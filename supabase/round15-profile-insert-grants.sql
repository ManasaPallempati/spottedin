-- Round 15 — fix profile creation, broken for every new signup.
--
-- Round 10 added first_name, last_name, avatar_url, date_of_birth, country and
-- interest, and granted UPDATE on them. It did not grant INSERT. The account
-- work then changed ensureProfile to carry date_of_birth from signup metadata
-- into the new row — so every profile insert began failing with "permission
-- denied for table profiles", and the person was left signed in with no
-- profile, which the app renders as the signed-out view.
--
-- This is why grants on this table are per-column: the baseline migration lists
-- them explicitly, so a new column is invisible to the client until named. That
-- is the right default, and the cost is that adding a column means deciding
-- both grants, not one.
--
-- Found because a real user reported it, not by review or by a failing build —
-- ensureProfile logs the failure with console.warn and returns null, so nothing
-- surfaced. Making that visible is tracked separately in docs/KNOWN_GAPS.md.

grant insert (first_name, last_name, avatar_url, date_of_birth, country, interest, guardian_email)
  on table public.profiles to authenticated;

-- guardian_consent_at is deliberately absent from both grants. Round 12 revoked
-- UPDATE on it precisely so a minor cannot record their own parental consent,
-- and granting INSERT here would reopen that at signup instead.
