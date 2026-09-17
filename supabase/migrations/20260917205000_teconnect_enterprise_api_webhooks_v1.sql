BEGIN;

CREATE TABLE IF NOT EXISTS public.app_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  key_prefix text NOT NULL,
  secret_hash text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS app_api_keys_secret_hash_uidx ON public.app_api_keys(secret_hash);
CREATE INDEX IF NOT EXISTS app_api_keys_company_idx ON public.app_api_keys(company_id, active, created_at DESC);

CREATE TABLE IF NOT EXISTS public.webhook_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  url text NOT NULL,
  secret text NOT NULL,
  events text[] NOT NULL DEFAULT ARRAY['employee.created','employee.updated','attendance.updated','vacation.updated','payroll.updated'],
  active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_delivery_at timestamptz,
  last_status integer
);
CREATE INDEX IF NOT EXISTS webhook_endpoints_company_idx ON public.webhook_endpoints(company_id, active, created_at DESC);

CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  endpoint_id uuid NOT NULL REFERENCES public.webhook_endpoints(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','DELIVERED','FAILED')),
  http_status integer,
  response_excerpt text,
  attempt integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz
);
CREATE INDEX IF NOT EXISTS webhook_deliveries_endpoint_idx ON public.webhook_deliveries(endpoint_id, created_at DESC);
CREATE INDEX IF NOT EXISTS webhook_deliveries_company_idx ON public.webhook_deliveries(company_id, created_at DESC);

ALTER TABLE public.app_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_api_keys_select ON public.app_api_keys;
DROP POLICY IF EXISTS app_api_keys_manage ON public.app_api_keys;
CREATE POLICY app_api_keys_select ON public.app_api_keys FOR SELECT TO authenticated USING (company_id=private.current_profile_company_id() AND private.is_company_admin_or_hr());
CREATE POLICY app_api_keys_manage ON public.app_api_keys FOR ALL TO authenticated USING (company_id=private.current_profile_company_id() AND private.is_company_admin_or_hr()) WITH CHECK (company_id=private.current_profile_company_id() AND private.is_company_admin_or_hr());

DROP POLICY IF EXISTS webhook_endpoints_select ON public.webhook_endpoints;
DROP POLICY IF EXISTS webhook_endpoints_manage ON public.webhook_endpoints;
CREATE POLICY webhook_endpoints_select ON public.webhook_endpoints FOR SELECT TO authenticated USING (company_id=private.current_profile_company_id() AND private.is_company_admin_or_hr());
CREATE POLICY webhook_endpoints_manage ON public.webhook_endpoints FOR ALL TO authenticated USING (company_id=private.current_profile_company_id() AND private.is_company_admin_or_hr()) WITH CHECK (company_id=private.current_profile_company_id() AND private.is_company_admin_or_hr());

DROP POLICY IF EXISTS webhook_deliveries_select ON public.webhook_deliveries;
CREATE POLICY webhook_deliveries_select ON public.webhook_deliveries FOR SELECT TO authenticated USING (company_id=private.current_profile_company_id() AND private.is_company_admin_or_hr());

