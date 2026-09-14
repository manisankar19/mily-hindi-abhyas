# Sprint v2 — Walkthrough

## Summary
Added a "जाँच mode" (marking/checking mode) gate to the हिंदी अभ्यास practice site.
The paper view now defaults to **अभ्यास (practice) mode** — questions only, no
answers, no marks UI — so Mily can't see the answer key while writing in her
workbook. A separate adult unlocks **जाँच mode** with a secret code to reveal
answers and enter marks. The code's plaintext never ships to the browser or into
git — only its SHA-256 hash, injected by a new build step. The site is also now
bundled into a single self-contained deployed `index.html` (source stays split
across `index.html`/`styles.css`/`app.js`/`data/*.json` for editability), removing
any remaining risk of a partial-file 404 regardless of deploy method.

## Architecture Overview

```
SOURCE (git-tracked, split for editability)          BUILD                DEPLOYED
┌─────────────────────────────┐                                    ┌──────────────────┐
│ app/index.html (template,    │                                    │                  │
│   __GANESH_HASH__ placeholder│    node build.js                   │  dist/index.html │
│   kept in git)                │  ──────────────▶                  │  (one file,       │
│ app/styles.css                │  1. resolve GANESH (env, or        │   ~265 KB,        │
│ app/app.js (placeholder kept) │     .env.local fallback)          │   git-ignored,    │
│ app/data/chapter1..7.json     │  2. sha256(GANESH) → hash          │   Vercel-served)  │
└─────────────────────────────┘  3. inline CSS/JS/data              └──────────────────┘
                                  4. patch hash into app.js
                                  5. fail loudly if GANESH unset
                                     or placeholder missing

BROWSER (dist/index.html, after login)
┌───────────────────────────────────────────────────────────────────┐
│ paper view                                                          │
│                                                                       │
│  checkMode = false (in-memory only, never persisted)                 │
│      │                                                                │
│      ├─ अभ्यास mode (default): questions + practiceBanner visible;   │
│      │  reveal buttons / marks row / score bar / result button       │
│      │  all .hidden = true                                           │
│      │                                                                │
│      └─ 🔒 जाँच मोड click → <dialog id="ganeshDialog">                │
│              typed code → sha256Hex() → compare to GANESH_HASH        │
│              match  → checkMode = true  → applyMode() reveals UI      │
│              no match → Hindi error, dialog stays open                 │
│                                                                        │
│  checkMode resets to false on: openPaper(), backBtn/homeBtn,          │
│  logoutBtn, and (for free) any page reload                            │
└───────────────────────────────────────────────────────────────────┘
```

## How This Sprint Was Executed
Per the user's request, this sprint ran via **multiple parallel/sequential
subagents** rather than one task at a time, coordinated as a dependency-aware
pipeline rather than blind fan-out:

1. **Parallel batch** — Tasks 2 (HTML markup), 3 (CSS), 11 (README) — three
   agents at once, since each touches a different file with no overlap.
2. **Combined sequential agent** — Tasks 4+5+6 (data loading, जाँच-mode
   state/hashing/dialog, `applyMode()` + event wiring) — deliberately run as
   *one* agent rather than three parallel ones, since all three touch
   `app/app.js` and running them concurrently would have caused edit conflicts.
3. **Sequential agent** — Task 7 (`build.js`) — depended on the final shape of
   both `app/index.html` and `app/app.js` from the steps above.
4. **Handled directly, not delegated** — Task 8 (Vercel project re-link), Task 9
   (`GANESH` env var + production deploy), and Task 12 (the final git commit).
   These touch the deploy token and live production, so they were kept under
   direct control rather than handed to a subagent.

