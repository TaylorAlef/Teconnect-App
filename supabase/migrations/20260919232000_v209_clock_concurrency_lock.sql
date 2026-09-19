-- v209: serialize clock events per employee to prevent duplicate concurrent punches.
create or replace function public.register_time_entry(
  p_event_type text,
  p_work_location_id uuid default null,
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_gps_accuracy double precision default null,
  p_device text default null
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $function$
declare
  v_uid uuid:=auth.uid();
  v_company uuid;
  v_employee uuid;
  v_location record;
  v_distance double precision;
  v_canonical text;
  v_id uuid;
  v_attendance jsonb;
  v_radius double precision;
  v_last_event text;
  v_event_at timestamptz:=clock_timestamp();
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select p.company_id into v_company from public.profiles p where p.id=v_uid and p.active=true limit 1;
  if v_company is null then raise exception 'PROFILE_NOT_FOUND'; end if;
  select e.id into v_employee from public.employees e where e.user_id=v_uid and e.company_id=v_company and e.status='ACTIVE' limit 1;
  if v_employee is null then raise exception 'EMPLOYEE_NOT_FOUND'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_employee::text,0));

  v_canonical:=case upper(coalesce(p_event_type,''))
    when 'IN' then 'CLOCK_IN'
    when 'OUT' then 'CLOCK_OUT'
    when 'CLOCK_IN' then 'CLOCK_IN'
    when 'CLOCK_OUT' then 'CLOCK_OUT'
    when 'BREAK_START' then 'BREAK_START'
    when 'BREAK_END' then 'BREAK_END'
    else null
  end;
  if v_canonical is null then raise exception 'INVALID_EVENT_TYPE'; end if;
  if p_work_location_id is null or p_latitude is null or p_longitude is null then raise exception 'GEOLOCALIZACAO_OBRIGATORIA'; end if;
  if p_latitude not between -90 and 90 or p_longitude not between -180 and 180 then raise exception 'COORDENADAS_INVALIDAS'; end if;

  select wl.* into v_location from public.work_locations wl
   where wl.id=p_work_location_id and wl.company_id=v_company and wl.active=true;
  if not found then raise exception 'WORK_LOCATION_NOT_FOUND'; end if;
  if v_location.latitude is null or v_location.longitude is null then raise exception 'LOCAL_SEM_COORDENADAS'; end if;

  v_radius:=greatest(1,coalesce(v_location.gps_radius_m,100));
  v_distance:=6371000*2*asin(sqrt(
    power(sin(radians(p_latitude-v_location.latitude)/2),2)
    +cos(radians(p_latitude))*cos(radians(v_location.latitude))
    *power(sin(radians(p_longitude-v_location.longitude)/2),2)
  ));
  if v_distance>=v_radius then
    raise exception 'FORA_DO_RAIO: %m (raio %m)',round(v_distance::numeric,1),round(v_radius::numeric,1);
  end if;

  select te.event_type into v_last_event from public.time_entries te
   where te.employee_id=v_employee and te.company_id=v_company and te.validation_status='VALID'
     and te.occurred_at>v_event_at-interval '36 hours'
   order by te.occurred_at desc,te.id desc limit 1;

  if v_canonical='CLOCK_IN' and v_last_event in ('CLOCK_IN','BREAK_END') then raise exception 'ENTRADA_JA_ABERTA'; end if;
  if v_canonical='BREAK_START' and v_last_event not in ('CLOCK_IN','BREAK_END') then raise exception 'NAO_EXISTE_ENTRADA_ABERTA'; end if;
  if v_canonical='BREAK_END' and v_last_event<>'BREAK_START' then raise exception 'NAO_EXISTE_PAUSA_ABERTA'; end if;
  if v_canonical='CLOCK_OUT' and v_last_event='BREAK_START' then raise exception 'PAUSA_ABERTA'; end if;
  if v_canonical='CLOCK_OUT' and v_last_event not in ('CLOCK_IN','BREAK_END') then raise exception 'NAO_EXISTE_ENTRADA_ABERTA'; end if;

  insert into public.time_entries(company_id,employee_id,work_location_id,event_type,occurred_at,latitude,longitude,gps_accuracy,device,validation_status)
  values(v_company,v_employee,p_work_location_id,v_canonical,v_event_at,p_latitude,p_longitude,p_gps_accuracy,p_device,'VALID')
  returning id into v_id;

  perform public.recalculate_attendance_day(v_employee,(v_event_at at time zone 'Europe/Lisbon')::date);
  select to_jsonb(ad) into v_attendance from public.attendance_days ad
   where ad.employee_id=v_employee and ad.work_date=(v_event_at at time zone 'Europe/Lisbon')::date;

  return jsonb_build_object('id',v_id,'status','VALID','event_type',v_canonical,'distance_m',round(v_distance::numeric,2),'radius_m',v_radius,'employee_id',v_employee,'attendance',v_attendance);
end;
$function$;

revoke execute on function public.register_time_entry(text,uuid,double precision,double precision,double precision,text) from anon,public;
grant execute on function public.register_time_entry(text,uuid,double precision,double precision,double precision,text) to authenticated;
