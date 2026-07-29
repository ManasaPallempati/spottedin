-- Run with `supabase test db` after all migrations have been applied.
begin;

create extension if not exists pgtap with schema extensions;
select plan(46);

select has_table('public', 'favorites', 'favorites table exists');
select has_table('public', 'conversations', 'conversations table exists');
select has_table('public', 'conversation_members', 'conversation_members table exists');
select has_table('public', 'messages', 'messages table exists');
select col_is_pk('public', 'favorites', array['user_id', 'listing_id'], 'favorites has a composite primary key');
select col_is_pk(
  'public',
  'conversation_members',
  array['conversation_id', 'user_id'],
  'conversation members has a composite primary key'
);
select col_is_fk('public', 'favorites', 'listing_id', 'favorites reference listings');
select col_is_fk('public', 'messages', 'conversation_id', 'messages reference conversations');

select policies_are(
  'public',
  'favorites',
  array[
    'Users can create their own favorites',
    'Users can delete their own favorites',
    'Users can read their own favorites'
  ],
  'favorites has only the reviewed RLS policies'
);
select policies_are(
  'public',
  'conversations',
  array['Members can read their conversations'],
  'conversations has only the reviewed RLS policy'
);
select policies_are(
  'public',
  'conversation_members',
  array['Users can read only their own memberships'],
  'conversation members has only the reviewed RLS policy'
);
select policies_are(
  'public',
  'messages',
  array[
    'Members can read conversation messages',
    'Members can send messages as themselves'
  ],
  'messages has only the reviewed RLS policies'
);

select ok(not has_table_privilege('anon', 'public.favorites', 'SELECT'), 'anon cannot read favorites');
select ok(has_table_privilege('authenticated', 'public.favorites', 'SELECT'), 'authenticated users can read permitted favorites');
select ok(not has_table_privilege('authenticated', 'public.favorites', 'UPDATE'), 'favorites cannot be updated');
select ok(has_table_privilege('authenticated', 'public.conversations', 'SELECT'), 'authenticated users can read permitted conversations');
select ok(not has_table_privilege('authenticated', 'public.conversations', 'INSERT'), 'clients cannot insert conversations directly');
select ok(not has_table_privilege('authenticated', 'public.conversation_members', 'INSERT'), 'clients cannot add conversation members directly');
select ok(
  has_column_privilege('authenticated', 'public.messages', 'body', 'INSERT'),
  'authenticated members can insert message bodies'
);
select ok(not has_table_privilege('authenticated', 'public.messages', 'UPDATE'), 'messages are immutable');
select ok(
  has_function_privilege('authenticated', 'public.start_conversation(uuid)', 'EXECUTE'),
  'authenticated users can call the conversation RPC'
);
select ok(
  not has_function_privilege('anon', 'public.start_conversation(uuid)', 'EXECUTE'),
  'anonymous users cannot call the conversation RPC'
);

insert into auth.users (id, email)
values
  ('51111111-1111-4111-8111-111111111111', 'social.buyer@test.example'),
  ('52222222-2222-4222-8222-222222222222', 'social.seller@test.example'),
  ('53333333-3333-4333-8333-333333333333', 'social.stranger@test.example');

insert into public.profiles (id, handle, name)
values
  ('51111111-1111-4111-8111-111111111111', '@social.buyer', 'Social Buyer'),
  ('52222222-2222-4222-8222-222222222222', '@social.seller', 'Social Seller'),
  ('53333333-3333-4333-8333-333333333333', '@social.stranger', 'Social Stranger');

insert into public.listings (id, seller_id, title, price_inr, category, condition)
values (
  '61111111-1111-4111-8111-111111111111',
  '52222222-2222-4222-8222-222222222222',
  'Social test listing',
  1500,
  'vintage',
  'good'
);

insert into public.favorites (user_id, listing_id)
values (
  '53333333-3333-4333-8333-333333333333',
  '61111111-1111-4111-8111-111111111111'
);

set local role anon;
select is((select count(*)::int from public.conversations), 0, 'anonymous users cannot read conversations');
select is((select count(*)::int from public.messages), 0, 'anonymous users cannot read messages');

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"51111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);

