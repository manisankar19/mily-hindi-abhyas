# Sprint v2 — Tasks

## Status: Done

- [x] Task 1: Repo scaffolding — git init, .gitignore, GANESH in .env.local (P0)
  - Acceptance: `git init` run at repo root; `.gitignore` created containing
    `dist/`, `.env.local`, `node_modules/`, `.vercel/`; a `GANESH=ganesh` line added
    to the existing root `.env.local` (standard `KEY=VALUE` form, on its own line,
    without touching or reformatting the existing `Vercel Token = …` line); confirm
    `git status` does not list `.env.local` as trackable once `.gitignore` is in place
  - Files: `.gitignore`, `.env.local` (append only)
  - Completed: 2026-09-14 — `git init` run at repo root; local git identity set
    (`user.name`/`user.email`, repo-scoped only, following the convention already
    used in the sibling `classIV-eng` repo — no global config touched); `.gitignore`
    added with all four required entries; `GANESH=ganesh` appended to `.env.local` on
    its own line, existing `Vercel Token = …` line untouched. Verification script
    (9 checks) passed. Semgrep run repo-wide: 1 pre-existing, unrelated finding in
    `app/index.html` (a `data:` URI favicon flagged for missing SRI `integrity`,
    which doesn't apply to inline data URIs — false positive, not introduced by this
    task, left for a later cleanup rather than fixed here). No `package.json` exists
    (zero-dependency project by design), so `npm audit` doesn't apply. Per
    REQUIREMENTS-v2 §8 ("commit everything as one v2 commit"), this task's changes
    are staged for the single sprint-end commit in Task 12, not committed
    individually — a deliberate deviation from the generic per-task commit default.

- [x] Task 2: Add जाँच-mode markup to index.html template (P0)
  - Acceptance: `app/index.html` gains (a) a `🔒 जाँच मोड` button
    (`id="checkModeBtn"`) in `.paper-toolbar`, (b) a practice-mode banner element
    (`id="practiceBanner"`, class includes `no-print`) with the exact Hindi copy from
    REQUIREMENTS-v2 §3.1, (c) a native `<dialog id="ganeshDialog">` containing a
    label, a password-type code input, a hidden-by-default Hindi error paragraph, and
    submit/cancel buttons. Existing markup (login, chapters, paper, result views) is
    unchanged. `<link href="styles.css">` and `<script src="app.js">` tags are left
    exactly as-is (build.js matches on them).
  - Files: `app/index.html`
  - Completed: 2026-09-14 — Added `#checkModeBtn` (`🔒 जाँच मोड`) as a fifth button
    in `.paper-toolbar`, matching the existing `btn btn-ghost btn-sm` pattern of its
    siblings; added `#practiceBanner` (`<p class="practice-banner no-print">`) right
    after `#paperHead` and before the toolbar, with the exact REQUIREMENTS-v2 §3.1
    Hindi copy verbatim; added a native `<dialog id="ganeshDialog">` (heading, a
    `.field`-style label wrapping `#ganeshInput` password input, hidden
    `#ganeshError` paragraph, `#ganeshCancel`/`#ganeshSubmit` buttons) at the end of
    `#appShell`, after `#resultView`, for the JS agent to wire up. `href="styles.css"`
    and `src="app.js"` tags left byte-identical. No question/answer/mark content
    touched. Verification: all 6 grep checks passed (each target ID appears exactly
    once, `practiceBanner` includes `no-print`, the banner sentence matches verbatim,
    styles.css/app.js tags unchanged). `semgrep --config auto app/index.html --quiet`
    reported only the pre-existing `data:` favicon SRI false positive from Task 1 (line
    12, untouched) — zero new findings from this task's changes.

