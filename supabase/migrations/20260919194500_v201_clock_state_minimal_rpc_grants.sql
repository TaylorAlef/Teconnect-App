do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure::text as signature
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where p.prosecdef=true
      and n.nspname='public'
  loop
    execute format('revoke execute on function %s from authenticated, anon, public', r.signature);
  end loop;
end $$;

grant execute on function public.approve_overtime_record(uuid,boolean) to authenticated;
grant execute on function public.approve_vacation_request(uuid,boolean) to authenticated;
grant execute on function public.get_my_clock_state() to authenticated;
grant execute on function public.register_time_entry(text,uuid,double precision,double precision,double precision,text) to authenticated;
