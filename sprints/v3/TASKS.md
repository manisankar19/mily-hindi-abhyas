# Sprint v3 — Tasks: School Worksheets with answers

## Status: In progress (Phases 0–2)

Rules: `sprints/v3/instruction.md`. Plan: `sprints/v3/PRD.md`.
🛑 = stop for the owner. Paper tasks (17–30) run one sub-agent per paper. That sub-agent writes only its own
`app/data/hindi-wsNN.json`, `app/assets/wsNN-*.svg` and `sprints/v3/answer-review/wsNN.md`.
Every task ends with `node build.js` still passing and the chapter1..7.json hashes unchanged (from Task 2 on).

---

## Phase 0 — Preflight and baseline

- [x] Task 1: Preflight tool and source check (P0)
  - Acceptance: `sprints/v3/preflight.md` records the versions of pdftoppm, pdftotext, node and Playwright, and whether a Devanagari font is present (`fc-list | grep -i devanagari`). It also has the count and SHA-256 of the 7 PDFs in `source/samples/` and of the 7 in `source/textbook/`, plus `git status`. No secret is printed.
  - Files: sprints/v3/preflight.md
  - Completed: 2026-10-04 — tools, 7+7 PDFs hashed, git clean apart from new files; see preflight.md

- [x] Task 2: Baseline hashes and build check (P0)
  - Acceptance: `node build.js` succeeds. `sprints/v3/preflight-hashes.json` holds the SHA-256 of `app/data/chapter1..7.json`, `app/app.js`, `app/styles.css` and `app/index.html`. `dist/index.html` contains the GANESH hash and not the plaintext. No `.env*` content appears in `dist/`. The live URL returns HTTP 200.
  - Files: sprints/v3/preflight-hashes.json, sprints/v3/preflight.md
  - Completed: 2026-10-04 — build 264.5 KB; hash-only GANESH confirmed (plaintext 0×, matches local value); no token/JWT in dist; live 200; preflight-hashes.json

- [x] Task 3: Install Devanagari font for screenshots (P0)
  - Acceptance: `fc-list | grep -i devanagari` shows Noto Sans Devanagari, or a similar font. A test Playwright screenshot of chapter 6 shows Hindi text, not boxes.
  - Files: sprints/v3/preflight.md (note)
  - Completed: 2026-10-04 — Noto Sans/Serif Devanagari installed (dnf); tests/font-check.js PASS; screenshot task3-01 shows Hindi correctly

- [x] Task 4: 🛑 Commit `source/` as the baseline (P0)
  - Acceptance: With the owner's OK, `source/samples/` and `source/textbook/` are committed unchanged. `.gitignore` adds `source/page-images/`. The commit has the session attribution lines.
  - Files: .gitignore
  - Completed: 2026-10-04 — commit e788d4b (owner go-ahead via /dev 'up to phase 3'); page images gitignored

## Phase 1 — Intake

