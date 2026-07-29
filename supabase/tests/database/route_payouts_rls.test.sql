begin;

create extension if not exists pgtap with schema extensions;
select plan(17);

select has_table('public', 'seller_payout_accounts', 'seller payout accounts exists');
select has_table('public', 'route_transfers', 'Route transfers exists');
select policies_are(
  'public',
  'seller_payout_accounts',
  array['Sellers can read their payout readiness'],
  'seller payout accounts has only the owner-read policy'
);
select policies_are(
  'public',
  'route_transfers',
  array['Sellers can read their Route transfers'],
  'Route transfers has only the seller-read policy'
);
select ok(
  not has_table_privilege('authenticated', 'public.seller_payout_accounts', 'INSERT'),
  'browser clients cannot create payout accounts'
);
select ok(
  not has_table_privilege('authenticated', 'public.seller_payout_accounts', 'UPDATE'),
  'browser clients cannot activate payout accounts'
);
select ok(
  not has_table_privilege('authenticated', 'public.route_transfers', 'INSERT'),
  'browser clients cannot create transfers'
);
select ok(
  not has_table_privilege('authenticated', 'public.route_transfers', 'UPDATE'),
  'browser clients cannot change transfers'
);
select ok(
  not has_function_privilege('authenticated', 'public.claim_route_transfer(uuid)', 'EXECUTE'),
  'browser clients cannot claim a transfer'
);
select ok(
  has_function_privilege('service_role', 'public.claim_route_transfer(uuid)', 'EXECUTE'),
  'service role can claim a transfer'
);

insert into auth.users (id, email) values
  ('91111111-1111-4111-8111-111111111111', 'route.buyer@test.example'),
  ('92222222-2222-4222-8222-222222222222', 'route.seller@test.example'),
  ('93333333-3333-4333-8333-333333333333', 'route.stranger@test.example');
insert into public.profiles (id, handle, name) values
  ('91111111-1111-4111-8111-111111111111', '@route.buyer', 'Route Buyer'),
  ('92222222-2222-4222-8222-222222222222', '@route.seller', 'Route Seller'),
  ('93333333-3333-4333-8333-333333333333', '@route.stranger', 'Route Stranger');
insert into public.listings (id, seller_id, title, price_inr, category, condition, status)
values (
  '94444444-4444-4444-8444-444444444444',
  '92222222-2222-4222-8222-222222222222',
  'Route listing',
  1200,
  'vintage',
  'good',
  'sold'
);
insert into public.commerce_orders (
  id, listing_id, buyer_id, seller_id, item_price_inr, platform_fee_inr,
  shipping_fee_inr, total_inr, status, razorpay_payment_id, shipping_address
) values (
  '95555555-5555-4555-8555-555555555555',
  '94444444-4444-4444-8444-444444444444',
  '91111111-1111-4111-8111-111111111111',
  '92222222-2222-4222-8222-222222222222',
  1200, 15, 85, 1300, 'paid', 'pay_route_test_123',
  '{"name":"Buyer","phone":"9876543210","email":"buyer@test.example","line1":"1 Test Rd","line2":"","city":"Mumbai","state":"Maharashtra","postalCode":"400001","country":"India"}'
);
insert into public.seller_payout_accounts (
  user_id, razorpay_account_id, status, transfers_enabled, activated_at
) values (
  '92222222-2222-4222-8222-222222222222',
  'acc_RouteTest1234',
  'activated',
  true,
  now()
);

select is(
  (select acquired from public.claim_route_transfer('95555555-5555-4555-8555-555555555555')),
  true,
  'first service-side claim acquires the transfer'
);
select is(
  (select amount_inr from public.route_transfers where order_id = '95555555-5555-4555-8555-555555555555'),
  1200,
  'seller proceeds equal the item price'
);
select is(
  (select acquired from public.claim_route_transfer('95555555-5555-4555-8555-555555555555')),
  false,
  'a second claim cannot acquire the same transfer'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"92222222-2222-4222-8222-222222222222","role":"authenticated"}', true);
select is((select count(*)::int from public.seller_payout_accounts), 1, 'seller can read payout readiness');
select is((select count(*)::int from public.route_transfers), 1, 'seller can read their Route transfer');

select set_config('request.jwt.claims', '{"sub":"91111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
select is((select count(*)::int from public.route_transfers), 0, 'buyer cannot read seller transfer details');

select set_config('request.jwt.claims', '{"sub":"93333333-3333-4333-8333-333333333333","role":"authenticated"}', true);
select is((select count(*)::int from public.seller_payout_accounts), 0, 'stranger cannot read payout readiness');

select * from finish();
rollback;

