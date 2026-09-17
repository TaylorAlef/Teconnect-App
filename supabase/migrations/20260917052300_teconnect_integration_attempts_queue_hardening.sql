begin;

alter table public.integration_jobs
  add column if not exists next_attempt_at timestamptz not null default now(),
  add column if not exists last_http_status integer,
  add column if not exists idempotency_key text not null default gen_random_uuid()::text;

create unique index if not exists uq_integration_jobs_company_idempotency on public.integration_jobs(company_id,idempotency_key);
create index if not exists idx_integration_jobs_ready on public.integration_jobs(status,next_attempt_at,created_at);

create table if not exists public.integration_job_attempts (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.integration_jobs(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  attempt_no integer not null,
  status text not null,
  http_status integer,
  error text,
  response_excerpt text,
  created_at timestamptz not null default now()
);

alter table public.integration_job_attempts enable row level security;
drop policy if exists integration_job_attempts_select on public.integration_job_attempts;
create policy integration_job_attempts_select on public.integration_job_attempts for select to authenticated using (company_id=(select private.current_profile_company_id()) and (select private.is_company_admin_or_hr()));
revoke all on public.integration_job_attempts from anon;
revoke all on public.integration_job_attempts from authenticated;
grant select on public.integration_job_attempts to authenticated;
create index if not exists idx_integration_job_attempts_job_id on public.integration_job_attempts(job_id,created_at desc);
create index if not exists idx_integration_job_attempts_company_created on public.integration_job_attempts(company_id,created_at desc);

create or replace function public.prevent_integration_attempt_mutation()
returns trigger language plpgsql security definer
set search_path to 'public','private','pg_temp'
as $function$
begin
  raise exception 'INTEGRATION_ATTEMPTS_APPEND_ONLY';
end;
$function$;
revoke all on function public.prevent_integration_attempt_mutation() from public,anon,authenticated;

drop trigger if exists trg_integration_attempts_immutable on public.integration_job_attempts;
create trigger trg_integration_attempts_immutable before update or delete on public.integration_job_attempts for each row execute function public.prevent_integration_attempt_mutation();

commit;
