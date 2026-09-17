begin;

-- QA production cleanup: remove only redundant permissive policies.
-- These policies were proven identical/subsumed and caused overlapping-policy
-- planning overhead without changing the intended company/role access model.

drop policy if exists audit_logs_select on public.audit_logs;

drop policy if exists departments_same_company_insert on public.departments;
drop policy if exists departments_same_company_select on public.departments;
drop policy if exists positions_same_company_insert on public.positions;
drop policy if exists positions_same_company_select on public.positions;
drop policy if exists assignments_same_company_insert on public.shift_assignments;
drop policy if exists assignments_same_company_select on public.shift_assignments;
drop policy if exists shifts_same_company_insert on public.shifts;
drop policy if exists shifts_same_company_select on public.shifts;
drop policy if exists locations_same_company_insert on public.work_locations;
drop policy if exists locations_same_company_select on public.work_locations;
drop policy if exists notifications_select on public.notifications;
drop policy if exists notifications_own on public.notifications;
drop policy if exists notifications_update on public.notifications;

commit;
