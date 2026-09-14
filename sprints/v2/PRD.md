# Sprint v2 — PRD: जाँच Mode Gate (Practice vs Marking)

Source of truth for detailed behavior: `sprints/v2/REQUIREMENTS-v2.md`. This PRD
translates those requirements into the concrete architecture and task breakdown for
this repo's actual current state (which differs from what REQUIREMENTS-v2.md assumed
— see Dependencies below).

## Overview
Today the deployed site shows every model answer and the marks-entry UI to whoever
opens a paper, which defeats the point of Mily writing in a paper workbook first. v2
adds a locked-by-default **अभ्यास (practice)** mode that shows only the questions, and
a secret-code-gated **जाँच (marking/checking) mode** that a separate adult unlocks to
reveal answers and enter marks. No question, passage, answer, or mark value changes —
this is purely a visibility/access change plus the build step needed to ship a secret
safely.

## Goals
- Practice mode is the default and unconditional: no answer text, no reveal buttons,
  no marks UI, no score bar, no result button reach the page unless जाँच mode is
  unlocked.
- `🔒 जाँच मोड` opens an in-page dialog; the correct code (env var `GANESH`, value
  `ganesh`) unlocks marking mode; a wrong code shows a clear Hindi error and unlocks
  nothing.
- The secret's plaintext never ships to the browser or lives in git — only its
  SHA-256 hash, injected by a build step that fails loudly if `GANESH` is unset.
- Marking-mode state lives in memory only: reload, chapter-list navigation, opening
  another chapter, and logout all return the page to practice mode.
- The whole site is still one self-contained deployed `index.html` (source files stay
  split for editability; a build step bundles them).
- `README.md` documents the secret's name/location (never its value), the two modes,
  the honest limitation that this is a deterrent not a security boundary, and the
  local build/run + redeploy steps.

## User Stories
- As Mily, I want to see only the questions when I open a paper, so I can't
  accidentally see the answer while I'm still writing in my workbook.
- As the checker (a parent), I want a code-gated marking mode, so I can go through
  Mily's workbook answer-by-answer, reveal each model answer, and enter her marks.
- As the checker, I want marking mode to end automatically when I'm done (reload,
  back to chapter list, next chapter, logout), so the site doesn't stay unlocked for
  Mily to find later.
- As whoever maintains this later, I want the secret documented by name and location
  only, so I don't have to guess where `GANESH` lives, without the code itself sitting
  in git history.

## Technical Architecture

### Current state vs. this sprint's baseline
REQUIREMENTS-v2.md was written assuming the site was already a single self-contained
`index.html` with no build step (the original v1 goal). What v1 actually deployed was
a multi-file build: `index.html` fetches `styles.css`, `app.js`, and
`data/chapter{1..7}.json` at runtime via `fetch()`. Per the repo owner's decision, this
sprint **bundles those into one file at build time**: source stays split (so papers
and styles remain easy to edit), and a new build step produces the single deployed
`dist/index.html`, satisfying REQUIREMENTS-v2 §5's "keep everything in one file" and
eliminating any future risk of a partial upload (regardless of deploy method).

### Repo layout (after this sprint)
```
hindi-abhyas-site/
├── .env.local              (git-ignored — GANESH=ganesh, plus the existing
│                             deploy-only Vercel Token line, untouched)
├── .gitignore               (new — dist/, .env.local, node_modules/, .vercel/)
├── README.md                (new — secrets table, modes, limitations, build/deploy)
├── vercel.json               (moved to repo root — buildCommand, installCommand,
│                             outputDirectory)
├── build.js                  (new — zero-dependency Node build script)
├── sprints/…                 (PRD/TASKS/WALKTHROUGH, unchanged pattern)
└── app/                       (source — deploy root's build INPUT, not served directly)
    ├── index.html             (template: <style>/<script> markers + placeholder,
    │                             unchanged Devanagari content)
    ├── styles.css             (existing rules unchanged; new rules added for the
    │                             practice banner, the जाँच dialog, and the lock
    │                             button's two states)
    ├── app.js                 (existing logic unchanged where not related to this
    │                             feature; adds mode state, dialog wiring, hashing,
    │                             visibility toggling; data loading switches from
    │                             fetch() to reading the embedded papersData blob)
    └── data/chapter1..7.json   (unchanged content — build input only, not deployed
                                  as standalone files anymore)
```

### Build step (`build.js`, run as `node build.js`, zero npm dependencies)
1. Resolve `GANESH`: prefer `process.env.GANESH` (how Vercel injects Project env
   vars at build time); for local convenience, also do a minimal manual parse of
   `.env.local` for a `GANESH=` line if the env var isn't already set (a few lines of
   `fs` + string parsing — not a dependency). The existing unrelated
   `Vercel Token = …` line in `.env.local` is left alone and ignored by this parser.
2. If `GANESH` is empty/unset → print a clear error to stderr and `process.exit(1)`
   without writing anything to `dist/`.
3. Compute `sha256(GANESH.trim())` as a 64-char lowercase hex string (Node's built-in
   `crypto` module).
