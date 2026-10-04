# Sprint v3 — PRD: School Worksheets with answers (`hindi-abhyas-site`)

**Instruction:** `sprints/v3/instruction.md` (source of truth for rules, gates and hard stops).
**Pattern followed:** `mily-evs-abhyas` v2 (school papers) + v3 (no answer hints).
**Owner:** Manisankar · **Written:** 2026-10-04

## Overview
Mily's school gives Hindi worksheets with no answer key. This sprint transcribes the seven
worksheets in `source/samples/` exactly as printed, writes an answer key for every question
(using the वीणा textbook in `source/textbook/`, the printed passages, or a rubric), and adds the
worksheets to the site as a **विद्यालय कार्यपत्रक** group under the seven chapter papers.
Mily writes on paper in अभ्यास mode. A parent unlocks जाँच mode with the existing code
and marks each answer, with ⚑ on answers worth a second look.

## Goals
- All usable worksheets (7, fewer if any is a duplicate at Gate 0) are on the site, and every string matches a
  double-checked Unicode transcript of the printed page (`scripts/fidelity.js` hard-fails otherwise).
- Every item has a model answer. Objective items have a wide `acceptable` list. Judgement items have a band
  rubric scaled to the printed marks. Uncertain answers are ⚑ with a `teacherNote`.
- Printed totals (40 / 80), headings, numbering and marks are kept, including ½ marks and printed mistakes.
- Practice mode shows no answer-derived content anywhere in the DOM. Checking mode shows nothing beyond the
  question and the marks row until "उत्तर देखें" is pressed.
- The seven chapter papers are byte-identical and render as before. The login and the `GANESH` gate are unchanged.
- One review sheet per worksheet (`sprints/v3/answer-review/wsNN.md`) for the parent to read before use.
- Deployed to the existing Vercel project after owner approval, and verified live.

## User Stories
- As **Mily**, I want my school worksheet on the site exactly as the teacher printed it, so practising
  at home matches what I get in class.
- As **the parent**, I want a model answer, the other acceptable answers and a rubric for every question,
  so I can mark her paper copy quickly and fairly, even where the school gave no key.
- As **the parent**, I want ⚑ on answers that rest on judgement, and a note on every printed mistake,
  so I know where to think before marking.
- As **the parent**, I want no hints on screen before I reveal an answer, so Mily can't read
  the answer off the page while I'm checking.
- As **the owner**, I want each worksheet traceable to its PDF (hash, transcript, review sheet), so a
  new worksheet can be added later by following the same steps.

## Source papers (preflight, 2026-10-04)
| ws | File | Pages | Header (from page image) | Total | Portion |
|---|---|---|---|---|---|
| ws01 | `3.1.1  Hindi_L6-7_WS.pdf` | 4 | कार्यपत्रक 2025-26, अगस्त 2025 | 40 | पाठ 6–7 |
| ws02 | `3.1.2 4-Hindi_L-1-7_WS (SetA).pdf` | 8 | कार्यपत्रक 2025-26, सेट अ, सितंबर | 80 | पाठ १–७ |
| ws03 | `3.1.3 -Hindi_L-1-7_WS (SetB).pdf` | 10 | संशोधन पत्र 2025-26, सेट ब, सितंबर | 80 | पाठ १–७ |
| ws04 | `3.1.4 _Hindi_WS_Sep '26_T-1(Set 2) 26-27.pdf` | 8 | अर्ध-वार्षिक अभ्यास प्रश्न-पत्र 2026-27, Set 2 | 80 | पाठ 1–7 |
| ws05 | `3.1.5 4_Hindi_WS_ Aug 26 L 6-7 (26-27).pdf` | 4 | कार्यपत्रक, अगस्त 2026 | 40 | पाठ 6–7 |
| ws06 | `3.1.6 4_Hindi_WS_ July 26 L 4-5.pdf` | 4 | जुलाई 2026 | 40 | पाठ 4–5 |
| ws07 | `3.1.7 4_Hindi_WS_ Sept 26.pdf` | 4 | कार्यपत्रक 2026-27, सितंबर | 40 | ओणम के रंग (not in पाठ १–७) |

