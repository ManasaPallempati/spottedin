-- Extends listings_category_valid to cover the app's Men/Women/Kids/Everything-else
-- taxonomy (already user-facing on Discover) so SellNew's category select can persist.
alter table public.listings drop constraint if exists listings_category_valid;
alter table public.listings add constraint listings_category_valid
  check (category in ('women', 'men', 'sneakers', 'electronics', 'home', 'vintage', 'kids', 'everything-else'));
