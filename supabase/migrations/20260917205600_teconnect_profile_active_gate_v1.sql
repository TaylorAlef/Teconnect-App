CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS TABLE(user_id uuid,company_id uuid,full_name text,role text,active boolean)
LANGUAGE sql STABLE SET search_path TO 'public','private','pg_catalog'
AS $function$
  select p.id,p.company_id,p.full_name,p.role::text,p.active
  from public.profiles p
  where p.id=auth.uid() and p.active=true
  limit 1;
$function$;
REVOKE ALL ON FUNCTION public.get_my_profile() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;
