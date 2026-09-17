begin;

update public.companies
set name = case
  when id = 'b8eccfb7-1ea4-4b0b-a978-3f18acdbaf6a' then 'TE-CONNECT'
  when id = '11111111-1111-4111-8111-111111111111' then 'TE-CONNECT LAB A'
  when id = '22222222-2222-4222-8222-222222222222' then 'TE-CONNECT LAB B'
  else name
end,
email = case
  when id = 'b8eccfb7-1ea4-4b0b-a978-3f18acdbaf6a' then 'admin@te-connect.com'
  when id = '11111111-1111-4111-8111-111111111111' then 'lab-a@te-connect.test'
  when id = '22222222-2222-4222-8222-222222222222' then 'lab-b@te-connect.test'
  else email
end
where id in ('b8eccfb7-1ea4-4b0b-a978-3f18acdbaf6a','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222');

update public.employees
set email = case
  when id = '11111111-1111-4111-8111-444444444444' then 'lab-a@te-connect.test'
  when id = '22222222-2222-4222-8222-555555555555' then 'lab-b@te-connect.test'
  else email
end
where id in ('11111111-1111-4111-8111-444444444444','22222222-2222-4222-8222-555555555555');

update public.profiles
set full_name = 'TE-CONNECT Admin'
where id = '4f1d66c2-d380-400c-953a-7444b2cfc9e4';

commit;
