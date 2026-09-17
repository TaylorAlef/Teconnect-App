BEGIN;
CREATE TABLE IF NOT EXISTS public.webhook_endpoint_credentials (
  endpoint_id uuid PRIMARY KEY REFERENCES public.webhook_endpoints(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  secret text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.webhook_endpoint_credentials(endpoint_id,company_id,secret)
SELECT id,company_id,secret FROM public.webhook_endpoints
ON CONFLICT(endpoint_id) DO NOTHING;
ALTER TABLE public.webhook_endpoint_credentials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS webhook_endpoint_credentials_no_client_access ON public.webhook_endpoint_credentials;
CREATE POLICY webhook_endpoint_credentials_no_client_access ON public.webhook_endpoint_credentials FOR ALL TO authenticated USING (false) WITH CHECK (false);
REVOKE ALL ON public.webhook_endpoint_credentials FROM anon,authenticated,public;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.webhook_endpoint_credentials TO service_role;
ALTER TABLE public.webhook_endpoints DROP COLUMN IF EXISTS secret;

CREATE OR REPLACE FUNCTION public.create_webhook_endpoint_app(p_name text,p_url text,p_events text[] DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','private','pg_catalog'
AS $function$
declare v_company uuid:=private.current_profile_company_id(); v_secret text; v_id uuid; v_events text[];
begin
 if auth.uid() is null or v_company is null or not private.is_company_admin_or_hr() then raise exception 'FORBIDDEN'; end if;
 if nullif(trim(p_name),'') is null then raise exception 'NAME_REQUIRED'; end if;
 if p_url !~ '^https://.+' then raise exception 'HTTPS_REQUIRED'; end if;
 v_events:=coalesce(nullif(array_remove(coalesce(p_events,'{}'::text[]),''),'{}'::text[]),ARRAY['employee.created','employee.updated']);
 v_secret:='whsec_'||encode(gen_random_bytes(24),'hex');
 insert into public.webhook_endpoints(company_id,name,url,events,created_by) values(v_company,trim(p_name),trim(p_url),v_events,auth.uid()) returning id into v_id;
 insert into public.webhook_endpoint_credentials(endpoint_id,company_id,secret) values(v_id,v_company,v_secret);
 return jsonb_build_object('id',v_id,'name',trim(p_name),'url',trim(p_url),'events',v_events,'secret',v_secret);
end;
$function$;
COMMIT;
