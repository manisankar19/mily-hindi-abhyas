# हिंदी अभ्यास — v2 Requirements

**Repo:** `/home/ec2-user/research/projects/home-application/mily/hindi-abhyas-site`
**Live:** https://mily-hindi-abhyas.vercel.app
**Workflow:** `/prd` to plan and write `task.md`, then `/dev` to execute, then `/walkthrough`.

---

## 1. Why this change

Mily writes her answers in a paper workbook. Today the site shows the answer key to
anyone who opens a paper, so she can see an answer while she is still writing it.

From v2, a **separate adult checks her workbook afterwards** and enters the marks.
So the answer key and the marks entry must both be **closed to the student** and
opened only by the checker, using a secret code.

The question paper itself must stay exactly as it is. This is a gating change, not a
content change.

---

## 2. Scope

**In scope:** how answers and marks are shown, a secret-code gate, a build step to
inject the secret's hash, README documentation, a git commit.

**Out of scope — must not change:**

- Any question, passage, model answer, mark value or section total in the seven papers.
  Do not regenerate, retranslate, reword, reformat or "improve" any Devanagari text.
- The login (`Mily` / `2026`).
- Chapter list, paper layout, result card, print behaviour, light/dark theming.
- The live URL.

---

## 3. Two modes

The paper screen gets two modes. **Practice is the default.** Nothing the student can
do reaches marking mode without the code.

### 3.1 अभ्यास mode (practice) — the default

The student sees the question paper and nothing else:

- Every question, passage, label and per-question mark value: **visible as today**.
- Per-question `👁 उत्तर देखें` button: **not shown**.
- `सभी उत्तर दिखाएँ`: **not shown**.
- Marks buttons (`मेरे अंक: ० १ २ …`): **not shown**.
- `अंक मिटाएँ`: **not shown**.
- The bottom score bar (प्राप्तांक / जाँचे गए प्रश्न): **not shown**.
- `परिणाम देखें`: **not shown**.
- `← पाठ सूची` and `🖨️ प्रश्नपत्र छापें`: **still shown**.
- A short banner explains the mode, e.g.
  `✍️ अभ्यास मोड — उत्तर अपनी उत्तर-पुस्तिका में लिखिए। उत्तर और अंक जाँच के समय ही दिखाई देंगे।`

### 3.2 जाँच mode (marking) — unlocked with the code

Everything above returns: per-question reveal, `सभी उत्तर दिखाएँ`, marks buttons,
score bar, `अंक मिटाएँ`, `परिणाम देखें`. The practice banner disappears.

The per-question reveal is deliberately kept **in this mode** — the checker goes
question by question through the workbook and wants one answer at a time.

### 3.3 Entering and leaving

- A button in the paper toolbar, labelled `🔒 जाँच मोड`, opens a small dialog asking
  for the secret code. Use an in-page dialog, not `window.prompt`.
- Wrong code: a clear Hindi error in the dialog, field cleared, dialog stays open,
  nothing unlocks. No limit on retries is required.
- Correct code: dialog closes, the paper switches to marking mode, button becomes
  `🔓 जाँच मोड बंद करें` and toggles back to practice when pressed.
- Dialog can also be dismissed with Escape, the cancel button, or a click on the backdrop.

**Marking mode must be held in memory only.** It must NOT be written to
localStorage, sessionStorage, a cookie, or the URL. It must end automatically on:
page reload, going back to the chapter list, opening another chapter, and logging out.
When it ends, any answers already revealed must be hidden again.

Marks that were entered stay saved as they are today (localStorage) and are unaffected
by locking and unlocking.

---

## 4. The secret code

- Value: `ganesh`
- Environment variable name: `GANESH`

Requirements:

1. The code's **plain value must never appear in `index.html`, in the repository, or in
   anything served to the browser.** Only its SHA-256 hash ships.
2. The value is supplied by the environment variable `GANESH` — set in Vercel
   (Project → Settings → Environment Variables, for Production, Preview and Development)
   and in a local, git-ignored `.env.local` for local builds.
3. A build step reads `GANESH`, computes the SHA-256 hash, and injects it into the page
   in place of a placeholder token. The committed `index.html` keeps the placeholder.
4. **The build must fail loudly (non-zero exit) if `GANESH` is not set, or if the
   placeholder is missing from `index.html`.** Never ship a page with an empty,
   default or guessable code, and never silently ship one that cannot be unlocked.
5. Verification in the browser hashes what the user typed and compares it with the
   injected hash. Comparison is exact — case-sensitive, surrounding whitespace trimmed.
6. Changing the code later must require only editing the Vercel environment variable
   and redeploying. No source edit.

---

## 5. Build and deployment

The site is currently a single self-contained `index.html` deployed as a static site
with no build step. v2 adds the smallest build step that does the job.

- Keep everything in one self-contained file. Do not split the CSS, the JavaScript or
  the seven papers back into separate files — that is what broke the first deployment.
- The committed `index.html` is the template, with the placeholder in it.
- The build writes the finished page into a build output directory.
- Put the build command and output directory in `vercel.json` so the deployment keeps
  working without anyone changing settings in the Vercel dashboard. The only manual step
  should be adding the `GANESH` environment variable once.
