begin;

alter table public.funcionarios enable row level security;
alter table public.obras enable row level security;
alter table public.picagens enable row level security;

drop policy if exists funcionarios_tenant_select on public.funcionarios;
drop policy if exists funcionarios_tenant_insert on public.funcionarios;
drop policy if exists funcionarios_tenant_update on public.funcionarios;
drop policy if exists funcionarios_tenant_delete on public.funcionarios;
create policy funcionarios_tenant_select on public.funcionarios for select to authenticated using (company_id = (select private.current_profile_company_id()));
create policy funcionarios_tenant_insert on public.funcionarios for insert to authenticated with check (company_id = (select private.current_profile_company_id()) and (select private.is_company_admin_or_hr()));
create policy funcionarios_tenant_update on public.funcionarios for update to authenticated using (company_id = (select private.current_profile_company_id()) and (select private.is_company_admin_or_hr())) with check (company_id = (select private.current_profile_company_id()));
create policy funcionarios_tenant_delete on public.funcionarios for delete to authenticated using (company_id = (select private.current_profile_company_id()) and (select private.is_company_admin_or_hr()));

drop policy if exists obras_tenant_select on public.obras;
drop policy if exists obras_tenant_insert on public.obras;
drop policy if exists obras_tenant_update on public.obras;
drop policy if exists obras_tenant_delete on public.obras;
create policy obras_tenant_select on public.obras for select to authenticated using (company_id = (select private.current_profile_company_id()));
create policy obras_tenant_insert on public.obras for insert to authenticated with check (company_id = (select private.current_profile_company_id()) and (select private.is_company_admin_or_hr()));
create policy obras_tenant_update on public.obras for update to authenticated using (company_id = (select private.current_profile_company_id()) and (select private.is_company_admin_or_hr())) with check (company_id = (select private.current_profile_company_id()));
create policy obras_tenant_delete on public.obras for delete to authenticated using (company_id = (select private.current_profile_company_id()) and (select private.is_company_admin_or_hr()));

drop policy if exists picagens_tenant_select on public.picagens;
drop policy if exists picagens_tenant_insert on public.picagens;
drop policy if exists picagens_tenant_update on public.picagens;
drop policy if exists picagens_tenant_delete on public.picagens;
create policy picagens_tenant_select on public.picagens for select to authenticated using (company_id = (select private.current_profile_company_id()));
create policy picagens_tenant_insert on public.picagens for insert to authenticated with check (
  company_id = (select private.current_profile_company_id())
  and exists (select 1 from public.funcionarios f where f.id = funcionario_id and f.company_id = (select private.current_profile_company_id()))
);
create policy picagens_tenant_update on public.picagens for update to authenticated using (company_id = (select private.current_profile_company_id())) with check (
  company_id = (select private.current_profile_company_id())
  and exists (select 1 from public.funcionarios f where f.id = funcionario_id and f.company_id = (select private.current_profile_company_id()))
);
create policy picagens_tenant_delete on public.picagens for delete to authenticated using (company_id = (select private.current_profile_company_id()) and (select private.is_company_admin_or_hr()));

revoke all on public.funcionarios from anon;
revoke all on public.obras from anon;
revoke all on public.picagens from anon;
grant select, insert, update, delete on public.funcionarios to authenticated;
grant select, insert, update, delete on public.obras to authenticated;
grant select, insert, update, delete on public.picagens to authenticated;

do $$
declare r record;
begin
  for r in select p.oid, p.proname, pg_get_function_identity_arguments(p.oid) args from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosecdef loop
    execute format('revoke execute on function public.%I(%s) from anon', r.proname, r.args);
  end loop;
end $$;

revoke execute on function public.audit_hr_task_changes() from anon, authenticated;
revoke execute on function public.enforce_company_employee_limit() from anon, authenticated;
revoke execute on function public.enforce_employee_subscription_limit() from anon, authenticated;
revoke execute on function public.generate_hr_alerts() from anon, authenticated;
revoke execute on function public.queue_attendance_integration() from anon, authenticated;
revoke execute on function public.queue_payroll_integration() from anon, authenticated;
revoke execute on function public.sync_company_billing_status() from anon, authenticated;
revoke execute on function public.system_process_event_batch(integer) from anon, authenticated;
revoke execute on function public.registar_picagem_segura(bigint,text,text,text,double precision,double precision) from anon, authenticated;
revoke execute on function public.verificar_pin_funcionario(bigint,text) from anon, authenticated;

