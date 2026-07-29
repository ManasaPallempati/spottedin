-- Run with `supabase test db` after all migrations have been applied.
begin;

create extension if not exists pgtap with schema extensions;
select plan(24);

select has_table('public', 'listings', 'listings table exists');
select col_is_pk('public', 'listings', 'id', 'listings.id is the primary key');
select col_is_fk('public', 'listings', 'seller_id', 'seller_id references profiles');
select has_index(
  'public',
  'listings',
  'listings_live_created_at_idx',
  'live feed has a created-at index'
);
select policies_are(
  'public',
  'listings',
  array[
    'Live listings are public and owners can see all their listings',
    'Users can create their own listings',
    'Users can update their own listings',
    'Users can delete their own listings'
  ],
  'listings has only the reviewed RLS policies'
);

select ok(has_table_privilege('anon', 'public.listings', 'SELECT'), 'anon can read public listings');
select ok(not has_table_privilege('anon', 'public.listings', 'INSERT'), 'anon cannot insert listings');
select ok(not has_table_privilege('anon', 'public.listings', 'UPDATE'), 'anon cannot update listings');
select ok(has_column_privilege('authenticated', 'public.listings', 'title', 'INSERT'), 'authenticated users can insert title');
select ok(not has_column_privilege('authenticated', 'public.listings', 'likes', 'INSERT'), 'likes cannot be supplied on insert');
select ok(not has_column_privilege('authenticated', 'public.listings', 'likes', 'UPDATE'), 'likes cannot be directly updated');
select ok(not has_column_privilege('authenticated', 'public.listings', 'seller_id', 'UPDATE'), 'seller ownership cannot be transferred');

select is(
  (select public from storage.buckets where id = 'listing-images'),
  true,
  'listing image bucket is public'
);
select is(
  (select file_size_limit from storage.buckets where id = 'listing-images'),
  8388608::bigint,
  'listing image bucket enforces the 8 MB limit'
);
select policies_are(
  'storage',
  'objects',
  array[
    'Listing images are publicly readable',
    'Users can delete listing images in their folder',
    'Users can update listing images in their folder',
    'Users can upload listing images to their folder'
  ],
  'storage objects has only the reviewed project policies'
);

insert into auth.users (id, email)
values
  ('31111111-1111-4111-8111-111111111111', 'listing.owner.one@test.example'),
  ('32222222-2222-4222-8222-222222222222', 'listing.owner.two@test.example');

insert into public.profiles (id, handle, name)
values
  ('31111111-1111-4111-8111-111111111111', '@listing.one', 'Listing Owner One'),
  ('32222222-2222-4222-8222-222222222222', '@listing.two', 'Listing Owner Two');

insert into public.listings (
  id, seller_id, title, price_inr, category, condition, status
) values
  (
    '41111111-1111-4111-8111-111111111111',
    '31111111-1111-4111-8111-111111111111',
    'Owner one live item',
    1200,
    'women',
    'good',
    'live'
  ),
  (
    '42222222-2222-4222-8222-222222222222',
    '32222222-2222-4222-8222-222222222222',
    'Owner two sold item',
    900,
    'vintage',
    'fair',
    'sold'
  );

select throws_ok(
  $$insert into public.listings (seller_id, title, price_inr, category, condition, image_path)
    values (
      '31111111-1111-4111-8111-111111111111',
      'Bad image path',
      100,
      'home',
      'good',
      '32222222-2222-4222-8222-222222222222/stolen.webp'
    )$$,
  '23514',
  null,
  'listing image path must stay under the seller folder'
);
select throws_ok(
  $$insert into public.listings (seller_id, title, price_inr, category, condition)
    values (
      '31111111-1111-4111-8111-111111111111',
      'Bad category',
      100,
      'vehicles',
      'good'
    )$$,
  '23514',
  null,
  'invalid categories are rejected'
);

set local role anon;
select is(
  (select count(*)::int from public.listings),
  1,
  'anonymous users see live listings but not sold listings'
);
select throws_ok(
  $$insert into public.listings (seller_id, title, price_inr, category, condition)
    values (
      '31111111-1111-4111-8111-111111111111',
      'Anonymous item',
      100,
      'home',
      'good'
    )$$,
  '42501',
  null,
  'anonymous listing inserts are denied'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"31111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);

select is(
  (select count(*)::int from public.listings),
  1,
  'an authenticated user cannot read another seller sold listing'
);
select throws_ok(
  $$insert into public.listings (seller_id, title, price_inr, category, condition)
    values (
      '32222222-2222-4222-8222-222222222222',
      'Spoofed owner',
      100,
      'home',
      'good'
    )$$,
  '42501',
  null,
  'a user cannot create a listing for another seller'
);
select results_eq(
  $$update public.listings
    set title = 'Cross-user write'
    where id = '42222222-2222-4222-8222-222222222222'
    returning id$$,
  $$select null::uuid where false$$,
  'a user cannot update another seller listing'
);
select results_eq(
  $$update public.listings
    set title = 'Owner edit'
    where id = '41111111-1111-4111-8111-111111111111'
    returning id$$,
  $$values ('41111111-1111-4111-8111-111111111111'::uuid)$$,
  'a user can update their own listing'
);
select results_eq(
  $$delete from public.listings
    where id = '42222222-2222-4222-8222-222222222222'
    returning id$$,
  $$select null::uuid where false$$,
  'a user cannot delete another seller listing'
);

select * from finish();
rollback;
