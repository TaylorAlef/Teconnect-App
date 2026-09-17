-- Teconnect P0: attendance loop hardening and RH live visibility.
-- Timezone is Europe/Lisbon because the product operates in Portugal.

create or replace function public.get_my_today_attendance()
returns table(work_date date, scheduled_minutes integer, worked_minutes integer, normal_minutes integer, overtime_minutes integer, late_minutes integer, early_leave_minutes integer, status text, first_clock_in timestamptz, last_clock_out timestamptz, notes text)
language sql stable security definer set search_path = public, private, pg_catalog as $$
  select a.work_date,a.scheduled_minutes,a.worked_minutes,a.normal_minutes,a.overtime_minutes,a.late_minutes,a.early_leave_minutes,a.status,a.first_clock_in,a.last_clock_out,a.notes
  from public.attendance_days a
  where a.employee_id=private.current_employee_id() and a.company_id=private.current_profile_company_id() and a.work_date=(now() at time zone 'Europe/Lisbon')::date limit 1;
$$;

create or replace function public.get_my_active_shift()
returns table(id uuid, name text, start_time time, end_time time, break_minutes integer, tolerance_minutes integer, night_shift boolean, assignment_start date, assignment_end date)
language sql security definer set search_path = public, private, pg_catalog as $$
  select s.id,s.name,s.start_time,s.end_time,s.break_minutes,s.tolerance_minutes,s.night_shift,sa.start_date,sa.end_date
  from public.shift_assignments sa join public.shifts s on s.id=sa.shift_id
  where sa.employee_id=private.current_employee_id() and sa.company_id=private.current_profile_company_id() and s.active=true
    and (now() at time zone 'Europe/Lisbon')::date>=sa.start_date and (sa.end_date is null or (now() at time zone 'Europe/Lisbon')::date<=sa.end_date)
  order by sa.start_date desc limit 1;
$$;

create or replace function public.get_my_clock_state()
returns jsonb language plpgsql stable security definer set search_path = public, private, pg_catalog as $$
declare
  v_employee uuid := private.current_employee_id(); v_company uuid := private.current_profile_company_id();
  v_employee_row public.employees; v_last public.time_entries; v_attendance jsonb; v_shift jsonb;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if v_company is null or v_employee is null then return jsonb_build_object('employee',null,'state','UNAVAILABLE'); end if;
  select * into v_employee_row from public.employees where id=v_employee and company_id=v_company and status='ACTIVE';
  if v_employee_row.id is null then return jsonb_build_object('employee',null,'state','UNAVAILABLE'); end if;
  select * into v_last from public.time_entries where employee_id=v_employee and company_id=v_company and validation_status='VALID'
    and occurred_at >= date_trunc('day',now() at time zone 'Europe/Lisbon') at time zone 'Europe/Lisbon'
    and occurred_at < (date_trunc('day',now() at time zone 'Europe/Lisbon') + interval '1 day') at time zone 'Europe/Lisbon'
    order by occurred_at desc limit 1;
  select to_jsonb(a) into v_attendance from public.attendance_days a where a.employee_id=v_employee and a.company_id=v_company and a.work_date=(now() at time zone 'Europe/Lisbon')::date limit 1;
  select to_jsonb(s) into v_shift from public.get_my_active_shift() s;
  return jsonb_build_object(
    'employee',jsonb_build_object('id',v_employee_row.id,'code',v_employee_row.employee_code,'name',v_employee_row.full_name),
    'state',coalesce(case v_last.event_type when 'CLOCK_IN' then 'WORKING' when 'BREAK_START' then 'ON_BREAK' when 'BREAK_END' then 'WORKING' when 'CLOCK_OUT' then 'OFF' end,'OFF'),
    'last_event',case when v_last.id is null then null else jsonb_build_object('id',v_last.id,'event_type',v_last.event_type,'occurred_at',v_last.occurred_at,'validation_status',v_last.validation_status,'work_location_id',v_last.work_location_id) end,
    'attendance',coalesce(v_attendance,'null'::jsonb),'shift',coalesce(v_shift,'null'::jsonb)
  );
end;
$$;

create or replace function public.get_company_attendance_live()
returns table(employee_id uuid,employee_code text,full_name text,last_event_type text,last_event_at timestamptz,last_location_name text,last_validation_status text,presence_status text,scheduled_minutes integer,worked_minutes integer,late_minutes integer,overtime_minutes integer,attendance_status text)
language plpgsql security definer set search_path = public, private, pg_catalog as $$
declare v_company uuid := private.current_profile_company_id(); v_role text := private.current_profile_role();
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if v_company is null then raise exception 'PROFILE_NOT_FOUND'; end if;
  if v_role not in ('SUPER_ADMIN','COMPANY_ADMIN','RH','GESTOR','SUPERVISOR') then raise exception 'NOT_AUTHORIZED'; end if;
  return query
  with latest as (
    select distinct on (te.employee_id) te.employee_id,te.event_type,te.occurred_at,te.validation_status,te.work_location_id
    from public.time_entries te
    where te.company_id=v_company and te.validation_status='VALID'
      and te.occurred_at >= date_trunc('day',now() at time zone 'Europe/Lisbon') at time zone 'Europe/Lisbon'
      and te.occurred_at < (date_trunc('day',now() at time zone 'Europe/Lisbon') + interval '1 day') at time zone 'Europe/Lisbon'
    order by te.employee_id,te.occurred_at desc
  )
  select e.id,e.employee_code,e.full_name,l.event_type,l.occurred_at,wl.name,l.validation_status,
    case l.event_type when 'CLOCK_IN' then 'PRESENT' when 'BREAK_START' then 'BREAK' when 'BREAK_END' then 'PRESENT' when 'CLOCK_OUT' then 'OFF' else 'NOT_STARTED' end,
    coalesce(a.scheduled_minutes,0),coalesce(a.worked_minutes,0),coalesce(a.late_minutes,0),coalesce(a.overtime_minutes,0),coalesce(a.status,'NOT_STARTED')
  from public.employees e left join latest l on l.employee_id=e.id left join public.work_locations wl on wl.id=l.work_location_id and wl.company_id=v_company
    left join public.attendance_days a on a.employee_id=e.id and a.company_id=v_company and a.work_date=(now() at time zone 'Europe/Lisbon')::date
  where e.company_id=v_company and e.status='ACTIVE' order by e.full_name;
