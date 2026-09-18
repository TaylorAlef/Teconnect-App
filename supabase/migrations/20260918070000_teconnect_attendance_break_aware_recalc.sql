-- Te-connect: authoritative attendance calculation with explicit break handling.
-- Work time is based on work segments, excluding pauses.

create or replace function public.recalculate_attendance_day(p_employee_id uuid, p_work_date date)
returns void
language plpgsql
security definer
set search_path = public, private, pg_temp
as $function$
declare
  v_company uuid;
  v_timezone text := 'Europe/Lisbon';
  v_scheduled integer := 0;
  v_planned_break integer := 0;
  v_tolerance integer := 0;
  v_worked integer := 0;
  v_normal integer := 0;
  v_overtime integer := 0;
  v_late integer := 0;
  v_early integer := 0;
  v_night integer := 0;
  v_first timestamptz;
  v_last timestamptz;
  v_in timestamptz;
  v_break_start timestamptz;
  v_shift_start time;
  v_shift_end time;
  v_shift_start_ts timestamptz;
  v_shift_end_ts timestamptz;
  v_query_start timestamptz;
  v_query_end timestamptz;
  v_night_start time := '22:00';
  v_night_end time := '07:00';
  v_night_start_ts timestamptz;
  v_night_end_ts timestamptz;
  v_segment_end timestamptz;
  v_segment_minutes integer;
  v_overlap integer;
  v_status text := 'PRESENT';
  r record;
