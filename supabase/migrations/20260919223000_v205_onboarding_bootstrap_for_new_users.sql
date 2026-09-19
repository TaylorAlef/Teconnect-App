-- v205: allow authenticated users without a profile/company to enter onboarding.
-- Existing company users still require an allowed HR role.

create or replace function public.get_my_onboarding_v1()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_user uuid := auth.uid();
  v_company uuid;
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
    return jsonb_build_object(
      'has_company', false,
      'current_step', 1,
      'completed_steps', '[]'::jsonb
    );
  end if;

  if private.current_profile_role() not in ('SUPER_ADMIN','COMPANY_ADMIN','RH') then
    raise exception 'NOT_AUTHORIZED';
  end if;

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
    'checks', jsonb_build_object(
      'company', true,
      'department', v_departments > 0,
      'location', v_locations > 0,
      'shift', v_shifts > 0,
      'employee', v_employees > 0
    )
  );
end;
$function$;

revoke execute on function public.get_my_onboarding_v1() from anon, public;
grant execute on function public.get_my_onboarding_v1() to authenticated;
