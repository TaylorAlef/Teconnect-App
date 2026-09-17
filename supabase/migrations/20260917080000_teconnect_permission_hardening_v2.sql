begin;

-- Close direct anonymous access to application tables and SECURITY DEFINER RPCs.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;

do $$
declare r record;
begin
  for r in
    select p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
  loop
    execute format('revoke execute on function public.%I(%s) from public, anon', r.proname, r.args);
  end loop;
end $$;

-- Managers/supervisors may only mutate records for employees they actually manage.
drop policy if exists absences_manage on public.absences;
create policy absences_manage on public.absences
for all to authenticated
using (
  company_id = private.current_profile_company_id()
  and (
    private.is_company_admin_or_hr()
    or (private.is_manager() and private.is_managed_employee(employee_id))
  )
  and exists (
    select 1 from public.employees e
    where e.id = absences.employee_id
      and e.company_id = private.current_profile_company_id()
  )
)
with check (
  company_id = private.current_profile_company_id()
  and (
    private.is_company_admin_or_hr()
    or (private.is_manager() and private.is_managed_employee(employee_id))
  )
  and exists (
    select 1 from public.employees e
    where e.id = absences.employee_id
      and e.company_id = private.current_profile_company_id()
  )
);

drop policy if exists employee_competencies_manage on public.employee_competencies;
create policy employee_competencies_manage on public.employee_competencies
for all to authenticated
using (
  company_id = private.current_profile_company_id()
  and (
    private.is_company_admin_or_hr()
    or (private.is_manager() and private.is_managed_employee(employee_id))
  )
  and exists (
    select 1 from public.employees e
    where e.id = employee_competencies.employee_id
      and e.company_id = private.current_profile_company_id()
  )
)
with check (
  company_id = private.current_profile_company_id()
  and (
    private.is_company_admin_or_hr()
    or (private.is_manager() and private.is_managed_employee(employee_id))
  )
  and exists (
    select 1 from public.employees e
    where e.id = employee_competencies.employee_id
      and e.company_id = private.current_profile_company_id()
  )
);

drop policy if exists employee_documents_manage on public.employee_documents;
create policy employee_documents_manage on public.employee_documents
for all to authenticated
using (
  company_id = private.current_profile_company_id()
  and (
    private.is_company_admin_or_hr()
    or (private.is_manager() and private.is_managed_employee(employee_id))
  )
  and exists (
    select 1 from public.employees e
    where e.id = employee_documents.employee_id
      and e.company_id = private.current_profile_company_id()
  )
)
with check (
  company_id = private.current_profile_company_id()
  and (
    private.is_company_admin_or_hr()
    or (private.is_manager() and private.is_managed_employee(employee_id))
  )
  and exists (
    select 1 from public.employees e
    where e.id = employee_documents.employee_id
      and e.company_id = private.current_profile_company_id()
  )
);

drop policy if exists employee_trainings_manage on public.employee_trainings;
create policy employee_trainings_manage on public.employee_trainings
for all to authenticated
using (
  company_id = private.current_profile_company_id()
  and (
    private.is_company_admin_or_hr()
    or (private.is_manager() and private.is_managed_employee(employee_id))
  )
  and exists (
    select 1 from public.employees e
    where e.id = employee_trainings.employee_id
      and e.company_id = private.current_profile_company_id()
  )
)
with check (
  company_id = private.current_profile_company_id()
  and (
    private.is_company_admin_or_hr()
    or (private.is_manager() and private.is_managed_employee(employee_id))
  )
  and exists (
    select 1 from public.employees e
    where e.id = employee_trainings.employee_id
      and e.company_id = private.current_profile_company_id()
  )
);

