# Mobile strategy

Decision (2026-07-28): **ship the installable PWA now, defer Expo/React Native**
to a later `apps/mobile` phase that starts only once staging Supabase is live
and the MVP loop is proven against it.

The original plan called for scaffolding an Expo app immediately. That was
written against an assumed empty repo. It is not what this repo is.

## Why PWA first

- The blocker is backend activation, not a second frontend. Ten screens, four
  migrations, six Edge Functions, and 28 passing tests already exist, but no
  Supabase cloud project has ever been created, so the RLS suites in
  `supabase/tests/database/` have never run against a real database.
- Expo Go breaks at checkout. `react-native-razorpay` is a native module and
  does not run inside Expo Go, so "on her iPhone today via Expo Go" fails at
  the one screen that makes this a marketplace. TestFlight additionally needs
  an EAS build and a paid Apple Developer account.
- `BRAND_DIRECTION.md` gates the visual pass on "the real backend and
  device-installable skeleton" existing for product-owner review. A PWA
  satisfies device-installable in days.

## What a future React Native port inherits vs. rewrites

Ports unchanged: all four migrations, the pgTAP RLS suites, and all six Edge
Functions — they are server-side and client-agnostic. Roughly 70% of
`profiles.ts`, `listings.ts`, `messages.ts`, and `favorites.ts` ports, since
those are mostly plain supabase-js calls.

Rewritten: every screen and its CSS, `react-router-dom` routing, `store.ts`
(localStorage / `window` / `CustomEvent`), `supabase.ts` (`import.meta.env` is
Vite-only, and React Native needs an AsyncStorage session adapter),
`AuthProvider.tsx` callback handling (query params become deep links), image
upload (`File` becomes expo-image-picker), and Razorpay checkout
(`services/commerce.ts` injects a `<script>` into `document.head`).

## Corrections to the original plan

| Plan claim | Repo reality |
| --- | --- |
| Scaffold Expo now | Mature Vite + React web app already covers the MVP loop |
| Phone-OTP auth | Email/password is deliberate; OTP gated on SMS budget and TRAI DLT (`AUTH_ROLLOUT.md`) |
| Stub Razorpay/Shiprocket | Already fully implemented; gated on provider accounts, not code (`COMMERCE_INTEGRATION.md`) |
| Supabase "stand up in a day" | Schema and tests written; the day of work is staging activation |
| Use a Depop-style component kit | `BRAND_DIRECTION.md` forbids a reskin before backend + installable review; `CONTRACT.md` mandates hand-rolled components |
| TestFlight in ~1 week | Needs an Apple Developer account and an EAS build, not Expo Go |

## Repository visibility

`Palle017/maanster-market` stays **public** so the GitHub Pages deploy keeps
serving; Pages on a private repo requires a paid plan. Secret scanning and push
protection are enabled instead. Any new repo is created private from birth.
