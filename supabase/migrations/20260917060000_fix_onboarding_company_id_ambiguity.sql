-- Fix: qualify profile.company_id in onboarding to avoid collision with RETURNS TABLE(company_id ...).
create or replace function public.create_company_onboarding(
  p_company_name text,
  p_nif text default null,
  p_phone text default null,
  p_address text default null
)
returns table(company_id uuid, user_id uuid, full_name text, role text)
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing_company uuid;
  v_company_id uuid;
  v_plan_id uuid;
  v_name text;
  v_role text := 'COMPANY_ADMIN';
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  v_name := nullif(trim(p_company_name), '');
  if v_name is null then
    raise exception 'COMPANY_NAME_REQUIRED';
  end if;

  select pr.company_id into v_existing_company
  from public.profiles as pr
  where pr.id = v_user_id
  limit 1;

  if v_existing_company is not null then
    raise exception 'COMPANY_ALREADY_ASSOCIATED';
  end if;

  insert into public.companies(name, nif, phone, address, active, billing_status, billing_blocked)
  values (
    v_name,
    nullif(trim(p_nif), ''),
    nullif(trim(p_phone), ''),
    nullif(trim(p_address), ''),
    true,
    'trial',
    false
  )
  returning id into v_company_id;

  insert into public.profiles(id, company_id, full_name, role, active)
  values (
    v_user_id,
    v_company_id,
    coalesce(
      nullif(trim(auth.jwt() ->> 'name'), ''),
      nullif(trim(auth.jwt() ->> 'email'), ''),
      'Administrador'
    ),
    v_role,
    true
  )
  on conflict (id) do update
    set company_id = excluded.company_id,
        role = excluded.role,
        active = true,
        full_name = coalesce(nullif(public.profiles.full_name, ''), excluded.full_name);

  select sp.id into v_plan_id
  from public.subscription_plans as sp
  where sp.code = 'STARTER' and sp.active = true
  limit 1;

  if v_plan_id is null then
    raise exception 'STARTER_PLAN_NOT_FOUND';
  end if;

  insert into public.subscriptions(
    company_id, plan_id, status, max_employees, trial_ends_at, renewal_at
  )
  select
    v_company_id,
    sp.id,
    'trial',
    sp.max_employees,
    now() + interval '14 days',
    now() + interval '14 days'
  from public.subscription_plans as sp
  where sp.id = v_plan_id
  on conflict (company_id) do nothing;

  return query
  select pr.company_id, pr.id, pr.full_name, pr.role::text
  from public.profiles as pr
  where pr.id = v_user_id;
end;
$$;

grant execute on function public.create_company_onboarding(text,text,text,text) to authenticated;
revoke execute on function public.create_company_onboarding(text,text,text,text) from anon;