drop policy if exists overtime_manage_role_scoped on public.overtime_records;
create policy overtime_manage_role_scoped on public.overtime_records
for all to authenticated
using (
  company_id = private.current_profile_company_id()
  and (
    private.is_company_admin_or_hr()
    or (private.is_manager() and private.is_managed_employee(employee_id))
  )
  and exists (
    select 1 from public.employees e
    where e.id = overtime_records.employee_id
      and e.company_id = private.current_profile_company_id()
  )
)
with check (
  company_id = private.current_profile_company_id()
  and (
    private.is_company_admin_or_hr()
    or (private.is_manager() and private.is_managed_employee(employee_id))
  )
  and exists (
    select 1 from public.employees e
    where e.id = overtime_records.employee_id
      and e.company_id = private.current_profile_company_id()
  )
);

drop policy if exists adjustments_manage_role_scoped on public.timesheet_adjustments;
create policy adjustments_manage_role_scoped on public.timesheet_adjustments
for all to authenticated
using (
  company_id = private.current_profile_company_id()
  and (
    private.is_company_admin_or_hr()
    or (private.is_manager() and private.is_managed_employee(employee_id))
  )
  and exists (
    select 1 from public.employees e
    where e.id = timesheet_adjustments.employee_id
      and e.company_id = private.current_profile_company_id()
  )
)
with check (
  company_id = private.current_profile_company_id()
  and (
    private.is_company_admin_or_hr()
    or (private.is_manager() and private.is_managed_employee(employee_id))
  )
  and exists (
    select 1 from public.employees e
    where e.id = timesheet_adjustments.employee_id
      and e.company_id = private.current_profile_company_id()
  )
);

drop policy if exists vacation_requests_manage on public.vacation_requests;
create policy vacation_requests_manage on public.vacation_requests
for all to authenticated
using (
  company_id = private.current_profile_company_id()
  and (
    private.is_company_admin_or_hr()
    or (private.is_manager() and private.is_managed_employee(employee_id))
  )
  and exists (
    select 1 from public.employees e
    where e.id = vacation_requests.employee_id
      and e.company_id = private.current_profile_company_id()
  )
)
with check (
  company_id = private.current_profile_company_id()
  and (
    private.is_company_admin_or_hr()
    or (private.is_manager() and private.is_managed_employee(employee_id))
  )
  and exists (
    select 1 from public.employees e
    where e.id = vacation_requests.employee_id
      and e.company_id = private.current_profile_company_id()
  )
);

drop policy if exists assignments_insert_role_scoped on public.shift_assignments;
create policy assignments_insert_role_scoped on public.shift_assignments
for insert to authenticated
with check (
  company_id = private.current_profile_company_id()
  and (
    private.is_company_admin_or_hr()
    or (private.is_manager() and private.is_managed_employee(employee_id))
  )
  and exists (
    select 1 from public.employees e
    where e.id = shift_assignments.employee_id
      and e.company_id = private.current_profile_company_id()
  )
  and exists (
    select 1 from public.shifts s
    where s.id = shift_assignments.shift_id
      and s.company_id = private.current_profile_company_id()
  )
);

drop policy if exists assignments_update_role_scoped on public.shift_assignments;
create policy assignments_update_role_scoped on public.shift_assignments
for update to authenticated
using (
  company_id = private.current_profile_company_id()
  and (
    private.is_company_admin_or_hr()
    or (private.is_manager() and private.is_managed_employee(employee_id))
  )
  and exists (
    select 1 from public.employees e
    where e.id = shift_assignments.employee_id
      and e.company_id = private.current_profile_company_id()
  )
)
with check (
  company_id = private.current_profile_company_id()
  and (
    private.is_company_admin_or_hr()
    or (private.is_manager() and private.is_managed_employee(employee_id))
  )
  and exists (
    select 1 from public.employees e
    where e.id = shift_assignments.employee_id
      and e.company_id = private.current_profile_company_id()
  )
  and exists (
    select 1 from public.shifts s
    where s.id = shift_assignments.shift_id
      and s.company_id = private.current_profile_company_id()
  )
);

drop policy if exists assignments_delete_role_scoped on public.shift_assignments;
create policy assignments_delete_role_scoped on public.shift_assignments
for delete to authenticated
using (
  company_id = private.current_profile_company_id()
  and (
    private.is_company_admin_or_hr()
    or (private.is_manager() and private.is_managed_employee(employee_id))
  )
  and exists (
    select 1 from public.employees e
    where e.id = shift_assignments.employee_id
      and e.company_id = private.current_profile_company_id()
  )
);

