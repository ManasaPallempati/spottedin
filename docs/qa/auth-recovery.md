# Password recovery verification

This correction depends on the password-reset feature in PR #28. A visitor can
start Google sign-in, return without completing it, then request a recovery link.
The previous pending OAuth destination took priority after the recovery session
resolved, sending that visitor to their profile rather than the new-password form.
RecoveryReturn now clears that abandoned destination before navigating.

## Repeatable isolated UI check

Use the existing development dependencies plus an externally available Playwright
runtime and an installed Chrome. This script does not add an npm dependency.
Set `SPOTTED_PLAYWRIGHT_MODULE` to the existing Playwright module path if Node
cannot resolve it, and optionally `CHROME_EXECUTABLE_PATH` for Chrome's executable.
Then run:

```text
node scripts/verify-auth-recovery.cjs
```

The runner starts and stops its own Vite server at 127.0.0.1:4188 and its own
headless Chromium instance. It explicitly sets the Supabase URL and site origin
to loopback, intercepts every Supabase request with synthetic responses, and
blocks every other external request. It sends no email and touches no live data.
Use `SPOTTED_AUTH_EVIDENCE_DIR` to select the output directory; the default is a
fresh system temporary directory. No real session, password, or key is needed.

Checks include login-to-forgot navigation; reset email rate-limit and neutral
success states; the real SDK's PKCE callback and recovery event; mismatch and
shared password-policy validation; same-password server feedback; successful
update, sign-out and login notice; missing-session and expired-link states;
and the abandoned-OAuth recovery regression. Screenshots, sanitized request
paths and assertion results are retained. `npm run build` is checked separately.

## Limits

Network responses are mocks. SMTP delivery, configured Supabase redirect
allowlists, actual email links and cross-device/browser behavior require a
separately authorized isolated service test. Production and hosted preview auth
were not exercised. The application uses PKCE, so the email must be opened in
the browser that requested it under the current design.

## Verified 2026-10-21

P15G2, Chrome, 390 x 844 viewport: 14 assertions passed after the correction;
the abandoned-OAuth assertion failed before it, ending at `/profile`.
`npm run build` passed, with the pre-existing large-bundle warning.
