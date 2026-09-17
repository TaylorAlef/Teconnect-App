-- Te-connect performance hardening
-- Covers the FK indexes flagged by the Supabase performance advisor and
-- avoids per-row re-evaluation of auth/profile helpers in selected RLS policies.

create index if not exists idx_app_api_keys_created_by on public.app_api_keys(created_by);
create index if not exists idx_employee_invitations_employee_id on public.employee_invitations(employee_id);
create index if not exists idx_employee_invitations_invited_by on public.employee_invitations(invited_by);
create index if not exists idx_performance_cycles_created_by on public.performance_cycles(created_by);
create index if not exists idx_performance_development_plans_created_by on public.performance_development_plans(created_by);
create index if not exists idx_performance_development_plans_cycle_id on public.performance_development_plans(cycle_id);
create index if not exists idx_performance_development_plans_employee_id on public.performance_development_plans(employee_id);
create index if not exists idx_performance_feedback_author_user_id on public.performance_feedback(author_user_id);
create index if not exists idx_performance_feedback_employee_id on public.performance_feedback(employee_id);
create index if not exists idx_performance_goals_created_by on public.performance_goals(created_by);
create index if not exists idx_performance_goals_cycle_id on public.performance_goals(cycle_id);
create index if not exists idx_performance_goals_employee_id on public.performance_goals(employee_id);
create index if not exists idx_performance_reviews_employee_id on public.performance_reviews(employee_id);
create index if not exists idx_performance_reviews_reviewer_id on public.performance_reviews(reviewer_id);
create index if not exists idx_webhook_endpoint_credentials_company_id on public.webhook_endpoint_credentials(company_id);
create index if not exists idx_webhook_endpoints_created_by on public.webhook_endpoints(created_by);

alter policy profiles_select_own_or_company on public.profiles
  using ((id = (select auth.uid())) or (company_id = (select private.current_profile_company_id())));

alter policy notifications_mark_read on public.notifications
  using ((user_id = (select auth.uid())) and (company_id = (select private.current_profile_company_id())))
  with check ((user_id = (select auth.uid())) and (company_id = (select private.current_profile_company_id())));

alter policy notifications_select_scoped on public.notifications
  using ((company_id = (select private.current_profile_company_id())) and ((user_id = (select auth.uid())) or (private.current_profile_role() = any (array['SUPER_ADMIN'::text,'COMPANY_ADMIN'::text,'RH'::text]))));

alter policy onboarding_progress_insert on public.onboarding_progress
  with check ((company_id = (select private.current_profile_company_id())) and ((user_id = (select auth.uid())) or (private.current_profile_role() = any (array['SUPER_ADMIN'::text,'COMPANY_ADMIN'::text,'RH'::text]))));

alter policy onboarding_progress_update on public.onboarding_progress
  using ((company_id = (select private.current_profile_company_id())) and ((user_id = (select auth.uid())) or (private.current_profile_role() = any (array['SUPER_ADMIN'::text,'COMPANY_ADMIN'::text,'RH'::text]))))
  with check ((company_id = (select private.current_profile_company_id())) and ((user_id = (select auth.uid())) or (private.current_profile_role() = any (array['SUPER_ADMIN'::text,'COMPANY_ADMIN'::text,'RH'::text]))));
