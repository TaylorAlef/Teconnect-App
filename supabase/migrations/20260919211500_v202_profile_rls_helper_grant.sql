-- v202: restore the authenticated RLS helper grant used by profiles policies.
-- The helper remains private and unavailable to anon/public roles.
grant usage on schema private to authenticated;
grant execute on function private.current_profile_company_id() to authenticated;
revoke execute on function private.current_profile_company_id() from anon, public;