Between each stage, the actual file contents were read and cross-checked (not
just each agent's self-report) — for example, confirming the CSS agent's claimed
class names (`.ganesh-title`, `.ganesh-form`, etc.) genuinely matched what the
parallel HTML agent had written, and doing a full manual trace of `app.js`'s new
logic against every REQUIREMENTS-v2 §3 behavior before moving on.

## Files Created/Modified

### app/index.html
**Purpose**: Page shell — added the जाँच-mode controls to the existing paper view.
**Key additions**:
- `#checkModeBtn` — toolbar button, labelled `🔒 जाँच मोड` / `🔓 जाँच मोड बंद करें`
- `#practiceBanner` — the practice-mode notice, `class="practice-banner no-print"`
- `<dialog id="ganeshDialog">` — the code-entry dialog (`#ganeshForm`,
  `#ganeshInput`, `#ganeshError`, `#ganeshCancel`, `#ganeshSubmit`)

**How it works**: A native `<dialog>` element is used (not `window.prompt`) so
Escape-to-close and a proper `::backdrop` come for free from the browser. The
`<link href="styles.css">` and `<script src="app.js">` tags were left completely
untouched, since `build.js` matches on their exact text to know what to inline.

### app/styles.css
**Purpose**: Styling for the new banner, dialog, and lock-button states.
**Key additions**: `#practiceBanner` (reuses the existing "note" visual language
from `.ph-note`), `#ganeshDialog` + `::backdrop` (modeled on the existing
`.login-card`), `.ganesh-title`/`.ganesh-form`/`.ganesh-error`/`.ganesh-actions`,
and `#checkModeBtn.on` for the unlocked state (solid accent fill, mirroring the
existing `.mk.on` mark-button convention).

**How it works**: No new CSS custom properties were introduced — everything
reuses the existing `--accent`/`--navy`/`--bad`/etc. token system, including the
existing `prefers-color-scheme: dark` block, so the new UI already respects
light/dark theming for free. `#ganeshDialog` was also added to the pre-existing
`@media print` hidden-list.

### app/app.js
**Purpose**: All जाँच-mode logic — state, hashing, the dialog, and mode toggling.
**Key additions**:
```js
let checkMode = false;                       // in-memory only — never persisted
const GANESH_HASH = '__GANESH_HASH__';        // build.js replaces this token

async function sha256Hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function applyMode() {
  const on = checkMode;
  document.querySelectorAll('#paperBody .ans-btn').forEach(b => b.hidden = !on);
  document.querySelectorAll('#paperBody .marks-row').forEach(m => m.hidden = !on);
  $('#revealAllBtn').hidden = !on; $('#resetBtn').hidden = !on;
  $('#scoreBar').hidden = !on;     $('#resultBtn').hidden = !on;
  $('#practiceBanner').hidden = on;   // inverted vs. everything else
  if (!on) { /* collapse any revealed answers, reset button text */ }
}
```
`loadPaper(n)` no longer calls `fetch()` — it reads chapter `n` from a
`<script type="application/json" id="papersData">` blob that `build.js` embeds
directly in the page, parsed once and cached.

**How it works**: `checkMode` is a plain JS variable — REQUIREMENTS-v2 was explicit
that marking mode must never touch `localStorage`/`sessionStorage`/a cookie/the
URL, so a reload wipes it for free. `applyMode()` is the single source of truth
for what's visible; it's called from `renderPaper()` (so every freshly opened
paper starts in practice mode), from the `backBtn`/`homeBtn`/`logoutBtn` handlers
(belt-and-suspenders), and from both branches of the code-check flow. The
`#checkModeBtn` click handler branches on the *current* `checkMode`: if locked, it
opens the dialog; if already unlocked, it re-locks directly without asking for the
code again (matching REQUIREMENTS-v2 §3.3's "toggles back to practice when
pressed"). The dialog's cancel button and a backdrop-click listener
(`e.target === dialog`) both close without touching `checkMode`; native `<dialog>`
Escape handling needed no extra code since nothing unlocks on that path.

### build.js (new)
**Purpose**: Zero-dependency Node script that assembles the deployed single-file
page and injects the secret's hash — the only build step this project has.
**How it works**: Resolves `GANESH` from `process.env` first, falling back to a
manual `.env.local` parse only if the env var key is entirely absent (an
*explicitly empty* `GANESH=` is treated as "set but invalid" and fails loudly,
rather than silently falling back — this distinction was worth getting right,
since silently falling back to a stale local value on a misconfigured empty env
var would defeat the "fail loudly" requirement). It computes
`sha256(GANESH.trim())`, confirms the `__GANESH_HASH__` placeholder still exists
in the committed `app/app.js` (catching the exact mistake REQUIREMENTS-v2 §9
pitfall 5 warns about), and only *then* writes `dist/index.html` — inlining
`styles.css` into a `<style>` tag, all seven chapter JSON files into a
`<script id="papersData">` blob, and the hash-patched `app.js` into a `<script>`
tag. Nothing is written to `dist/` on any failure path.

### README.md (new, repo root)
**Purpose**: The canonical (and only) project README — secrets table, the two
modes, an honest "deterrent not a security boundary" note, local build/run steps
including the `crypto.subtle`/secure-context caveat, how to edit a paper, and
deploy/rollback steps. Per the repo owner's explicit decision, it documents only
the `GANESH` env var's *name* and *where its value lives* — never the literal
value — keeping the security benefit of hashing intact.

The old `app/README.md` from v1 was **removed** during this sprint: it still told
a reader to deploy from inside `app/` with no build step, which — after this
sprint's changes — would ship a broken page (no `papersData`, an unreplaced
`__GANESH_HASH__` placeholder). Keeping two contradictory READMEs side by side
was worse than one accurate one.

### vercel.json (moved to repo root)
`buildCommand: "node build.js"`, a no-op `installCommand` (no framework, no
dependencies), `outputDirectory: "dist"`. The old `app/vercel.json` from v1 (just
`cleanUrls` + a now-irrelevant `/data/*` cache header) was removed.

## Data Flow
1. **Build time**: Vercel (or a local `node build.js`) reads `GANESH` from the
   Project's environment variables → computes its SHA-256 hash → assembles
   `dist/index.html` with the hash baked in and everything else inlined.
2. **Page load**: browser fetches the single `dist/index.html` → login (unchanged
   from v1) → chapter grid → open a paper → `renderPaper()` runs →
   `applyMode()` runs with `checkMode === false` → practice mode.
3. **Unlocking**: `🔒 जाँच मोड` → dialog → typed code hashed client-side with
   `crypto.subtle` → compared to the baked-in hash → match sets
   `checkMode = true` and calls `applyMode()` again, revealing the marking UI.
4. **Marking**: reveal buttons / marks buttons work exactly as in v1 — marks are
   still written to `localStorage` per chapter, untouched by this feature.
5. **Re-locking**: explicit toggle, `backBtn`/`homeBtn`, `logoutBtn`, or a reload
   all set `checkMode = false` and re-run `applyMode()`, collapsing any revealed
   answers.

## Verification
No browser automation tool was available in this environment (confirmed via tool
search at the start of this sprint), so verification split into two tiers —
documented in full in `sprints/v2/TASKS.md`'s Task 10 entry:

- **Directly re-verified against the live URL / independently re-run**, not just
  trusted from subagent reports: the injected SHA-256 hash (recomputed with both
  `openssl dgst` and Node's `crypto` outside any agent — exact match); the literal
  secret value's absence from the shipped page (41 case-insensitive `ganesh`
  matches individually inspected — every one an identifier/class name, never the
  bare value); the `GANESH`-unset build failure path (re-tested with both an
  explicitly empty value and a fully-absent-with-no-`.env.local`-fallback
  scenario — both correctly fail with no `dist/` output); all seven chapters'
  marks totalling exactly 100 (recomputed from the source JSON directly); and —
  beyond the 23 listed criteria — that `.env.local` (holding the deploy token and
  an OIDC JWT) was never uploaded to Vercel as part of the deployment source
  (confirmed via the deployment's file-manifest API).
- **Verified by code reading, not live interaction**: the dialog's open/close/
  wrong-code/right-code behavior, `applyMode()`'s element-hiding logic, the
  `checkMode`-reset wiring on navigation, and localStorage-backed marks
  persistence were all traced by hand against every REQUIREMENTS-v2 §3 behavior
  and found correct — but **this is not equivalent to actually clicking through
  the page**. No dialog was really opened, no mark button really pressed, no
  phone-width or dark-mode rendering actually seen, no browser console actually
  watched. This is the same honest limitation already recorded in v1's
  WALKTHROUGH.md, for the same reason (no browser tool in this environment).

## Security Measures
- Secret code (`GANESH`) never committed to git and never shipped to the browser
  in plaintext — only its SHA-256 hash, computed server-side at build time.
- The committed `app/app.js` keeps the `__GANESH_HASH__` placeholder; `build.js`
  refuses to build if that placeholder is missing, catching the specific mistake
  of a prior build accidentally baking a hash back into the committed source.
- `build.js` fails loudly (non-zero exit, no `dist/` output) if `GANESH` is unset
  or empty, rather than silently shipping an unlockable or default-coded page.
- Marking-mode unlock state lives in memory only — never in `localStorage`,
  `sessionStorage`, a cookie, or the URL — so it cannot survive a reload or be
  shared/bookmarked.
- `.env.local` (deploy token + `GANESH` for local builds) stays git-ignored and
  was confirmed absent from the actual Vercel deployment's uploaded source.
- **Explicitly not a real security boundary** (documented plainly in README.md,
  per REQUIREMENTS-v2 §9.2): the model answers are embedded directly in the
  shipped page, so anyone using browser dev tools can read them without ever
  entering the code. This is an accepted trade-off for a fully static,
  zero-server site — the gate stops a nine-year-old from stumbling onto the
  answer key, nothing more. An airtight version would require moving answers
  behind a server-side API, which is out of scope for this sprint.

## Known Limitations
- No live browser click-through was performed (see Verification above) — a real
  session (log in, try a wrong code then the right one, mark a question, reload,
  print-preview, check at phone width in both themes) is recommended before
  treating this as fully proven.
- The production URL is still `mily-hindi-abhyas-nu.vercel.app`, not the
  originally-intended bare `mily-hindi-abhyas.vercel.app` — that domain remains
  held by a different, inaccessible Vercel account (unresolved carry-over from
  v1, out of this sprint's scope).
- The final `sprints/v2/TASKS.md` status edits (marking Task 12 itself done) were
  deliberately left **uncommitted** — REQUIREMENTS-v2 §8 asked for exactly one
  commit covering the feature work, and Task 12's own completion note can't
  logically be part of the commit it's describing. The user can commit this
  small follow-up themselves, or ask for it to be included next time.
- No rate limit on wrong-code attempts (REQUIREMENTS-v2 §3.3 explicitly says none
  is required, so this is by design, not an oversight).

## What's Next
- A real browser click-through of the full acceptance checklist, the first time
  a browser tool is available (or done manually by the user).
- Decide whether to pursue recovering `mily-hindi-abhyas.vercel.app` from
  whichever account currently holds it, carried over from v1.
- If the "deterrent, not security boundary" trade-off ever becomes insufficient,
  a v3 could move answers behind a small server-side API instead of embedding
  them in the page — noted in REQUIREMENTS-v2 §9.2 as the natural next step, not
  attempted here.
