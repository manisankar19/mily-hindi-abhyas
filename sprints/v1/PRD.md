# Sprint v1 — PRD: Deploy हिंदी अभ्यास to Vercel Production

## Overview
The हिंदी अभ्यास (Class IV Hindi practice) site is content-complete — seven question
papers, login, self-marking, and results are all implemented in `app/`. A prior manual
drag-and-drop deploy to Vercel only uploaded `index.html`; `styles.css` and `app.js`
returned 404, so the page rendered unstyled and login silently failed. This sprint's
only goal is a correct production deploy of the existing build via the Vercel CLI, into
the existing `mily-hindi-abhyas` project, with verification that all files actually
serve.

## Goals
- `npx vercel deploy --prod` from `app/` pushes `index.html`, `styles.css`, `app.js`,
  and `data/*.json` into the existing `mily-hindi-abhyas` Vercel project.
- Production URL `https://mily-hindi-abhyas.vercel.app/` returns HTTP 200 and serves
  the real page (not a 404 or the old broken shell).
- `styles.css` and `app.js` are reachable at their referenced paths — no 404s.
- Login (`Mily` / `2026`) and marking flow work end-to-end in a real browser.
- A walkthrough doc records what was deployed, the verification results, and the
  redeploy steps for future paper edits.

## User Stories
- As Mily's parent, I want the practice site live at the existing URL, so Mily can
  study from any device without me re-sharing a new link.
- As Mily, I want to log in and see the styled, working app (not a plain unstyled
  page), so the practice experience matches what was built and tested locally.
- As the person maintaining this, I want a documented redeploy command, so editing a
  chapter's JSON later doesn't require rediscovering the deploy process.

## Technical Architecture
- **Stack**: Static HTML/CSS/JS, zero build step, zero dependencies.
- **Hosting**: Vercel, existing project `mily-hindi-abhyas`.
- **Deploy path**: Vercel CLI (`npx vercel deploy --prod --yes --token …`) run from
  inside `app/`, not the browser drag-and-drop flow that dropped files last time.
- **Auth for CLI**: `VERCEL_TOKEN` read from `.env.local` at the project root, never
  echoed or logged.

```
app/
 ├─ index.html   → served at /
 ├─ styles.css   → served at /styles.css   (linked from index.html)
 ├─ app.js       → served at /app.js       (linked from index.html)
 ├─ data/*.json  → served at /data/*.json  (fetched by app.js)
 └─ vercel.json  → static config (cleanUrls, cache headers for /data/*)
```

Data flow: browser loads `/` → `index.html` pulls in `styles.css` + `app.js` →
`app.js` fetches the relevant `data/chapterN.json` on chapter selection → marks are
tallied client-side, nothing is persisted server-side.

## Out of Scope
- Any edit to `index.html`, `styles.css`, `app.js`, or the chapter JSON content —
  the build is treated as finished and frozen this sprint.
- Migrating to a single self-contained `index.html` (that file does not exist in this
  checkout; deploying the current multi-file build as-is is the agreed approach).
- Custom domain setup, analytics, or auth hardening beyond the existing
  Mily/2026 login.
- CI/CD automation for future deploys (manual CLI redeploy is acceptable for now).

## Dependencies
- Existing Vercel project `mily-hindi-abhyas` (already created; this deploy targets
  it, it does not create a new project).
- `VERCEL_TOKEN` present in `.env.local` at the project root.
- Vercel CLI available via `npx vercel`.
