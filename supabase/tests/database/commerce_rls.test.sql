begin;

create extension if not exists pgtap with schema extensions;
select plan(20);

select has_table('public', 'seller_fulfillment', 'seller fulfillment exists');
select has_table('public', 'commerce_orders', 'commerce orders exists');
select has_table('public', 'shipments', 'shipments exists');
select has_table('public', 'provider_events', 'provider events exists');
select policies_are(
  'public',
  'commerce_orders',
  array['Buyers and sellers can read their orders'],
  'commerce orders has only the party-read policy'
);
select policies_are(
  'public',
  'shipments',
  array['Order parties can read shipment status'],
  'shipments has only the party-read policy'
);
select ok(has_table_privilege('authenticated', 'public.commerce_orders', 'SELECT'), 'authenticated parties can select orders');
select ok(not has_table_privilege('authenticated', 'public.commerce_orders', 'INSERT'), 'browser clients cannot insert orders');
select ok(not has_table_privilege('authenticated', 'public.commerce_orders', 'UPDATE'), 'browser clients cannot update order state');
select ok(not has_table_privilege('authenticated', 'public.provider_events', 'SELECT'), 'provider payloads are not browser-readable');
select ok(
  not has_function_privilege('authenticated', 'public.finalize_paid_commerce_order(uuid,text)', 'EXECUTE'),
  'browser clients cannot finalize payments'
);
select ok(
  has_function_privilege('service_role', 'public.finalize_paid_commerce_order(uuid,text)', 'EXECUTE'),
  'only the service role can finalize payments'
);

insert into auth.users (id, email) values
  ('81111111-1111-4111-8111-111111111111', 'commerce.buyer@test.example'),
  ('82222222-2222-4222-8222-222222222222', 'commerce.seller@test.example'),
  ('83333333-3333-4333-8333-333333333333', 'commerce.stranger@test.example');
insert into public.profiles (id, handle, name) values
  ('81111111-1111-4111-8111-111111111111', '@commerce.buyer', 'Commerce Buyer'),
  ('82222222-2222-4222-8222-222222222222', '@commerce.seller', 'Commerce Seller'),
  ('83333333-3333-4333-8333-333333333333', '@commerce.stranger', 'Commerce Stranger');
insert into public.listings (id, seller_id, title, price_inr, category, condition)
values (
  '84444444-4444-4444-8444-444444444444',
  '82222222-2222-4222-8222-222222222222',
  'Commerce listing',
  1000,
  'vintage',
  'good'
);
insert into public.commerce_orders (
  id, listing_id, buyer_id, seller_id, item_price_inr, platform_fee_inr,
  shipping_fee_inr, total_inr, shipping_address
) values (
  '85555555-5555-4555-8555-555555555555',
  '84444444-4444-4444-8444-444444444444',
  '81111111-1111-4111-8111-111111111111',
  '82222222-2222-4222-8222-222222222222',
  1000, 15, 85, 1100,
  '{"name":"Buyer","phone":"9876543210","email":"buyer@test.example","line1":"1 Test Rd","line2":"","city":"Mumbai","state":"Maharashtra","postalCode":"400001","country":"India"}'
);
insert into public.shipments (order_id) values ('85555555-5555-4555-8555-555555555555');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"81111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
select is((select count(*)::int from public.commerce_orders), 1, 'buyer can read their order');
select is((select count(*)::int from public.shipments), 1, 'buyer can read their shipment');

select set_config('request.jwt.claims', '{"sub":"82222222-2222-4222-8222-222222222222","role":"authenticated"}', true);
select is((select count(*)::int from public.commerce_orders), 1, 'seller can read their order');
select is((select count(*)::int from public.shipments), 1, 'seller can read their shipment');

select set_config('request.jwt.claims', '{"sub":"83333333-3333-4333-8333-333333333333","role":"authenticated"}', true);
select is((select count(*)::int from public.commerce_orders), 0, 'stranger cannot read the order');
select is((select count(*)::int from public.shipments), 0, 'stranger cannot read the shipment');

reset role;
select is(
  public.finalize_paid_commerce_order(
    '85555555-5555-4555-8555-555555555555',
    'pay_test_123'
  ),
  'paid',
  'service-side finalization marks a live listing order paid'
);
select is(
  (select status from public.listings where id = '84444444-4444-4444-8444-444444444444'),
  'sold',
  'payment finalization atomically marks the listing sold'
);

select * from finish();
rollback;
