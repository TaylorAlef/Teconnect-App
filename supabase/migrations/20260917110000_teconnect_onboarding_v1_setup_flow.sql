-- Teconnect P0: end-to-end company setup flow.
-- Keeps onboarding progress server-side and derives readiness from real tenant data.

create or replace function public.get_my_onboarding_v1()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, private, pg_catalog
as $$
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
    return jsonb_build_object('has_company', false, 'current_step', 1, 'completed_steps', '[]'::jsonb);
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
$$;

create or replace function public.save_onboarding_v1_progress(
  p_current_step integer,
  p_completed_steps jsonb default '[]'::jsonb
)
returns public.onboarding_progress
language plpgsql
security definer
set search_path = public, private, pg_catalog
as $$
declare
  v_user uuid := auth.uid();
  v_company uuid;
  v_row public.onboarding_progress;
  v_steps jsonb;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  v_company := private.current_profile_company_id();
  if v_company is null then raise exception 'PROFILE_NOT_FOUND'; end if;
  if private.current_profile_role() not in ('SUPER_ADMIN','COMPANY_ADMIN','RH') then raise exception 'NOT_AUTHORIZED'; end if;
  if p_current_step < 1 or p_current_step > 6 then raise exception 'INVALID_ONBOARDING_STEP'; end if;
  v_steps := case when jsonb_typeof(coalesce(p_completed_steps, '[]'::jsonb)) = 'array' then coalesce(p_completed_steps, '[]'::jsonb) else '[]'::jsonb end;

  insert into public.onboarding_progress(company_id, user_id, current_step, completed_steps, completed_at)
  values(v_company, v_user, p_current_step, v_steps, null)
  on conflict (company_id) do update set
    user_id = excluded.user_id,
    current_step = excluded.current_step,
    completed_steps = excluded.completed_steps,
    completed_at = case when p_current_step >= 6 then coalesce(public.onboarding_progress.completed_at, now()) else null end,
    updated_at = now()
  returning * into v_row;
  return v_row;
end;
$$;

grant execute on function public.get_my_onboarding_v1() to authenticated;
grant execute on function public.save_onboarding_v1_progress(integer, jsonb) to authenticated;