- [x] Task 5: Render page images and textbook text (P0)
  - Acceptance: `source/page-images/wsNN-P.png` exists at 200 dpi for every page of all 7 worksheets (42 pages), and the directory is gitignored. `source/textbook-text/ch1..7.txt` comes from `pdftotext`, and each file holds that chapter's title.
  - Files: scripts/render-pages.sh, source/textbook-text/*.txt
  - Completed: 2026-10-04 — scripts/render-pages.sh: 42 page images (4/8/10/8/4/4/4); textbook-text ch1..7 (titles verified)

- [ ] Task 6: Transcribe ws01 + ws05 from page images (P0)
  - Acceptance: `source/transcripts/ws01.txt` and `ws05.txt` have every printed string in Unicode Devanagari, page by page, with printed numerals, typos and `|` kept. Every page was viewed.
  - Files: source/transcripts/ws01.txt, source/transcripts/ws05.txt

- [ ] Task 7: Transcribe ws06 + ws07 (P0)
  - Acceptance: As Task 6, for ws06 and ws07.
  - Files: source/transcripts/ws06.txt, source/transcripts/ws07.txt

- [ ] Task 8: Transcribe ws02 (8 pages) (P0)
  - Acceptance: As Task 6.
  - Files: source/transcripts/ws02.txt

- [ ] Task 9: Transcribe ws03 (10 pages) (P0)
  - Acceptance: As Task 6.
  - Files: source/transcripts/ws03.txt

- [ ] Task 10: Transcribe ws04 (8 pages) (P0)
  - Acceptance: As Task 6.
  - Files: source/transcripts/ws04.txt

- [ ] Task 11: Second independent read of all transcripts (P0)
  - Acceptance: A different agent compares each transcript with its page images word by word. `source/transcripts/SECOND-READ.md` lists every disagreement and how it was resolved, and none is left open. Unresolvable text is a hard stop.
  - Files: source/transcripts/SECOND-READ.md, source/transcripts/ws*.txt

- [ ] Task 12: Intake records and duplicate check (P0)
  - Acceptance: `source/intake.json` and `source/WORKSHEETS-INTAKE.md` give, for each paper: header lines, total, portion, every section and question pattern verbatim, the mark arithmetic (section marks summed against the total), pictures with what each question needs from them, likely paper-only items, a ⚑ estimate and the SHA-256. The ws01 vs ws05 text overlap is reported as a percentage, with the matching questions listed.
  - Files: source/intake.json, source/WORKSHEETS-INTAKE.md

- [ ] Task 13: 🛑 Gate 0: owner decisions (P0)
  - Acceptance: `sprints/v3/v3-decisions.md` records the owner's answers on: the paper list and display order; ws01/ws05 (keep both or drop one); the ओणम के रंग source (add the chapter PDF, or use passage plus general knowledge with all ⚑); which items are paper-only; and any adaptation that needs a yes.
  - Files: sprints/v3/v3-decisions.md

## Phase 2 — Schema and tooling

- [x] Task 14: Schema doc + `validate.js` with school rules and bad fixtures (P0)
  - Acceptance: `SCHEMA.md` documents the chapter and `kind:"school"` fields. `validate.js` passes on chapter1..7 with today's rules. School rules check that marks sum per block, section and printed total (in ½ units); that every objective item has `acceptable`; that every judgement item has a rubric; that `answerConfidence` is set; that spelling items have no `acceptable` other than the target unless they are ⚑; that SVG assets exist; and that alt text does not contain the answer. Each rule has a fixture in `tests/fixtures/bad-*.json` that fails it.
  - Files: SCHEMA.md, validate.js, tests/fixtures/*, package.json
  - Completed: 2026-10-04 — validator 37/37 (26 bad fixtures in tests/fixtures/validate/); `node validate.js` OK 7 papers, 400 items; SCHEMA.md. Chapter papers keep parse-only rules (as build.js)

- [x] Task 15: `scripts/fidelity.js` with fixtures (P0)
  - Acceptance: Every heading, instruction, passage, question and option in `hindi-wsNN.json` is found in `source/transcripts/wsNN.txt`. Matching normalises whitespace, `|`/`।`, quotes and dashes, but not nukta, chandrabindu or matras. Total and section marks equal the intake. Fixtures with one altered matra, one wrong section mark and one dropped question each fail. A good fixture passes.
  - Files: scripts/fidelity.js, tests/fixtures/fidelity-*
  - Completed: 2026-10-04 — fidelity 26/26 (fixtures in tests/fixtures/fidelity/): matra, word, nukta, chandrabindu, numeral, dropped item (coverage check), marks, total; normalise keeps nukta/matras/numerals

- [x] Task 16: Review-sheet generator and existing-paper hash check (P0)
  - Acceptance: `scripts/review-sheet.js` writes `sprints/v3/answer-review/wsNN.md` with ⚑ items first (question, answer, acceptable, rubric, teacherNote, answerRef), and `validate.js` fails if a sheet is stale. `scripts/check-existing.js` compares chapter1..7.json with `preflight-hashes.json`. The npm scripts `validate`, `fidelity`, `review-sheets`, `check:existing` and `test:fixtures` all work.
  - Files: scripts/review-sheet.js, scripts/check-existing.js, package.json
  - Completed: 2026-10-04 — review-sheet 10/10 (expected ws99.md by hand first); instruction/adaptation repeated per part (coordinator change); check-existing 7/7 OK

- [x] Task 17: Sub-agent brief (P0)
  - Acceptance: `sprints/v3/subagent-brief.md` gives the per-paper rules from instruction §5–7. That covers the Hindi variant list for `acceptable` and the spelling exception, the ⚑ policy (flag when in doubt), pictures and numbered blanks, the paper-only marker, the files the sub-agent may write, and the commands it must run before reporting.
  - Files: sprints/v3/subagent-brief.md
  - Completed: 2026-10-04 — sprints/v3/subagent-brief.md (+ block.marks override rule from Task 14)

## Phase 3 — Worksheets, in batches (sub-agent per paper; no-picture papers first)

Batch order is set at Gate 0. The default order is below, fewest pictures first. Each paper task's acceptance: `npm run validate`, `fidelity` and `review-sheets` pass for that paper; existing hashes are unchanged; its pictures are viewed at 2× and the picture questions can be answered from the drawing; and there is one commit per paper.

- [ ] Task 18: ws07 (ओणम के रंग, 40) per the Gate 0 decision (P0)
  - Files: app/data/hindi-ws07.json, sprints/v3/answer-review/ws07.md
- [ ] Task 19: ws06 (पाठ 4–5, 40) (P0)
  - Files: app/data/hindi-ws06.json, app/assets/ws06-*.svg, sprints/v3/answer-review/ws06.md
- [ ] Task 20: 🛑 Batch 1 coordinator re-check (not delegated) (P0)
  - Acceptance: Every ⚑ answer is re-derived from the textbook text or passage. Every non-⚑ objective item is swept for a missing ⚑ or a narrow `acceptable`. 10% of transcript lines are re-read against the images. Findings and fixes go in `sprints/v3/recheck-batch1.md`, and the brief is tightened if needed. The parent reads the ws06/ws07 sheets.
  - Files: sprints/v3/recheck-batch1.md, sprints/v3/subagent-brief.md
- [ ] Task 21: ws01 (पाठ 6–7, Aug 2025, 40) (P0)
  - Files: app/data/hindi-ws01.json, app/assets/ws01-*.svg, sprints/v3/answer-review/ws01.md
- [ ] Task 22: ws05 (पाठ 6–7, Aug 2026, 40). If Gate 0 drops it, mark it excluded. (P0)
  - Files: app/data/hindi-ws05.json, app/assets/ws05-*.svg, sprints/v3/answer-review/ws05.md
- [ ] Task 23: 🛑 Batch 2 coordinator re-check, including ws01/ws05 answer consistency for shared questions (P0)
  - Files: sprints/v3/recheck-batch2.md
- [ ] Task 24: ws04 sections 1–3 (पठन, पाठ्य पुस्तक, रचनात्मक) (P0)
  - Files: app/data/hindi-ws04.json, sprints/v3/answer-review/ws04.md
- [ ] Task 25: ws04 remaining sections (व्याकरण, शब्दावली, वर्तनी), duplicate "प्रश्न 6" kept with a teacherNote (P0)
  - Files: app/data/hindi-ws04.json, app/assets/ws04-*.svg, sprints/v3/answer-review/ws04.md
- [ ] Task 26: ws02 Set A, first half of its sections (P0)
  - Files: app/data/hindi-ws02.json, sprints/v3/answer-review/ws02.md
- [ ] Task 27: ws02 Set A, remaining sections + pictures (P0)
  - Files: app/data/hindi-ws02.json, app/assets/ws02-*.svg, sprints/v3/answer-review/ws02.md
- [ ] Task 28: ws03 Set B, प्रश्न 1–10 (P0)
  - Files: app/data/hindi-ws03.json, sprints/v3/answer-review/ws03.md
- [ ] Task 29: ws03 Set B, प्रश्न 11–21, including the picture questions (प्रश्न 13, 14, 18, word grid 15) (P0)
  - Files: app/data/hindi-ws03.json, app/assets/ws03-*.svg, sprints/v3/answer-review/ws03.md
- [ ] Task 30: 🛑 Batch 3 coordinator re-check, including Set A / Set B / Set 2 answer consistency (P0)
  - Files: sprints/v3/recheck-batch3.md

## Phase 4 — App and build

- [ ] Task 31: `build.js` discovers papers and inlines SVGs once (P0)
  - Acceptance: `CHAPTER_COUNT` is removed. Papers are read from `chapter*.json` and `hindi-ws*.json`, and the build fails on a duplicate id or invalid JSON. Each SVG is inlined once in an asset map. The GANESH behaviour is unchanged, and the build fails when GANESH is unset. `dist/index.html` holds all papers. The size is printed.
  - Files: build.js

- [ ] Task 32: Paper ids, home group and score keys (P0)
  - Acceptance: Papers are keyed by id. A "विद्यालय कार्यपत्रक" section under the chapter grid shows short label, total and progress. Worksheet scores use their own localStorage key. Existing chapter score keys and saved marks still load.
  - Files: app/app.js, app/index.html, app/styles.css

- [ ] Task 33: Answers built lazily, for all papers (P0)
  - Acceptance: `renderItem` no longer creates the `.answer` node until "उत्तर देखें" or "सभी उत्तर दिखाएँ". In practice mode the DOM has no answer text for any paper. Chapter papers look the same once an answer is revealed.
  - Files: app/app.js

- [ ] Task 34: Worksheet rendering (P0)
  - Acceptance: The page shows the printed header, labels, headings, passages, `underline` spans, pictures from the asset map with alt text, adaptation notes and a paper-only badge (यह प्रश्न छपे हुए पत्र पर करें). The chapter render is unchanged.
  - Files: app/app.js, app/styles.css

- [ ] Task 35: Checking-mode answer panel for worksheets (P0)
  - Acceptance: After reveal, the panel shows model answer, स्वीकार्य उत्तर, rubric, ⚑, teacherNote and answerRef. The disclaimer line shows once per worksheet in checking mode. None of these is in the DOM before reveal.
  - Files: app/app.js, app/styles.css

- [ ] Task 36: ½ marks, printed total and title on the result page (P0)
  - Acceptance: Marks buttons step by ½ where an item's marks are fractional or split, and show as e.g. ½, १½. The score bar, result and grade use `totalMarks`. The result title shows the worksheet title instead of "पाठ N". Chapter results are unchanged.
  - Files: app/app.js

- [ ] Task 37: Print styles for worksheets (P1)
  - Acceptance: Print emulation of a worksheet shows questions, pictures and paper-only items, and no answers, marks UI or banners.
  - Files: app/styles.css

## Phase 5 — Tests, deploy, docs

- [ ] Task 38: Playwright e2e: regression on chapter papers (P0)
  - Acceptance: Login, then chapter 6 in practice mode (no answer text in DOM), then checking mode (wrong code, right code, reveal, mark, result /100), then a reload returns to practice mode. Screenshots show Hindi correctly.
  - Files: tests/e2e.js, package.json

- [ ] Task 39: Playwright e2e: every worksheet (P0)
  - Acceptance: For each worksheet, practice mode has none of its `a`, `acceptable`, teacherNote or ⚑ strings in the DOM. Checking mode is the same before reveal; after "सभी उत्तर दिखाएँ" they are present. ½ marks work. The result total equals the printed total. All pictures load. There are no console errors, at both 390 px and 1280 px.
  - Files: tests/e2e-worksheets.js, tests/screenshots/

- [ ] Task 40: Security pass (P1)
  - Acceptance: `dist/index.html` has no plaintext GANESH, token or `.env` content. `git ls-files` contains no `.env*`. `npm audit` shows no high or critical issues. Results are noted in TASKS.
  - Files: sprints/v3/TASKS.md

- [ ] Task 41: README update (P1)
  - Acceptance: README covers the worksheet group, the steps to add a new worksheet (intake → transcript → second read → sub-agent → validate/fidelity/sheet → build), the new npm scripts, and the review-sheet rule.
  - Files: README.md

- [ ] Task 42: 🛑 Production deploy and live check (P0)
  - Acceptance: With the owner's approval, production is deployed to the existing project. The live `index.html` hash equals the tested `dist/index.html`. A live e2e on chapter 6 and one worksheet passes in both modes at both widths.
  - Files: tests/e2e-live.js

- [ ] Task 43: Walkthrough (P0)
  - Acceptance: `sprints/v3/WALKTHROUGH.md` covers instruction §14: ⚑ actual vs estimate per paper, every teacherNote, adaptations, pictures, paper-only items, second-read disagreements, PDF hashes re-checked, chapter files byte-identical and what was not verified. It states that the parent reads every review sheet before Mily uses that worksheet.
  - Files: sprints/v3/WALKTHROUGH.md
