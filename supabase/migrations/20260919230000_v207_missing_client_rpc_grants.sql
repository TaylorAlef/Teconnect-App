-- v207: restore authenticated grants for RH operations that are part of the client UI.
begin;

grant execute on function public.create_candidate_app(uuid,text,text,text,text,text) to authenticated;
grant execute on function public.create_interview_app(uuid,timestamptz,uuid) to authenticated;
grant execute on function public.create_vacation_request_app(uuid,date,date,numeric,text) to authenticated;
grant execute on function public.update_company_settings_app(text,integer[],integer,time,time,integer) to authenticated;

revoke execute on function public.create_candidate_app(uuid,text,text,text,text,text) from anon,public;
revoke execute on function public.create_interview_app(uuid,timestamptz,uuid) from anon,public;
revoke execute on function public.create_vacation_request_app(uuid,date,date,numeric,text) from anon,public;
revoke execute on function public.update_company_settings_app(text,integer[],integer,time,time,integer) from anon,public;

commit;
