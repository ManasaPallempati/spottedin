# HANDOFF: spotted launch + OpenClaw lag remediation (session 2026-07-31)

Read this whole file before acting. STATE and CONSTRAINTS are immutable; BATCH is the work order.
If the machine contradicts this file, the machine wins — report the conflict, propose the smallest
amendment, continue with unaffected items.

Written 2026-07-31 ~17:30 ET from tonystool (Windows 11, user augel, GitHub Palle017).

## STATE — what is true right now

### Workstream A: SPOTTED app (repo spottedin-b)
- New app LIVE-quality at `C:\Users\augel\spottedin-b` → github.com/Palle017/spottedin-b (main).
  Next.js 16 / React 19 / TS / Tailwind v4 (NO tailwind config file — tokens via `@theme` in
  `app/globals.css`). All 13 screens + `/api/listings` + ImageResponse share-card routes build green.
- LOAD-BEARING: prices are server-computed only. `lib/pricing.ts` pure fns (explicit `now` arg);
  seed uses `offsetHours` (NOT absolute dates — absolute dates decay to all-AT-FLOOR); `PricedListing`
  in `lib/data.ts` structurally omits `floorPrice`; every priced route has `force-dynamic`.
- Design truth: `docs/design/TOKENS_FINAL.md` (light-first override) beats `docs/design/SPOTTED_B_PLAN.md`
  §4 on color/surface only; plan beats it on everything else. No emoji; `#D9FF3D` appears exactly once.
- Gates: `npx vitest run` (14 tests), `scripts/verify-prices.mjs` + `verify-routes.mjs` with
  `BASE_URL=<url>` (independent reimplementations — never import lib/).
- Public preview: https://tonystool.taild5f39d.ts.net:8443/ = Tailscale funnel → `npm run start -- -p 3100`
  (launch.json entry "spotted-public" in Maanster_Market/.claude/launch.json). Manasa
  (manasa.pallempati@gmail.com) was emailed this link from prudhvi.pallempati@gmail.com asking for
  exactly TWO pieces of feedback; reply watch spec: `HANDOFF_EMAIL_MONITOR.md` in repo.
- Vercel: user claims import done but GitHub shows 0 deployments, `spottedin-b.vercel.app` 404s,
  empty-commit push triggered nothing → GitHub-App grant or import wizard incomplete. UNRESOLVED.
- Full finish plan (phases, gates, DNS): `HANDOFF_TARDBOT_FINISH.md` in repo. Key pending human steps:
  Vercel project (A1/A6), GoDaddy zone export → Cloudflare add-site → NS flip (A2-A4), b CNAME (A7).
  spottedin.co is still on GoDaddy NS; www CNAMEs palle017.github.io; www HTTPS broken (GitHub cert
  never issued — pre-existing, fix post-migration).

### Workstream B: live site A (repo spottedin, www.spottedin.co)
- Polish pass (B's craft: layered shadows, tile hairlines+placeholders, micro-type, focus ring,
  reduced-motion) merged & deployed; live CSS verified (`--tile-hairline` served). Clone at
  `C:\Users\augel\spottedin-a`. Flagged-not-done: accent chat bubbles, sub-44px icon buttons.

### Workstream C: OpenClaw gateway lag (RESOLVED-bridged)
- Root cause proven: `claude.list.gateway` scanned 1GB `~/.claude/projects` per call, 144-153s,
  serializing all dashboard RPCs (UI polls 8s). Fix applied: `plugins.entries.anthropic.config
  .sessionCatalog.enabled=false` in `C:\Users\augel\.openclaw\openclaw.json` (code-verified gate in
  `extensions/anthropic/session-catalog-registration`). Claude sessions NOT archived (owner forbids).
