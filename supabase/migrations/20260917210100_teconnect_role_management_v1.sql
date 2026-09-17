BEGIN;
CREATE OR REPLACE FUNCTION public.set_profile_role_app(p_user_id uuid,p_role text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','private','pg_catalog'
AS $function$
declare v_company uuid:=private.current_profile_company_id(); v_actor text:=private.current_profile_role(); v_target text:=upper(trim(p_role)); v_target_company uuid;
begin
 if auth.uid() is null or v_company is null then raise exception 'AUTH_REQUIRED'; end if;
 if v_target not in ('EMPLOYEE','GESTOR','SUPERVISOR','RH','COMPANY_ADMIN') then raise exception 'INVALID_ROLE'; end if;
 select company_id into v_target_company from public.profiles where id=p_user_id and active=true limit 1;
 if v_target_company is null or v_target_company<>v_company then raise exception 'USER_NOT_IN_COMPANY'; end if;
 if v_actor='RH' and v_target not in ('EMPLOYEE','GESTOR','SUPERVISOR') then raise exception 'FORBIDDEN'; end if;
 if v_actor='COMPANY_ADMIN' and v_target='COMPANY_ADMIN' then raise exception 'FORBIDDEN'; end if;
 if v_actor not in ('SUPER_ADMIN','COMPANY_ADMIN','RH') then raise exception 'FORBIDDEN'; end if;
 update public.profiles set role=v_target where id=p_user_id and company_id=v_company;
 return found;
end;$function$;
REVOKE ALL ON FUNCTION public.set_profile_role_app(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_profile_role_app(uuid,text) TO authenticated;
COMMIT;
