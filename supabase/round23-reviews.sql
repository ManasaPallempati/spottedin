-- Round 23: buyer reviews of sellers, like Depop's shop reviews.
-- NOT applied to any database by this PR. Run on staging, then production.
-- Requires round20-shipping-fulfilment.sql (orders.status, delivered_at,
-- order_items -> listings) and round6 (orders.payment_status).
-- Idempotent: guarded creates, drop-before-create policies, create-or-replace
-- functions. Safe to re-run.
--
-- One review per order. Only the buyer of a PAID order that has been marked
-- delivered can leave it, and only through leave_review(): the table has no
-- client INSERT/UPDATE/DELETE grant. Reviews are public, so a shop can show
-- them to signed-out visitors. leave_review() also refreshes profiles.rating
-- (the average, 1 decimal) so the seller's stars show wherever the profile
-- is embedded.
--
-- Before running: confirm spotted_reviews does not already exist
-- (select table_name from information_schema.tables
--  where table_schema = 'public' and table_name = 'spotted_reviews';  -- expect 0 rows)
-- The table is prefixed like spotted_messages because this database carries an
-- unrelated schema from an old prototype.

create table if not exists public.spotted_reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text not null default '' check (char_length(comment) <= 500),
  created_at timestamptz not null default now()
);

create index if not exists spotted_reviews_seller_idx on public.spotted_reviews (seller_id, created_at desc);

alter table public.spotted_reviews enable row level security;

drop policy if exists "spotted_reviews_select_all" on public.spotted_reviews;
create policy "spotted_reviews_select_all" on public.spotted_reviews
  for select using (true);

grant select on public.spotted_reviews to anon, authenticated;
grant all on public.spotted_reviews to service_role;

-- The seller is decided from the listings in the order (as is_order_seller
-- does), never from orders.seller_id, which the demo checkout writes from the
-- client.
create or replace function public.leave_review(p_order_id uuid, p_rating integer, p_comment text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seller uuid;
  v_sellers integer;
  v_comment text := trim(coalesce(p_comment, ''));
begin
  if p_rating is null or p_rating not between 1 and 5 then
    raise exception 'rating must be 1 to 5 stars';
  end if;
  if char_length(v_comment) > 500 then
    raise exception 'review is too long';
  end if;

  perform 1 from public.orders o
  where o.id = p_order_id
    and o.buyer_id = auth.uid()
    and o.payment_status = 'paid'
    and o.status = 'delivered';
  if not found then
    raise exception 'only the buyer can review a delivered order';
  end if;

  select count(distinct l.seller_id), min(l.seller_id::text)::uuid
  into v_sellers, v_seller
  from public.order_items oi
  join public.listings l on l.id::text = oi.listing_id
  where oi.order_id = p_order_id;
  if v_sellers <> 1 or v_seller is null or v_seller = auth.uid() then
    raise exception 'this order has no seller to review';
  end if;

  insert into public.spotted_reviews (order_id, reviewer_id, seller_id, rating, comment)
  values (p_order_id, auth.uid(), v_seller, p_rating, v_comment);

  update public.profiles
  set rating = (select round(avg(r.rating)::numeric, 1) from public.spotted_reviews r where r.seller_id = v_seller)
  where id = v_seller;
exception
  when unique_violation then
    raise exception 'you have already reviewed this order';
end
$$;

revoke all on function public.leave_review(uuid, integer, text) from public;
grant execute on function public.leave_review(uuid, integer, text) to authenticated;

-- Verify (SQL editor, as postgres):
--   select count(*) from public.spotted_reviews;  -- expect 0 on first run
--   select has_function_privilege('authenticated', 'public.leave_review(uuid, integer, text)', 'execute');  -- expect true
--   select has_table_privilege('authenticated', 'public.spotted_reviews', 'insert');  -- expect false
--
-- Rollback (profiles.rating keeps the last average leave_review() wrote):
--   drop function if exists public.leave_review(uuid, integer, text);
--   drop table if exists public.spotted_reviews;