create or replace function public.register_time_entry(
  p_event_type text,
  p_work_location_id uuid default null,
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_gps_accuracy double precision default null,
  p_device text default null
)
returns jsonb language plpgsql security definer
set search_path to 'public', 'private', 'pg_temp'
as $function$
declare
  v_uid uuid := auth.uid(); v_company uuid; v_employee uuid; v_location record;
  v_distance double precision; v_canonical text; v_id uuid; v_attendance jsonb; v_radius double precision;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select p.company_id into v_company from public.profiles p where p.id=v_uid and p.active=true limit 1;
  if v_company is null then raise exception 'PROFILE_NOT_FOUND'; end if;
  select e.id into v_employee from public.employees e where e.user_id=v_uid and e.company_id=v_company and e.status='ACTIVE' limit 1;
  if v_employee is null then raise exception 'EMPLOYEE_NOT_FOUND'; end if;
  v_canonical := case upper(coalesce(p_event_type,'')) when 'IN' then 'CLOCK_IN' when 'OUT' then 'CLOCK_OUT' when 'CLOCK_IN' then 'CLOCK_IN' when 'CLOCK_OUT' then 'CLOCK_OUT' when 'BREAK_START' then 'BREAK_START' when 'BREAK_END' then 'BREAK_END' else null end;
  if v_canonical is null then raise exception 'INVALID_EVENT_TYPE'; end if;
  if p_work_location_id is null or p_latitude is null or p_longitude is null then raise exception 'GEOLOCALIZACAO_OBRIGATORIA'; end if;
  if p_latitude not between -90 and 90 or p_longitude not between -180 and 180 then raise exception 'COORDENADAS_INVALIDAS'; end if;
  select wl.* into v_location from public.work_locations wl where wl.id=p_work_location_id and wl.company_id=v_company and wl.active=true;
  if not found then raise exception 'WORK_LOCATION_NOT_FOUND'; end if;
  if v_location.latitude is null or v_location.longitude is null then raise exception 'LOCAL_SEM_COORDENADAS'; end if;
  v_radius := greatest(1, coalesce(v_location.gps_radius_m,100));
  v_distance := 6371000*2*asin(sqrt(power(sin(radians(p_latitude-v_location.latitude)/2),2)+cos(radians(p_latitude))*cos(radians(v_location.latitude))*power(sin(radians(p_longitude-v_location.longitude)/2),2)));
  if v_distance >= v_radius then raise exception 'FORA_DO_RAIO: %m (raio %m)',round(v_distance::numeric,1),round(v_radius::numeric,1); end if;
  if v_canonical='CLOCK_IN' and exists(select 1 from public.time_entries te where te.employee_id=v_employee and te.company_id=v_company and te.validation_status='VALID' and te.event_type='CLOCK_IN' and te.occurred_at>now()-interval '36 hours' and not exists(select 1 from public.time_entries tx where tx.employee_id=te.employee_id and tx.company_id=te.company_id and tx.validation_status='VALID' and tx.event_type='CLOCK_OUT' and tx.occurred_at>te.occurred_at and tx.occurred_at<=now()+interval '5 minutes')) then raise exception 'ENTRADA_JA_ABERTA'; end if;
  if v_canonical='CLOCK_OUT' and not exists(select 1 from public.time_entries te where te.employee_id=v_employee and te.company_id=v_company and te.validation_status='VALID' and te.event_type='CLOCK_IN' and te.occurred_at>now()-interval '36 hours' and not exists(select 1 from public.time_entries tx where tx.employee_id=te.employee_id and tx.company_id=te.company_id and tx.validation_status='VALID' and tx.event_type='CLOCK_OUT' and tx.occurred_at>te.occurred_at and tx.occurred_at<=now()+interval '5 minutes')) then raise exception 'NAO_EXISTE_ENTRADA_ABERTA'; end if;
  insert into public.time_entries(company_id,employee_id,work_location_id,event_type,occurred_at,latitude,longitude,gps_accuracy,device,validation_status) values(v_company,v_employee,p_work_location_id,v_canonical,now(),p_latitude,p_longitude,p_gps_accuracy,p_device,'VALID') returning id into v_id;
  perform public.recalculate_attendance_day(v_employee,(now() at time zone 'Europe/Lisbon')::date);
  select to_jsonb(ad) into v_attendance from public.attendance_days ad where ad.employee_id=v_employee and ad.work_date=(now() at time zone 'Europe/Lisbon')::date;
  return jsonb_build_object('id',v_id,'status','VALID','event_type',v_canonical,'distance_m',round(v_distance::numeric,2),'radius_m',v_radius,'employee_id',v_employee,'attendance',v_attendance);
end;
$function$;

create index if not exists idx_hr_alerts_employee_id on public.hr_alerts(employee_id);
create index if not exists idx_hr_tasks_completed_by on public.hr_tasks(completed_by);
create index if not exists idx_hr_tasks_created_by on public.hr_tasks(created_by);
create index if not exists idx_hr_tasks_employee_id on public.hr_tasks(employee_id);
create index if not exists idx_hr_tasks_source_alert_id on public.hr_tasks(source_alert_id);
create index if not exists idx_hr_task_audit_task_id on public.hr_task_audit(task_id);
create index if not exists idx_payroll_runs_approved_by on public.payroll_runs(approved_by);
create index if not exists idx_payroll_runs_created_by on public.payroll_runs(created_by);
create index if not exists idx_payroll_items_employee_id on public.payroll_items(employee_id);
create index if not exists idx_employees_company_status on public.employees(company_id,status);
create index if not exists idx_time_entries_company_employee_occurred on public.time_entries(company_id,employee_id,occurred_at desc);
create index if not exists idx_attendance_days_company_date on public.attendance_days(company_id,work_date desc);
create index if not exists idx_hr_alerts_company_status_created on public.hr_alerts(company_id,status,created_at desc);
create index if not exists idx_hr_tasks_company_status_due on public.hr_tasks(company_id,status,due_at);
create index if not exists idx_payroll_runs_company_period on public.payroll_runs(company_id,period_year desc,period_month desc);

do $$
declare t text;
begin
  foreach t in array array['employees','time_entries','attendance_days','vacation_requests','overtime_records','timesheet_adjustments','hr_alerts','hr_tasks','hr_task_audit','payroll_runs','payroll_items','notifications','integration_jobs','shift_assignments','shifts','picagens'] loop
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then
      execute format('alter publication supabase_realtime add table public.%I',t);
    end if;
  end loop;
end $$;

commit;
