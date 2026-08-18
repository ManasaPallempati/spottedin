-- =====================================================================
-- Spotted — demo inventory seed  (supabase/seed-demo-listings.sql)
-- =====================================================================
--
-- WHAT THIS DOES
--   Populates an EMPTY Spotted project with believable demo inventory so
--   the app has something to show on first run: 8 demo sellers (auth.users
--   + public.profiles) and 40 pre-owned Indian-fashion listings spread
--   across sellers and the round-14 category tree. All listings are 'live'.
--
-- STATUS: UNAPPLIED. This file has NOT been run against any database.
--   It was authored by reading the schema only; no live project was
--   touched while writing it.
--
-- WHERE TO RUN IT
--   Paste the whole file into the Supabase SQL editor of an EMPTY or
--   STAGING project (or a fresh local `supabase start` dev DB) whose schema
--   already has baseline + EVERY round*.sql applied (the run order is in
--   supabase/baseline/README.md). It needs those migrations because it
--   references public.profiles, public.listings and public.categories
--   (the category tree is seeded by round14) and satisfies the round-8
--   handle rule and the round-10/11 minimum-age trigger.
--
--   NEVER run this against production (masdygvcssrtwseopfmj). It is demo
--   data and the account emails/handles are fictional.
--
-- HOW TO RUN
--   1. Open the target project's SQL editor.
--   2. Paste this entire file and press Run. It is wrapped in one
--      transaction and is idempotent (safe to run more than once — every
--      insert is ON CONFLICT DO NOTHING keyed on the fixed ids below).
--
-- HOW TO UNDO
--   Uncomment and run the single DELETE at the very bottom of this file.
--   auth.users -> profiles -> listings -> listing_images all cascade on
--   delete, so removing the demo auth.users rows removes everything this
--   seed added, and nothing else.
--
-- DESIGN NOTES / SCHEMA CONSTRAINTS THAT SHAPED THIS FILE
--   * FIXED UUIDs, not gen_random_uuid(). Idempotency needs a stable
--     conflict key and listings have no natural unique key, so sellers use
--     d0000000-…-00000000000N and listings use a0000000-…-0000000000NN.
--     gen_random_uuid() would insert 40 fresh listings on every re-run.
--   * IMAGES: image_path is left NULL and no listing_images rows are
--     created — on purpose. listings.image_path carries a CHECK that any
--     value must begin with "<seller_id>/…" (a path inside the private
--     per-seller folder of the 'listing-images' storage bucket), so an
--     external image URL cannot be stored there, and a made-up storage
--     path would 404 because no file was uploaded. With image_path NULL the
--     app's resolveImage() (src/lib/useListings.ts) falls back to a
--     deterministic https://picsum.photos/seed/<listing-id>/600/600 photo,
--     so the grid looks fully populated with stable images and nothing is
--     broken. To show REAL photos, upload files to
--     listing-images/<seller_id>/… and set image_path (or add
--     listing_images rows); that requires the Storage API, not SQL.
--   * auth.users: the Supabase SQL editor runs as a privileged role and may
--     insert into auth.users. Only `id` is NOT NULL at the DB level, but the
--     token columns are set to '' rather than left NULL because GoTrue scans
--     them into non-nullable Go strings and NULLs there break sign-in.
--     Passwords use extensions.crypt()/gen_salt() (pgcrypto lives in the
--     `extensions` schema on Supabase, hence the schema qualifier).
--   * auth.identities rows are included so the demo accounts can actually
--     sign in (email = seller e-mail below, password = 'spotted-demo').
--     If a GoTrue version mismatch makes that INSERT error, it can be
--     deleted — public browsing only needs the auth.users row to satisfy
--     the profiles FK, not the identity.
--   * Handles obey round8: lowercase, letters/digits/underscore only,
--     3–30 chars, first char alphanumeric, no leading '@'.
--   * date_of_birth is an adult date for every seller so the round-10/11
--     age trigger passes and is_adult() is true.
--   * legacy listings.category is one of the round-2b allowed values
--     (women/men/sneakers/electronics/home/vintage/kids/everything-else);
--     category_id points at the precise round-14 leaf for real navigation.
--
-- Demo login: e-mail demo+sellerN@spotted.test  /  password  spotted-demo
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. Demo seller identities in auth.users (profiles.id FKs auth.users.id)
-- ---------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new,
  raw_app_meta_data, raw_user_meta_data
)
values
  ('00000000-0000-0000-0000-000000000000', 'd0000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'demo+seller1@spotted.test', extensions.crypt('spotted-demo', extensions.gen_salt('bf')), now(), now(), now(), '', '', '', '', '{"provider":"email","providers":["email"]}', '{"seed":"spotted-demo"}'),
  ('00000000-0000-0000-0000-000000000000', 'd0000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'demo+seller2@spotted.test', extensions.crypt('spotted-demo', extensions.gen_salt('bf')), now(), now(), now(), '', '', '', '', '{"provider":"email","providers":["email"]}', '{"seed":"spotted-demo"}'),
  ('00000000-0000-0000-0000-000000000000', 'd0000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'demo+seller3@spotted.test', extensions.crypt('spotted-demo', extensions.gen_salt('bf')), now(), now(), now(), '', '', '', '', '{"provider":"email","providers":["email"]}', '{"seed":"spotted-demo"}'),
  ('00000000-0000-0000-0000-000000000000', 'd0000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'demo+seller4@spotted.test', extensions.crypt('spotted-demo', extensions.gen_salt('bf')), now(), now(), now(), '', '', '', '', '{"provider":"email","providers":["email"]}', '{"seed":"spotted-demo"}'),
  ('00000000-0000-0000-0000-000000000000', 'd0000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'demo+seller5@spotted.test', extensions.crypt('spotted-demo', extensions.gen_salt('bf')), now(), now(), now(), '', '', '', '', '{"provider":"email","providers":["email"]}', '{"seed":"spotted-demo"}'),
  ('00000000-0000-0000-0000-000000000000', 'd0000000-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'demo+seller6@spotted.test', extensions.crypt('spotted-demo', extensions.gen_salt('bf')), now(), now(), now(), '', '', '', '', '{"provider":"email","providers":["email"]}', '{"seed":"spotted-demo"}'),
  ('00000000-0000-0000-0000-000000000000', 'd0000000-0000-4000-8000-000000000007', 'authenticated', 'authenticated', 'demo+seller7@spotted.test', extensions.crypt('spotted-demo', extensions.gen_salt('bf')), now(), now(), now(), '', '', '', '', '{"provider":"email","providers":["email"]}', '{"seed":"spotted-demo"}'),
  ('00000000-0000-0000-0000-000000000000', 'd0000000-0000-4000-8000-000000000008', 'authenticated', 'authenticated', 'demo+seller8@spotted.test', extensions.crypt('spotted-demo', extensions.gen_salt('bf')), now(), now(), now(), '', '', '', '', '{"provider":"email","providers":["email"]}', '{"seed":"spotted-demo"}')
on conflict (id) do nothing;

-- Identities so the demo accounts can sign in with email + password.
-- Removable if a GoTrue version mismatch makes this error; browsing does
-- not need it.
insert into auth.identities (
  id, user_id, provider_id, provider, identity_data, created_at, updated_at
)
values
  (gen_random_uuid(), 'd0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'email', '{"sub":"d0000000-0000-4000-8000-000000000001","email":"demo+seller1@spotted.test","email_verified":true}', now(), now()),
  (gen_random_uuid(), 'd0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000002', 'email', '{"sub":"d0000000-0000-4000-8000-000000000002","email":"demo+seller2@spotted.test","email_verified":true}', now(), now()),
  (gen_random_uuid(), 'd0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000003', 'email', '{"sub":"d0000000-0000-4000-8000-000000000003","email":"demo+seller3@spotted.test","email_verified":true}', now(), now()),
  (gen_random_uuid(), 'd0000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000004', 'email', '{"sub":"d0000000-0000-4000-8000-000000000004","email":"demo+seller4@spotted.test","email_verified":true}', now(), now()),
  (gen_random_uuid(), 'd0000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000005', 'email', '{"sub":"d0000000-0000-4000-8000-000000000005","email":"demo+seller5@spotted.test","email_verified":true}', now(), now()),
  (gen_random_uuid(), 'd0000000-0000-4000-8000-000000000006', 'd0000000-0000-4000-8000-000000000006', 'email', '{"sub":"d0000000-0000-4000-8000-000000000006","email":"demo+seller6@spotted.test","email_verified":true}', now(), now()),
  (gen_random_uuid(), 'd0000000-0000-4000-8000-000000000007', 'd0000000-0000-4000-8000-000000000007', 'email', '{"sub":"d0000000-0000-4000-8000-000000000007","email":"demo+seller7@spotted.test","email_verified":true}', now(), now()),
  (gen_random_uuid(), 'd0000000-0000-4000-8000-000000000008', 'd0000000-0000-4000-8000-000000000008', 'email', '{"sub":"d0000000-0000-4000-8000-000000000008","email":"demo+seller8@spotted.test","email_verified":true}', now(), now())
on conflict (provider_id, provider) do nothing;

-- ---------------------------------------------------------------------
-- 2. Seller profiles (handles: lowercase / underscore only / 3-30 chars)
-- ---------------------------------------------------------------------
insert into public.profiles (
  id, handle, name, avatar_emoji, bio, city,
  rating, sales, first_name, last_name, date_of_birth, country, interest
)
values
  ('d0000000-0000-4000-8000-000000000001', 'priya_thrift',     'Priya Nair',      '🧵', 'Handpicked pre-loved ethnic wear from my own wardrobe. Gentle prices, honest condition notes.', 'Mumbai',    4.8, 42, 'Priya',   'Nair',      '1994-03-11', 'IN', 'womenswear'),
  ('d0000000-0000-4000-8000-000000000002', 'arjun_kicks',      'Arjun Mehta',     '👟', 'Sneakerhead clearing the rotation. Everything cleaned and deodorised before it ships.',           'Bengaluru', 4.6, 88, 'Arjun',   'Mehta',     '1991-07-22', 'IN', 'menswear'),
  ('d0000000-0000-4000-8000-000000000003', 'the_saree_shelf',  'Lakshmi Iyer',    '🥻', 'Silk and cotton sarees, some worn once for a wedding, some new with tags. Chennai based.',         'Chennai',   4.9, 65, 'Lakshmi', 'Iyer',      '1988-11-02', 'IN', 'womenswear'),
  ('d0000000-0000-4000-8000-000000000004', 'delhi_denim_co',   'Rohan Kapoor',    '👖', 'Denim and everyday basics for men and women. Levis, Zara, Uniqlo. Fair wear, fair price.',         'Delhi',     4.5, 51, 'Rohan',   'Kapoor',    '1993-01-19', 'IN', 'both'),
  ('d0000000-0000-4000-8000-000000000005', 'kolkata_kloset',   'Ananya Ghosh',    '🌸', 'Womens and kids festive wear from Kolkata. Buy for a function, resell after. Zero-waste closet.', 'Kolkata',   4.7, 37, 'Ananya',  'Ghosh',     '1996-05-30', 'IN', 'both'),
  ('d0000000-0000-4000-8000-000000000006', 'vintage_vault_in', 'Sameer Deshmukh', '📻', 'Vintage finds, retro tees, film-camera era gear and old-school prints. One-of-one pieces.',        'Pune',      4.4, 29, 'Sameer',  'Deshmukh',  '1990-09-14', 'IN', 'both'),
  ('d0000000-0000-4000-8000-000000000007', 'hyd_fashion_finds','Imran Khan',      '🧥', 'Menswear edit from Hyderabad. Kurtas, jackets, tailoring. Measured photos, no surprises.',         'Hyderabad', 4.6, 44, 'Imran',   'Khan',      '1992-12-08', 'IN', 'menswear'),
  ('d0000000-0000-4000-8000-000000000008', 'jaipur_juttis',    'Meera Sharma',    '👡', 'Handmade juttis, mojaris and jewellery from Jaipur. Some pre-loved, some end-of-line new stock.',  'Jaipur',    4.8, 73, 'Meera',   'Sharma',    '1989-06-25', 'IN', 'womenswear')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 3. Listings (image_path NULL -> app renders picsum placeholder by id)
-- ---------------------------------------------------------------------
insert into public.listings (
  id, seller_id, title, description, price_inr, category, category_id,
  size, condition, gradient_start, gradient_end, emoji, likes, status
)
values
  -- priya_thrift (women ethnic) --------------------------------------
  ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'FabIndia block-print cotton kurta',            'Indigo hand-block cotton kurta from FabIndia. Worn a handful of times, no fading. Great for daily wear.', 749,  'women', 'women-kurti',    'M',    'good',     '#4F46E5', '#EC4899', '🧵', 34, 'live'),
  ('a0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', 'Biba anarkali suit set',                       'Biba floor-length anarkali with dupatta. Worn once to a wedding, dry-cleaned. Wine red.',                  2299, 'women', 'women-anarkali', 'L',    'like-new', '#7C3AED', '#DB2777', '👗', 56, 'live'),
  ('a0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000001', 'W for Woman printed straight kurta',           'W straight-cut kurta, soft rayon, teal print. Everyday office wear, minor wash wear only.',                599,  'women', 'women-kurti',    'S',    'good',     '#0EA5E9', '#22C55E', '🪷', 21, 'live'),
  ('a0000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000001', 'Cotton palazzo and kurti co-ord',              'Handloom cotton palazzo with matching kurti. Mustard yellow. Barely worn, super comfy.',                  849,  'women', 'women-salwar',   'M',    'like-new', '#F59E0B', '#EF4444', '🌼', 40, 'live'),
  ('a0000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000001', 'Chikankari kurti, white on white',             'Lucknowi chikankari kurti, pure white, delicate threadwork. New without tags, bought extra.',             1199, 'women', 'women-kurti',    'L',    'new',      '#E5E7EB', '#9CA3AF', '🕊️', 63, 'live'),

  -- arjun_kicks (sneakers / men) -------------------------------------
  ('a0000000-0000-4000-8000-000000000006', 'd0000000-0000-4000-8000-000000000002', 'Nike Air Force 1 ''07 white',                  'Classic AF1 triple white. Worn about ten times, creased toe box, plenty of life left. Cleaned.',           4499, 'sneakers', 'men-sneakers', 'UK9',  'good',     '#111827', '#6B7280', '👟', 120, 'live'),
  ('a0000000-0000-4000-8000-000000000007', 'd0000000-0000-4000-8000-000000000002', 'Adidas Samba OG black',                        'Samba OG in black/white gum. Lightly worn, box included. The pair everyone wants right now.',              5999, 'sneakers', 'men-sneakers', 'UK8',  'like-new', '#000000', '#F59E0B', '🖤', 98, 'live'),
  ('a0000000-0000-4000-8000-000000000008', 'd0000000-0000-4000-8000-000000000002', 'Puma suede classic navy',                      'Puma Suede in navy. Some scuffing on the suede, laces swapped for fresh ones. Solid daily beater.',        1799, 'sneakers', 'men-sneakers', 'UK10', 'fair',     '#1E3A8A', '#3B82F6', '🐆', 33, 'live'),
  ('a0000000-0000-4000-8000-000000000009', 'd0000000-0000-4000-8000-000000000002', 'Levi''s trucker denim jacket',                 'Levis trucker jacket, mid-wash. Broken-in and soft, no rips. Menswear staple, fits M-L.',                  2199, 'men',      'men-jackets',  'L',    'good',     '#2563EB', '#1E40AF', '🧥', 47, 'live'),
  ('a0000000-0000-4000-8000-000000000010', 'd0000000-0000-4000-8000-000000000002', 'Uniqlo dry-fit graphic tee',                   'Uniqlo UT graphic tee, black. Worn twice, basically new. Cotton, boxy fit.',                               399,  'men',      'men-tshirts',  'M',    'like-new', '#374151', '#111827', '👕', 12, 'live'),

  -- the_saree_shelf (women sarees) -----------------------------------
  ('a0000000-0000-4000-8000-000000000011', 'd0000000-0000-4000-8000-000000000003', 'Kanjivaram silk saree, temple border',         'Pure Kanjivaram silk, peacock blue with gold temple border. Worn once, blouse piece attached.',           6499, 'women', 'women-saree',  'Free', 'like-new', '#0D9488', '#CA8A04', '🥻', 88, 'live'),
  ('a0000000-0000-4000-8000-000000000012', 'd0000000-0000-4000-8000-000000000003', 'Cotton Ikat handloom saree',                   'Pochampally Ikat cotton saree, maroon and cream. Light everyday drape, freshly washed and pressed.',       1899, 'women', 'women-saree',  'Free', 'good',     '#7F1D1D', '#D6D3D1', '🧵', 35, 'live'),
  ('a0000000-0000-4000-8000-000000000013', 'd0000000-0000-4000-8000-000000000003', 'Banarasi silk saree, gold zari',               'Banarasi silk in deep red with heavy gold zari. Wedding-worn once, immaculate. Statement piece.',         7999, 'women', 'women-saree',  'Free', 'like-new', '#B91C1C', '#D97706', '✨', 74, 'live'),
  ('a0000000-0000-4000-8000-000000000014', 'd0000000-0000-4000-8000-000000000003', 'Georgette printed saree',                      'Lightweight georgette saree, floral print, easy to carry. Great for a day function. Minor loose thread.',  899,  'women', 'women-saree',  'Free', 'good',     '#DB2777', '#8B5CF6', '🌷', 26, 'live'),
  ('a0000000-0000-4000-8000-000000000015', 'd0000000-0000-4000-8000-000000000003', 'Linen saree, natural beige',                   'Handwoven linen saree in natural beige with a thin contrast border. New with tags, breathable and elegant.', 2499, 'women', 'women-saree', 'Free', 'new',    '#D6D3D1', '#A8A29E', '🌾', 51, 'live'),

  -- delhi_denim_co (denim / basics) ----------------------------------
  ('a0000000-0000-4000-8000-000000000016', 'd0000000-0000-4000-8000-000000000004', 'Levi''s 511 slim jeans',                       'Levis 511 slim, dark indigo. Worn regularly but no damage, hems intact. Waist 32, length 32.',             1499, 'men',   'men-jeans',    '32',   'good',     '#1E3A8A', '#0F172A', '👖', 44, 'live'),
  ('a0000000-0000-4000-8000-000000000017', 'd0000000-0000-4000-8000-000000000004', 'Zara mom-fit jeans',                           'Zara high-waist mom jeans, light wash. Worn a few times, excellent condition. Size 28.',                   1099, 'women', 'women-jeans',  '28',   'like-new', '#60A5FA', '#2563EB', '👖', 38, 'live'),
  ('a0000000-0000-4000-8000-000000000018', 'd0000000-0000-4000-8000-000000000004', 'Uniqlo oxford shirt, sky blue',                'Uniqlo oxford button-down, sky blue. Office staple, lightly worn, no stains. Fits M.',                     699,  'men',   'men-shirts',   'M',    'good',     '#38BDF8', '#0284C7', '👔', 19, 'live'),
  ('a0000000-0000-4000-8000-000000000019', 'd0000000-0000-4000-8000-000000000004', 'H&M ribbed knit sweater',                      'H&M ribbed crew sweater, oatmeal. Cosy winter layer, one tiny pull on the sleeve, otherwise great.',       549,  'women', 'women-sweaters', 'S',  'good',     '#D6D3D1', '#78716C', '🧶', 22, 'live'),
  ('a0000000-0000-4000-8000-000000000020', 'd0000000-0000-4000-8000-000000000004', 'Wrangler black slim jeans',                    'Wrangler slim jeans, jet black. Barely worn, colour still deep. Waist 34.',                                1299, 'men',   'men-jeans',    '34',   'like-new', '#111827', '#374151', '🖤', 15, 'live'),

  -- kolkata_kloset (women / kids festive) ----------------------------
  ('a0000000-0000-4000-8000-000000000021', 'd0000000-0000-4000-8000-000000000005', 'Silk lehenga choli set',                       'Three-piece lehenga choli, emerald green with sequin work. Worn once for Durga Puja. Semi-stitched blouse.', 4299, 'women', 'women-lehenga', 'M',   'like-new', '#059669', '#CA8A04', '💚', 67, 'live'),
  ('a0000000-0000-4000-8000-000000000022', 'd0000000-0000-4000-8000-000000000005', 'Kids girls festive frock',                     'Kids party frock, wine velvet with net overlay. Fits roughly 4-5 yrs. Worn once, no marks.',               799,  'kids',  'kids-girls-dresses', '4-5Y', 'like-new', '#9F1239', '#F472B6', '👧', 18, 'live'),
  ('a0000000-0000-4000-8000-000000000023', 'd0000000-0000-4000-8000-000000000005', 'Kids boys kurta pyjama set',                   'Boys cotton kurta pyjama, cream with gold buttons. Fits 6-7 yrs. Festive-ready, gently used.',             649,  'kids',  'kids-kurta-set',     '6-7Y', 'good',     '#FDE68A', '#F59E0B', '🧒', 14, 'live'),
  ('a0000000-0000-4000-8000-000000000024', 'd0000000-0000-4000-8000-000000000005', 'Bandhani dupatta, red and yellow',             'Genuine Gujarati bandhani dupatta, red with yellow dots. Brightens any suit. New, never used.',            499,  'women', 'women-dupatta', 'Free', 'new',      '#DC2626', '#FACC15', '🧣', 29, 'live'),
  ('a0000000-0000-4000-8000-000000000025', 'd0000000-0000-4000-8000-000000000005', 'Salwar kameez suit, powder blue',              'Unstitched-turned-stitched salwar suit, powder blue with light embroidery. Worn twice.',                   1099, 'women', 'women-salwar',  'L',    'good',     '#93C5FD', '#3B82F6', '💠', 31, 'live'),

  -- vintage_vault_in (vintage) ---------------------------------------
  ('a0000000-0000-4000-8000-000000000026', 'd0000000-0000-4000-8000-000000000006', 'Retro band tee, 90s wash',                     'Faded vintage rock band tee, single-stitch, genuine 90s. Soft and thin, a couple of pinholes. Size L.',    899,  'vintage', 'else-art-prints', 'L',  'fair',     '#292524', '#57534E', '🎸', 41, 'live'),
  ('a0000000-0000-4000-8000-000000000027', 'd0000000-0000-4000-8000-000000000006', 'Vintage Kodak film camera',                    'Working Kodak point-and-shoot, 35mm film. Tested, winds and fires. A lovely shelf-and-shoot piece.',       2499, 'vintage', 'else-cameras',    'One',  'good',     '#1C1917', '#B45309', '📷', 58, 'live'),
  ('a0000000-0000-4000-8000-000000000028', 'd0000000-0000-4000-8000-000000000006', 'Retro Bollywood film poster print',            'Reproduction retro Bollywood poster print, thick matte stock. Frame-ready. Rolled, never displayed.',      399,  'vintage', 'else-art-prints', 'A2',   'new',      '#B91C1C', '#F59E0B', '🎞️', 23, 'live'),
  ('a0000000-0000-4000-8000-000000000029', 'd0000000-0000-4000-8000-000000000006', 'Vinyl LP, classic Hindi film songs',           'Original vinyl LP of classic Hindi film songs. Sleeve worn at edges, disc plays clean. Collector item.',    1299, 'vintage', 'else-music-cds',  'One',  'good',     '#0F172A', '#7C3AED', '📀', 36, 'live'),
  ('a0000000-0000-4000-8000-000000000030', 'd0000000-0000-4000-8000-000000000006', 'Vintage leather satchel',                      'Old-school full-grain leather satchel, brass buckles. Honest patina and scuffs, structurally solid.',      1899, 'vintage', 'else-art-collectibles', 'One', 'fair', '#78350F', '#B45309', '💼', 44, 'live'),

  -- hyd_fashion_finds (men ethnic / tailoring) -----------------------
  ('a0000000-0000-4000-8000-000000000031', 'd0000000-0000-4000-8000-000000000007', 'Manyavar cotton-silk kurta',                   'Manyavar kurta in beige cotton-silk. Worn once for Eid. Crisp, no marks. Pairs with churidar.',            1499, 'men', 'men-kurta',    'M',    'like-new', '#D6D3D1', '#B45309', '🧥', 39, 'live'),
  ('a0000000-0000-4000-8000-000000000032', 'd0000000-0000-4000-8000-000000000007', 'Nehru jacket, navy raw silk',                  'Bandhgala Nehru jacket in navy raw silk. Layer over a kurta. Dry-cleaned, excellent shape.',               1799, 'men', 'men-nehru',    'L',    'good',     '#1E3A8A', '#0F172A', '🧷', 27, 'live'),
  ('a0000000-0000-4000-8000-000000000033', 'd0000000-0000-4000-8000-000000000007', 'Wedding sherwani, gold brocade',               'Cream and gold brocade sherwani, worn for one wedding. Includes stole. A statement outfit at a fraction.', 5499, 'men', 'men-sherwani', 'L',    'like-new', '#FCD34D', '#B45309', '👑', 61, 'live'),
  ('a0000000-0000-4000-8000-000000000034', 'd0000000-0000-4000-8000-000000000007', 'Allen Solly slim blazer',                      'Allen Solly single-breasted blazer, charcoal. Office/party ready. Lightly worn, lining intact. Size 40.',  1999, 'men', 'men-jackets',  '40',   'good',     '#334155', '#0F172A', '🕴️', 20, 'live'),
  ('a0000000-0000-4000-8000-000000000035', 'd0000000-0000-4000-8000-000000000007', 'Cotton pathani suit, olive',                   'Two-piece pathani suit in olive cotton. Comfortable and roomy. Worn a few times, fully intact.',           1199, 'men', 'men-pathani',  'XL',   'good',     '#4D7C0F', '#365314', '🫒', 17, 'live'),

  -- jaipur_juttis (footwear / jewellery / accessories) ---------------
  ('a0000000-0000-4000-8000-000000000036', 'd0000000-0000-4000-8000-000000000008', 'Handmade leather juttis, tan',                 'Jaipur handmade leather juttis, tan with subtle embroidery. New, tried on once indoors. Runs true to size.', 899,  'women', 'women-juttis', 'UK6',  'new',      '#B45309', '#F59E0B', '👡', 52, 'live'),
  ('a0000000-0000-4000-8000-000000000037', 'd0000000-0000-4000-8000-000000000008', 'Mens mojaris, maroon velvet',                  'Maroon velvet mojaris with zari toe. Worn for one function. Cushioned, no wear on sole. Size UK9.',        1099, 'men',   'men-mojaris',  'UK9',  'like-new', '#7F1D1D', '#B45309', '🥿', 30, 'live'),
  ('a0000000-0000-4000-8000-000000000038', 'd0000000-0000-4000-8000-000000000008', 'Kolhapuri chappals, natural tan',              'Genuine handmade Kolhapuri chappals, natural tan leather. New stock, will darken beautifully with wear.',  749,  'men',   'men-kolhapuris', 'UK8', 'new',     '#92400E', '#D97706', '🐫', 28, 'live'),
  ('a0000000-0000-4000-8000-000000000039', 'd0000000-0000-4000-8000-000000000008', 'Oxidised silver jhumka earrings',              'Oxidised German-silver jhumkas with tiny bells. New, never worn. Perfect with a kurta or saree.',          349,  'women', 'women-earrings', 'One',  'new',    '#9CA3AF', '#4B5563', '💫', 46, 'live'),
  ('a0000000-0000-4000-8000-000000000040', 'd0000000-0000-4000-8000-000000000008', 'Potli bag, gold zardozi',                      'Handmade potli bag in gold zardozi embroidery. Used once for a wedding. Roomy enough for essentials.',     599,  'women', 'women-bags',   'One',  'good',     '#CA8A04', '#B45309', '👛', 33, 'live')
on conflict (id) do nothing;

commit;

-- =====================================================================
-- UNDO  (uncomment the line below and run it to remove everything above)
-- ---------------------------------------------------------------------
-- Deleting the demo auth.users rows cascades to profiles -> listings ->
-- listing_images and to auth.identities, so this one statement reverses
-- the entire seed and touches nothing else.
--
-- delete from auth.users where email like 'demo+seller%@spotted.test';
-- =====================================================================