end;
$$;

create or replace function public.register_time_entry(p_event_type text,p_work_location_id uuid default null,p_latitude double precision default null,p_longitude double precision default null,p_gps_accuracy double precision default null,p_device text default null)
returns jsonb language plpgsql security definer set search_path = public, private, pg_temp as $$
declare v_uid uuid:=auth.uid(); v_company uuid; v_employee uuid; v_location record; v_distance double precision; v_canonical text; v_id uuid; v_attendance jsonb; v_radius double precision; v_last_event text;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select p.company_id into v_company from public.profiles p where p.id=v_uid and p.active=true limit 1;
  if v_company is null then raise exception 'PROFILE_NOT_FOUND'; end if;
  select e.id into v_employee from public.employees e where e.user_id=v_uid and e.company_id=v_company and e.status='ACTIVE' limit 1;
  if v_employee is null then raise exception 'EMPLOYEE_NOT_FOUND'; end if;
  v_canonical:=case upper(coalesce(p_event_type,'')) when 'IN' then 'CLOCK_IN' when 'OUT' then 'CLOCK_OUT' when 'CLOCK_IN' then 'CLOCK_IN' when 'CLOCK_OUT' then 'CLOCK_OUT' when 'BREAK_START' then 'BREAK_START' when 'BREAK_END' then 'BREAK_END' else null end;
  if v_canonical is null then raise exception 'INVALID_EVENT_TYPE'; end if;
  if p_work_location_id is null or p_latitude is null or p_longitude is null then raise exception 'GEOLOCALIZACAO_OBRIGATORIA'; end if;
  if p_latitude not between -90 and 90 or p_longitude not between -180 and 180 then raise exception 'COORDENADAS_INVALIDAS'; end if;
  select wl.* into v_location from public.work_locations wl where wl.id=p_work_location_id and wl.company_id=v_company and wl.active=true;
  if not found then raise exception 'WORK_LOCATION_NOT_FOUND'; end if;
  if v_location.latitude is null or v_location.longitude is null then raise exception 'LOCAL_SEM_COORDENADAS'; end if;
  v_radius:=greatest(1,coalesce(v_location.gps_radius_m,100));
  v_distance:=6371000*2*asin(sqrt(power(sin(radians(p_latitude-v_location.latitude)/2),2)+cos(radians(p_latitude))*cos(radians(v_location.latitude))*power(sin(radians(p_longitude-v_location.longitude)/2),2)));
  if v_distance>=v_radius then raise exception 'FORA_DO_RAIO: %m (raio %m)',round(v_distance::numeric,1),round(v_radius::numeric,1); end if;
  select te.event_type into v_last_event from public.time_entries te where te.employee_id=v_employee and te.company_id=v_company and te.validation_status='VALID' order by te.occurred_at desc limit 1;
  if v_canonical='CLOCK_IN' and v_last_event in ('CLOCK_IN','BREAK_END') then raise exception 'ENTRADA_JA_ABERTA'; end if;
  if v_canonical='BREAK_START' and v_last_event not in ('CLOCK_IN','BREAK_END') then raise exception 'NAO_EXISTE_ENTRADA_ABERTA'; end if;
  if v_canonical='BREAK_END' and v_last_event <> 'BREAK_START' then raise exception 'NAO_EXISTE_PAUSA_ABERTA'; end if;
  if v_canonical='CLOCK_OUT' and v_last_event='BREAK_START' then raise exception 'PAUSA_ABERTA'; end if;
  if v_canonical='CLOCK_OUT' and v_last_event not in ('CLOCK_IN','BREAK_END') then raise exception 'NAO_EXISTE_ENTRADA_ABERTA'; end if;
  insert into public.time_entries(company_id,employee_id,work_location_id,event_type,occurred_at,latitude,longitude,gps_accuracy,device,validation_status) values(v_company,v_employee,p_work_location_id,v_canonical,now(),p_latitude,p_longitude,p_gps_accuracy,p_device,'VALID') returning id into v_id;
  perform public.recalculate_attendance_day(v_employee,(now() at time zone 'Europe/Lisbon')::date);
  select to_jsonb(ad) into v_attendance from public.attendance_days ad where ad.employee_id=v_employee and ad.work_date=(now() at time zone 'Europe/Lisbon')::date;
  return jsonb_build_object('id',v_id,'status','VALID','event_type',v_canonical,'distance_m',round(v_distance::numeric,2),'radius_m',v_radius,'employee_id',v_employee,'attendance',v_attendance);
end;
$$;

grant execute on function public.get_my_today_attendance() to authenticated;
grant execute on function public.get_my_active_shift() to authenticated;
grant execute on function public.get_my_clock_state() to authenticated;
grant execute on function public.get_company_attendance_live() to authenticated;
grant execute on function public.register_time_entry(text,uuid,double precision,double precision,double precision,text) to authenticated;
