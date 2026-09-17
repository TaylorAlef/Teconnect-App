update public.subscription_plans
set stripe_price_id = case code
  when 'STARTER' then 'price_1UGZHxQmcxsmACrZxwEYYZZa'
  when 'BUSINESS' then 'price_1UGZI4QmcxsmACrZOZkuTTir'
  when 'ENTERPRISE' then 'price_1UGZIBQmcxsmACrZjuTmAPZv'
  else stripe_price_id
end
where code in ('STARTER','BUSINESS','ENTERPRISE');
