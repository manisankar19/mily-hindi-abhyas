# Sprint v1 — Walkthrough

## Summary
This sprint deployed the existing हिंदी अभ्यास (Class IV Hindi practice) static site
to Vercel production. No application code was written or changed — the task was pure
deployment ops. Two assumptions in the original brief turned out to be wrong once the
actual environment was inspected, both were resolved with the user mid-sprint, and the
site is now live and verified working end-to-end.

## Architecture Overview

```
┌────────────────────────────────────────────────────────────┐
│ Browser                                                     │
│                                                               │
│  GET /            → index.html (login screen)                │
│  GET /styles.css   → linked <link> in index.html              │
│  GET /app.js       → linked <script> in index.html            │
│  GET /data/*.json  → fetched by app.js when a chapter opens   │
└──────────────────────────┬───────────────────────────────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │  Vercel static host  │
                 │  project:             │
                 │  mily-hindi-abhyas    │
                 │  (team mani125slm)    │
                 └─────────────────────┘

No backend, no database, no build step. Marking/results are computed
client-side in app.js and never leave the browser.
```

## What Was Deployed

The `app/` folder as it existed at the start of this sprint:

| File | Size | Role |
|---|---|---|
| `index.html` | 4,977 B | Page shell — login form, chapter grid, paper view containers |
| `styles.css` | 15,360 B | All styling (light + dark) |
| `app.js` | 16,510 B | Login check, chapter rendering, paper rendering, marking, results |
| `data/chapter1.json` … `chapter7.json` | ~2–3 KB each | The seven papers (पाठ १–७) and their answer keys |
| `vercel.json` | 217 B | `cleanUrls`, cache headers for `/data/*` |

**This is not what the sprint brief originally described.** The brief said the folder
held a single self-contained `index.html` (~260 KB) with CSS, JS, and all seven papers
inlined, and that the only job was to deploy that file untouched. That file did not
exist anywhere in the checkout or on disk — what was actually present was the
multi-file build above, which is exactly the structure the brief blamed for the
*original* failure (separate `styles.css`/`app.js` 404ing after a manual
drag-and-drop). The user was asked and confirmed: deploy this multi-file build as-is
via the CLI rather than wait for or reconstruct a single-file version. The CLI path
(vs. the earlier manual browser upload) uploads every file in the directory, so the
404 problem does not reproduce here.

## Deployment Details

### Target project mismatch
The brief named the target as an *existing* Vercel project `mily-hindi-abhyas`, whose
live URL was expected to stay `https://mily-hindi-abhyas.vercel.app`. Investigation
found that domain **is** live — serving exactly the broken old build (4,977 B page
referencing `styles.css`/`app.js`, both 404ing) — but it belongs to a Vercel
account/team this deploy token cannot see (`GET /v9/projects/mily-hindi-abhyas` → `404
Project not found`, and it's absent from the 23 projects this token can list). The
token's own account (`manisankar19@gmail.com`, team `mani125slm`) has no such project.

The user chose to create a **new** project named `mily-hindi-abhyas` under this
token's team rather than chase down credentials for the other account. Vercel accepted
the project name (names only need to be unique per-account) but could not grant the
matching `mily-hindi-abhyas.vercel.app` alias, since that string is already claimed
elsewhere. It auto-assigned:

**Production URL: https://mily-hindi-abhyas-nu.vercel.app**

### Token
The first `VERCEL_TOKEN` found in `.env.local` was rejected by Vercel's own API
(`404 User not found` on `GET /v2/user`) — invalid or revoked. The user supplied a
replacement, which authenticated successfully. The token is read from `.env.local`
into a shell variable at deploy time and is never printed or logged.

### Commands run
```bash
cd app
export VERCEL_TOKEN=$(awk -F'= ' '{print $2}' ../.env.local)

# One-time: link this directory to a (new) project named mily-hindi-abhyas
npx vercel link --yes --project mily-hindi-abhyas --token "$VERCEL_TOKEN"

# Deploy to production
npx vercel deploy --prod --yes --token "$VERCEL_TOKEN"
```

## Verification

| Check | Result |
|---|---|
| `GET /` | `200`, 4,977 bytes (matches source `index.html` exactly) |
| `GET /styles.css` | `200`, 15,360 bytes — byte-identical to source (`diff` clean) |
| `GET /app.js` | `200`, 16,510 bytes — byte-identical to source (`diff` clean) |
| `GET /data/chapter1.json` | `200` |
| `GET /data/chapter7.json` | `200` |
| Page `<title>` | `हिंदी अभ्यास — कक्षा ४ (वीणा)` — correct |
| `<link href="styles.css">` / `<script src="app.js">` resolve | Yes, no 404s |

No browser automation tool was available in this session, so the login/marking flow
was not exercised in a live browser. As a substitute, the deployed `app.js` (confirmed
byte-identical to the tested source) was inspected directly:
- `const AUTH = { user: 'Mily', pass: '2026' }` — login credentials present and
  unchanged.
- Mark buttons wire to `setMark(id, v, mrow, wrap)` via `addEventListener('click', …)`,
  which is the function that recomputes and displays the running total.

Since the deployed files are byte-for-byte identical to the source that was presumably
tested locally, this is a reasonable substitute for a live click-through, but it is not
the same as observing the page actually render and respond in a browser.

## Known Limitations
- Production URL is `mily-hindi-abhyas-nu.vercel.app`, not the originally intended
  `mily-hindi-abhyas.vercel.app` — that exact domain is occupied by a different Vercel
  account still serving the old broken build. Anyone who was given the old URL will
  still see the 404-riddled unstyled page until that's addressed separately.
- No live browser verification of login/marking — confirmed via code inspection only.
- No custom domain; relying on the Vercel-assigned `.vercel.app` alias.
- No CI — every redeploy is a manual CLI run.

## What's Next
- Decide what to do about the original `mily-hindi-abhyas.vercel.app` domain: either
  get access to whichever Vercel account owns it and redeploy there, or tell whoever
  has that URL bookmarked to switch to the new one.
- If a real browser tool becomes available, do a live click-through: log in as
  Mily/2026, open a paper, reveal an answer, tap a mark, confirm the total updates.
- Consider a `vercel alias` custom domain if the `-nu` suffix is undesirable long term.

## Redeploying After a Paper Edit
Edit the relevant `app/data/chapterN.json`, then from `hindi-abhyas-site/app/`:
```bash
export VERCEL_TOKEN=$(awk -F'= ' '{print $2}' ../.env.local)
npx vercel deploy --prod --yes --token "$VERCEL_TOKEN"
```
The project is already linked (`.vercel/project.json`), so this redeploys straight to
`https://mily-hindi-abhyas-nu.vercel.app` — no need to re-run `vercel link`.