Totals and portions are from a first read and are confirmed at intake.

## Technical Architecture

### Pipeline
```
source/samples/*.pdf ──pdftoppm -r 200──► page images (gitignored)
        │                                     │ typed in Unicode, then 2nd independent read
        │                                     ▼
        │                       source/transcripts/wsNN.txt ──► source/intake.json + WORKSHEETS-INTAKE.md
        │                                                              │
source/textbook/*.pdf ──pdftotext──► source/textbook-text/chN.txt ─────┤ (answers + answerRef)
                                                                       ▼
         sub-agent per worksheet ──► app/data/hindi-wsNN.json + app/assets/wsNN-*.svg
                                                                       │
   validate.js (chapter rules unchanged; kind:"school" rules) ◄────────┤
   scripts/fidelity.js (JSON strings vs transcript) ◄──────────────────┤
   scripts/review-sheet.js ─► sprints/v3/answer-review/wsNN.md ◄───────┤ (validate fails if stale)
   scripts/check-existing.js (chapter1..7.json hashes = preflight) ◄───┘
                                                                       ▼
   build.js ─► dist/index.html (one file: chapters + worksheets + SVGs once, GANESH as SHA-256)
                                                                       ▼
   Playwright e2e (local) ─► vercel deploy --prod (owner OK) ─► live check
```

### Why transcripts, not `pdftotext`
The worksheet PDFs use a legacy Word font mapping, so the text layer is scrambled (`िा` for `का`).
The page images render correctly. A typed transcript, read twice against the images, becomes the
fidelity reference. This is the EVS sp04 situation (garbled text layer, typed from images),
applied to every paper.

### Data: `app/data/hindi-wsNN.json`
This extends today's schema (`chapter`, `title`, `subtitle`, `totalMarks`,
`sections[{code,title,marks,blocks[{num,instruction,passage,passageType,items[{label,q,marks,a}]}]}]`):
```json
{
  "kind": "school", "ws": "ws04", "sourceFile": "3.1.4 _Hindi_WS_Sep '26_T-1(Set 2) 26-27.pdf",
  "title": "अर्ध-वार्षिक अभ्यास प्रश्न-पत्र (2026-27) Set 2", "shortLabel": "अर्ध-वार्षिक अभ्यास · सितंबर 2026",
  "header": ["…printed header lines…"], "totalMarks": 80, "portion": "पाठ 1 से पाठ 7",
  "sections": [{ "code": "1", "title": "पठन आधारित प्रश्न - 20 अंक", "marks": 20,
    "blocks": [{ "num": "प्रश्न1.", "instruction": "…verbatim…", "passage": "…verbatim…", "adaptation": null,
      "items": [{ "label": "4.", "q": "…", "options": ["…"], "marks": 1,
        "a": "घ) (क और ख) दोनों", "acceptable": ["…"], "rubric": null, "modelAnswer": null,
        "answerSource": "passage", "answerRef": "प्रश्न1 गद्यांश, पंक्ति 4",
        "answerConfidence": "ok", "teacherNote": null, "underline": [], "picture": null, "paperOnly": false }]}]}]
}
```
Chapter files keep their current shape and get no `kind` field. Absent `kind` means chapter.

### App changes (`app/app.js`, `app/index.html`, `app/styles.css`)
- **Home:** a new "विद्यालय कार्यपत्रक" section under the chapter grid. Its cards show the short label, the printed total and progress.
- **Paper ids:** papers are keyed by id (`1`…`7`, `ws01`…), not by chapter number. The localStorage score key is per id.
  Existing chapter keys are unchanged, so Mily's saved chapter marks survive.
- **Render:** header block, printed labels, `underline` spans, picture `<img>` (inlined SVG), adaptation note,
  paper-only badge ("यह प्रश्न छपे हुए पत्र पर करें").
- **Checking mode:** the answer panel gains स्वीकार्य उत्तर, rubric, ⚑, `teacherNote`, `answerRef`. The disclaimer line
  appears once per worksheet in checking mode. None of these are built until the answer is revealed.