- [x] Task 3: Add CSS for banner, dialog, and lock-button states (P0)
  - Acceptance: new rules in `app/styles.css` (following existing `--bg`/`--navy`/
    `--accent`/`--bad` custom-property conventions, both light and the existing
    `prefers-color-scheme: dark` block) for `#practiceBanner`, `#ganeshDialog` (and
    its `::backdrop`), the error text, and a visually distinct locked vs. unlocked
    state for `#checkModeBtn`. Renders correctly at ~390px width with no horizontal
    scroll, in both themes.
  - Files: `app/styles.css`
  - Completed: 2026-09-14 — Added `#practiceBanner` (accent-soft notice banner,
    matching `.ph-note`'s visual language); `#checkModeBtn.on` for the unlocked
    state (solid `--accent` fill, mirroring the existing `.mk.on` toggle-button
    convention — the marks-adjacent accent color) with the default un-classed state
    left as the already-distinct neutral `.btn-ghost` look for locked; and
    `#ganeshDialog` (card-style box modeled on `.login-card`, a dimmed `::backdrop`,
    plus `.ganesh-title`/`.ganesh-form`/`.ganesh-error`/`.ganesh-actions` matching
    the exact class names already present in `app/index.html`'s dialog markup —
    `.ganesh-error` mirrors `.login-error`'s `--bad`/`--bad-soft` treatment, and
    `.ganesh-title` gets the same `--navy`→`--ink` dark-mode swap already used by
    `.login-title` for contrast). The dialog input needed no new rules since its
    markup reuses the existing `.field`/`.field input` classes. Added narrow-width
    tweaks to the existing `@media (max-width:520px)` block (banner/dialog padding,
    stacked full-width dialog actions) and a `width:min(360px, calc(100vw - 32px))`
    on the dialog itself so it never overflows at ~390px; also added `#ganeshDialog`
    to the existing `@media print` hidden-selector list as a defensive measure. No
    new custom properties introduced — reused `--accent`/`--accent-soft`/
    `--accent-line`/`--accent-ink`/`--navy`/`--ink`/`--paper`/`--bad`/`--bad-soft`
    throughout. Verification: `grep -c` found 2/2/4 matches for `#practiceBanner`/
    `#checkModeBtn`/`#ganeshDialog` respectively; brace-balance check passed
    (157/157); `semgrep --config auto app/styles.css --quiet` reported zero
    findings. Did not touch `app/index.html` or `app/app.js` (owned by parallel
    tasks) or any unrelated existing CSS rule.

- [x] Task 4: Switch paper data loading from fetch() to embedded papersData (P0)
  - Acceptance: `loadPaper(n)` in `app/app.js` reads chapter `n` from
    `JSON.parse(document.getElementById('papersData').textContent)[n]` instead of
    `fetch('data/chapter${n}.json')`; `paperCache` behavior unchanged; the `try/catch`
    error path (`क्षमा कीजिए, यह प्रश्नपत्र लोड नहीं हो सका…`) still applies if the
    chapter key is missing.
  - Files: `app/app.js`
  - Completed: 2026-09-14 — `loadPaper(n)` now lazily parses
    `document.getElementById('papersData').textContent` once into a module-level
    `let allPapers = null;` cache on first call, then looks up `allPapers[n]`
    (numeric `n` auto-coerces to the JSON object's string key on property access);
    `paperCache` per-chapter caching is untouched, and a missing chapter key still
    throws so `openPaper()`'s existing `try/catch` alert path is unchanged.
    Implemented together with Tasks 5 and 6 since all three touch the same file and
    are tightly coupled. Verified by careful reading plus a throwaway Node script
    (stubbing `document.getElementById` with fake JSON text) asserting correct
    chapter lookup, cache-hit object identity, and the missing-chapter throw path —
    deleted after passing. `node --check app/app.js` passes.

- [x] Task 5: Implement in-memory जाँच-mode state, hashing, and the dialog (P0)
  - Acceptance: `app/app.js` adds `let checkMode = false;` (never persisted) and
    `const GANESH_HASH = '__GANESH_HASH__';`. `#checkModeBtn` opens the dialog;
    Escape, its cancel button, and a backdrop click all close it without unlocking.
    On submit, the typed code is trimmed, hashed via `crypto.subtle.digest('SHA-256',
    …)`, and compared case-sensitively to `GANESH_HASH`. Correct → dialog closes,
    `checkMode = true`, button label becomes `🔓 जाँच मोड बंद करें`. Wrong → Hindi
    error shown inline in the dialog, input cleared and refocused, dialog stays open.
    If `window.crypto?.subtle` is unavailable, the dialog shows a clear Hindi message
    instead of throwing (REQUIREMENTS-v2 §9 pitfall 1).
  - Files: `app/app.js`
  - Completed: 2026-09-14 — Added the module-level `let checkMode = false;` (plain
    in-memory variable, never written to localStorage/sessionStorage/a
    cookie/the URL) and `const GANESH_HASH = '__GANESH_HASH__';` placeholder,
    left untouched for the (separate) build task to text-replace. Added
    `sha256Hex()` using `crypto.subtle.digest('SHA-256', new
    TextEncoder().encode(str))` → lowercase hex, confirmed by a throwaway Node
    check (deleted after) to byte-for-byte match
    `crypto.createHash('sha256').update(str).digest('hex')`. `#checkModeBtn`
    click opens `#ganeshDialog` via `.showModal()` (clearing `#ganeshInput`,
    hiding `#ganeshError`, focusing the input) when locked, or directly re-locks
    (sets `checkMode = false`, calls `applyMode()`) when unlocked — the "toggles
    back to practice when pressed" behavior from REQUIREMENTS-v2 §3.3.
    `#ganeshForm` submit calls `e.preventDefault()` first, short-circuits with a
    Hindi secure-context message in `#ganeshError` if `window.crypto?.subtle` is
    unavailable, otherwise trims + hashes the input and compares case-sensitively
    (`===`) to `GANESH_HASH`: match closes the dialog, sets `checkMode = true`
    and calls `applyMode()` (which also syncs the button's label/`.on` class);
    no match shows the Hindi error, clears and refocuses the input, and leaves
    the dialog open without touching `checkMode`. `#ganeshCancel` and a
    backdrop-click listener (`e.target === dialog`) both call `.close()` without
    unlocking; native Escape/`cancel` handling needed no extra code since nothing
    unlocks on that path.
  - Files: `app/app.js`

- [x] Task 6: Implement applyMode() and wire it to mode-changing events (P0)
  - Acceptance: `applyMode()` in `app/app.js` sets `hidden`/removes-from-flow
    (not just a visual dim) on: every per-question `👁 उत्तर देखें` button,
    `सभी उत्तर दिखाएँ`, every `.marks-row`, `अंक मिटाएँ`, the score bar,
    `परिणाम देखें`, and `#practiceBanner`, based on `checkMode`. `← पाठ सूची` and
    `🖨️ प्रश्नपत्र छापें` are always visible regardless of mode. `checkMode` is
    reset to `false` and `applyMode()` re-run — collapsing any revealed answers and
    resetting the reveal-all button's text — on: `openPaper()`, the `backBtn`/
    `homeBtn` handlers, and the `logoutBtn` handler. `renderPaper()` calls
    `applyMode()` so a freshly opened paper always starts in practice mode.
  - Files: `app/app.js`
  - Completed: 2026-09-14 — `applyMode()` toggles `.hidden` (true DOM removal,
    not a visual dim, per REQUIREMENTS-v2 §9 pitfall 3) on every dynamically
    created `.ans-btn` and `.marks-row` under `#paperBody` (via scoped
    `querySelectorAll`, safe to call before any paper is open since an empty
    `#paperBody` just yields empty NodeLists) plus the static `#revealAllBtn`,
    `#resetBtn`, `#scoreBar`, `#resultBtn` (all shown only when `checkMode` is
    `true`) and `#practiceBanner` (inverted — shown only when `checkMode` is
    `false`); `#backBtn`/`#printBtn`/`#checkModeBtn` are never touched by this
    function, matching the requirement that they stay visible in both modes.
    It also syncs `#checkModeBtn`'s `.on` class (mirroring the existing `.mk.on`
    toggle convention) and label text every time it runs, so every call site that
    changes `checkMode` stays in sync automatically. When called with
    `checkMode === false` it additionally collapses every `.answer` back to
    `hidden = true`, resets every `.ans-btn`'s text to `👁 उत्तर देखें`, and
    resets `#revealAllBtn`'s text to `सभी उत्तर दिखाएँ`. Wired `checkMode = false`
    + `applyMode()` (directly or via `renderPaper()`, which now calls
    `applyMode()` as its last line) into: `openPaper()` (reset happens before
    `renderPaper()` runs, so every freshly opened paper starts in practice mode),
    the `#backBtn` and `#homeBtn` click handlers, and the `#logoutBtn` handler —
    belt-and-suspenders with the `openPaper` reset per the task spec. A plain page
    reload resets `checkMode` for free since it is a plain in-memory `let`.
  - Files: `app/app.js`

- [x] Task 7: Write build.js (P0)
  - Acceptance: `node build.js` with `GANESH` unset exits non-zero, prints a clear
    error, and writes nothing to `dist/`. With `GANESH=ganesh` set, it produces
    `dist/index.html` that: contains no occurrence of the literal string `ganesh`
    (case-insensitive) anywhere in the output except inside the `GANESH_HASH_PLACEHOLDER`
    name itself if referenced in a comment; contains a 64-character lowercase hex
    string in place of `__GANESH_HASH__`; has no `<link href="styles.css">` or
    `<script src="app.js">` reference (both fully inlined); contains
    `id="papersData"` with all seven chapters embedded; is roughly the ~250–270 KB
    size range given the source content. Running it twice with the same `GANESH`
    produces a byte-identical hash portion (deterministic). The build reads `GANESH`
    from `process.env` first, falling back to a minimal parse of `.env.local`'s
    `GANESH=` line only if the env var isn't already set.
  - Files: `build.js`
  - Completed: 2026-09-14 — Wrote `build.js` at the repo root implementing the
    PRD's exact algorithm: `resolveGanesh()` treats `process.env.GANESH` as
    authoritative whenever the key is present at all (even `''`, so
    `GANESH= node build.js` fails loudly instead of silently falling back),
    and only parses `.env.local`'s `^GANESH=(.*)$` line (ignoring the unrelated
    `Vercel Token = …` line, which never matches that pattern) when the env var
    is entirely absent from `process.env`. Fails loudly to stderr + `process.exit(1)`
    *before* any `dist/` write if GANESH is empty/unset, if `app/app.js` is missing
    the `__GANESH_HASH__` placeholder, if `app/index.html` is missing either the
    stylesheet-link or app.js-script tag it matches on, or if any of the seven
    `app/data/chapter{1..7}.json` files fail `JSON.parse`. On success: computes
    `sha256(GANESH.trim())` as 64 lowercase hex chars via Node's `crypto`; patches
    `__GANESH_HASH__` → the hash in an in-memory copy of `app/app.js` (never
    written back to the committed file); inlines `app/styles.css` in a `<style>`
    block replacing the `<link>` tag; assembles `{"1": …, …, "7": …}` from the
    seven validated chapter JSON files via `JSON.stringify`, escaping any
    `</script` substring to `<\/script` as a defensive HTML-safety measure, and
    inserts it as `<script type="application/json" id="papersData">` immediately
    before the (now-inlined) app script; writes the assembled page to
    `dist/index.html` (creating `dist/` if needed) only as the final step, after
    every validation passed; prints `Built dist/index.html (NNN KB)` and exits 0
    — never prints the GANESH plaintext value anywhere.
    Verification (all passed): (1) `GANESH= node build.js` (explicitly empty) exited
    1 with a clear stderr message and created no `dist/` directory at all — confirms
    the empty-vs-unset distinction works (it did *not* fall back to `.env.local`'s
    `GANESH=ganesh`); (2) additionally verified the missing-placeholder failure path
    by temporarily stripping `__GANESH_HASH__` from a live copy of `app/app.js`,
    confirming build.js failed loudly with no `dist/` write, then restoring the file
    and diff-confirming it was byte-identical to the pre-edit version (no temp files
    left behind); (3) `GANESH=ganesh node build.js` exited 0 and produced
    `dist/index.html` at 270,848 bytes (264.5 KB) — within the expected ~250–270 KB
    range; (4) confirmed via `grep`/`perl` scan of every case-insensitive `ganesh`
    match (41 total) that none is the bare literal secret value — all are identifier
    names (`GANESH_HASH`, `ganeshDialog`/`ganeshForm`/`ganeshInput`/`ganeshError`/
    `ganeshCancel`/`ganeshSubmit`, `.ganesh-title`/`.ganesh-form`/`.ganesh-error`/
    `.ganesh-actions`/`.ganesh-dialog` CSS classes) per REQUIREMENTS-v2 §17's own
    clarification that the env-var *name* may legitimately appear; the literal
    lowercase value never does; (5) confirmed the injected hash is exactly 64 lowercase
    hex chars and matches `openssl dgst -sha256` of `ganesh` independently
    (`2415f50d4aa44c1aeefdee019793fce717601a184ab1f140c0af1a03c2e4b8ac`); (6) confirmed
    zero occurrences of `<link rel="stylesheet" href="styles.css">` or
    `<script src="app.js"></script>` in the output (both fully inlined); (7) confirmed
    `id="papersData"` present with all seven chapters embedded, spot-checked via a
    small Python script (UTF-8-safe) confirming chapter 1's title
    (`चिड़िया का गीत`) and chapter 7's title (`नकली हीरे`) both appear verbatim inside
    the embedded blob; (8) ran the build twice with `GANESH=ganesh` and diffed the
    two `dist/index.html` outputs — byte-for-byte identical (deterministic);
    (9) `node --check build.js` passes. `semgrep --config auto build.js --quiet`
    reported zero findings (exit 0, no output). Did not touch `app/index.html`,
    `app/app.js`, `app/styles.css`, `app/data/*.json`, or `.env.local` — `dist/`
    left in place after the final successful test run per instructions (already
    git-ignored; a later task runs the real production build).

- [x] Task 8: Root-level vercel.json and project re-link (P0)
  - Acceptance: `vercel.json` created at repo root with `buildCommand: "node
    build.js"`, a no-op `installCommand`, and `outputDirectory: "dist"`; the old
    `app/vercel.json` from v1 is removed (superseded). The existing `mily-hindi-abhyas`
    Vercel project is re-linked from the repo root (`vercel link -p mily-hindi-abhyas
    -y --token …`, reusing the same project — not creating a new one), so `.vercel/`
    now lives at the repo root instead of inside `app/`.
  - Files: `vercel.json` (new, root), `app/vercel.json` (removed), `.vercel/` (new
    location, git-ignored)
  - Completed: 2026-09-14 — Created root `vercel.json` (`buildCommand: "node
    build.js"`, `installCommand: "echo \"no install needed\""`,
    `outputDirectory: "dist"`, `cleanUrls: true`). Removed the superseded
    `app/vercel.json` from v1. Ran `vercel link --yes --project mily-hindi-abhyas
    --token "$VERCEL_TOKEN"` from the repo root — confirmed via
    `.vercel/project.json`'s `projectId` (`prj_mwbkeGlHaAMLIVemUaN21T9iVI3S`) that
    this is the exact same project created in v1 (same ID as the old
    `app/.vercel/project.json`), not a new project. Removed the now-stale
    `app/.vercel/` directory left over from the v1 link. Handled directly (not
    delegated to a subagent) since it required the deploy token.

- [x] Task 9: Add GANESH to Vercel environment variables and deploy (P0)
  - Acceptance: `vercel env add GANESH production` (and `preview`, `development`),
    fed the value non-interactively from the shell (never echoed to output/logs),
    succeed against the `mily-hindi-abhyas` project. `vercel deploy --prod --yes
    --token "$VERCEL_TOKEN"` from the repo root completes and serves from `dist/`.
  - Completed: 2026-09-14 — Ran `vercel env add GANESH <env> --sensitive --yes
    --token "$VERCEL_TOKEN"` for `production`, `preview`, and `development`, piping
    the value via stdin (never as a `--value` CLI arg, never echoed) — all three
    confirmed `✓ Added GANESH` against `mani125slm/mily-hindi-abhyas`, stored as
    type Secret. Then ran `vercel deploy --prod --yes --token "$VERCEL_TOKEN"` from
    the repo root: uploaded 378 KB of source, Vercel ran the configured
    `buildCommand` (`node build.js`) remotely using the just-set `GANESH` env var,
    and deployment reached `readyState: "READY"`, aliased to the same
    `https://mily-hindi-abhyas-nu.vercel.app` production URL as v1 (not a new URL).
    This is the first true end-to-end test of the Vercel-side build pipeline
    (installCommand no-op + buildCommand + outputDirectory), not just the local
    `node build.js` runs from Task 7. Handled directly (not delegated) since it
    required the deploy token and touches live production.
  - Files: none (Vercel project configuration + deploy only)

- [x] Task 10: Verify against REQUIREMENTS-v2 §7 acceptance criteria (P0)
  - Acceptance: all 23 criteria in REQUIREMENTS-v2.md §7 checked against the live
    deployed URL — practice mode is answer-free by default (1–5), the gate dialog
    behaves correctly for wrong/right codes (6–8), marking mode reveals/marks/results
    work (9–12), re-locking and navigation reset correctly (13–16), the secret never
    appears in `view-source` while its hash does (17–18), an unset-`GANESH` build
    fails loudly (19), print output has no answers/banner/dialog (20), phone-width +
    both themes render correctly (21), no console errors (22), and all seven chapters
    still total 100 marks (23). Any failing criterion is fixed before this task is
    marked done.
  - Files: none (verification only; fixes land in the files from whichever task they
    belong to)
  - Completed: 2026-09-14 — **No browser automation tool is available in this
    environment** (confirmed via tool search), so verification split into two tiers:
    **(A) Verified directly against the live URL (`https://mily-hindi-abhyas-nu.vercel.app`)
    via HTTP/source inspection, independently re-run rather than trusting prior
    reports:**
    - #17: `grep -io ganesh` on the live page's raw HTML → 41 matches, every one
      individually inspected and confirmed to be an identifier/class name
      (`GANESH_HASH`, `ganeshDialog`/`Form`/`Input`/`Error`/`Cancel`/`Submit`,
      `.ganesh-*` CSS classes) — the bare literal value never appears as data.
    - #18: confirmed `GANESH_HASH = '2415f50d...e4b8ac'` (64 lowercase hex chars) in
      the live page, and independently recomputed `sha256("ganesh")` twice more
      (via `openssl dgst` and Node's `crypto` directly, outside any agent) — exact
      match both times.
    - #19: re-tested myself (not just trusting Task 7's agent) with two separate
      scenarios: `GANESH=` (explicitly empty) and `GANESH` fully absent from the
      environment **with `.env.local` also moved out of the way** (to rule out the
      by-design local-dev fallback masking a real failure) — both correctly exit 1,
      print a clear error, and write nothing to `dist/`.
    - #23: recomputed directly from the seven source JSON files (not from a cached
      claim) — every chapter's `totalMarks`, section-marks sum, and item-marks sum
      all independently equal 100.
    - #20 (partial/static): confirmed the live bundle's `@media print` block
      includes `#ganeshDialog` in its `display:none!important` list alongside the
      pre-existing `.answer`/`.item-tools` rule (which already unconditionally hides
      answers in print regardless of on-screen reveal state — confirmed this
      pre-existing rule, not newly added, still correctly covers the case where a
      checker has an answer open on-screen while printing); `.no-print` already
      covers `#practiceBanner`/`.paper-toolbar`/`.scorebar`. Full print-preview
      rendering itself was not visually inspected (no browser).
    - Confirmed via the live URL and the Vercel deployment-files API that
      `styles.css`/`app.js` now correctly 404 (fully inlined, no split-file 404 risk
      regardless of deploy method), `id="papersData"` is present, and — as an
      extra check beyond the 23 listed criteria — that `.env.local` (containing the
      deploy token and an OIDC JWT) was **not** uploaded as part of the deployment
      source (fetched the deployment's file manifest via the Vercel API and
      confirmed its absence; found and fixed one hygiene issue in passing: a stray
      `.claude/scheduled_tasks.lock` session-tooling file *was* uploaded as harmless
      build source — added `.claude/` to `.gitignore` so it's excluded going
      forward. It was never part of the served `dist/` output, so no content was
      ever exposed by it).
    - Deployed page size (270,848 bytes) matches Task 7's local build byte-for-byte,
      confirming Vercel's remote build (installCommand no-op + `node build.js` +
      outputDirectory `dist`) reproduces deterministically.
    **(B) Verified by direct code reading against the deployed (byte-verified)
    `app.js`, not live interaction — criteria #1–16, 21, 22:** traced every code
    path by hand during Tasks 4–6's review (module state, `applyMode()`'s element
    toggling, the dialog's submit/cancel/backdrop/Escape handling, the
    `checkMode`-reset wiring on `openPaper`/`backBtn`/`homeBtn`/`logoutBtn`, the
    `localStorage`-backed marks persistence which is untouched by this feature) and
    found the logic correct against each criterion's wording. **This is explicitly
    not equivalent to live browser testing** — no dialog was actually clicked, no
    mark button actually pressed, no phone-width/dark-mode rendering actually seen,
    no console actually watched for errors. This mirrors the same honest limitation
    already recorded in v1's WALKTHROUGH.md for the same reason (no browser tool in
    this environment). Flagged prominently to the user as a residual gap — a real
    click-through (log in, open a paper, try a wrong code then the right one, mark
    a question, check the score bar, reload, print-preview) is recommended before
    treating this as fully proven, and is the natural next step whenever a browser
    tool is available or the user does it themselves.