- Permanent fix = next beta > 2026.7.2-beta.5 (PRs openclaw#114961 #115259 merged to main 07-28).
  When it ships: `npm i -g openclaw@beta`, restart gateway, re-enable sessionCatalog. DO NOT
  `--channel dev` (owner declined); DO NOT downgrade to stable (state DB schema v6 > stable's v1 —
  tried, gateway refused boot, rolled back).
- Also done: 942 codex rollouts archived to `C:\Users\augel\OpenClaw-Backups\codex-rollouts-archive`
  (556→144MB); weekly schtask "OpenClaw Rollout Archive" runs
  `C:\Users\augel\.openclaw\maintenance\archive-codex-rollouts.ps1` Sun 4:30am; heartbeat 30m→1h
  (model unchanged gpt-5.6-sol). Config backups: `openclaw.json.bak-pre-{doctor-20260731,
  catalog-toggle,heartbeat-1h}`.
- Residual known-slow: `channels status` ~45s = provider probes + untrustworthy `--probe`
  (openclaw#21603, #45698, #67938 — use `--timeout 30000` or plain curl :18789). CLI startup ~15-20s
  is normal-bad on Windows (linux.do says WSL2 fixes; not attempted). Optional unexplored: prune
  unused plugins from `plugins.allow` (openai/codex/deepseek/elevenlabs candidates), Defender
  exclusion for `.claude\projects` (owner-only decision).
- TardBot (OpenClaw main agent, Codex/gpt-5.6-sol): told to stand down from restart-recovery; acked.
  Message it via `openclaw agent --agent main -m "..."` (CLI is authed; Control UI needs token — never
  type it).

### Workstream D: Chrome control (BLOCKED — user's active complaint)
- User demands control of their REAL Chrome via CDP debugging mode. Their Chrome (pid was 33524,
  `C:\Program Files\Google\Chrome\Application\chrome.exe`) LISTENS on 127.0.0.1:9222 but all
  /json/* endpoints return 404 with Content-Length 0. Hypothesis UNVERIFIED: Chrome 136+ disables
  CDP HTTP on the default user-data-dir. chrome-devtools-mcp errors "browser already running" for
  its managed profile at `C:\Users\augel\.cache\chrome-devtools-mcp\chrome-profile` (stale instance,
  no DevToolsActivePort file). claude-in-chrome extension: was connected (Browser 2 = profile "Raj",
  Gmail = authuser 2), currently disconnected.

## CONSTRAINTS
- Never touch repo Palle017/spottedin's DNS records, `public/CNAME`, or www/apex records. Never
  orange-cloud anything in the spottedin.co zone; never Cloudflare SSL "Flexible".
- Never archive/move `C:\Users\augel\.claude\projects` content.
- Back up `openclaw.json` before every edit (`.bak-<purpose>` convention). No gateway restarts
  unless required by an item — each restart interrupts TardBot sessions.
- floorPrice never reaches spottedin-b client; no client price math; no emoji in product UI.
- Commit messages in spottedin-b end with the Co-Authored-By Claude trailer used in git log.

## BATCH — do all of these without stopping to ask between items
1. Chrome CDP: verify the 9222 404 cause (check Chrome version; test `--user-data-dir` non-default
   relaunch theory on a THROWAWAY profile first). Then get working control of the user's real Chrome:
   preferred order (a) claude-in-chrome extension reconnect (ask user to open Claude side panel),
   (b) real Chrome relaunched with CDP enabled in a way that preserves their profiles/sessions,
   (c) chrome-devtools-mcp managed profile as last resort. *Done when:* a snapshot/read_page of a
   real-Chrome tab succeeds and the user's profiles are intact.
2. Vercel unblock: re-check `gh api repos/Palle017/spottedin-b/deployments`; if still 0, walk the
   user through the exact grant screen (screenshots if Chrome works). *Done when:* unauthenticated
   curl of the production URL returns 200 containing "GLOBAL DROP".
3. Watch for Manasa's reply per `HANDOFF_EMAIL_MONITOR.md`. *Done when:* reply classified
   TWO_CHANGES/DRAWING_BOARD/OTHER and reported verbatim.
4. OpenClaw beta watch: `npm view openclaw dist-tags --json`; when beta > 2026.7.2-beta.5, apply the
   upgrade + re-enable sessionCatalog + restart + verify `openclaw nodes list` completes <15s warm.
   *Done when:* dashboard lists Claude sessions again and no RPC timeout.
5. DNS move per `HANDOFF_TARDBOT_FINISH.md` Phase 2 once user supplies GoDaddy export. *Done when:*
   NS = cloudflare AND `nslookup www.spottedin.co 1.1.1.1` still returns palle017.github.io.

## STOP AND ASK only if
- a credential/token/password must be entered anywhere (incl. OpenClaw Control UI token, Cloudflare/
  Vercel/GoDaddy logins) — hand the user a numbered checklist instead
- an action would close/kill the user's real Chrome windows or delete any data
- gateway state-DB schema or channel pairing would change
- sending anything outward (email, issue comment, message) beyond TardBot CLI pings
Otherwise keep going. Pre-authorized: git commit/push to spottedin-b and spottedin-a, openclaw.json
edits with backup, gateway restart when an item requires it, npm global installs of openclaw betas.

## REPORT SHAPE (one report, at the end)
1. Item-by-item: done / blocked / skipped, with the gate evidence (command output, URL, http code)
2. Chrome CDP root cause found and which control path now works
3. Measured numbers: warm `openclaw nodes list` time, prod-URL curl time, price-gate pass count
4. Anything that contradicted this packet
5. What is left + rollback per area (config .baks; GoDaddy NS restore; `b` CNAME delete; funnel
   `tailscale funnel --https=8443 off`)