4. Read `app/app.js`. Confirm it contains the placeholder token
   (`const GANESH_HASH = '__GANESH_HASH__';` or equivalent). If the placeholder is
   missing → error, `process.exit(1)`, no output written. Replace the placeholder
   (in memory only — the committed `app/app.js` keeps it) with the computed hash.
5. Read `app/index.html` as the template. Replace:
   - `<link rel="stylesheet" href="styles.css">` → `<style>` containing
     `app/styles.css` verbatim.
   - the data files → a `<script type="application/json" id="papersData">` tag
     holding `{ "1": {…chapter1…}, …, "7": {…chapter7…} }`, inserted before the app
     script.
   - `<script src="app.js"></script>` → `<script>` containing the (hash-patched)
     `app.js` content.
6. Write the assembled page to `dist/index.html`. Print a short success line (file
   size, no secret material) and exit 0.

### Client-side changes (`app/app.js`)
- `loadPaper(n)` reads chapter `n` from the embedded `#papersData` JSON blob instead
  of `fetch('data/chapterN.json')`. `paperCache` behavior is unchanged.
- New in-memory-only state: a module-level `let checkMode = false;` — never written
  to `localStorage`/`sessionStorage`/a cookie/the URL.
- `const GANESH_HASH = '__GANESH_HASH__';` — the build-time placeholder.
- Hashing: `crypto.subtle.digest('SHA-256', new TextEncoder().encode(typed.trim()))`
  → hex, compared to `GANESH_HASH` (case-sensitive exact match). If `crypto.subtle`
  is unavailable (non-secure context — see Known Pitfalls), show a clear Hindi
  message in the dialog instead of throwing.
- `#checkModeBtn` opens `<dialog id="ganeshDialog">` (native `<dialog>`, not
  `window.prompt`): Escape, the cancel button, and a backdrop click all dismiss it
  without unlocking. Wrong code: Hindi error shown inline, input cleared and
  refocused, dialog stays open. Correct code: dialog closes, `checkMode = true`,
  button label flips to `🔓 जाँच मोड बंद करें`.
- `applyMode()` toggles, based on `checkMode`: per-question reveal buttons,
  `सभी उत्तर दिखाएँ`, the marks row, `अंक मिटाएँ`, the score bar, `परिणाम देखें`,
  and the practice banner — hidden outright (not just visually dimmed), matching
  REQUIREMENTS-v2 §9 pitfall 3. `← पाठ सूची` and `🖨️ प्रश्नपत्र छापें` are
  unaffected by mode.
- `checkMode` resets to `false` (and `applyMode()` re-runs, collapsing any revealed
  answers and resetting the reveal-all toggle text) on: opening a paper
  (`openPaper()`), `backBtn`/`homeBtn` click, and `logoutBtn` click. A plain page
  reload achieves the same result for free, since the variable is in-memory only.

### Deployment
- `vercel.json` (repo root): `buildCommand: "node build.js"`,
  `installCommand` set to a no-op (no framework, no dependencies),
  `outputDirectory: "dist"`.
- The existing linked Vercel project (`mily-hindi-abhyas`, created in v1, live at
  `https://mily-hindi-abhyas-nu.vercel.app` — see v1 WALKTHROUGH for why it's not the
  bare `mily-hindi-abhyas.vercel.app` domain) is re-linked from the **repo root**
  instead of `app/`, since the build now needs to read from `app/` and write `dist/`
  at the root. Same project, same live URL — not a new project.
- `GANESH` is added once to the Vercel project's Production, Preview, and Development
  environment variables (via `vercel env add`, non-interactively, using the existing
  deploy token). Changing the code later is: update that env var, redeploy — no
  source edit.

## Out of Scope
- Any change to question/passage/answer/mark-value/section-total content in the
  seven papers.
- Changing the student login (`Mily`/`2026`), chapter list, paper layout, result
  card, or light/dark theming beyond what's needed for the new banner/dialog/button.
- Making the gate an actual security boundary (e.g., moving answers behind a
  server-side API) — explicitly deferred to a possible v3 per REQUIREMENTS-v2 §9.
- Recovering the original `mily-hindi-abhyas.vercel.app` domain from whatever other
  Vercel account currently holds it — unrelated to this sprint's scope, still
  outstanding from v1.
- Rate-limiting or retry-limiting wrong-code attempts (REQUIREMENTS-v2 §3.3: no limit
  required).

## Dependencies
- v1's deployed build (this sprint edits and re-deploys it; see v1 WALKTHROUGH.md for
  what's currently live).
- `GANESH` value (`ganesh`) supplied by the repo owner for both `.env.local` (local
  builds) and the Vercel Production/Preview/Development env vars.
- The existing `VERCEL_TOKEN` in `.env.local` (from v1) for non-interactive
  `vercel env add` and `vercel deploy`.
- No git repository exists yet in this checkout. This sprint initializes one
  (`git init`), adds `.gitignore`, and makes the "one v2 commit" required by
  REQUIREMENTS-v2 §8 the first commit — it will necessarily include the v1 baseline
  files alongside the v2 changes, since there is no prior commit to diff against.