select lives_ok(
  $$insert into public.favorites (user_id, listing_id)
    values (
      '51111111-1111-4111-8111-111111111111',
      '61111111-1111-4111-8111-111111111111'
    )$$,
  'a user can favorite a listing for themselves'
);
select is(
  (
    select likes
    from public.listings
    where id = '61111111-1111-4111-8111-111111111111'
  ),
  2,
  'creating a favorite increments the public listing count'
);
select throws_ok(
  $$insert into public.favorites (user_id, listing_id)
    values (
      '52222222-2222-4222-8222-222222222222',
      '61111111-1111-4111-8111-111111111111'
    )$$,
  '42501',
  null,
  'a user cannot favorite a listing for someone else'
);
select is((select count(*)::int from public.favorites), 1, 'a user reads only their own favorites');
select lives_ok(
  $$delete from public.favorites
    where user_id = '51111111-1111-4111-8111-111111111111'
      and listing_id = '61111111-1111-4111-8111-111111111111'$$,
  'a user can remove their own favorite'
);
select is(
  (
    select likes
    from public.listings
    where id = '61111111-1111-4111-8111-111111111111'
  ),
  1,
  'removing a favorite decrements the public listing count'
);

select set_config(
  'test.conversation_id',
  public.start_conversation('61111111-1111-4111-8111-111111111111')::text,
  true
);
select ok(
  current_setting('test.conversation_id')::uuid is not null,
  'a buyer can start a conversation about a live listing'
);
select is((select count(*)::int from public.conversations), 1, 'the buyer can read the conversation');
select is((select count(*)::int from public.conversation_members), 1, 'the buyer reads only their membership row');
select is(
  (
    select count(*)::int
    from public.conversation_members
    where user_id = '51111111-1111-4111-8111-111111111111'
  ),
  1,
  'the buyer is a conversation member'
);
select is(
  public.start_conversation('61111111-1111-4111-8111-111111111111'),
  current_setting('test.conversation_id')::uuid,
  'starting the same listing conversation is idempotent'
);
select throws_ok(
  $$insert into public.messages (conversation_id, sender_id, body)
    values (
      current_setting('test.conversation_id')::uuid,
      '52222222-2222-4222-8222-222222222222',
      'spoofed sender'
    )$$,
  '42501',
  null,
  'a member cannot spoof another sender'
);
select lives_ok(
  $$insert into public.messages (conversation_id, sender_id, body)
    values (
      current_setting('test.conversation_id')::uuid,
      '51111111-1111-4111-8111-111111111111',
      'Is this available?'
    )$$,
  'a member can send a message as themselves'
);
select is((select count(*)::int from public.messages), 1, 'the buyer can read the sent message');

select set_config(
  'request.jwt.claims',
  '{"sub":"53333333-3333-4333-8333-333333333333","role":"authenticated"}',
  true
);
select is((select count(*)::int from public.conversations), 0, 'a stranger cannot read the conversation');
select is((select count(*)::int from public.messages), 0, 'a stranger cannot read its messages');
select throws_ok(
  $$insert into public.messages (conversation_id, sender_id, body)
    values (
      current_setting('test.conversation_id')::uuid,
      '53333333-3333-4333-8333-333333333333',
      'intrusion'
    )$$,
  '42501',
  null,
  'a stranger cannot send into the conversation'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"52222222-2222-4222-8222-222222222222","role":"authenticated"}',
  true
);
select is((select count(*)::int from public.conversations), 1, 'the seller can read the conversation');
select is((select count(*)::int from public.conversation_members), 1, 'the seller reads only their membership row');
select is((select count(*)::int from public.messages), 1, 'the seller can read the buyer message');
select lives_ok(
  $$insert into public.messages (conversation_id, sender_id, body)
    values (
      current_setting('test.conversation_id')::uuid,
      '52222222-2222-4222-8222-222222222222',
      'Yes, it is available.'
    )$$,
  'the seller can reply as themselves'
);
select throws_ok(
  $$select public.start_conversation('61111111-1111-4111-8111-111111111111')$$,
  '22023',
  null,
  'a seller cannot start a conversation with themselves'
);

select * from finish();
rollback;
