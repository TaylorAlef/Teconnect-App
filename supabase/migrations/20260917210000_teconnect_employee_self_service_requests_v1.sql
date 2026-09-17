BEGIN;
CREATE OR REPLACE FUNCTION public.create_my_absence_request(p_start_date date,p_end_date date,p_reason text DEFAULT NULL,p_absence_type_id uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','private','pg_catalog'
AS $function$
declare v_company uuid:=private.current_profile_company_id(); v_employee uuid:=private.current_employee_id(); v_id uuid;
begin
 if auth.uid() is null or v_company is null or v_employee is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_start_date is null or p_end_date is null or p_end_date<p_start_date then raise exception 'INVALID_DATES'; end if;
 if p_absence_type_id is not null and not exists(select 1 from public.absence_types where id=p_absence_type_id and company_id=v_company and active=true) then raise exception 'ABSENCE_TYPE_NOT_FOUND'; end if;
 insert into public.absences(company_id,employee_id,absence_type_id,start_date,end_date,reason,status) values(v_company,v_employee,p_absence_type_id,p_start_date,p_end_date,nullif(trim(p_reason),''),'PENDING') returning id into v_id;
 return v_id;
end;$function$;
REVOKE ALL ON FUNCTION public.create_my_absence_request(date,date,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_my_absence_request(date,date,text,uuid) TO authenticated;
COMMIT;
