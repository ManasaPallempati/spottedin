-- Spotted Round 3 — offers (accept/decline) — spottedin-c
-- No agent applies this migration — a human runs it in the Supabase SQL editor.
-- Idempotent: every `create policy` is preceded by `drop policy if exists`
-- (Postgres has no `create policy if not exists`); columns/constraints use
-- `if not exists` / `drop ... if exists` guards throughout.

-- ============================================================================
-- offers — extend existing table with seller-side fields + status
-- ============================================================================
alter table public.offers
  add column if not exists seller_id uuid null references public.profiles(id) on delete cascade;

alter table public.offers
  add column if not exists seller_handle text not null default '';

alter table public.offers
  add column if not exists status text not null default 'pending';

-- Pre-migration rows get seller_handle='' and status='pending' by default, so
-- they simply never surface to any seller (acceptable, not a bug).

alter table public.offers drop constraint if exists offers_status_check;
alter table public.offers
  add constraint offers_status_check check (status in ('pending', 'accepted', 'declined'));

-- offers_select_own and offers_insert_own already exist and are untouched.
-- Additive: a row is visible if EITHER the buyer OR the seller condition matches.
drop policy if exists "offers_select_seller" on public.offers;
create policy "offers_select_seller" on public.offers
  for select using (seller_id = auth.uid());

drop policy if exists "offers_update_seller" on public.offers;
create policy "offers_update_seller" on public.offers
  for update using (seller_id = auth.uid()) with check (seller_id = auth.uid());
