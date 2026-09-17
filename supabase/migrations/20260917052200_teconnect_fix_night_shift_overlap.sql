begin;

create or replace function public.recalculate_attendance_day(p_employee_id uuid, p_work_date date)
returns void
language plpgsql
set search_path to 'public', 'private', 'pg_temp'
as $function$
declare
  v_company uuid; v_timezone text := 'Europe/Lisbon'; v_scheduled integer := 0; v_break integer := 0; v_tolerance integer := 0;
  v_worked integer := 0; v_normal integer := 0; v_overtime integer := 0; v_late integer := 0; v_early integer := 0; v_night integer := 0;
  v_first timestamptz; v_last timestamptz; v_in timestamptz; v_shift_start time; v_shift_end time; v_start_ts timestamptz; v_end_ts timestamptz;
  v_night_start time := '22:00'; v_night_end time := '07:00'; r record; v_status text := 'PRESENT'; v_pair_end timestamptz; v_pair_minutes integer; v_overlap integer;
  v_night_a_start timestamptz; v_night_a_end timestamptz; v_night_b_start timestamptz; v_night_b_end timestamptz;
begin
  select e.company_id into v_company from public.employees e where e.id=p_employee_id;
  if v_company is null then raise exception 'COLABORADOR_NAO_ENCONTRADO'; end if;
  select cs.timezone,cs.night_start,cs.night_end into v_timezone,v_night_start,v_night_end from public.company_settings cs where cs.company_id=v_company limit 1;
  select s.start_time,s.end_time,greatest((case when s.end_time<=s.start_time then 1440 else 0 end)+extract(epoch from(s.end_time-s.start_time))/60,0)::integer,s.break_minutes,s.tolerance_minutes
  into v_shift_start,v_shift_end,v_scheduled,v_break,v_tolerance
  from public.shift_assignments sa join public.shifts s on s.id=sa.shift_id
  where sa.employee_id=p_employee_id and sa.company_id=v_company and sa.start_date<=p_work_date and (sa.end_date is null or sa.end_date>=p_work_date) and s.active=true
  order by sa.start_date desc limit 1;
  v_scheduled:=greatest(coalesce(v_scheduled,480)-coalesce(v_break,0),0);
  if v_shift_start is not null then
    v_start_ts:=(p_work_date::text||' '||v_shift_start::text)::timestamp at time zone v_timezone;
    v_end_ts:=((case when v_shift_end<=v_shift_start then p_work_date+1 else p_work_date end)::text||' '||v_shift_end::text)::timestamp at time zone v_timezone;
  else
    v_start_ts:=(p_work_date::text||' 00:00:00')::timestamp at time zone v_timezone; v_end_ts:=v_start_ts+interval '24 hours';
  end if;
  v_night_a_start:=(p_work_date::text||' '||v_night_start::text)::timestamp at time zone v_timezone;
  v_night_a_end:=((case when v_night_end<=v_night_start then p_work_date+1 else p_work_date end)::text||' '||v_night_end::text)::timestamp at time zone v_timezone;
  if v_night_end<=v_night_start then
    v_night_b_start:=(p_work_date::text||' 00:00:00')::timestamp at time zone v_timezone;
    v_night_b_end:=(p_work_date::text||' '||v_night_end::text)::timestamp at time zone v_timezone;
  else
    v_night_b_start:=null; v_night_b_end:=null;
  end if;
  for r in select te.event_type,te.occurred_at from public.time_entries te where te.employee_id=p_employee_id and te.company_id=v_company and te.occurred_at between v_start_ts-interval '4 hours' and v_end_ts+interval '8 hours' and te.validation_status='VALID' order by te.occurred_at loop
    if upper(r.event_type) in ('IN','CLOCK_IN') and v_in is null then
      v_in:=r.occurred_at; v_first:=coalesce(v_first,r.occurred_at);
    elsif upper(r.event_type) in ('OUT','CLOCK_OUT') and v_in is not null then
      v_pair_end:=greatest(r.occurred_at,v_in); v_pair_minutes:=greatest(0,extract(epoch from(v_pair_end-v_in))/60)::integer; v_worked:=v_worked+v_pair_minutes; v_last:=v_pair_end;
      v_overlap:=greatest(0,extract(epoch from(least(v_pair_end,v_night_a_end)-greatest(v_in,v_night_a_start)))/60)::integer;
      if v_night_b_start is not null then v_overlap:=v_overlap+greatest(0,extract(epoch from(least(v_pair_end,v_night_b_end)-greatest(v_in,v_night_b_start)))/60)::integer; end if;
      v_night:=v_night+v_overlap; v_in:=null;
    end if;
  end loop;
  if v_first is null then v_status:='ABSENT';
  else
    v_normal:=least(v_worked,v_scheduled); v_overtime:=greatest(v_worked-v_scheduled,0);
    v_late:=case when v_first>v_start_ts+make_interval(mins=>coalesce(v_tolerance,0)) then greatest(0,extract(epoch from(v_first-v_start_ts))/60)::integer-coalesce(v_tolerance,0) else 0 end;
    v_early:=case when v_last is not null and v_last<v_end_ts then greatest(0,extract(epoch from(v_end_ts-v_last))/60)::integer else 0 end;
    if v_late>0 then v_status:='LATE'; end if; if v_in is not null then v_status:='OPEN'; end if;
  end if;
  insert into public.attendance_days(company_id,employee_id,work_date,scheduled_minutes,worked_minutes,normal_minutes,overtime_minutes,late_minutes,early_leave_minutes,night_minutes,status,first_clock_in,last_clock_out)
  values(v_company,p_employee_id,p_work_date,v_scheduled,v_worked,v_normal,v_overtime,v_late,v_early,v_night,v_status,v_first,v_last)
  on conflict(employee_id,work_date) do update set scheduled_minutes=excluded.scheduled_minutes,worked_minutes=excluded.worked_minutes,normal_minutes=excluded.normal_minutes,overtime_minutes=excluded.overtime_minutes,late_minutes=excluded.late_minutes,early_leave_minutes=excluded.early_leave_minutes,night_minutes=excluded.night_minutes,status=excluded.status,first_clock_in=excluded.first_clock_in,last_clock_out=excluded.last_clock_out;
end;
$function$;

commit;
