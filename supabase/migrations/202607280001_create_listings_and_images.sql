create table public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null default '',
  price_inr integer not null,
  category text not null,
  size text,
  condition text not null,
  gradient_start text not null default '#7C3AED',
  gradient_end text not null default '#EC4899',
  emoji text not null default '🛍️',
  image_path text,
  likes integer not null default 0,
  status text not null default 'live',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint listings_title_length check (char_length(title) between 1 and 80),
  constraint listings_description_length check (char_length(description) <= 500),
  constraint listings_price_range check (price_inr between 1 and 100000000),
  constraint listings_category_valid check (
    category in ('women', 'men', 'sneakers', 'electronics', 'home', 'vintage')
  ),
  constraint listings_size_length check (size is null or char_length(size) between 1 and 12),
  constraint listings_condition_valid check (
    condition in ('new', 'like-new', 'good', 'fair')
  ),
  constraint listings_gradient_start_format check (gradient_start ~ '^#[0-9A-Fa-f]{6}$'),
  constraint listings_gradient_end_format check (gradient_end ~ '^#[0-9A-Fa-f]{6}$'),
  constraint listings_emoji_length check (char_length(emoji) between 1 and 16),
  constraint listings_image_owned_path check (
    image_path is null or image_path like seller_id::text || '/%'
  ),
  constraint listings_likes_nonnegative check (likes >= 0),
  constraint listings_status_valid check (status in ('live', 'sold'))
);

create index listings_live_created_at_idx
  on public.listings (created_at desc)
  where status = 'live';

create index listings_seller_created_at_idx
  on public.listings (seller_id, created_at desc);

alter table public.listings enable row level security;

revoke all on table public.listings from anon, authenticated;
grant select on table public.listings to anon, authenticated;
grant insert (
  id,
  seller_id,
  title,
  description,
  price_inr,
  category,
  size,
  condition,
  gradient_start,
  gradient_end,
  emoji,
  image_path
) on table public.listings to authenticated;
grant update (
  title,
  description,
  price_inr,
  category,
  size,
  condition,
  gradient_start,
  gradient_end,
  emoji,
  image_path,
  status
) on table public.listings to authenticated;
grant delete on table public.listings to authenticated;

create policy "Live listings are public and owners can see all their listings"
  on public.listings
  for select
  to anon, authenticated
  using (status = 'live' or (select auth.uid()) = seller_id);

create policy "Users can create their own listings"
  on public.listings
  for insert
  to authenticated
  with check ((select auth.uid()) is not null and (select auth.uid()) = seller_id);

create policy "Users can update their own listings"
  on public.listings
  for update
  to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = seller_id)
  with check ((select auth.uid()) is not null and (select auth.uid()) = seller_id);

create policy "Users can delete their own listings"
  on public.listings
  for delete
  to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = seller_id);

create trigger listings_set_updated_at
before update on public.listings
for each row execute function public.set_profile_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'listing-images',
  'listing-images',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Listing images are publicly readable"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'listing-images');

create policy "Users can upload listing images to their folder"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users can update listing images in their folder"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users can delete listing images in their folder"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
