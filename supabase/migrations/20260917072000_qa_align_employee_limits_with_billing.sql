begin;

create or replace function public.enforce_company_employee_limit()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_catalog
as $$
declare
  v_limit integer;
  v_status text;
begin
  if tg_op = 'INSERT' and coalesce(new.status, 'ACTIVE') = 'ACTIVE' then
    select s.max_employees, s.status
      into v_limit, v_status
    from public.subscriptions as s
    where s.company_id = new.company_id
    order by s.created_at desc
    limit 1;

    if v_limit is not null and v_status not in ('past_due','canceled','incomplete','paused') then
      if (select count(*) from public.employees where company_id = new.company_id and status = 'ACTIVE') >= v_limit then
        raise exception 'PLAN_EMPLOYEE_LIMIT_REACHED';
      end if;
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.create_employee_app(
  p_employee_code text,
  p_full_name text,
  p_email text default null,
  p_phone text default null,
  p_nif text default null,
  p_hire_date date default current_date
)
returns public.employees
language plpgsql
set search_path = public, private, pg_catalog
as $$
declare
  v_company uuid;
  v_employee public.employees;
  v_limit integer;
  v_status text;
  v_active integer;
begin
  if auth.uid() is null then raise exception 'AUTENTICACAO_NECESSARIA'; end if;
  v_company := private.current_profile_company_id();
  if v_company is null then raise exception 'PROFILE_NOT_FOUND'; end if;
  if private.current_profile_role() not in ('SUPER_ADMIN','COMPANY_ADMIN','RH') then raise exception 'NOT_AUTHORIZED'; end if;
  if nullif(btrim(p_full_name),'') is null then raise exception 'FULL_NAME_REQUIRED'; end if;
  if nullif(btrim(p_employee_code),'') is null then raise exception 'EMPLOYEE_CODE_REQUIRED'; end if;

  select s.max_employees, s.status
    into v_limit, v_status
  from public.subscriptions as s
  where s.company_id = v_company
  order by s.created_at desc
  limit 1;

  if v_limit is null then raise exception 'SUBSCRIPTION_REQUIRED'; end if;
  if v_status in ('past_due','canceled','incomplete','paused') then raise exception 'BILLING_PAST_DUE'; end if;

  select count(*)::integer into v_active
  from public.employees as e
  where e.company_id = v_company and e.status = 'ACTIVE';

  if v_active >= v_limit then raise exception 'PLAN_EMPLOYEE_LIMIT_REACHED'; end if;

  if exists(
    select 1 from public.employees as e
    where e.company_id = v_company
      and lower(e.employee_code) = lower(trim(p_employee_code))
  ) then
    raise exception 'EMPLOYEE_CODE_ALREADY_EXISTS';
  end if;

  insert into public.employees(
    company_id, employee_code, full_name, email, phone, nif, hire_date, status
  ) values (
    v_company,
    trim(p_employee_code),
    trim(p_full_name),
    nullif(trim(p_email), ''),
    nullif(trim(p_phone), ''),
    nullif(trim(p_nif), ''),
    coalesce(p_hire_date, current_date),
    'ACTIVE'
  )
  returning * into v_employee;

  return v_employee;
end;
$$;

commit;
