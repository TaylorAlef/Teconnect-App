BEGIN;

-- Remove residual public SELECT policies from privileged HR operational tables.
DROP POLICY IF EXISTS hr_alerts_select ON public.hr_alerts;
DROP POLICY IF EXISTS hr_tasks_select ON public.hr_tasks;
DROP POLICY IF EXISTS payroll_runs_select ON public.payroll_runs;

CREATE POLICY hr_alerts_select
  ON public.hr_alerts FOR SELECT TO authenticated
  USING (
    company_id = (SELECT private.current_profile_company_id())
    AND (SELECT private.is_company_admin_or_hr())
  );

CREATE POLICY hr_tasks_select
  ON public.hr_tasks FOR SELECT TO authenticated
  USING (
    company_id = (SELECT private.current_profile_company_id())
    AND (SELECT private.is_company_admin_or_hr())
  );

CREATE POLICY payroll_runs_select
  ON public.payroll_runs FOR SELECT TO authenticated
  USING (
    company_id = (SELECT private.current_profile_company_id())
    AND (SELECT private.is_company_admin_or_hr())
  );

-- Align UPDATE WITH CHECK with the same tenant + role boundary as USING.
DROP POLICY IF EXISTS hr_alerts_update ON public.hr_alerts;
CREATE POLICY hr_alerts_update
  ON public.hr_alerts FOR UPDATE TO authenticated
  USING (
    company_id = (SELECT private.current_profile_company_id())
    AND (SELECT private.is_company_admin_or_hr())
  )
  WITH CHECK (
    company_id = (SELECT private.current_profile_company_id())
    AND (SELECT private.is_company_admin_or_hr())
  );

DROP POLICY IF EXISTS hr_tasks_update ON public.hr_tasks;
CREATE POLICY hr_tasks_update
  ON public.hr_tasks FOR UPDATE TO authenticated
  USING (
    company_id = (SELECT private.current_profile_company_id())
    AND (SELECT private.is_company_admin_or_hr())
  )
  WITH CHECK (
    company_id = (SELECT private.current_profile_company_id())
    AND (SELECT private.is_company_admin_or_hr())
  );

DROP POLICY IF EXISTS payroll_runs_update ON public.payroll_runs;
CREATE POLICY payroll_runs_update
  ON public.payroll_runs FOR UPDATE TO authenticated
  USING (
    company_id = (SELECT private.current_profile_company_id())
    AND (SELECT private.is_company_admin_or_hr())
  )
  WITH CHECK (
    company_id = (SELECT private.current_profile_company_id())
    AND (SELECT private.is_company_admin_or_hr())
  );

-- Remove residual anonymous EXECUTE grants from legacy application RPCs.
REVOKE ALL ON FUNCTION public.create_absence_app(uuid,date,date,text,uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.create_absence_app(uuid,date,date,text,uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.create_competency_app(uuid,text,text,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.create_competency_app(uuid,text,text,text) TO authenticated;

REVOKE ALL ON FUNCTION public.create_document_app(uuid,text,text,date,date,text,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.create_document_app(uuid,text,text,date,date,text,text) TO authenticated;

REVOKE ALL ON FUNCTION public.create_recruitment_job_app(text,uuid,uuid,text,text,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.create_recruitment_job_app(text,uuid,uuid,text,text,text) TO authenticated;

REVOKE ALL ON FUNCTION public.create_training_course_app(text,text,numeric) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.create_training_course_app(text,text,numeric) TO authenticated;

-- Trigger-only functions must not be callable as RPC endpoints.
REVOKE ALL ON FUNCTION public.refresh_payroll_run_totals() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_hr_task_updated_at() FROM public, anon, authenticated;

COMMIT;
