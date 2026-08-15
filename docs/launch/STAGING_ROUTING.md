# Staging Routing Decision

Updated: 2026-08-01 (Iteration 4)

## Verified current state

- Live host: GitHub Pages at `www.spottedin.co`.
- Pages build type: GitHub Actions workflow.
- Build workflow: `.github/workflows/deploy.yml` runs `npm ci`, `npm run build`, and uploads `dist`.
- Pages source: `main`, repository root, workflow deployment.
- Custom 404: not configured.
- HTTPS enforcement: disabled in the Pages configuration.
- Client router: `HashRouter` with Vite `base: './'`.

Evidence was read-only: local workflow/config files plus GitHub Pages and Actions API responses. No repository, Pages, DNS, or production settings were changed.

## Architecture constraint

GitHub Pages cannot rewrite arbitrary requests such as `/listing/<id>/<slug>` to the SPA entry document with an HTTP 200 response. Switching directly to `BrowserRouter` would therefore break deep links. A copied `404.html` can make the UI recover client-side, but the initial response remains HTTP 404 and is not an acceptable indexability foundation.

## Staging-ready choices

1. Use a rewrite-capable preview host for staging, then switch to `BrowserRouter` behind that staging path. This is the recommended route because category and dynamic listing URLs can return the app shell with HTTP 200.
2. Keep GitHub Pages and add a 404 recovery shim. This preserves deep-link usability but does not meet the launch indexability requirement for dynamic routes.
3. Build-time prerender every public route to static files. Categories are finite, but live listing URLs would require a reliable build-time inventory fetch and rebuild trigger whenever inventory changes.

## Decision required

Select the staging host/strategy before the router is changed. No production-only routing mutation should be made first.
