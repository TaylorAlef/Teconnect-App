begin;

-- Company-wide live attendance is HR/admin visibility; managers only see their own team.
create or replace function public.get_company_attendance_live()
returns table(employee_id uuid, employee_code text, full_name text, last_event_type text, last_event_at timestamptz, last_location_name text, last_validation_status text, presence_status text, scheduled_minutes integer, worked_minutes integer, late_minutes integer, overtime_minutes integer, attendance_status text)
language plpgsql
security definer
set search_path to 'public', 'private', 'pg_catalog'
as $function$
declare
  v_company uuid := private.current_profile_company_id();
  v_role text := private.current_profile_role();
  v_employee uuid := private.current_employee_id();
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if v_company is null then raise exception 'PROFILE_NOT_FOUND'; end if;
  if v_role not in ('SUPER_ADMIN','COMPANY_ADMIN','RH','GESTOR','SUPERVISOR') then raise exception 'NOT_AUTHORIZED'; end if;

  return query
  with latest as (
    select distinct on (te.employee_id)
      te.employee_id,te.event_type,te.occurred_at,te.validation_status,te.work_location_id
    from public.time_entries te
    where te.company_id=v_company
      and te.validation_status='VALID'
      and te.occurred_at >= date_trunc('day', now() at time zone 'Europe/Lisbon') at time zone 'Europe/Lisbon'
      and te.occurred_at < (date_trunc('day', now() at time zone 'Europe/Lisbon') + interval '1 day') at time zone 'Europe/Lisbon'
    order by te.employee_id,te.occurred_at desc
  )
  select e.id,e.employee_code,e.full_name,
         l.event_type,l.occurred_at,wl.name,l.validation_status,
         case l.event_type when 'CLOCK_IN' then 'PRESENT' when 'BREAK_START' then 'BREAK' when 'BREAK_END' then 'PRESENT' when 'CLOCK_OUT' then 'OFF' else 'NOT_STARTED' end,
         coalesce(a.scheduled_minutes,0),coalesce(a.worked_minutes,0),coalesce(a.late_minutes,0),coalesce(a.overtime_minutes,0),coalesce(a.status,'NOT_STARTED')
  from public.employees e
  left join latest l on l.employee_id=e.id
  left join public.work_locations wl on wl.id=l.work_location_id and wl.company_id=v_company
  left join public.attendance_days a on a.employee_id=e.id and a.company_id=v_company and a.work_date=(now() at time zone 'Europe/Lisbon')::date
  where e.company_id=v_company
    and e.status='ACTIVE'
    and (
      v_role in ('SUPER_ADMIN','COMPANY_ADMIN','RH')
      or (v_role in ('GESTOR','SUPERVISOR') and e.manager_id=v_employee)
    )
  order by e.full_name;
end;
$function$;

-- Company onboarding metadata (NIF/address/subscription) is restricted to administrative roles once a company exists.
create or replace function public.get_my_onboarding_v1()
returns jsonb
language plpgsql
stable security definer
set search_path to 'public', 'private', 'pg_catalog'
as $function$
declare
  v_user uuid := auth.uid();
  v_company uuid;
  v_role text;
  v_progress public.onboarding_progress;
  v_company_row public.companies;
  v_departments integer;
  v_locations integer;
  v_shifts integer;
  v_employees integer;
  v_sub_status text;
  v_trial_ends_at timestamptz;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  v_company := private.current_profile_company_id();
  if v_company is null then
    return jsonb_build_object('has_company', false, 'current_step', 1, 'completed_steps', '[]'::jsonb);
  end if;
  v_role := private.current_profile_role();
  if v_role not in ('SUPER_ADMIN','COMPANY_ADMIN','RH') then raise exception 'NOT_AUTHORIZED'; end if;

  select * into v_company_row from public.companies where id = v_company;
  select * into v_progress from public.onboarding_progress where company_id = v_company;
  select count(*)::integer into v_departments from public.departments where company_id = v_company and active = true;
  select count(*)::integer into v_locations from public.work_locations where company_id = v_company and active = true;
  select count(*)::integer into v_shifts from public.shifts where company_id = v_company and active = true;
  select count(*)::integer into v_employees from public.employees where company_id = v_company and status = 'ACTIVE';
  select s.status, s.trial_ends_at into v_sub_status, v_trial_ends_at
  from public.subscriptions s where s.company_id = v_company order by s.created_at desc limit 1;

  return jsonb_build_object(
    'has_company', true,
    'company_id', v_company,
    'company_name', v_company_row.name,
    'nif', v_company_row.nif,
    'phone', v_company_row.phone,
    'address', v_company_row.address,
    'subscription_status', v_sub_status,
    'trial_ends_at', v_trial_ends_at,
    'departments_count', v_departments,
    'locations_count', v_locations,
    'shifts_count', v_shifts,
    'employees_count', v_employees,
    'current_step', coalesce(v_progress.current_step, 1),
    'completed_steps', coalesce(v_progress.completed_steps, '[]'::jsonb),
    'completed_at', v_progress.completed_at,
    'ready', (v_departments > 0 and v_locations > 0 and v_shifts > 0 and v_employees > 0),
    'checks', jsonb_build_object('company', true,'department', v_departments > 0,'location', v_locations > 0,'shift', v_shifts > 0,'employee', v_employees > 0)
  );
end;
$function$;

-- Starting a paid/trial subscription is a billing-admin action, not a generic employee action.
create or replace function public.start_company_trial(p_plan_code text, p_billing_cycle text default 'MONTHLY')
returns public.company_subscriptions
language plpgsql
security definer
set search_path to 'public', 'private', 'pg_catalog'
as $function$
declare
  v_company uuid;
  v_role text;
  v_plan public.saas_plans;
  v_sub public.company_subscriptions;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  v_company := private.current_profile_company_id();
  v_role := private.current_profile_role();
  if v_company is null then raise exception 'EMPRESA_NAO_ENCONTRADA'; end if;
  if v_role not in ('SUPER_ADMIN','COMPANY_ADMIN','RH') then raise exception 'NOT_AUTHORIZED'; end if;
  select * into v_plan from public.saas_plans where code=upper(p_plan_code) and active=true limit 1;
  if v_plan.id is null then raise exception 'PLANO_INVALIDO'; end if;
  select * into v_sub from public.company_subscriptions where company_id=v_company and status in ('TRIALING','ACTIVE','PAST_DUE') order by created_at desc limit 1;
  if v_sub.id is not null then return v_sub; end if;
  insert into public.company_subscriptions(company_id,plan_id,status,billing_cycle,employee_limit,trial_ends_at,current_period_start,current_period_end)
  values(v_company,v_plan.id,'TRIALING',upper(p_billing_cycle),v_plan.max_employees,now()+interval '30 days',now(),now()+interval '30 days') returning * into v_sub;
  return v_sub;
end;
$function$;

commit;