-- Harden manager approvals so a manager/supervisor cannot approve another team's requests.
create or replace function public.approve_overtime_record(p_record_id uuid, p_approve boolean)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'private', 'pg_catalog'
as $function$
declare
  v_company uuid;
  v_role text;
  v_rec record;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  v_company := private.current_profile_company_id();
  v_role := private.current_profile_role();
  if v_company is null then raise exception 'PROFILE_NOT_FOUND'; end if;
  if v_role not in ('SUPER_ADMIN','COMPANY_ADMIN','RH','GESTOR','SUPERVISOR') then raise exception 'FORBIDDEN'; end if;
  select * into v_rec
  from public.overtime_records
  where id = p_record_id and company_id = v_company and status = 'PENDING'
  for update;
  if not found then raise exception 'RECORD_NOT_FOUND'; end if;
  if v_role in ('GESTOR','SUPERVISOR') and not private.is_managed_employee(v_rec.employee_id) then
    raise exception 'FORBIDDEN';
  end if;
  update public.overtime_records
  set status = case when p_approve then 'APPROVED' else 'REJECTED' end,
      approved_by = auth.uid(),
      approved_at = now()
  where id = p_record_id;
  return jsonb_build_object('id',p_record_id,'status',case when p_approve then 'APPROVED' else 'REJECTED' end);
end;
$function$;

create or replace function public.approve_vacation_request(p_request_id uuid, p_approve boolean)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'private', 'pg_catalog'
as $function$
declare
  v_company uuid;
  v_role text;
  v_req record;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  v_company := private.current_profile_company_id();
  v_role := private.current_profile_role();
  if v_company is null then raise exception 'PROFILE_NOT_FOUND'; end if;
  if v_role not in ('SUPER_ADMIN','COMPANY_ADMIN','RH','GESTOR','SUPERVISOR') then raise exception 'FORBIDDEN'; end if;
  select * into v_req
  from public.vacation_requests
  where id = p_request_id and company_id = v_company and status = 'PENDING'
  for update;
  if not found then raise exception 'REQUEST_NOT_FOUND'; end if;
  if v_role in ('GESTOR','SUPERVISOR') and not private.is_managed_employee(v_req.employee_id) then
    raise exception 'FORBIDDEN';
  end if;
  update public.vacation_requests
  set status = case when p_approve then 'APPROVED' else 'REJECTED' end,
      approved_by = auth.uid(),
      approved_at = now()
  where id = p_request_id;
  if p_approve then
    insert into public.vacation_balances(company_id,employee_id,year,allocated_days,used_days,pending_days)
    values(v_company,v_req.employee_id,extract(year from v_req.start_date)::int,22,v_req.days,0)
    on conflict(employee_id,year) do update
      set used_days = public.vacation_balances.used_days + excluded.used_days,
          pending_days = greatest(public.vacation_balances.pending_days-excluded.used_days,0);
  else
    update public.vacation_balances
    set pending_days = greatest(pending_days-v_req.days,0)
    where employee_id = v_req.employee_id
      and year = extract(year from v_req.start_date)::int
      and company_id = v_company;
  end if;
  return jsonb_build_object('id',p_request_id,'status',case when p_approve then 'APPROVED' else 'REJECTED' end);
end;
$function$;

