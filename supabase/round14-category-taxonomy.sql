-- Round 14 — a real category taxonomy.
--
-- listings.category is text with a CHECK of eight values, so the whole of
-- Indian fashion collapses into 'women' or 'men'. Adding a category needs a
-- migration, and the stored value doubles as its own label.
--
-- This follows what large marketplaces do: categories are rows, not code.
-- Adding one becomes an INSERT rather than a deploy, listings reference it by
-- foreign key so a listing can never point at a category that does not exist,
-- and there is a clean path to an admin screen later. The seed lives in this
-- migration, so the tree is still reviewable in a diff.
--
-- Three levels: department (Men) → group (Tops) → type (T-shirts). Only a leaf
-- is selectable on a listing; groups exist to navigate.
--
-- The structure mirrors the reference marketplace, with Indian categories added
-- into it rather than replacing it. Ethnic wear is a group alongside Tops and
-- Bottoms, and Indian types are added inside existing groups where they belong
-- — juttis and kolhapuris under Footwear, dupattas and turbans under
-- Accessories — so a seller finds them where they would expect any other
-- garment, not in a separate section.

create table if not exists public.categories (
  -- Readable, stable slug rather than a serial: it appears in /category/:slug
  -- URLs, so it must not change when the display name is edited or the tree is
  -- reordered.
  id text primary key,
  parent_id text references public.categories (id) on delete restrict,
  name text not null,
  position integer not null default 0,
  -- Soft retirement. Deleting a category that listings reference is blocked by
  -- the foreign key, and should be — the history stays valid.
  active boolean not null default true,
  created_at timestamptz not null default now(),

  constraint categories_id_format check (id ~ '^[a-z0-9-]{2,60}$'),
  constraint categories_name_length check (char_length(name) between 1 and 60),
  constraint categories_not_own_parent check (parent_id is distinct from id)
);

create index if not exists categories_parent_idx on public.categories (parent_id, position);

alter table public.categories enable row level security;

-- Public: the tree is browse navigation. Nobody edits it from the client — the
-- absence of an insert/update policy is the control, and an admin screen would
-- go through the service role.
drop policy if exists "categories_select_public" on public.categories;
create policy "categories_select_public" on public.categories
  for select using (true);

grant select on table public.categories to authenticated, anon;

-- Departments
insert into public.categories (id, parent_id, name, position) values
  ('men',              null, 'Men',             0),
  ('women',            null, 'Women',           1),
  ('kids',             null, 'Kids',            2),
  ('everything-else',  null, 'Everything else', 3)
on conflict (id) do update set name = excluded.name, position = excluded.position;

-- Men — reference groups, with Ethnic wear added among the garment groups
insert into public.categories (id, parent_id, name, position) values
  ('men-tops',        'men', 'Tops',                  0),
  ('men-bottoms',     'men', 'Bottoms',               1),
  ('men-ethnic',      'men', 'Ethnic wear',           2),
  ('men-outerwear',   'men', 'Coats and jackets',     3),
  ('men-jumpsuits',   'men', 'Jumpsuits and rompers', 4),
  ('men-suits',       'men', 'Suits',                 5),
  ('men-footwear',    'men', 'Footwear',              6),
  ('men-accessories', 'men', 'Accessories',           7),
  ('men-sleepwear',   'men', 'Sleepwear',             8),
  ('men-underwear',   'men', 'Underwear',             9),
  ('men-swimwear',    'men', 'Swimwear',             10),
  ('men-costume',     'men', 'Costume',              11)
on conflict (id) do update set name = excluded.name, position = excluded.position;

