create table public.favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create index favorites_listing_id_idx
  on public.favorites (listing_id);

alter table public.favorites enable row level security;

revoke all on table public.favorites from anon, authenticated;
grant select on table public.favorites to authenticated;
grant insert (user_id, listing_id) on table public.favorites to authenticated;
grant delete on table public.favorites to authenticated;

create policy "Users can read their own favorites"
  on public.favorites
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own favorites"
  on public.favorites
  for insert
  to authenticated
  with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "Users can delete their own favorites"
  on public.favorites
  for delete
  to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create function public.adjust_listing_likes_from_favorite()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.listings
    set likes = likes + 1
    where id = new.listing_id;
    return new;
  end if;

  update public.listings
  set likes = greatest(0, likes - 1)
  where id = old.listing_id;
  return old;
end;
$$;

create trigger favorites_adjust_listing_likes
after insert or delete on public.favorites
for each row execute function public.adjust_listing_likes_from_favorite();

revoke all on function public.adjust_listing_likes_from_favorite()
  from public, anon, authenticated;

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint conversations_buyer_listing_unique unique (listing_id, created_by)
);

create index conversations_updated_at_idx
  on public.conversations (updated_at desc);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create index conversation_members_user_id_idx
  on public.conversation_members (user_id, conversation_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint messages_body_length check (char_length(btrim(body)) between 1 and 2000)
);

create index messages_conversation_created_at_idx
  on public.messages (conversation_id, created_at);

alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;

revoke all on table public.conversations from anon, authenticated;
revoke all on table public.conversation_members from anon, authenticated;
revoke all on table public.messages from anon, authenticated;

grant select on table public.conversations to authenticated;
grant select on table public.conversation_members to authenticated;
grant select on table public.messages to authenticated;
grant insert (id, conversation_id, sender_id, body) on table public.messages to authenticated;

create policy "Members can read their conversations"
  on public.conversations
  for select
  to authenticated
  using (
    created_by = (select auth.uid())
    or exists (
      select 1
      from public.conversation_members member
      where member.conversation_id = conversations.id
        and member.user_id = (select auth.uid())
    )
  );

create policy "Users can read only their own memberships"
  on public.conversation_members
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Members can read conversation messages"
  on public.messages
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.conversation_members member
      where member.conversation_id = messages.conversation_id
        and member.user_id = (select auth.uid())
    )
  );

create policy "Members can send messages as themselves"
  on public.messages
  for insert
  to authenticated
  with check (
    sender_id = (select auth.uid())
    and exists (
      select 1
      from public.conversation_members member
      where member.conversation_id = messages.conversation_id
        and member.user_id = (select auth.uid())
    )
  );

drop policy "Live listings are public and owners can see all their listings"
  on public.listings;

create policy "Live listings are public and owners can see all their listings"
  on public.listings
  for select
  to anon, authenticated
  using (
    status = 'live'
    or (select auth.uid()) = seller_id
    or exists (
      select 1
      from public.conversations conversation
      join public.conversation_members member
        on member.conversation_id = conversation.id
      where conversation.listing_id = listings.id
        and member.user_id = (select auth.uid())
    )
  );

create function public.start_conversation(target_listing_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  listing_seller_id uuid;
  listing_status text;
  conversation_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select seller_id, status
    into listing_seller_id, listing_status
  from public.listings
  where id = target_listing_id;

  if listing_seller_id is null or listing_status <> 'live' then
    raise exception 'Listing is not available' using errcode = '22023';
  end if;

  if listing_seller_id = current_user_id then
    raise exception 'A seller cannot message themselves about their listing'
      using errcode = '22023';
  end if;

  insert into public.conversations (listing_id, created_by)
  values (target_listing_id, current_user_id)
  on conflict (listing_id, created_by)
  do update set updated_at = public.conversations.updated_at
  returning id into conversation_id;

  insert into public.conversation_members (conversation_id, user_id)
  values
    (conversation_id, current_user_id),
    (conversation_id, listing_seller_id)
  on conflict do nothing;

  return conversation_id;
end;
$$;

revoke all on function public.start_conversation(uuid) from public, anon;
grant execute on function public.start_conversation(uuid) to authenticated;

create function public.touch_conversation_from_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations
  set updated_at = new.created_at
  where id = new.conversation_id;
  return new;
end;
$$;

create trigger messages_touch_conversation
after insert on public.messages
for each row execute function public.touch_conversation_from_message();

revoke all on function public.touch_conversation_from_message() from public, anon, authenticated;
