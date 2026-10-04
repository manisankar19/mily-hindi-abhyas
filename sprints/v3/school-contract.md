# v3 shared contract: transcripts, intake, worksheet JSON, tooling interfaces

The working agreement for the agents that run in parallel during Phases 1–2. `SCHEMA.md` (Task 14) is the user-facing schema doc and must agree with this file. If something here is ambiguous, follow `sprints/v3/instruction.md`.

## Paths
| What | Path |
|---|---|
| Worksheet PDFs (read-only) | `source/samples/*.pdf` → ws01…ws07 in `ls \| sort` order |
| Page images (gitignored) | `source/page-images/wsNN-P.png` (200 dpi; P is `1`… or `01`… as pdftoppm names them) |
| Textbook text | `source/textbook-text/ch1..7.txt` |
| Transcript | `source/transcripts/wsNN.txt` |
| Second-read log | `source/transcripts/SECOND-READ.md` (one `## wsNN` section per paper) |
| Intake fragment | `source/intake/wsNN.json` |
| Merged intake | `source/intake.json` (`{ "papers": [...] }`) + `source/WORKSHEETS-INTAKE.md` |
| Worksheet JSON | `app/data/hindi-wsNN.json` |
| Pictures | `app/assets/wsNN-*.svg` (shared: `app/assets/shared-*.svg`) |
| Review sheet | `sprints/v3/answer-review/wsNN.md` |
| Good fixture (shared by all tooling tests) | `tests/fixtures/good/hindi-ws99.json`, `tests/fixtures/good/ws99.txt`, `tests/fixtures/good/intake-ws99.json`, `tests/fixtures/good/ws99.md` (expected review sheet, written by Task 16) |

## 1. Transcript format (`source/transcripts/wsNN.txt`)
These are typed from the page images in Unicode Devanagari, never from `pdftotext`.
```
=== page 1 ===
<every printed line, top to bottom, left to right, verbatim>
=== page 2 ===
...
```
- Reproduce **exactly what is printed**, including spelling, matras, nukta, chandrabindu or anusvara, numerals (Devanagari `१` vs Latin `1`, as printed), punctuation (`|` vs `।`, `?`, `!`, `-`, `–`), spacing quirks that are visible (e.g. `प्रश्न1.` with no space), and teacher typos. Never correct anything.
- Write each two-column row (e.g. `पुराना x ____    दिन x ____`) on one line, with 4+ spaces between columns.
- **Blanks / answer lines:** a printed run of `_`, `-`, `.` or `…` used as a blank or answer line is written `____` (exactly four underscores). A whole answer-line row is written as a line holding only `____`.
- **Underlined (रेखांकित) words:** `<u>शब्द</u>`. **Bold words are marked `<b>शब्द</b>` only when a question refers to them** (e.g. "गहरे शब्दों"); italic is never marked. The JSON uses `underline` for both, and fidelity strips both tags.
- **Pictures:** `[चित्र: <short English description of what is drawn; what the question needs from it>]` on its own line, where it appears.
- **Tables:** one row per line, cells separated by ` | ` (space-pipe-space). Prefix the table with a line `[तालिका]` and end it with `[/तालिका]`. A printed `|` that is a danda inside running text stays `|`.
- **Logos / school emblem:** `[चिह्न: school emblem]` only. Do not describe it further.
- **Page footer** (e.g. `Page 1 of 8`): keep as printed.
- **Illegible:** `[?अस्पष्ट: best reading?]`. Every one of these must be resolved in the second read, or it becomes a hard stop.