insert into public.categories (id, parent_id, name, position) values
  ('men-tshirts',    'men-tops', 'T-shirts',            0),
  ('men-jerseys',    'men-tops', 'Jerseys',             1),
  ('men-hoodies',    'men-tops', 'Hoodies',             2),
  ('men-sweatshirts','men-tops', 'Sweatshirts',         3),
  ('men-sweaters',   'men-tops', 'Sweaters',            4),
  ('men-cardigans',  'men-tops', 'Cardigans',           5),
  ('men-shirts',     'men-tops', 'Shirts',              6),
  ('men-polos',      'men-tops', 'Polo shirts',         7),
  ('men-tanks',      'men-tops', 'Tank tops and vests', 8),
  ('men-tops-other', 'men-tops', 'Other',               9),

  ('men-jeans',        'men-bottoms', 'Jeans',       0),
  ('men-sweatpants',   'men-bottoms', 'Sweatpants',  1),
  ('men-trousers',     'men-bottoms', 'Trousers',    2),
  ('men-shorts',       'men-bottoms', 'Shorts',      3),
  ('men-bottoms-other','men-bottoms', 'Other',       4),

  -- Indian additions
  ('men-kurta',        'men-ethnic', 'Kurtas and kurta sets',       0),
  ('men-sherwani',     'men-ethnic', 'Sherwanis and achkans',       1),
  ('men-nehru',        'men-ethnic', 'Nehru jackets and waistcoats', 2),
  ('men-dhoti',        'men-ethnic', 'Dhotis and mundus',           3),
  ('men-pathani',      'men-ethnic', 'Pathani suits',               4),
  ('men-pyjama',       'men-ethnic', 'Churidars and pyjamas',       5),
  ('men-ethnic-other', 'men-ethnic', 'Other',                       6),

  ('men-coats',      'men-outerwear', 'Coats',   0),
  ('men-jackets',    'men-outerwear', 'Jackets', 1),
  ('men-vests',      'men-outerwear', 'Vests',   2),
  ('men-outer-other','men-outerwear', 'Other',   3),

  ('men-jumpsuits-full','men-jumpsuits', 'Jumpsuits', 0),
  ('men-rompers',       'men-jumpsuits', 'Rompers',   1),
  ('men-overalls',      'men-jumpsuits', 'Overalls',  2),
  ('men-jumpsuits-other','men-jumpsuits','Other',     3),

  ('men-suits-full',       'men-suits', 'Suits',             0),
  ('men-tailored-jackets', 'men-suits', 'Tailored jackets',  1),
  ('men-tailored-trousers','men-suits', 'Tailored trousers', 2),
  ('men-suit-vests',       'men-suits', 'Vests',             3),
  ('men-tuxedos',          'men-suits', 'Tuxedos',           4),
  ('men-suits-other',      'men-suits', 'Other',             5),

  ('men-sneakers',    'men-footwear', 'Sneakers',    0),
  ('men-mojaris',     'men-footwear', 'Mojaris and juttis', 1),
  ('men-kolhapuris',  'men-footwear', 'Kolhapuris',  2),
  ('men-slides',      'men-footwear', 'Slides',      3),
  ('men-sandals',     'men-footwear', 'Sandals',     4),
  ('men-flipflops',   'men-footwear', 'Flip flops',  5),
  ('men-slippers',    'men-footwear', 'Slippers',    6),
  ('men-brogues',     'men-footwear', 'Brogues',     7),
  ('men-oxfords',     'men-footwear', 'Oxfords',     8),
  ('men-loafers',     'men-footwear', 'Loafers',     9),
  ('men-boots',       'men-footwear', 'Boots',      10),
  ('men-footwear-other','men-footwear','Other',     11),

  ('men-bags',        'men-accessories', 'Bags',                   0),
  ('men-belts',       'men-accessories', 'Belts',                  1),
  ('men-hats',        'men-accessories', 'Hats and caps',          2),
  ('men-turbans',     'men-accessories', 'Turbans and safas',      3),
  ('men-stoles',      'men-accessories', 'Stoles and scarves',     4),
  ('men-sunglasses',  'men-accessories', 'Sunglasses',             5),
  ('men-wallets',     'men-accessories', 'Wallets and cardholders', 6),
  ('men-jewellery',   'men-accessories', 'Jewellery',              7),
  ('men-watches',     'men-accessories', 'Watches',                8),
  ('men-acc-other',   'men-accessories', 'Other',                  9),

  ('men-pajamas',       'men-sleepwear', 'Pyjamas', 0),
  ('men-robes',         'men-sleepwear', 'Robes',   1),
  ('men-sleepwear-other','men-sleepwear','Other',   2),

  ('men-underwear-briefs','men-underwear', 'Underwear', 0),
  ('men-socks',           'men-underwear', 'Socks',     1),
  ('men-underwear-other', 'men-underwear', 'Other',     2),

  ('men-swim-shorts',  'men-swimwear', 'Swim shorts', 0),
  ('men-swim-other',   'men-swimwear', 'Other',       1),

  ('men-costume-full', 'men-costume', 'Costumes', 0)
