# Sign-in / Onboarding Design Reference

Recorded 2026-08-01 from a reference screenshot relayed by another session
(the parent transcript could not be forked, so this is the textual capture).

## Reference screen (visual inspiration only — do not copy Depop branding)

Full-height portrait mobile onboarding/sign-in screen:

- Solid vivid-red background, rounded phone corners
- Small "Skip" link at top-right
- Large empty breathing room
- Centered white brand wordmark
- Centered two-line tagline ("Buy, sell, and discover / preloved fashion")
- Two large white pill buttons: Google and Apple
- Small "or" separator
- Red/transparent outlined pill button for email
- Small Terms of Service / Privacy Policy copy at the bottom

Adapt the layout language for Spotted's own brand (wordmark, palette, copy).

## RESOLVED 2026-08-01 — product owner

Auth provider conflict settled: **Google, Facebook, or email**.

Apple sign-in is not implemented. It would need a paid Apple Developer account
and a Supabase provider entry before the button could do anything, so it was
dropped rather than shipped dead.

## Built

`src/pages/Welcome.tsx` + `welcome.css`, routed at `/`. The marketing page that
previously owned `/` moved to `/about` with its metadata intact.

Still outstanding: the legal footer names Terms of Service and Privacy Policy as
plain text, not links, because no `/terms` or `/privacy` route exists yet. Create
those pages before launch and turn the text into links.