begin
  select e.company_id
    into v_company
    from public.employees e
   where e.id = p_employee_id;

  if v_company is null then
    raise exception 'COLABORADOR_NAO_ENCONTRADO';
  end if;

  select cs.timezone, cs.night_start, cs.night_end
    into v_timezone, v_night_start, v_night_end
    from public.company_settings cs
   where cs.company_id = v_company
   limit 1;

  select
    s.start_time,
    s.end_time,
    extract(epoch from (
      case
        when s.end_time <= s.start_time
          then (s.end_time - s.start_time) + interval '24 hours'
        else (s.end_time - s.start_time)
      end
    )) / 60,
    coalesce(s.break_minutes, 0),
    coalesce(s.tolerance_minutes, 0)
    into v_shift_start, v_shift_end, v_scheduled, v_planned_break, v_tolerance
    from public.shift_assignments sa
    join public.shifts s on s.id = sa.shift_id
   where sa.employee_id = p_employee_id
     and sa.company_id = v_company
     and sa.start_date <= p_work_date
     and (sa.end_date is null or sa.end_date >= p_work_date)
     and s.active = true
   order by sa.start_date desc
   limit 1;

  v_scheduled := greatest(coalesce(v_scheduled, 480) - v_planned_break, 0);

  if v_shift_start is not null and v_shift_end is not null then
    v_shift_start_ts := (p_work_date::text || ' ' || v_shift_start::text)::timestamp at time zone v_timezone;
    v_shift_end_ts := (
      (
        case when v_shift_end <= v_shift_start then p_work_date + 1 else p_work_date end
      )::text || ' ' || v_shift_end::text
    )::timestamp at time zone v_timezone;
    v_query_start := v_shift_start_ts - interval '6 hours';
    v_query_end := v_shift_end_ts + interval '8 hours';
  else
    v_shift_start_ts := p_work_date::timestamp at time zone v_timezone;
    v_shift_end_ts := (p_work_date + 1)::timestamp at time zone v_timezone;
    v_query_start := v_shift_start_ts;
    v_query_end := v_shift_end_ts;
  end if;

  v_night_start_ts := (p_work_date::text || ' ' || v_night_start::text)::timestamp at time zone v_timezone;
  v_night_end_ts := (
    (
      case when v_night_end <= v_night_start then p_work_date + 1 else p_work_date end
    )::text || ' ' || v_night_end::text
  )::timestamp at time zone v_timezone;

  for r in
    select te.event_type, te.occurred_at
      from public.time_entries te
     where te.employee_id = p_employee_id
       and te.company_id = v_company
       and te.occurred_at between v_query_start and v_query_end
       and te.validation_status = 'VALID'
     order by te.occurred_at, te.id
  loop
    case upper(r.event_type)
      when 'IN', 'CLOCK_IN' then
        if v_in is null and v_break_start is null then
          v_in := r.occurred_at;
          v_first := coalesce(v_first, r.occurred_at);
        end if;

      when 'BREAK_START' then
        if v_in is not null and v_break_start is null then
          v_segment_end := r.occurred_at;
          if v_segment_end > v_in then
            v_segment_minutes := floor(extract(epoch from (v_segment_end - v_in)) / 60)::integer;
            v_worked := v_worked + greatest(v_segment_minutes, 0);
            v_overlap := greatest(
              0,
              floor(extract(epoch from (least(v_segment_end, v_night_end_ts) - greatest(v_in, v_night_start_ts))) / 60)::integer
            );
            v_night := v_night + v_overlap;
          end if;
          v_break_start := r.occurred_at;
          v_in := null;
        end if;

      when 'BREAK_END' then
        if v_break_start is not null then
          v_break_start := null;
          v_in := r.occurred_at;
        end if;

      when 'OUT', 'CLOCK_OUT' then
        if v_break_start is null and v_in is not null then
          v_segment_end := r.occurred_at;
          if v_segment_end > v_in then
            v_segment_minutes := floor(extract(epoch from (v_segment_end - v_in)) / 60)::integer;
            v_worked := v_worked + greatest(v_segment_minutes, 0);
            v_overlap := greatest(
              0,
              floor(extract(epoch from (least(v_segment_end, v_night_end_ts) - greatest(v_in, v_night_start_ts))) / 60)::integer
            );
            v_night := v_night + v_overlap;
          end if;
          v_last := r.occurred_at;
          v_in := null;
        end if;

      else
        null;
    end case;
  end loop;

  -- Persist the current open work segment so the day remains current.
  if v_break_start is null and v_in is not null then
    v_segment_end := least(now(), v_shift_end_ts);
    if v_segment_end > v_in then
      v_segment_minutes := floor(extract(epoch from (v_segment_end - v_in)) / 60)::integer;
      v_worked := v_worked + greatest(v_segment_minutes, 0);
      v_overlap := greatest(
        0,
        floor(extract(epoch from (least(v_segment_end, v_night_end_ts) - greatest(v_in, v_night_start_ts))) / 60)::integer
      );
      v_night := v_night + v_overlap;
    end if;
  end if;

  if v_first is null then
    v_status := 'ABSENT';
  else
    v_normal := least(v_worked, v_scheduled);
    v_overtime := greatest(v_worked - v_scheduled, 0);

    if v_shift_start_ts is not null and v_first > v_shift_start_ts + make_interval(mins => v_tolerance) then
      v_late := greatest(
        0,
        floor(extract(epoch from (v_first - v_shift_start_ts)) / 60)::integer - v_tolerance
      );
    else
      v_late := 0;
    end if;

    if v_last is not null and v_shift_end_ts is not null and v_last < v_shift_end_ts then
      v_early := greatest(
        0,
        floor(extract(epoch from (v_shift_end_ts - v_last)) / 60)::integer
      );
    else
      v_early := 0;
    end if;

    if v_in is not null then
      v_status := 'OPEN';
    elsif v_late > 0 then
      v_status := 'LATE';
    else
      v_status := 'PRESENT';
    end if;
  end if;

  insert into public.attendance_days(
    company_id,
    employee_id,
    work_date,
    scheduled_minutes,
    worked_minutes,
    normal_minutes,
    overtime_minutes,
    late_minutes,
    early_leave_minutes,
    night_minutes,
    status,
    first_clock_in,
    last_clock_out
  )
  values(
    v_company,
    p_employee_id,
    p_work_date,
    v_scheduled,
    v_worked,
    v_normal,
    v_overtime,
    v_late,
    v_early,
    v_night,
    v_status,
    v_first,
    v_last
  )
  on conflict(employee_id, work_date) do update set
    scheduled_minutes = excluded.scheduled_minutes,
    worked_minutes = excluded.worked_minutes,
    normal_minutes = excluded.normal_minutes,
    overtime_minutes = excluded.overtime_minutes,
    late_minutes = excluded.late_minutes,
    early_leave_minutes = excluded.early_leave_minutes,
    night_minutes = excluded.night_minutes,
    status = excluded.status,
    first_clock_in = excluded.first_clock_in,
    last_clock_out = excluded.last_clock_out;
end;
$function$;
