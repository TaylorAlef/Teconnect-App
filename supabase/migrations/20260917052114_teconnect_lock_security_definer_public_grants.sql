begin;

do $$
declare r record;
begin
  for r in select p.oid,p.proname,pg_get_function_identity_arguments(p.oid) args
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.prosecdef loop
    execute format('revoke execute on function public.%I(%s) from public',r.proname,r.args);
    execute format('grant execute on function public.%I(%s) to authenticated',r.proname,r.args);
  end loop;
end $$;

revoke execute on function public.audit_hr_task_changes() from authenticated,anon;
revoke execute on function public.enforce_company_employee_limit() from authenticated,anon;
revoke execute on function public.enforce_employee_subscription_limit() from authenticated,anon;
revoke execute on function public.generate_hr_alerts() from authenticated,anon;
revoke execute on function public.queue_attendance_integration() from authenticated,anon;
revoke execute on function public.queue_payroll_integration() from authenticated,anon;
revoke execute on function public.sync_company_billing_status() from authenticated,anon;
revoke execute on function public.system_process_event_batch(integer) from authenticated,anon;
revoke execute on function public.recover_stale_event_processing() from authenticated,anon;
revoke execute on function public.refresh_attendance_day(uuid,date) from authenticated,anon;
revoke execute on function public.refresh_timesheet(uuid,integer,integer) from authenticated,anon;
revoke execute on function public.registar_picagem_segura(bigint,text,text,text,double precision,double precision) from authenticated,anon;
revoke execute on function public.verificar_pin_funcionario(bigint,text) from authenticated,anon;

commit;
