# Sprint v1 — Tasks

## Status: Done

- [x] Task 1: Confirm build is deploy-ready and locate Vercel project link (P0)
  - Acceptance: `app/` contains index.html, styles.css, app.js, data/*.json,
    vercel.json; confirm no stray files (old single-file build, node_modules, etc.)
    would confuse the deploy; confirm `.env.local` has a usable `VERCEL_TOKEN`
  - Result: build confirmed complete; the "self-contained single index.html" described
    in the original brief does not exist in this checkout — the multi-file build was
    deployed as-is per user decision.
- [x] Task 2: Load VERCEL_TOKEN from .env.local without echoing it (P0)
  - Result: token extracted into shell env only; never printed. First token found was
    invalid (404 from Vercel API); user supplied a replacement which validated.
- [x] Task 3: Deploy to Vercel production via CLI from app/ (P0)
  - Result: target project `mily-hindi-abhyas` did not exist under this token's
    account/team (a same-named project is already live under a *different* Vercel
    account — the exact broken build from the background). Per user decision, created
    a **new** `mily-hindi-abhyas` project under this token's team (`mani125slm`) via
    `vercel link -p mily-hindi-abhyas -y`, then `vercel deploy --prod --yes`.
    Vercel auto-assigned the alias `mily-hindi-abhyas-nu.vercel.app` since the exact
    name was taken elsewhere.
- [x] Task 4: Verify HTTP-level correctness of production URL (P0)
  - Result: `/` → 200, 4,977 bytes; `/styles.css` → 200 (15,360 bytes, byte-identical
    to source); `/app.js` → 200 (16,510 bytes, byte-identical to source);
    `/data/chapter1.json` and `/data/chapter7.json` → 200. No 404s.
- [x] Task 5: Browser verification of login + marking flow (P0)
  - Result: no browser automation tool was available in this environment. Verified
    instead by code inspection of the deployed (byte-identical) `app.js`: login
    constant `AUTH = { user: 'Mily', pass: '2026' }` confirmed, mark-button handlers
    (`setMark`) wired to update state present and unchanged.
- [x] Task 6: Write sprint walkthrough documenting deploy + redeploy steps (P0)
  - Files: WALKTHROUGH.md
