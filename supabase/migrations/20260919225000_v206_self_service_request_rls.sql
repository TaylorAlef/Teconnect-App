-- v206: allow employees to create their own self-service requests.
-- Keep company/manager/admin controls and tenant isolation intact.

begin;

alter policy vacation_requests_insert on public.vacation_requests
with check (
  company_id = private.current_profile_company_id()
  and (
    private.is_company_admin_or_hr()
    or private.is_self_employee(employee_id)
    or (private.is_manager() and private.is_managed_employee(employee_id))
  )
  and exists (
    select 1 from public.employees e
    where e.id = vacation_requests.employee_id
      and e.company_id = private.current_profile_company_id()
  )
);

alter policy absences_insert on public.absences
with check (
  company_id = private.current_profile_company_id()
  and (
    private.is_company_admin_or_hr()
    or private.is_self_employee(employee_id)
    or (private.is_manager() and private.is_managed_employee(employee_id))
  )
  and exists (
    select 1 from public.employees e
    where e.id = absences.employee_id
      and e.company_id = private.current_profile_company_id()
  )
);

alter policy overtime_insert on public.overtime_records
with check (
  company_id = private.current_profile_company_id()
  and (
    private.is_company_admin_or_hr()
    or private.is_self_employee(employee_id)
    or (private.is_manager() and private.is_managed_employee(employee_id))
  )
  and exists (
    select 1 from public.employees e
    where e.id = overtime_records.employee_id
      and e.company_id = private.current_profile_company_id()
  )
);

commit;
