begin;

-- Canonical runtime branding: TE-CONNECT.
-- Rename the only live scheduler identifier that still used the legacy brand.
select cron.unschedule(3);
select cron.schedule('teconnect_event_processor','*/5 * * * *','select public.system_process_event_batch(100)');

create or replace function public.get_production_readiness()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $function$
declare
  core_ok boolean;
  attendance_ok boolean;
  clock_ok boolean;
  vacation_ok boolean;
  event_ok boolean;
  audit_ok boolean;
  realtime_ok boolean;
  scheduler_ok boolean;
begin
  if private.current_profile_role() not in ('SUPER_ADMIN','COMPANY_ADMIN','RH') then
    raise exception 'SEM_PERMISSAO';
  end if;
  core_ok := to_regclass('public.companies') is not null
    and to_regclass('public.profiles') is not null
    and to_regclass('public.employees') is not null
    and to_regclass('public.time_entries') is not null
    and to_regclass('public.attendance_days') is not null
    and to_regclass('public.timesheets') is not null;
  attendance_ok := to_regclass('public.attendance_days') is not null
    and exists(select 1 from pg_proc where pronamespace='public'::regnamespace and proname='recalculate_attendance_day')
    and exists(select 1 from pg_trigger where tgname='trg_time_entry_attendance');
  clock_ok := exists(select 1 from pg_proc where pronamespace='public'::regnamespace and proname='clock_in_self')
    and exists(select 1 from pg_proc where pronamespace='public'::regnamespace and proname='get_my_active_shift');
  vacation_ok := to_regclass('public.vacation_requests') is not null
    and to_regclass('public.vacation_balances') is not null
    and exists(select 1 from pg_proc where pronamespace='public'::regnamespace and proname='create_my_vacation_request')
    and exists(select 1 from pg_proc where pronamespace='public'::regnamespace and proname='approve_vacation_request');
  event_ok := to_regclass('public.event_bus') is not null
    and to_regclass('public.event_processing') is not null
    and exists(select 1 from pg_proc where pronamespace='public'::regnamespace and proname='process_event_batch');
  audit_ok := to_regclass('public.audit_logs') is not null
    and exists(select 1 from pg_trigger where tgname in ('trg_audit_employees','trg_audit_time_entries','trg_audit_vacation_requests'));
  realtime_ok := exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='event_bus')
    and exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='notifications');
  scheduler_ok := exists(select 1 from cron.job where jobname='teconnect_event_processor' and active=true);
  return jsonb_build_object(
    'core_tables_ok',core_ok,
    'attendance_engine_ok',attendance_ok,
    'clock_engine_ok',clock_ok,
    'vacation_engine_ok',vacation_ok,
    'event_bus_ok',event_ok,
    'audit_ok',audit_ok,
    'realtime_ok',realtime_ok,
    'scheduler_ok',scheduler_ok
  );
end;
$function$;

commit;
