# Baseline schema

The `round*.sql` files in the parent directory cannot build a database on
their own. They `ALTER public.listings` and `ALTER public.profiles` without
ever creating them, because those tables were created by an earlier set of
versioned migrations that were removed when this repo adopted the spottedin-c
codebase. Applying only the round files to an empty project fails.

These four files are those missing migrations, recovered from git history at
commit `61d4c2c`. They exist so a new environment — a staging project, or a
replacement for production — can be built from scratch and reproducibly.

They are **not** applied to the existing production project
(`masdygvcssrtwseopfmj`), whose schema already contains all of this. Running
them there is unnecessary and would fail.

## What they create

| File | Creates |
|---|---|
| `202607270001_create_profiles.sql` | `public.profiles` |
| `202607280001_create_listings_and_images.sql` | `public.listings`, the public `listing-images` storage bucket and its policies |
| `202607290001_create_app_opens.sql` | `public.app_opens` (written by `src/App.tsx`) |
| `202607300001_add_app_opens_session.sql` | adds `session_id` to `app_opens` |

## Apply order for a new project

Run each file's contents in the Supabase SQL editor, in exactly this order.
The round files depend on the baseline, and on each other.

```
baseline/202607270001_create_profiles.sql
baseline/202607280001_create_listings_and_images.sql
baseline/202607290001_create_app_opens.sql
baseline/202607300001_add_app_opens_session.sql
../round2.sql
../round2b-category-fix.sql
../round2c-handle-format-fix.sql
../round2d-message-sender-fk-fix.sql
../round3-offers.sql
../round3b-offers-grants-fix.sql
../round4-offer-checkout.sql
../round6-razorpay-checkout.sql
```

There is no `round5`; that gap exists in the original repository.

## Known divergence from production

Production also contains `route_transfers`, created by a migration
(`create_route_payouts`) that was only ever applied to that project and whose
SQL is not in this repository. Nothing in `src/` queries that table, so a new
environment built from these files runs the app correctly without it.

Production's migration history also records version `202607290001` under the
name `create_route_payouts`, while this repo's file of that version number is
`create_app_opens`. That collision is why `supabase db push` refuses to run
against production, and is another reason a new project should be built from
these files rather than linked to the existing history.