## 2. Intake fragment (`source/intake/wsNN.json`)
```json
{
  "ws": "ws04",
  "sourceFile": "3.1.4 _Hindi_WS_Sep '26_T-1(Set 2) 26-27.pdf",
  "sha256": "<64 hex>",
  "pdfPages": 8,
  "printedPages": "8 (as printed on the header, or null)",
  "header": ["each printed header line verbatim, as in the transcript"],
  "printedTitle": "verbatim title line",
  "shortLabel": "अर्ध-वार्षिक अभ्यास · सितंबर 2026",
  "month": "सितंबर 2026",
  "set": "Set 2 | सेट अ | null",
  "printedTotal": 80,
  "portion": "verbatim portion text",
  "chapters": [1,2,3,4,5,6,7],
  "chaptersOutsideTextbook": ["ओणम के रंग"],
  "sections": [
    { "code": "1", "heading": "verbatim section heading or \"\"", "marks": 20,
      "blocks": [
        { "label": "प्रश्न1.", "instruction": "verbatim",
          "pattern": "passage-qa | unseen-passage | poem-qa | mcq | fill-blank | one-word | short | long | vilom | paryay | sentence-making | word-formation | upsarg-pratyay | ling-vachan | muhavara | punctuation | question-forming | spelling-circle | jumbled-letters | matra | match | classify | letter | paragraph | picture-describe | picture-label | picture-match | word-grid | handwriting | table | other",
          "items": 6, "marksEach": 1, "marks": 6, "printedMarks": "verbatim bracket e.g. (1X5=5) or 10 अंक or null",
          "pictures": [ { "page": 2, "what": "what is drawn", "need": "identify | label | match | describe | decorative" } ],
          "paperOnlyLikely": false,
          "notes": "anything odd: typo, duplicate number, marks mismatch" } ] }
  ],
  "markArithmetic": "e.g. 20+10+10+15+10+10+5 = 80 = printed total ✔",
  "flagEstimate": 12,
  "issues": ["things the owner must decide"],
  "pagesViewed": [1,2,3,4,5,6,7,8],
  "secondReadDisagreements": 0
}
```

## 3. Worksheet JSON (`app/data/hindi-wsNN.json`)
This is today's chapter shape plus the school fields marked †. The chapter files stay untouched and have no `kind` field, so a missing `kind` means a chapter paper.
```json
{
  "kind": "school"†, "ws": "ws99"†, "sourceFile": "…pdf"†,
  "title": "<printed title verbatim>", "shortLabel": "…"†, "subtitle": "<free text, e.g. विद्यालय कार्यपत्रक · अगस्त 2026>",
  "header": ["<printed header lines verbatim>"]†, "portion": "<verbatim>"†, "chapters": [6,7]†,
  "totalMarks": 40,
  "disclaimer": true†,
  "sections": [
    { "code": "1", "title": "<printed section heading verbatim, or \"\" if none>", "marks": 10,
      "blocks": [
        { "num": "प्रश्न 1.", "instruction": "<verbatim>", "passage": "<verbatim, optional>", "passageType": "गद्यांश | पद्यांश | null",
          "printedMarks": "(5M)"†, "adaptation": "<Hindi note shown under the instruction, or null>"†, "picture": "ws99-q4.svg or null"†,
          "pictureAlt": "<Hindi alt text that does not give away the answer>"†,
          "items": [
            { "label": "(क)", "q": "<verbatim>", "marks": 1,
              "answerKind"†: "objective | spelling | judgement | paperOnly",
              "options"†: ["<verbatim>", "…"],            // MCQ only
              "pairs"†: [{ "left": "…", "right": "…" }],     // match only; printedRight = printed order of right column
              "printedRight"†: ["…"],
              "underline"†: ["<exact substring of q to underline>"],
              "picture"†: null, "pictureAlt"†: null,
              "a": "<model answer, Hindi>",
              "acceptable"†: ["<every other full-mark answer>"],
              "rubric"†: [{ "marks": 2, "desc": "…" }, { "marks": 1, "desc": "…" }, { "marks": 0, "desc": "…" }],
              "answerSource"†: "textbook | passage | authored",
              "answerRef"†: "पाठ 6, पृ. 62, पंक्ति 3 | प्रश्न 1 गद्यांश, वाक्य 2 | —",
              "answerConfidence"†: "ok | check",
              "teacherNote"†: null } ] } ] } ]
}
```
Rules (the validator enforces these for `kind:"school"`):
- Marks are multiples of 0.5. Item marks add up to the block marks. Block marks add up to the section marks if `printedMarks` doesn't say otherwise; the section `marks` field is authoritative. Section marks add up to `totalMarks`. `totalMarks` equals the intake `printedTotal`.
- `objective` items: `acceptable` is an array (it may be empty only when the answer is a single exact form, such as an MCQ letter). `rubric` is null.
- `spelling` items: `acceptable` must be empty unless `answerConfidence` is `"check"` and `teacherNote` explains the variant.
- `judgement` items: `rubric` has at least 2 bands, the top band equals the item marks, and the bottom band is 0. `a` holds a short model answer.
- `paperOnly` items: `rubric` is required. `adaptation` on the block, or `teacherNote` on the item, says it is done on the printed sheet.
- `answerConfidence` is required on every item. `teacherNote` is a string or null.
- Picture files exist in `app/assets/`. `pictureAlt` must not contain `a` or any `acceptable` string.
- Strings use the curly quotes `“ ” ‘ ’` only where the paper prints them. Never "correct" quotes, since fidelity normalises them anyway.

