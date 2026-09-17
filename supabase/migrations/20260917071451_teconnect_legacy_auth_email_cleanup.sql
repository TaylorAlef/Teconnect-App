begin;

-- Legacy test account branding cleanup. Changes only the old test login identifier.
update auth.users
set email = 'admin@te-connect.com', updated_at = now()
where id = '4f1d66c2-d380-400c-953a-7444b2cfc9e4';

update auth.identities
set identity_data = jsonb_set(identity_data, '{email}', to_jsonb('admin@te-connect.com'::text), true)
where user_id = '4f1d66c2-d380-400c-953a-7444b2cfc9e4'
  and provider = 'email';

commit;
