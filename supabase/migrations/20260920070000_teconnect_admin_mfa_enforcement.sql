create schema if not exists private;

create or replace function private.teconnect_admin_mfa_pre_request()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_path text;
  caller_id uuid;
  caller_role text;
  caller_aal text;
begin
  if coalesce(auth.role(), '') <> 'authenticated' then
    return;
  end if;

  request_path := coalesce(current_setting('request.path', true), '');
  if position('get_my_profile' in request_path) > 0 then
    return;
  end if;

  caller_id := auth.uid();
  caller_aal := coalesce(auth.jwt() ->> 'aal', 'aal1');

  select p.role
    into caller_role
  from public.profiles p
  where p.id = caller_id
  limit 1;

  if caller_role in ('SUPER_ADMIN', 'COMPANY_ADMIN', 'RH')
     and caller_aal <> 'aal2' then
    raise sqlstate 'PGRST' using
      message = json_build_object(
        'code', 'MFA_REQUIRED',
        'message', 'MFA obrigatória para contas administrativas do Te-connect.',
        'details', 'Conclua a verificação TOTP antes de continuar.',
        'hint', 'Volte ao acesso do Te-connect e conclua a autenticação multifator.'
      )::text,
      detail = json_build_object(
        'status', 403,
        'status_text', 'Forbidden'
      )::text;
  end if;
end;
$$;

revoke execute on function private.teconnect_admin_mfa_pre_request() from public;
grant usage on schema private to authenticator;
grant execute on function private.teconnect_admin_mfa_pre_request() to anon, authenticated, authenticator;

alter role authenticator
  set pgrst.db_pre_request = 'private.teconnect_admin_mfa_pre_request';

notify pgrst, 'reload config';