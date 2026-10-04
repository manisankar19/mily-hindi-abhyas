# हिंदी अभ्यास — कक्षा ४ (वीणा)

A static practice-paper site for Mily's Class IV Hindi (वीणा textbook). It holds
seven fixed question papers (पाठ १–७), 100 marks each, with a model answer for
every question.

Since v3 it also holds the **school's own worksheets** ("विद्यालय कार्यपत्रक",
7 papers, 40 or 80 marks), copied exactly as printed, with answer keys written
for practice — the school gave none. See [School worksheets](#school-worksheets-v3).

Since v2, the paper screen has two modes:

- **अभ्यास (practice) mode** — the default. Mily sees only the questions. No
  answers, no reveal buttons, no marks entry, no score bar.
- **जाँच (marking/checking) mode** — unlocked with a secret code by whoever
  checks her paper workbook afterwards. It reveals model answers one question
  at a time and lets the checker enter marks.

The whole thing is a single self-contained static page with no server and no
database — everything runs in the browser. Source files are split for
editability (`app/`); a small build step (`build.js`) bundles them into one
deployed `dist/index.html`.

---

## Secrets

| Name | What it controls | Where the value lives |
|---|---|---|
| `GANESH` | Unlocks जाँच mode (answer reveals + marks entry). The build injects only its **SHA-256 hash** into the shipped page — the plain value is never written to `index.html`, `dist/`, or git. | The Vercel project's environment variables (Production, Preview, and Development), and a local, git-ignored `.env.local` (`GANESH=...` line) for building locally. **The value is deliberately not written anywhere in this README** — only its name and where it lives. |
| Student login `Mily` / `2026` | Gates the login screen. | Hardcoded near the top of `app/app.js`. |

**The student login is client-side only and is not a security control.** It is
a courtesy so the page doesn't just dump straight into the chapter list — it
keeps things tidy for a nine-year-old, and does not protect anything from
anyone who opens dev tools or views source. Do not treat it as an access
control when reasoning about this app's security.

### Changing the `GANESH` code later

No source edit is needed. Either:

- In the Vercel dashboard: Project → Settings → Environment Variables → edit
  `GANESH` for Production (and Preview/Development if you keep them in sync),
  then redeploy.
- Or via the CLI, e.g.:
  ```bash
  vercel env rm GANESH production
  vercel env add GANESH production
  ```
  (repeat for `preview` / `development` as needed), then redeploy — see
  [Deploy](#deploy).

If you're rebuilding locally, also update the `GANESH=` line in your local
`.env.local`.

---

## What this gate does and does not do

Be honest with yourself about this: **जाँच mode is a deterrent, not a real
security boundary.**

The model answers are embedded in the page itself (inside the bundled
`dist/index.html`, in the `papersData` JSON blob) so that the site can stay
fully static and work offline with no backend. That means anyone who opens
browser dev tools — View Source, the Elements/Network panel, or just searching
the page's JS — can read every answer without ever typing the code. The
`GANESH` hash check only stops the casual path: a nine-year-old clicking
around the page won't stumble into the answer key.

This is an accepted trade-off for this sprint, not an oversight. A version
where the answers are genuinely inaccessible without the code would require
moving them off the client entirely — e.g. behind a server-side API that only
returns an answer after checking the code server-side. That's a real
architecture change (adds a backend where today there is none) and is
explicitly out of scope here; it's a possible future v3, not this one.

---

## Local development

### Build

```bash
node build.js
```

- Zero npm dependencies — uses only Node's built-in `crypto` module (for the
  SHA-256 hash) plus `fs`. No `npm install` required.
- Reads `GANESH` from the environment first; if it isn't set, falls back to
  parsing a `GANESH=` line out of a local `.env.local` at the repo root.
- Fails loudly (non-zero exit, nothing written to `dist/`) if `GANESH` is
  unset, or if the hash placeholder is missing from `app/app.js`.
- Discovers every paper in `app/data/` (`chapterN.json`, `hindi-wsNN.json`) —
  no hard-coded counts — and fails on invalid JSON, a duplicate or misnamed
  worksheet id, a missing picture, or an `app/worksheet-order.json` that does
  not list every worksheet exactly once.
- On success, writes the single bundled file `dist/index.html` (CSS and JS
  inlined, all papers embedded as JSON, each picture from `app/assets/`
  embedded once, the placeholder replaced with the computed hash).

### Serving `dist/` locally — don't just double-click the file

`app.js` uses `crypto.subtle.digest(...)` to hash the code typed into the
जाँच dialog. `crypto.subtle` is only available in a browser **secure
context**, which means:

- It **does not work** opening `dist/index.html` directly via `file://`.
- It **does not work** over plain `http://` on a raw IP address (e.g.
  `http://192.168.x.x`).
- It **does work** over `https://`, and over plain `http://localhost` (or
  `http://127.0.0.1`).

So after building, serve the `dist/` folder locally rather than opening the
file directly, e.g.:

```bash
npx serve dist
# or
python3 -m http.server --directory dist
```

then open `http://localhost:<port>` in the browser. If `crypto.subtle` is
genuinely unavailable, the जाँच dialog shows a clear Hindi message instead of
throwing — but testing over `localhost` avoids hitting that path at all.

---

## Editing a question or model answer

Edit the relevant source file directly — **do not** edit `dist/index.html`,
which is regenerated by the build and not committed:

```
app/data/chapter1.json
app/data/chapter2.json
...
app/data/chapter7.json
```

Each scorable item has this shape:

```json
{ "label": "(क)", "q": "…question text…", "marks": 2, "a": "…model answer…" }
```

Rules when editing:

- Every section's items must still sum to that section's declared `marks`
  total, and every paper must still total **100 marks** overall.
- **Treat the existing Devanagari content as final.** Don't reword,
  retranslate, or reformat it casually while making an unrelated edit — the
  text has already been reviewed. Content edits should be deliberate,
  intentional, and reviewed like any other change to the answer key, not a
  drive-by tidy-up.

After editing, rebuild (`node build.js`) and redeploy (see below) to publish
the change.

## School worksheets (v3)

The worksheets the school hands out, put on the site **exactly as printed**
(wording, typos, numbering, marks), with authored answers. Mily writes on paper
in अभ्यास mode; a parent checks in जाँच mode, where each answer shows the model
answer, the other acceptable answers, the marking rubric, a ⚑ when the answer
rests on judgement, and a note on any printed mistake.

**Before Mily uses a worksheet, a parent reads its review sheet**
(`sprints/v3/answer-review/wsNN.md`, ⚑ items first). The answers were written
for practice, not by the teacher.

| What | Where |
|---|---|
| Source PDFs (read-only) | `source/samples/` → ws01…ws07 in filename order |
| Typed transcripts (the PDFs' text layer is garbled) | `source/transcripts/wsNN.txt` + `second-read/` |
| Intake (sections, marks, pictures, owner issues) | `source/intake/wsNN.json`, `source/WORKSHEETS-INTAKE.md` |
| Worksheet data | `app/data/hindi-wsNN.json` (shape: `SCHEMA.md`) |
| Pictures (original SVGs) | `app/assets/` |
| Display order on the home page | `app/worksheet-order.json` |
| Review sheets | `sprints/v3/answer-review/wsNN.md` (generated) |

### Adding a new worksheet

1. Put the PDF in `source/samples/` and run `scripts/render-pages.sh` (page images, 200 dpi).
2. Type the transcript from the page images (`source/transcripts/wsNN.txt`, format in
   `sprints/v3/school-contract.md` §1), then have it checked word by word by a
   second reader; write `source/intake/wsNN.json` and run `node scripts/merge-intake.js`.
3. Author `app/data/hindi-wsNN.json` (+ any `app/assets/wsNN-*.svg`) following
   `sprints/v3/subagent-brief.md`; add the id to `app/worksheet-order.json`.
4. Run the checks below until all pass, then `node scripts/review-sheet.js wsNN`.
5. A parent reads the review sheet; then build and deploy.

### Checks and tests

`npm install` is needed only for the browser tests (Playwright, dev-only); the
build itself has no dependencies.

| Command | What it checks |
|---|---|
| `npm run validate` | every paper: marks add up (½ allowed), answer keys complete, pictures exist, alt text doesn't give the answer, review sheets up to date |
| `npm run fidelity` | every printed string in a worksheet matches its transcript exactly (matras, nukta, numerals included) |
| `npm run consistency` | a question printed in two worksheets has the same answer key in both |
| `npm run check:existing` | the seven chapter papers are byte-identical to the v3 baseline |
| `npm run test:fixtures` | the checkers themselves (bad fixtures must fail) |
| `npm run test:build` | the build (discovery, pictures once, GANESH, failure cases) |
| `npm run test:e2e` | Playwright: practice/checking modes, no answer text in the page before reveal, every worksheet at 390 px and 1280 px, ½ marks, results, print |

The browser tests build with a throw-away test code, never the real `GANESH`.

---

## Deploy

From the repo root:

```bash
node build.js && vercel deploy --prod --yes --token "$VERCEL_TOKEN"
```

`.vercelignore` limits the upload to what the build needs (`build.js`, `app/`,
`vercel.json`, `package.json`); sprint docs, source PDFs, tests and env files
are never uploaded.

Alternatively, since `vercel.json` at the repo root already declares
`buildCommand: "node build.js"` and `outputDirectory: "dist"`, you can let
Vercel run the build itself as part of a normal CLI or dashboard deploy
(`vercel deploy --prod`) without invoking `node build.js` yourself first.

### Rollback

If a deploy needs to be undone, roll back to a previous known-good deployment,
e.g.:

```bash
vercel rollback <deployment-url-or-id>
```

(list recent deployments with `vercel ls` or the Vercel dashboard to find the
one to roll back to). Alternatively, check out an earlier commit and redeploy
from it.

### Live URL

The site is live at **https://mily-hindi-abhyas-nu.vercel.app** — note the
`-nu` suffix. The bare `mily-hindi-abhyas.vercel.app` domain is currently held
by a different, inaccessible Vercel account and serves an old, broken build;
see `sprints/v1/WALKTHROUGH.md` for the history. This is unrelated to v2 and
still outstanding from v1.