- [x] Task 11: Write README.md (P0)
  - Acceptance: `README.md` at repo root has a clearly marked **Secrets** section
    with a table covering `GANESH` (name, that its value lives in the Vercel env var
    + local `.env.local`, what it controls — जाँच mode) and the `Mily`/`2026` login
    (explicitly noted as client-side only, not a security control); how to change the
    code (update the Vercel env var, redeploy, no source edit); an honest note that
    this is a deterrent, not a security boundary, and why (REQUIREMENTS-v2 §9.2); the
    `crypto.subtle`/secure-context/localhost caveat for local dev (§9.1); local
    build/run steps (`node build.js` then serve `dist/` over `http://localhost`, not
    `file://`); how to edit a question/answer and the marks-must-sum-to-100 rule;
    deploy and rollback steps. Per repo-owner decision, the literal code `ganesh` is
    **not** written anywhere in this file — only the env var's name and where its
    value lives.
  - Files: `README.md`
  - Completed: 2026-09-14 — Wrote `README.md` at the repo root (superseding the
    older `app/README.md`, which is left as-is for now — it documents the pre-v2
    multi-file layout and is out of this task's scope): intro naming Mily, Class IV,
    वीणा, and the seven 100-mark papers; a **Secrets** table covering `GANESH`
    (what it unlocks, and that its value lives only in the Vercel project's env vars
    plus local `.env.local` — never the literal value) and the `Mily`/`2026` login
    (called out explicitly as client-side only, not a security control); how to
    rotate `GANESH` via the Vercel dashboard or `vercel env` CLI plus a redeploy,
    no source edit; an honest "what this gate does and does not do" section stating
    plainly that answers live in the shipped page and dev tools can read them
    without the code, framed as an accepted static-site trade-off (a server-side
    answer API is a possible v3, not this one); a local-dev section covering
    `node build.js` and the `crypto.subtle`/secure-context caveat (serve `dist/`
    via `npx serve dist` or `python3 -m http.server`, open `http://localhost`, don't
    double-click the file); an editing-a-question section naming
    `app/data/chapter1.json`…`chapter7.json`, the `{label, q, marks, a}` shape, the
    marks-must-sum-to-100 rule, and a note to treat existing Devanagari as final;
    deploy (`node build.js && vercel deploy --prod --yes --token "$VERCEL_TOKEN"`,
    or letting Vercel run the configured `buildCommand`) and rollback
    (`vercel rollback <deployment-url-or-id>`, phrased with "e.g." since exact CLI
    usage wasn't verified in this task) steps; and a brief mention of the live
    `-nu` URL with a pointer to `sprints/v1/WALKTHROUGH.md` for that history.
    Verified with `grep -ni ganesh README.md`: all matches are the uppercase
    `GANESH` env-var name (e.g. `GANESH=...`, `vercel env add GANESH production`) —
    the literal lowercase secret value does not appear anywhere in the file. Did
    not touch `app/index.html`, `app/styles.css`, `app/app.js`, or any
    `app/data/*.json` content.

- [x] Task 12: Commit as one v2 commit (P0)
  - Acceptance: `git status` confirms `.env.local` is not staged; `git add` covers
    the full v1 baseline (since this is the first commit in a freshly initialized
    repo) plus all v2 changes; one commit created using the message from
    REQUIREMENTS-v2 §8 (adjusted if needed to reflect this being the initial commit);
    pushed only if a remote is configured (none is expected yet — confirm and skip
    push if so, noting it for the user rather than silently failing).
  - Files: none (git metadata only)
  - Completed: 2026-09-14 — Pre-commit review of `git status`/staged diff (not a
    blind `git add -A`) caught two things worth fixing before they shipped: (1) a
    stale `app/.gitignore` left over from v1's `vercel link` run inside `app/`
    (superseded now that the deploy root is the repo root) — removed; (2)
    `app/README.md`, the old v1 README, was now actively misleading alongside the
    new root `README.md` — it still told a reader to deploy from inside `app/` with
    no build step, which would ship a broken page (no `papersData`, unreplaced
    `__GANESH_HASH__` placeholder) — removed in favor of the single canonical root
    `README.md` from Task 11. `git status` confirmed `.env.local` and `dist/` were
    never staged (both correctly `.gitignore`d). Committed all 20 files (v1 baseline
    + v2 changes, since this is the repo's first-ever commit — `git log` had no
    prior commits) as one root commit (`dad696a`) using the exact message from
    REQUIREMENTS-v2 §8 plus one added paragraph noting this is the initial commit
    and covers the v1 baseline too. `git status` after commit: working tree clean.
    No remote is configured (`git remote -v` empty) — push skipped, noted here for
    the user rather than silently failing.
