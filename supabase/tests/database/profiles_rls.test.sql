-- Run with `supabase test db`. Seeds real auth.users rows (standard hosted
-- schema) so foreign keys and cascade behavior are exercised for real.
begin;

create extension if not exists pgtap with schema extensions;
select plan(27);

-- Schema shape -------------------------------------------------------------

select has_table('public', 'profiles', 'profiles table exists');
select col_is_pk('public', 'profiles', 'id', 'profiles.id is the primary key');
select col_is_fk('public', 'profiles', 'id', 'profiles.id is a foreign key to auth.users');
select has_index(
  'public',
  'profiles',
  'profiles_handle_ci_unique',
  'case-insensitive unique handle index exists'
);
select policies_are(
  'public',
  'profiles',
  array[
    'Public profiles are viewable',
    'Users can insert own profile',
    'Users can update own profile'
  ],
  'profiles has only the reviewed RLS policies'
);

-- Grants -------------------------------------------------------------------

select ok(
  has_table_privilege('anon', 'public.profiles', 'SELECT'),
  'anonymous visitors can read public profiles'
);
select ok(
  not has_table_privilege('anon', 'public.profiles', 'INSERT'),
  'anonymous visitors cannot insert profiles'
);
select ok(
  not has_table_privilege('anon', 'public.profiles', 'UPDATE'),
  'anonymous visitors cannot update profiles'
);
select ok(
  not has_table_privilege('anon', 'public.profiles', 'DELETE'),
  'anonymous visitors cannot delete profiles'
);
select ok(
  not has_table_privilege('authenticated', 'public.profiles', 'DELETE'),
  'authenticated users cannot delete profiles'
);
select ok(
  not has_column_privilege('authenticated', 'public.profiles', 'rating', 'UPDATE'),
  'rating is protected from authenticated updates'
);
select ok(
  not has_column_privilege('authenticated', 'public.profiles', 'sales', 'UPDATE'),
  'sales is protected from authenticated updates'
);
select ok(
  not has_column_privilege('authenticated', 'public.profiles', 'rating', 'INSERT'),
  'rating cannot be set at insert by authenticated users'
);
select ok(
  not has_column_privilege('authenticated', 'public.profiles', 'sales', 'INSERT'),
  'sales cannot be set at insert by authenticated users'
);
select ok(
  has_column_privilege('authenticated', 'public.profiles', 'handle', 'UPDATE'),
  'authenticated users can update their handle column'
);

-- Seed two verified users and their profiles (as the test superuser, which
-- bypasses RLS). owner.one gets a backdated updated_at so the trigger test
-- can detect the refresh.
insert into auth.users (id, email)
values
  ('11111111-1111-4111-8111-111111111111', 'owner.one@test.example'),
  ('22222222-2222-4222-8222-222222222222', 'owner.two@test.example');

insert into public.profiles (id, handle, name, updated_at)
values ('11111111-1111-4111-8111-111111111111', '@owner.one', 'Owner One', now() - interval '1 day');
insert into public.profiles (id, handle, name)
values ('22222222-2222-4222-8222-222222222222', '@owner.two', 'Owner Two');

-- Constraints --------------------------------------------------------------

select throws_ok(
  $$insert into public.profiles (id, handle, name)
    values ('33333333-3333-4333-8333-333333333333', 'BadHandle', 'Bad Handle')$$,
  '23514', null,
  'handle format constraint rejects handles without @ or with uppercase'
);
select throws_ok(
  $$update public.profiles set rating = 5.5
    where id = '22222222-2222-4222-8222-222222222222'$$,
  '23514', null,
  'rating must stay within 0–5'
);
select throws_ok(
  $$update public.profiles set sales = -1
    where id = '22222222-2222-4222-8222-222222222222'$$,
  '23514', null,
  'sales cannot go negative'
);
select throws_ok(
  $$insert into public.profiles (id, handle, name)
    values ('33333333-3333-4333-8333-333333333333', '@owner.one', 'Handle Thief')$$,
  '23505', null,
  'duplicate handles are rejected by the unique index'
);

-- RLS as an authenticated user (owner.one) ---------------------------------

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);

select throws_ok(
  $$insert into public.profiles (id, handle, name)
    values ('44444444-4444-4444-8444-444444444444', '@spoofed.seller', 'Spoofed')$$,
  '42501', null,
  'a user cannot insert a profile under another identity'
);
select results_eq(
  $$update public.profiles
    set bio = 'cross-user write'
    where id = '22222222-2222-4222-8222-222222222222'
    returning id$$,
  $$select null::uuid where false$$,
  'a user cannot update another profile'
);
select results_eq(
  $$update public.profiles
    set bio = 'owner write'
    where id = '11111111-1111-4111-8111-111111111111'
    returning id$$,
  $$values ('11111111-1111-4111-8111-111111111111'::uuid)$$,
  'a user can update their own profile'
);
select is(
  (select updated_at from public.profiles where id = '11111111-1111-4111-8111-111111111111'),
  now(),
  'updating a profile refreshes updated_at via trigger'
);
select throws_ok(
  $$delete from public.profiles
    where id = '11111111-1111-4111-8111-111111111111'$$,
  '42501', null,
  'even the owner cannot delete their profile row directly'
);

-- RLS as an anonymous visitor ----------------------------------------------

set local role anon;
select is(
  (select count(*)::int from public.profiles),
  2,
  'anonymous visitors can read all profiles under RLS'
);
select throws_ok(
  $$insert into public.profiles (id, handle, name)
    values ('55555555-5555-4555-8555-555555555555', '@anon.writer', 'Anon')$$,
  '42501', null,
  'anonymous inserts are denied'
);

-- Lifecycle ----------------------------------------------------------------

reset role;
delete from auth.users where id = '22222222-2222-4222-8222-222222222222';
select ok(
  not exists (
    select 1 from public.profiles
    where id = '22222222-2222-4222-8222-222222222222'
  ),
  'profiles cascade-delete with their auth user'
);

select * from finish();
rollback;