CREATE OR REPLACE FUNCTION public.create_api_key_app(p_name text, p_expires_at timestamptz DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','private','pg_catalog'
AS $function$
declare v_company uuid:=private.current_profile_company_id(); v_secret text; v_id uuid; v_prefix text;
begin
 if auth.uid() is null or v_company is null or not private.is_company_admin_or_hr() then raise exception 'FORBIDDEN'; end if;
 if nullif(trim(p_name),'') is null then raise exception 'NAME_REQUIRED'; end if;
 if p_expires_at is not null and p_expires_at <= now() then raise exception 'INVALID_EXPIRATION'; end if;
 v_secret:='tc_live_'||encode(gen_random_bytes(24),'hex');
 v_prefix:=left(v_secret,17);
 insert into public.app_api_keys(company_id,name,key_prefix,secret_hash,created_by,expires_at) values(v_company,trim(p_name),v_prefix,encode(digest(v_secret,'sha256'),'hex'),auth.uid(),p_expires_at) returning id into v_id;
 return jsonb_build_object('id',v_id,'name',trim(p_name),'key_prefix',v_prefix,'secret',v_secret,'expires_at',p_expires_at);
end;
$function$;

CREATE OR REPLACE FUNCTION public.revoke_api_key_app(p_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','private','pg_catalog'
AS $function$
declare v_company uuid:=private.current_profile_company_id();
begin
 if auth.uid() is null or v_company is null or not private.is_company_admin_or_hr() then raise exception 'FORBIDDEN'; end if;
 update public.app_api_keys set active=false,revoked_at=coalesce(revoked_at,now()) where id=p_id and company_id=v_company;
 return found;
end;
$function$;

CREATE OR REPLACE FUNCTION public.resolve_api_key_internal(p_secret_hash text)
RETURNS TABLE(id uuid,company_id uuid,active boolean,expires_at timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path TO 'public','pg_catalog'
AS $function$
 select k.id,k.company_id,k.active,k.expires_at from public.app_api_keys k where k.secret_hash=p_secret_hash limit 1;
$function$;

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
 insert into public.webhook_endpoints(company_id,name,url,secret,events,created_by) values(v_company,trim(p_name),trim(p_url),v_secret,v_events,auth.uid()) returning id into v_id;
 return jsonb_build_object('id',v_id,'name',trim(p_name),'url',trim(p_url),'events',v_events,'secret',v_secret);
end;
$function$;

CREATE OR REPLACE FUNCTION public.revoke_webhook_endpoint_app(p_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','private','pg_catalog'
AS $function$
declare v_company uuid:=private.current_profile_company_id();
begin
 if auth.uid() is null or v_company is null or not private.is_company_admin_or_hr() then raise exception 'FORBIDDEN'; end if;
 update public.webhook_endpoints set active=false where id=p_id and company_id=v_company; return found;
end;
$function$;

CREATE OR REPLACE FUNCTION public.update_company_settings_app(p_timezone text DEFAULT 'Europe/Lisbon',p_work_week_days integer[] DEFAULT NULL,p_default_gps_radius_m integer DEFAULT 200,p_night_start time DEFAULT '22:00',p_night_end time DEFAULT '06:00',p_absenteeism_risk_days integer DEFAULT 3)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','private','pg_catalog'
AS $function$
declare v_company uuid:=private.current_profile_company_id(); v_row public.company_settings; v_days integer[];
begin
 if auth.uid() is null or v_company is null or not private.is_company_admin_or_hr() then raise exception 'FORBIDDEN'; end if;
 if p_timezone is null or trim(p_timezone)='' then raise exception 'TIMEZONE_REQUIRED'; end if;
 v_days:=coalesce(p_work_week_days,ARRAY[1,2,3,4,5]);
 if array_length(v_days,1) is null or exists(select 1 from unnest(v_days) x where x<0 or x>6) then raise exception 'INVALID_WORK_WEEK'; end if;
 if coalesce(p_default_gps_radius_m,0)<50 or p_default_gps_radius_m>5000 then raise exception 'INVALID_GPS_RADIUS'; end if;
 if coalesce(p_absenteeism_risk_days,0)<1 or p_absenteeism_risk_days>365 then raise exception 'INVALID_ABSENCE_RISK'; end if;
 insert into public.company_settings(company_id,timezone,work_week_days,default_gps_radius_m,night_start,night_end,absenteeism_risk_days) values(v_company,trim(p_timezone),v_days,p_default_gps_radius_m,p_night_start,p_night_end,p_absenteeism_risk_days)
 on conflict(company_id) do update set timezone=excluded.timezone,work_week_days=excluded.work_week_days,default_gps_radius_m=excluded.default_gps_radius_m,night_start=excluded.night_start,night_end=excluded.night_end,absenteeism_risk_days=excluded.absenteeism_risk_days returning * into v_row;
 return to_jsonb(v_row);
end;
$function$;

REVOKE ALL ON FUNCTION public.resolve_api_key_internal(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_api_key_internal(text) TO service_role;
REVOKE ALL ON FUNCTION public.create_api_key_app(text,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_api_key_app(text,timestamptz) TO authenticated;
REVOKE ALL ON FUNCTION public.revoke_api_key_app(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.revoke_api_key_app(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.create_webhook_endpoint_app(text,text,text[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_webhook_endpoint_app(text,text,text[]) TO authenticated;
REVOKE ALL ON FUNCTION public.revoke_webhook_endpoint_app(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.revoke_webhook_endpoint_app(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.update_company_settings_app(text,integer[],integer,time,time,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.update_company_settings_app(text,integer[],integer,time,time,integer) TO authenticated;

COMMIT;