-- Employee-level vacation creation remains self-service, while delegated creation is manager-scoped.
create or replace function public.create_vacation_request_app(
  p_employee_id uuid,
  p_start_date date,
  p_end_date date,
  p_days numeric,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'private', 'pg_catalog'
as $function$
declare
  v_company uuid;
  v_role text;
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  v_company := private.current_profile_company_id();
  v_role := private.current_profile_role();
  if v_company is null or v_role not in ('SUPER_ADMIN','COMPANY_ADMIN','RH','GESTOR') then
    raise exception 'NOT_AUTHORIZED';
  end if;
  if not exists (
    select 1 from public.employees
    where id = p_employee_id and company_id = v_company
  ) then raise exception 'EMPLOYEE_NOT_FOUND'; end if;
  if v_role = 'GESTOR' and not private.is_managed_employee(p_employee_id) then
    raise exception 'NOT_AUTHORIZED';
  end if;
  if p_start_date is null or p_end_date is null or p_end_date < p_start_date or coalesce(p_days,0) <= 0 then
    raise exception 'INVALID_VACATION';
  end if;
  insert into public.vacation_requests(company_id,employee_id,start_date,end_date,days,reason,status)
  values(v_company,p_employee_id,p_start_date,p_end_date,p_days,nullif(trim(p_reason),''),'PENDING')
  returning id into v_id;
  return v_id;
end;
$function$;

-- Keep employee directory reads aligned with the table-level role scope.
create or replace function public.list_my_employees()
returns table(
  id uuid,
  employee_code text,
  full_name text,
  email text,
  phone text,
  department_id uuid,
  position_id uuid,
  hire_date date,
  status text
)
language sql
stable security definer
set search_path to 'public','private','pg_catalog'
as $function$
  select e.id,e.employee_code,e.full_name,e.email,e.phone,e.department_id,e.position_id,e.hire_date,e.status
  from public.employees e
  where e.company_id = private.current_profile_company_id()
    and (
      private.is_company_admin_or_hr()
      or e.id = private.current_employee_id()
      or (private.is_manager() and e.manager_id = private.current_employee_id())
    )
  order by e.full_name;
$function$;

-- Integration processing is operationally privileged; do not expose its errors to regular employees.
create or replace function public.list_my_event_processing(p_limit integer default 100)
returns setof public.event_processing
language plpgsql
security definer
set search_path to 'public','private','pg_catalog'
as $function$
declare
  v_role text := private.current_profile_role();
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if private.current_profile_company_id() is null then raise exception 'PROFILE_NOT_FOUND'; end if;
  if v_role not in ('SUPER_ADMIN','COMPANY_ADMIN','RH') then raise exception 'NOT_AUTHORIZED'; end if;
  return query
    select ep.*
    from public.event_processing ep
    where ep.company_id = private.current_profile_company_id()
    order by ep.created_at desc
    limit greatest(1,least(coalesce(p_limit,100),500));
end;
$function$;

-- Billing visibility is an administrative concern; employee accounts do not need plan metadata.
create or replace function public.get_my_billing()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public','private','pg_catalog'
as $function$
declare
  s public.subscriptions;
  p public.subscription_plans;
  cid uuid;
  active_count integer;
  overdue boolean;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  cid := private.current_profile_company_id();
  if cid is null then raise exception 'PROFILE_NOT_FOUND'; end if;
  if private.current_profile_role() not in ('SUPER_ADMIN','COMPANY_ADMIN','RH') then
    raise exception 'NOT_AUTHORIZED';
  end if;
  select * into s from public.subscriptions where company_id = cid;
  if s.id is null then raise exception 'SUBSCRIPTION_NOT_FOUND'; end if;
  select * into p from public.subscription_plans where id = s.plan_id;
  select count(*) into active_count from public.employees where company_id = cid and status='ACTIVE';
  overdue := s.status in ('past_due','canceled','incomplete','paused');
  return jsonb_build_object(
    'company_id',cid,'subscription_id',s.id,'status',s.status,'plan_code',p.code,'plan_name',p.name,
    'max_employees',s.max_employees,'active_employees',active_count,
    'usage_percent',round((active_count::numeric/greatest(s.max_employees,1))*100,1),
    'renewal_at',s.renewal_at,'trial_ends_at',s.trial_ends_at,'cancel_at_period_end',s.cancel_at_period_end,
    'billing_blocked',overdue OR active_count >= s.max_employees,'features',p.features,
    'monthly_price_cents',p.monthly_price_cents
  );
end;
$function$;

commit;