- **Marks:** buttons go 0, ½, 1 … when an item has fractional or split marks. The score bar, result and grade use
  `totalMarks` (already partly done in `updateScore`). The result title uses the paper title instead of "पाठ N".
- **Practice mode:** answers are no longer in the DOM until reveal. Today `renderItem` builds the hidden `.answer`
  node up front, so it is built lazily on "उत्तर देखें" for all papers. Chapter papers look the same.

### Build (`build.js`)
- Replace `CHAPTER_COUNT` with discovery of `app/data/chapter*.json` + `hindi-ws*.json`. Validate each file, and
  fail on duplicate ids.
- Inline each referenced SVG once (an id → data map), so worksheets that share a picture don't duplicate it.
- The `GANESH` handling, the placeholder check and the fail-loudly behaviour are unchanged. Add a check that no `.env*` content is
  read into the output.

### Tooling and tests (new)
- `package.json` with dev-only dependencies (Playwright). Vercel's `installCommand` stays a no-op, and the deployed page
  stays dependency-free.
- `npm run validate | fidelity | review-sheets | check:existing | test:fixtures | test:e2e`.
- e2e: login → chapter 6 in both modes (regression) → every worksheet in practice mode (no answer text, ⚑, note
  or acceptable in the DOM) → checking mode before and after reveal → ½ marks → result total = printed total →
  pictures load → print emulation. It needs a Devanagari font on the host for meaningful screenshots.

### Deploy
Same Vercel project (`mily-hindi-abhyas`, live at `https://mily-hindi-abhyas-nu.vercel.app`) and the same `GANESH`
env var. Deploy to production only after the owner approves. After the deploy, check that the live `index.html` hash
equals the tested build, then run the live e2e on one chapter and one worksheet.

## Phases and gates
1. **Preflight + baseline:** tools, hashes, build OK, commit `source/` (owner OK).
2. **Intake:** page images, transcripts with a second read, `intake.json`, duplicate check. **Gate 0:** paper list
   and order, `3.1.1` vs `3.1.5`, the ओणम के रंग source, paper-only items.
3. **Tooling:** validator school kind + fixtures, fidelity + fixtures, review-sheet generator, existing-hash check.
4. **Worksheets in batches** (no-picture papers first; one sub-agent per paper; then the coordinator re-check).
   **Gate after each batch:** the parent reads the review sheets.
5. **App + build** changes, plus e2e.
6. **Deploy gate:** production deploy, then the live check.
7. **Walkthrough** (§14 of the instruction).

Detailed atomic tasks go in `sprints/v3/TASKS.md` (next step).

## Out of Scope
- Changing any question, answer or mark in the seven chapter papers.
- On-screen answering or auto-marking. Mily still writes on paper, and the parent marks.
- Making the जाँच gate a real security boundary. Answers stay in the static page, as accepted in v2.
- Recovering the `mily-hindi-abhyas.vercel.app` domain (carried over from v1).
- Worksheets beyond the seven in `source/samples/`. The process is documented for future ones.

## Dependencies
- v2 is live and committed (`4f0ad65`).
- The owner's decisions at Gate 0, and the parent's review at each batch gate.
- The `GANESH` value in `.env.local` / Vercel env, and a Vercel token for deploy (never printed).
- Playwright (already used in `../mily-evs-abhyas`) and a Devanagari font installed on the build host.

## Risks
| Risk | Mitigation |
|---|---|
| Transcription errors (no usable text layer) | Second independent read, 10% coordinator re-read, fidelity fixtures |
| Too few ⚑ (EVS actual was 2–3× the estimate) | Brief requires ⚑ on any judgement, and the coordinator sweeps after each batch |
| `acceptable` too narrow for Hindi spelling/synonym variants | Explicit variant list in the instruction §7 |
| `acceptable` too wide on वर्तनी items | Validator rule: spelling items have an exact target |
| Answer hints leak before reveal | Lazy answer DOM, plus an e2e check that searches the DOM for answer strings |
| ओणम के रंग not in the textbook | Owner decision at Gate 0, with all such answers ⚑ |