on conflict (id) do update set name = excluded.name, position = excluded.position;

-- Women — same structure, plus Dresses
insert into public.categories (id, parent_id, name, position) values
  ('women-tops',        'women', 'Tops',                  0),
  ('women-bottoms',     'women', 'Bottoms',               1),
  ('women-dresses',     'women', 'Dresses',               2),
  ('women-ethnic',      'women', 'Ethnic wear',           3),
  ('women-outerwear',   'women', 'Coats and jackets',     4),
  ('women-jumpsuits',   'women', 'Jumpsuits and rompers', 5),
  ('women-suits',       'women', 'Suits',                 6),
  ('women-footwear',    'women', 'Footwear',              7),
  ('women-accessories', 'women', 'Accessories',           8),
  ('women-sleepwear',   'women', 'Sleepwear',             9),
  ('women-underwear',   'women', 'Underwear',            10),
  ('women-swimwear',    'women', 'Swimwear',             11),
  ('women-costume',     'women', 'Costume',              12)
on conflict (id) do update set name = excluded.name, position = excluded.position;

insert into public.categories (id, parent_id, name, position) values
  ('women-tshirts',    'women-tops', 'T-shirts',             0),
  ('women-shirts',     'women-tops', 'Shirts and blouses',   1),
  ('women-crop',       'women-tops', 'Crop tops',            2),
  ('women-hoodies',    'women-tops', 'Hoodies',              3),
  ('women-sweatshirts','women-tops', 'Sweatshirts',          4),
  ('women-sweaters',   'women-tops', 'Sweaters',             5),
  ('women-cardigans',  'women-tops', 'Cardigans',            6),
  ('women-tanks',      'women-tops', 'Tank tops and camis',  7),
  ('women-tops-other', 'women-tops', 'Other',                8),

  ('women-jeans',        'women-bottoms', 'Jeans',      0),
  ('women-trousers',     'women-bottoms', 'Trousers',   1),
  ('women-skirts',       'women-bottoms', 'Skirts',     2),
  ('women-shorts',       'women-bottoms', 'Shorts',     3),
  ('women-leggings',     'women-bottoms', 'Leggings and jeggings', 4),
  ('women-sweatpants',   'women-bottoms', 'Sweatpants', 5),
  ('women-bottoms-other','women-bottoms', 'Other',      6),

  ('women-maxi',         'women-dresses', 'Maxi dresses', 0),
  ('women-midi',         'women-dresses', 'Midi dresses', 1),
  ('women-mini',         'women-dresses', 'Mini dresses', 2),
  ('women-dresses-other','women-dresses', 'Other',        3),

  -- Indian additions
  ('women-saree',          'women-ethnic', 'Sarees',                        0),
  ('women-lehenga',        'women-ethnic', 'Lehengas and chaniya cholis',   1),
  ('women-salwar',         'women-ethnic', 'Salwar suits and kurta sets',   2),
  ('women-kurti',          'women-ethnic', 'Kurtis and tunics',             3),
  ('women-anarkali',       'women-ethnic', 'Anarkalis and ethnic gowns',    4),
  ('women-blouse',         'women-ethnic', 'Blouses',                       5),
  ('women-dupatta',        'women-ethnic', 'Dupattas and stoles',           6),
  ('women-sharara',        'women-ethnic', 'Shararas and gararas',          7),
  ('women-ethnic-bottoms', 'women-ethnic', 'Palazzos and churidars',        8),
  ('women-ethnic-other',   'women-ethnic', 'Other',                         9),

  ('women-coats',      'women-outerwear', 'Coats',            0),
  ('women-jackets',    'women-outerwear', 'Jackets',          1),
  ('women-shrugs',     'women-outerwear', 'Shrugs and capes', 2),
  ('women-outer-other','women-outerwear', 'Other',            3),

  ('women-jumpsuits-full', 'women-jumpsuits', 'Jumpsuits', 0),
  ('women-rompers',        'women-jumpsuits', 'Rompers',   1),
  ('women-overalls',       'women-jumpsuits', 'Overalls',  2),
  ('women-jumpsuits-other','women-jumpsuits', 'Other',     3),

  ('women-suits-full',       'women-suits', 'Suits',             0),
  ('women-tailored-jackets', 'women-suits', 'Tailored jackets',  1),
  ('women-tailored-trousers','women-suits', 'Tailored trousers', 2),
  ('women-suits-other',      'women-suits', 'Other',             3),

  ('women-sneakers',     'women-footwear', 'Sneakers',           0),
  ('women-juttis',       'women-footwear', 'Juttis and mojaris', 1),
  ('women-kolhapuris',   'women-footwear', 'Kolhapuris',         2),
  ('women-heels',        'women-footwear', 'Heels',              3),
  ('women-flats',        'women-footwear', 'Flats',              4),
  ('women-sandals',      'women-footwear', 'Sandals',            5),
  ('women-slides',       'women-footwear', 'Slides',             6),
  ('women-flipflops',    'women-footwear', 'Flip flops',         7),
  ('women-boots',        'women-footwear', 'Boots',              8),
  ('women-mules',        'women-footwear', 'Mules',              9),
  ('women-footwear-other','women-footwear','Other',             10),

  ('women-bags',        'women-accessories', 'Bags and potlis',        0),
  ('women-belts',       'women-accessories', 'Belts',                  1),
  ('women-hats',        'women-accessories', 'Hats and caps',          2),
  ('women-scarves',     'women-accessories', 'Scarves and wraps',      3),
  ('women-sunglasses',  'women-accessories', 'Sunglasses',             4),
  ('women-wallets',     'women-accessories', 'Wallets and cardholders', 5),
  ('women-earrings',    'women-accessories', 'Jhumkas and earrings',   6),
  ('women-necklaces',   'women-accessories', 'Necklaces and sets',     7),
  ('women-bangles',     'women-accessories', 'Bangles and bracelets',  8),
  ('women-maangtikka',  'women-accessories', 'Maang tikkas',           9),
  ('women-anklets',     'women-accessories', 'Anklets and toe rings', 10),
  ('women-watches',     'women-accessories', 'Watches',               11),
  ('women-acc-other',   'women-accessories', 'Other',                 12),

  ('women-nightwear',     'women-sleepwear', 'Nightwear',  0),
  ('women-robes',         'women-sleepwear', 'Robes',      1),
  ('women-loungewear',    'women-sleepwear', 'Loungewear', 2),
  ('women-sleepwear-other','women-sleepwear','Other',      3),

  ('women-underwear-briefs','women-underwear', 'Underwear', 0),
  ('women-bras',            'women-underwear', 'Bras',      1),
  ('women-socks',           'women-underwear', 'Socks and tights', 2),
  ('women-underwear-other', 'women-underwear', 'Other',     3),

  ('women-swimsuits',  'women-swimwear', 'Swimsuits', 0),
  ('women-swim-other', 'women-swimwear', 'Other',     1),

  ('women-costume-full','women-costume', 'Costumes', 0)
