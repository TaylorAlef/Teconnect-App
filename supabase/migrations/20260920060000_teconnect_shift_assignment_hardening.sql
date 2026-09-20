-- TE-Connect: harden employee shift assignment
create or replace function public.assign_shift(
  p_employee_id uuid,
  p_shift_id uuid,
  p_start_date date,
  p_end_date date default null
)
returns public.shift_assignments
language plpgsql
security invoker
set search_path to 'public','private','pg_catalog'
as $function$
declare
  v_company uuid;
  v_row public.shift_assignments;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  v_company := private.current_profile_company_id();
  if v_company is null then raise exception 'PROFILE_NOT_FOUND'; end if;
  if private.current_profile_role() not in ('SUPER_ADMIN','COMPANY_ADMIN','RH','GESTOR','SUPERVISOR') then raise exception 'NOT_AUTHORIZED'; end if;
  if p_start_date is null then raise exception 'START_DATE_REQUIRED'; end if;
  if p_end_date is not null and p_end_date < p_start_date then raise exception 'INVALID_ASSIGNMENT_PERIOD'; end if;
  if not exists (select 1 from public.employees where id=p_employee_id and company_id=v_company and status='ACTIVE') then raise exception 'EMPLOYEE_NOT_FOUND'; end if;
  if not exists (select 1 from public.shifts where id=p_shift_id and company_id=v_company and active=true) then raise exception 'SHIFT_NOT_FOUND'; end if;
  if exists (
    select 1 from public.shift_assignments sa
    where sa.company_id=v_company
      and sa.employee_id=p_employee_id
      and daterange(sa.start_date, coalesce(sa.end_date,'infinity'::date), '[]')
          && daterange(p_start_date, coalesce(p_end_date,'infinity'::date), '[]')
  ) then raise exception 'SHIFT_ASSIGNMENT_OVERLAP'; end if;
  insert into public.shift_assignments(company_id,employee_id,shift_id,start_date,end_date)
  values(v_company,p_employee_id,p_shift_id,p_start_date,p_end_date)
  returning * into v_row;
  return v_row;
end;
$function$;

revoke execute on function public.assign_shift(uuid,uuid,date,date) from anon, public;
grant execute on function public.assign_shift(uuid,uuid,date,date) to authenticated;
