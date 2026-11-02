-- Round 7 — account deletion that retains what the law and the counterparty need.
--
-- Deleting a marketplace account cannot mean deleting the rows: orders and
-- payments are financial records with statutory retention periods, and the other
-- side of a completed sale still needs their purchase history when the seller
-- leaves. Depop, Vinted and eBay all anonymise rather than erase, and that is
-- what this migration enables.
--
-- The profiles row is kept and scrubbed in place, so every foreign key stays
-- valid — orders.buyer_id, payments.user_id and listings.seller_id are all
-- NOT NULL and could not survive the row being removed. auth.users is not
-- deleted either; the delete-account Edge Function anonymises its email and bans
-- it so the person can no longer sign in.

-- 1. Mark a profile as deleted. Null means an active account.
alter table public.profiles
  add column if not exists deleted_at timestamptz;

comment on column public.profiles.deleted_at is
  'Set when the account is deleted. The row is retained and anonymised so that orders, payments and sold listings keep a valid seller/buyer reference.';

-- Partial index: queries only ever ask for the deleted ones, which stay a small
-- minority of the table.
create index if not exists profiles_deleted_at_idx
  on public.profiles (deleted_at)
  where deleted_at is not null;

-- 2. Allow a listing to be withdrawn without being sold.
-- The original constraint permitted only 'live' and 'sold', so a departing
-- seller's unsold listings had nowhere to go. 'removed' keeps them out of the
-- public feed (listings_select_live filters on status = 'live') while leaving
-- sold listings readable for the buyers who own those orders.
alter table public.listings
  drop constraint if exists listings_status_valid;

alter table public.listings
  add constraint listings_status_valid
  check (status in ('live', 'sold', 'removed'));

-- 3. Stop a message thread from blocking deletion.
-- threads.peer_id was ON DELETE NO ACTION, so removing a profile that anyone had
-- ever messaged failed outright rather than degrading. The column is already
-- nullable, and spotted_messages.sender_id is already SET NULL, so this matches
-- the behaviour messages already had.
alter table public.threads
  drop constraint if exists threads_peer_id_fkey;

alter table public.threads
  add constraint threads_peer_id_fkey
  foreign key (peer_id) references public.profiles (id)
  on delete set null;

-- 4. A deleted profile must not be able to reactivate itself.
-- profiles_update_own still allows the owner to edit their row, which is correct
-- for a live account. This adds the one thing it must not permit: clearing
-- deleted_at. The Edge Function uses the service-role key and bypasses RLS, so
-- it is unaffected.
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update
  using (id = (select auth.uid()) and deleted_at is null)
  with check (id = (select auth.uid()) and deleted_at is null);