on conflict (id) do update set name = excluded.name, position = excluded.position;

-- Kids
insert into public.categories (id, parent_id, name, position) values
  ('kids-girls',      'kids', 'Girls',          0),
  ('kids-boys',       'kids', 'Boys',           1),
  ('kids-ethnic',     'kids', 'Ethnic wear',    2),
  ('kids-baby',       'kids', 'Baby (0-2)',     3),
  ('kids-footwear',   'kids', 'Footwear',       4),
  ('kids-accessories','kids', 'Accessories',    5),
  ('kids-school',     'kids', 'School uniforms', 6),
  ('kids-costume',    'kids', 'Costume',        7)
on conflict (id) do update set name = excluded.name, position = excluded.position;

insert into public.categories (id, parent_id, name, position) values
  ('kids-girls-tops',    'kids-girls', 'Tops',               0),
  ('kids-girls-bottoms', 'kids-girls', 'Bottoms',            1),
  ('kids-girls-dresses', 'kids-girls', 'Dresses and frocks', 2),
  ('kids-girls-outer',   'kids-girls', 'Coats and jackets',  3),
  ('kids-girls-other',   'kids-girls', 'Other',              4),

  ('kids-boys-tops',    'kids-boys', 'Tops',              0),
  ('kids-boys-bottoms', 'kids-boys', 'Bottoms',           1),
  ('kids-boys-outer',   'kids-boys', 'Coats and jackets', 2),
  ('kids-boys-other',   'kids-boys', 'Other',             3),

  -- Indian additions
  ('kids-lehenga',     'kids-ethnic', 'Lehenga cholis',  0),
  ('kids-kurta-set',   'kids-ethnic', 'Kurta sets',      1),
  ('kids-sherwani',    'kids-ethnic', 'Sherwanis',       2),
  ('kids-dhoti-set',   'kids-ethnic', 'Dhoti sets',      3),
  ('kids-ethnic-frock','kids-ethnic', 'Ethnic frocks',   4),
  ('kids-ethnic-other','kids-ethnic', 'Other',           5),

  ('kids-baby-sets',   'kids-baby', 'Baby sets and rompers', 0),
  ('kids-baby-ethnic', 'kids-baby', 'Baby ethnic wear',      1),
  ('kids-baby-other',  'kids-baby', 'Other',                 2),

  ('kids-footwear-ethnic', 'kids-footwear', 'Juttis and ethnic footwear', 0),
  ('kids-footwear-shoes',  'kids-footwear', 'Shoes and sneakers',         1),
  ('kids-footwear-sandals','kids-footwear', 'Sandals',                    2),
  ('kids-footwear-other',  'kids-footwear', 'Other',                      3),

  ('kids-acc-hair',  'kids-accessories', 'Hair accessories', 0),
  ('kids-acc-bags',  'kids-accessories', 'Bags',             1),
  ('kids-acc-other', 'kids-accessories', 'Other',            2),

  ('kids-school-uniform','kids-school', 'Uniforms', 0),
  ('kids-costume-full',  'kids-costume','Costumes', 0)
