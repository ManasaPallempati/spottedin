-- Round 13 — more than one photo per listing.
--
-- listings.image_path is a single text column, so a listing could only ever
-- have one photo. On a resale marketplace the photos are the product: buyers
-- want the label, the fabric, the flaws. The reference app allows eight.
--
-- A separate table rather than an array column, because order matters (the
-- first photo is the thumbnail everywhere), individual photos need removing,
-- and RLS is expressible per row.
--
-- listings.image_path is deliberately kept and kept populated with the first
-- image. Every existing read path uses it — useListings, ProductCard, the order
-- snapshot in the razorpay-order function — and a hard cutover would break all
-- of them at once, including orders already placed. It becomes a denormalised
-- convenience rather than the source of truth.

create table if not exists public.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  path text not null,
  position integer not null,
  created_at timestamptz not null default now(),

  constraint listing_images_path_length check (char_length(path) between 1 and 400),
  -- Eight matches the reference. The cap is here as well as in the form because
  -- the form is not the only way rows can arrive.
  constraint listing_images_position_range check (position between 0 and 7)
);

-- Every photo must live under the seller's own storage folder, mirroring
-- listings_image_owned_path. This is not merely consistency: the sync trigger
-- below copies a path into listings.image_path, which enforces that rule, so
-- without the same constraint here a path that fails it would make the trigger
-- fail and block the image insert with a confusing error about the listings
-- table. Enforcing it at the point of entry gives the seller the real reason.
--
-- Written as a trigger rather than a CHECK because the rule spans two tables:
-- a CHECK cannot read listings.seller_id.
create or replace function public.enforce_listing_image_owner_path()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner uuid;
begin
  select seller_id into owner from public.listings where id = new.listing_id;
  if owner is null then
    raise exception 'listing_not_found' using errcode = 'P0001';
  end if;
  if new.path not like owner::text || '/%' then
    raise exception 'image_path_not_owned' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists listing_images_owner_path on public.listing_images;
create trigger listing_images_owner_path
  before insert or update on public.listing_images
  for each row
  execute function public.enforce_listing_image_owner_path();

-- Two photos cannot occupy the same slot in one listing, which is what keeps
-- ordering stable and the first image unambiguous.
create unique index if not exists listing_images_listing_position_idx
  on public.listing_images (listing_id, position);

create index if not exists listing_images_listing_idx
  on public.listing_images (listing_id);

alter table public.listing_images enable row level security;

-- Readable whenever the listing itself is. The subquery defers to the listings
-- policies rather than restating them, so a change there cannot leave images
-- visible for a listing that is not.
drop policy if exists "listing_images_select_visible" on public.listing_images;
create policy "listing_images_select_visible" on public.listing_images
  for select
  using (exists (select 1 from public.listings l where l.id = listing_id));

-- Writes are the seller's own, and only while they are allowed to sell at all —
-- the same is_adult() check the listings insert policy uses (round 11).
-- Without it a minor could not create a listing but could still attach images
-- to one.
drop policy if exists "listing_images_write_own" on public.listing_images;
create policy "listing_images_write_own" on public.listing_images
  for all
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and l.seller_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and l.seller_id = (select auth.uid())
    )
    and public.is_adult((select auth.uid()))
  );

grant select on table public.listing_images to authenticated, anon;
grant insert (listing_id, path, position) on table public.listing_images to authenticated;
grant update (path, position) on table public.listing_images to authenticated;
grant delete on table public.listing_images to authenticated;

-- Keeps listings.image_path pointing at position 0 without the client having to
-- remember to. Runs for insert, update and delete so that removing the first
-- photo promotes the next one rather than leaving a dangling thumbnail.
create or replace function public.sync_listing_primary_image()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid := coalesce(new.listing_id, old.listing_id);
begin
  update public.listings
     set image_path = (
       select path from public.listing_images
        where listing_id = target
        order by position
        limit 1
     )
   where id = target;
  return null;
end;
$$;

drop trigger if exists listing_images_sync_primary on public.listing_images;
create trigger listing_images_sync_primary
  after insert or update or delete on public.listing_images
  for each row
  execute function public.sync_listing_primary_image();

-- Backfill: existing listings keep their single photo as position 0 so they are
-- not left with an image_path and an empty gallery.
insert into public.listing_images (listing_id, path, position)
select id, image_path, 0
  from public.listings
 where image_path is not null
   and not exists (select 1 from public.listing_images li where li.listing_id = listings.id)
on conflict do nothing;