## 4. Tooling interfaces (Tasks 14–16 agents depend on each other through these)
- `validate.js [--dir app/data] [files...]` checks every `app/data/*.json` by default. A file with no `kind` gets the chapter rules exactly as today: the totals and section shape that `build.js` checks now, and nothing stricter. Prints `OK n papers, m items` or errors. Exit code 0 or 1.
  - Staleness check: for each school paper, if `sprints/v3/answer-review/wsNN.md` exists or the paper is non-fixture, the sheet must equal `require('./scripts/review-sheet.js').renderSheet(paper)`. If `scripts/review-sheet.js` doesn't exist yet, skip with a warning.
  - Intake check: if `source/intake/wsNN.json` exists, `totalMarks` equals `printedTotal`.
  - `module.exports = { validatePaper(paper, { assetsDir, intake }) → string[] errors }`.
- `scripts/fidelity.js [wsNN...] [--data dir] [--transcripts dir] [--intake dir]`:
  - `module.exports = { normalise(s), checkPaper(paper, transcriptText, intake) → string[] errors }`.
  - **Normalise:** strip `<u>`/`</u>`; drop `[चित्र: …]`, `[चिह्न: …]`, `[तालिका]`, `[/तालिका]` and `=== page N ===` lines; map `|` to `।` only when it is surrounded by Devanagari or spaces, not when it is a table cell separator ` | ` (so ` | ` becomes a single space); map curly quotes to straight; map `–` and `—` to `-`; collapse runs of `_`, `.` (3 or more), `-` (3 or more) and `…` into `____`; collapse all whitespace, including newlines, to a single space; trim. It must **not** touch nukta, chandrabindu/anusvara, matras or numerals.
  - Checked strings: `title`, every `header` line, section `title` (if non-empty), block `num` + `instruction` (as one string `num + ' ' + instruction` **or** separately, whichever is found), `passage`, item `label`, item `q`, `options[]`, `pairs[].left`, `printedRight[]`. Each normalised string must be a substring of the normalised transcript. Not checked: `adaptation`, answers, `teacherNote`, `subtitle`, `shortLabel`.
  - Also: `totalMarks` equals intake `printedTotal`; the section count and each section's marks equal the intake.
- `scripts/review-sheet.js [wsNN...]`: `module.exports = { renderSheet(paper) → string }`. It is deterministic: no dates or timestamps.
  - Layout: a title line, the source file, the total, the counts (items, ⚑), then **⚑ items first**, then all others in paper order. For each item: the location (`section title › block num › label`), the question, the model answer, acceptable answers, the rubric, answerSource and ref, and the teacherNote.
  - It writes `sprints/v3/answer-review/wsNN.md` for the given papers, or for all papers in `app/data/hindi-ws*.json`.
- `scripts/check-existing.js` compares the SHA-256 of `app/data/chapter1..7.json` with `sprints/v3/preflight-hashes.json`. Exit 0 or 1.
- npm scripts are already in `package.json`. Do not edit `package.json`; ask the coordinator.