on conflict (id) do update set name = excluded.name, position = excluded.position;

-- Everything else — reference groups, with festive supplies added
insert into public.categories (id, parent_id, name, position) values
  ('else-beauty',   'everything-else', 'Beauty',              0),
  ('else-facemasks','everything-else', 'Face masks and coverings', 1),
  ('else-home',     'everything-else', 'Home',                2),
  ('else-tech',     'everything-else', 'Tech accessories',    3),
  ('else-cameras',  'everything-else', 'Cameras and film',    4),
  ('else-art',      'everything-else', 'Art',                 5),
  ('else-books',    'everything-else', 'Books and magazines', 6),
  ('else-music',    'everything-else', 'Music',               7),
  ('else-party',    'everything-else', 'Party and festive supplies', 8),
  ('else-sports',   'everything-else', 'Sports equipment',    9),
  ('else-toys',     'everything-else', 'Toys',               10),
  ('else-umbrellas','everything-else', 'Umbrellas',          11)
on conflict (id) do update set name = excluded.name, position = excluded.position;

insert into public.categories (id, parent_id, name, position) values
  ('else-beauty-bath',      'else-beauty', 'Bath and body',     0),
  ('else-beauty-fragrance', 'else-beauty', 'Fragrance',         1),
  ('else-beauty-haircare',  'else-beauty', 'Haircare',          2),
  ('else-beauty-makeup',    'else-beauty', 'Makeup',            3),
  ('else-beauty-nails',     'else-beauty', 'Nails',             4),
  ('else-beauty-grooming',  'else-beauty', 'Grooming',          5),
  ('else-beauty-skincare',  'else-beauty', 'Skincare',          6),
  ('else-beauty-tools',     'else-beauty', 'Tools and brushes', 7),

  ('else-home-dinnerware', 'else-home', 'Dinnerware',                  0),
  ('else-home-furniture',  'else-home', 'Furniture',                   1),
  ('else-home-accessories','else-home', 'Home accessories',            2),
  ('else-home-textiles',   'else-home', 'Soft furnishings and textiles', 3),
  ('else-home-storage',    'else-home', 'Storage and organisation',    4),

  ('else-tech-laptop', 'else-tech', 'Laptop bags and cases', 0),
  ('else-tech-phone',  'else-tech', 'Phone cases',           1),

  ('else-art-collectibles','else-art', 'Collectibles',              0),
  ('else-art-drawings',    'else-art', 'Drawings and illustrations', 1),
  ('else-art-mixed',       'else-art', 'Mixed media',               2),
  ('else-art-paintings',   'else-art', 'Paintings',                 3),
  ('else-art-photography', 'else-art', 'Photography',               4),
  ('else-art-prints',      'else-art', 'Prints',                    5),
  ('else-art-sculptures',  'else-art', 'Sculptures',                6),
  ('else-art-stickers',    'else-art', 'Stickers',                  7),

  ('else-books-books',    'else-books', 'Books',     0),
  ('else-books-magazines','else-books', 'Magazines', 1),

  ('else-music-cds',        'else-music', 'CDs and vinyl',       0),
  ('else-music-instruments','else-music', 'Musical instruments', 1),

  ('else-party-cake',        'else-party', 'Cake decorating',              0),
  ('else-party-cards',       'else-party', 'Cards, invitations, gift wrap', 1),
  ('else-party-decorations', 'else-party', 'Decorations',                  2),
  ('else-party-favors',      'else-party', 'Party favours',                3),
  ('else-party-hats',        'else-party', 'Party hats',                   4),
  ('else-party-festive',     'else-party', 'Diwali, Holi and festive decor', 5),

  ('else-sports-ball',    'else-sports', 'Ball sports',                    0),
  ('else-sports-camping', 'else-sports', 'Camping and hiking',             1),
  ('else-sports-cycling', 'else-sports', 'Cycling',                        2),
  ('else-sports-fitness', 'else-sports', 'Fitness',                        3),
  ('else-sports-golf',    'else-sports', 'Golf',                           4),
  ('else-sports-skates',  'else-sports', 'Skates, skateboards and scooters', 5),
  ('else-sports-racket',  'else-sports', 'Racket sports',                  6),
  ('else-sports-water',   'else-sports', 'Water sports',                   7),
  ('else-sports-winter',  'else-sports', 'Winter sports',                  8),

  ('else-toys-action',   'else-toys', 'Action figures and playsets', 0),
  ('else-toys-building', 'else-toys', 'Building sets and blocks',    1),
  ('else-toys-cars',     'else-toys', 'Cars and vehicles',           2),
  ('else-toys-dolls',    'else-toys', 'Dolls and accessories',       3),
  ('else-toys-learning', 'else-toys', 'Learning toys',               4),
  ('else-toys-puzzles',  'else-toys', 'Puzzles and games',           5),
  ('else-toys-stuffed',  'else-toys', 'Stuffed animals',             6),
  ('else-toys-trading',  'else-toys', 'Trading cards',               7)