- No runtime dependencies. The install step should be a no-op — do not add a framework.
- Git-ignore the build output, `.env.local`, `node_modules/` and `.vercel/`.

---

## 6. README.md

Create or update `README.md` at the repo root. It must contain a clearly marked
**Secrets** section, plus enough for someone returning in six months:

- A table of every secret and credential the project has — for each: the name, where the
  value lives, and what it controls. Cover both:
  - `GANESH` — unlocks जाँच mode (answers + marks). Value lives in the Vercel
    environment variable and in the local `.env.local`.
  - The student login `Mily` / `2026` — note plainly that this is **client-side only and
    is not a security control**; it keeps the page tidy, it does not protect anything.
- How to change the code: update the Vercel env var, redeploy, done.
- An honest note on what the gate does and does not do — see §9.
- Local development: how to build and run it locally, and the https/localhost caveat
  from §9.
- How to edit a question or a model answer, and the rule that every section's marks must
  still sum to its declared total and each paper to 100.
- Deploy and rollback steps.

> Decision needed from the repo owner: whether to also write the literal value `ganesh`
> into README.md. It is committed to git, so writing it there puts the code back in the
> repository and cancels most of the benefit of the environment variable. The
> recommendation is to document the **name and location** in README and keep the value in
> Vercel and `.env.local` only. Follow whatever the owner decides.

---

## 7. Acceptance criteria

Test on the deployed URL, or locally over `http://localhost` (see §9).

**Practice mode (fresh load, no code entered):**

1. Log in, open any chapter. Every question and passage renders as before.
2. No `👁 उत्तर देखें` button is visible or clickable anywhere on the page.
3. No `सभी उत्तर दिखाएँ`, no marks buttons, no `अंक मिटाएँ`, no score bar,
   no `परिणाम देखें`.
4. The practice banner is visible.
5. No answer text is present in the rendered, visible page.

**The gate:**

6. Pressing `🔒 जाँच मोड` opens the dialog.
7. A wrong code shows an error and unlocks nothing.
8. The correct code closes the dialog and reveals the marking controls.

**Marking mode:**

9. Per-question reveal shows exactly the right answer for that question, and hides again.
10. `सभी उत्तर दिखाएँ` reveals every answer, and its second press hides them.
11. Giving every question its full marks totals exactly **१०० / १००** in the score bar.
12. `परिणाम देखें` shows the section-wise result card.

**Re-locking:**

13. Pressing `🔓 जाँच मोड बंद करें` hides answers and marks again, and any revealed
    answer is collapsed.
14. Going back to the chapter list and opening a chapter starts in practice mode.
15. Reloading the page starts in practice mode.
16. Marks entered while unlocked survive a reload and still show on the chapter card.

**Secret:**

17. `view-source` of the deployed page contains **no occurrence of the literal code**.
    Note the env-var *name* `GANESH` may legitimately appear in a comment — that is fine;
    what must not appear is the value.
18. The deployed page contains a 64-character hex SHA-256 hash where the placeholder was.
19. Running the build with `GANESH` unset exits non-zero and writes no output.

**No regressions:**

20. `🖨️ प्रश्नपत्र छापें` still prints the question paper **without** answers, and
    without the practice banner or the dialog.
21. Works at phone width (~390px) with no horizontal scrolling, in both light and dark.
22. No JavaScript errors in the browser console.
23. All seven chapters still load and still total 100 marks each.

---

## 8. Git

- Commit everything as one v2 commit on the current branch.
- Confirm `.env.local` is **not** staged before committing.
- Suggested message:

  ```
  feat: gate answer key and marks behind जाँच mode secret code

  Practice mode is now the default: the paper shows questions only, with no
  answer buttons, no marks entry and no score bar, so the student cannot see
  the answer key while writing in her workbook.

  A checker unlocks जाँच mode with a secret code to reveal answers and enter
  marks. The code is supplied by the GANESH environment variable and only its
  SHA-256 hash is injected into the page at build time, so the value is never
  committed and never readable in view-source. Marking mode is held in memory
  only and ends on reload, on leaving the paper and on logout.
  ```

- Push if a remote is configured. Redeploy and re-run §7 against the live URL.

---

## 9. Known pitfalls

1. **`crypto.subtle` needs a secure context.** SHA-256 in the browser is unavailable on
   `file://` and on plain `http://` with an IP address. It works on `https://` and on
   `http://localhost`. So test locally by serving the build over `localhost`, not by
   double-clicking the file. Handle its absence with a clear message rather than a
   silent failure or a thrown error.

2. **This is a deterrent, not a security boundary.** The answers are in the page, so
   anyone who knows browser dev-tools can read them without the code. That is an
   accepted trade-off: it stops a nine-year-old, and it keeps the site working offline
   with no server. Say so plainly in the README rather than implying the answers are
   protected. Making it airtight would mean moving the answers to a serverless API — a
   possible v3, not this change.

3. **Hiding must remove the controls, not just the answer text.** If the marks buttons or
   reveal buttons are left in the page and only visually dimmed, they are still
   reachable. Hide them outright in practice mode.

4. **Do not let marking mode persist.** If it is stored anywhere that survives a reload,
   the student can open the site the next day and find it already unlocked.

5. **Keep the placeholder in the committed file.** If a build ever writes the hash back
   into `index.html` itself, the next build has no placeholder to replace and will fail.