on conflict (id) do update set name = excluded.name, position = excluded.position;

-- Listings reference the tree. Nullable and additive: the existing `category`
-- column stays and stays populated, exactly as image_path did in round 13, so
-- every current read path keeps working while the app migrates over.
alter table public.listings
  add column if not exists category_id text references public.categories (id) on delete restrict;

create index if not exists listings_category_id_idx on public.listings (category_id);

grant insert (category_id), update (category_id) on table public.listings to authenticated;

-- Backfill: map the eight legacy values onto the closest leaf. 'women' and
-- 'men' have no better answer than the catch-all within their department —
-- the old vocabulary genuinely could not say more than that, which is the
-- reason for this migration.
update public.listings set category_id = 'women-tops-other' where category_id is null and category = 'women';
update public.listings set category_id = 'men-tops-other'   where category_id is null and category = 'men';
update public.listings set category_id = 'women-sneakers'   where category_id is null and category = 'sneakers';
update public.listings set category_id = 'kids-girls-other' where category_id is null and category = 'kids';
update public.listings set category_id = 'else-tech-phone'  where category_id is null and category = 'electronics';
update public.listings set category_id = 'else-home-accessories' where category_id is null and category = 'home';
update public.listings set category_id = 'else-art-collectibles' where category_id is null and category = 'vintage';
update public.listings set category_id = 'else-umbrellas'   where category_id is null and category = 'everything-else';
