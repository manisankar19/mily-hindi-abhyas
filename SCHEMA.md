# Paper JSON schema

Every paper the app shows is one JSON file in `app/data/`. There are two shapes:

- **Chapter papers** (`chapter1.json` … `chapter7.json`): the original पाठ १–७ practice papers. They have **no `kind` field**.
- **School worksheets** (`hindi-wsNN.json`): replicas of printed school worksheets. They have `"kind": "school"`.

`node validate.js` (or `npm run validate`) checks both. A missing `kind` means a chapter paper. This file must agree with `sprints/v3/school-contract.md` §3–4.

## 1. Chapter paper (as-is, v1/v2)

```json
{
  "chapter": 6,
  "title": "जयपुर से पत्र",
  "subtitle": "वीणा — कक्षा ४ — पाठ ६ (पत्र)",
  "totalMarks": 100,
  "sections": [
    { "code": "क", "title": "पठन पर आधारित प्रश्न", "marks": 20,
      "blocks": [
        { "num": "प्र.१", "instruction": "…", "passage": "… (optional)", "passageType": "prose | poem (optional)",
          "items": [ { "label": "(क)", "q": "…", "marks": 1, "a": "<model answer>" } ] } ] } ]
}
```

| Field | Meaning |
|---|---|
| `chapter` | Chapter number 1–7. |
| `title`, `subtitle` | Shown on the paper header. |
| `totalMarks` | Always 100 for chapter papers. |
| `sections[]` | The fixed 7-section blueprint (क–छ): `code`, `title`, `marks`, `blocks[]`. |
| `blocks[]` | `num` (प्र.१ …), `instruction`, optional `passage` + `passageType`, `items[]`. |
| `items[]` | `label`, `q`, `marks`, `a`. |

**Validation:** exactly what `build.js` checks today: the file is readable and parses as JSON. Nothing else is enforced (see Decisions). These seven files must stay byte-identical (`npm run check:existing`).

## 2. School worksheet (`kind: "school"`)

This is the chapter shape plus the school fields. "Req." means the contract requires the field; `validate.js` enforces only the rules in the table under "Validation rules" (e.g. it does not check that `answerSource` or `header` is present). "Verbatim" means it is copied exactly as printed, and `scripts/fidelity.js` checks it against `source/transcripts/wsNN.txt`.

### Paper

| Field | Req. | Meaning |
|---|---|---|
| `kind` | yes | Always `"school"`. Any other value is an error. |
| `ws` | yes | Worksheet id `wsNN` (two digits). Unique across all files. `ws99` is reserved for the test fixture. |
| `sourceFile` | yes | The PDF file name in `source/samples/`. |
| `title` | yes | Printed title line, verbatim. |
| `shortLabel` | yes | Short label for the paper picker (not checked for fidelity). |
| `subtitle` | yes | Free text, e.g. `विद्यालय कार्यपत्रक · अगस्त 2026`. |
| `header` | yes | Array of printed header lines, verbatim. |
| `portion` | yes | Printed portion text, verbatim (`""` if none). |
| `chapters` | yes | Textbook chapter numbers the paper covers (may be `[]`). |
| `totalMarks` | yes | The **printed** total (e.g. 40 or 80). |
| `disclaimer` | yes | `true`: show the "replica of a school worksheet" notice. |
| `sections[]` | yes | The paper's own sections, in printed order. |

### Section

| Field | Req. | Meaning |
|---|---|---|
| `code` | yes | Section id as printed/ordered (`"1"`, `"क"`, …). |
| `title` | yes | Printed section heading verbatim, or `""` if none. |
| `marks` | yes | Section marks. **Authoritative**: item marks must add up to it. |
| `blocks[]` | yes | Non-empty. |

### Block (one printed question, e.g. प्रश्न 1.)

| Field | Req. | Meaning |
|---|---|---|
| `num` | yes | Printed question number, verbatim (`प्रश्न 1.`). |
| `instruction` | yes | Printed instruction, verbatim. |
| `passage` | no | Printed passage/poem, verbatim. |
| `passageType` | no | `"गद्यांश"`, `"पद्यांश"` or `null`. |
| `printedMarks` | yes | The printed marks bracket verbatim (`"(5M)"`, `"(1X5=5)"`, `"10 अंक"`), or `null`. |
| `marks` | no | Explicit block total. Use it only when `printedMarks` is missing, unreadable or wrong (a teacher typo); it then overrides `printedMarks` for the block-sum check. |
| `adaptation` | yes | Hindi note shown under the instruction (e.g. "यहाँ सही शब्द लिखिए।"), or `null`. |
| `picture` | yes | Asset file name in `app/assets/` (e.g. `ws99-q5.svg`), or `null`. |
| `pictureAlt` | yes | Hindi alt text for `picture`, or `null` when there is no picture. Must not give the answer away. |
| `items[]` | yes | Non-empty. |

### Item

| Field | Req. | Meaning |
|---|---|---|
| `label` | yes | Printed sub-label (`(क)`, `(i)`), or `""`. |
| `q` | yes | Printed question, verbatim (may be `""` when the block instruction is the whole question). |
| `marks` | yes | Item marks, a multiple of 0.5. |
| `answerKind` | yes | `objective` (exact answer, auto-checkable with variants), `spelling` (one exact target), `judgement` (rubric-marked, e.g. वाक्य बनाओ, अनुच्छेद), `paperOnly` (done on the printed sheet; rubric-marked). |
| `options` | MCQ only | Printed options, verbatim. |
| `pairs` | match only | `[{ "left", "right" }]` in the correct pairing. |
| `printedRight` | match only | The right column in printed order, verbatim. |
| `underline` | no | Exact substrings of `q` that are underlined (रेखांकित) on paper. |
| `picture`, `pictureAlt` | no | Item-level picture; same rules as the block's. |
| `a` | yes | Model answer, Hindi. |
| `acceptable` | see rules | Every other full-mark answer. |
| `rubric` | see rules | `[{ "marks", "desc" }]` bands, highest first, or `null`. |
| `answerSource` | yes | `textbook`, `passage` or `authored`. |
| `answerRef` | yes | Where the answer comes from (`पाठ 6, पृ. 62, पंक्ति 3`, `प्रश्न 1 गद्यांश, वाक्य 2`, `—`). |
| `answerConfidence` | yes | `ok`, or `check` (⚑: the owner should confirm). |
| `teacherNote` | yes | A string or `null`. Explains ⚑ items, variants, typos and paper-only work. |

Curly quotes `“ ” ‘ ’` appear only where the paper prints them; never "correct" them.

### Validation rules (school papers)

Each error is printed as `<where>: [tag] message`. Every tag has a failing fixture in `tests/fixtures/validate/bad-<tag>.json` (run `node tests/fixtures.test.js`).

| Tag | Rule |
|---|---|
| `kind` | `kind` is `"school"` (or absent, for a chapter paper). |
| `ws-id` | `ws` matches `wsNN`. |
| `duplicate-ws` | No two files share a `ws` id (checked across all files). |
| `shape` | `sections`, `blocks` and `items` are non-empty arrays of objects. |
| `marks-half` | `totalMarks`, section/block/item marks and rubric band marks are numbers ≥ 0 and multiples of 0.5. |
| `block-sum` | Item marks add up to the block total: `block.marks` if present, else the number read from `printedMarks` (the number after the last `=`, or the only number in it; Devanagari digits and `½` are understood). If neither gives a number, the check is skipped. |
| `section-sum` | Item marks in a section add up to the section `marks`. |
| `total-sum` | Section marks add up to `totalMarks`. |
| `intake-total` | `totalMarks` equals `printedTotal` in `source/intake/wsNN.json` (when that file exists). |
| `answer-kind` | `answerKind` is one of the four kinds. |
| `answer-confidence` | `answerConfidence` is `"ok"` or `"check"` on every item. |
| `teacher-note` | `teacherNote`, if present, is a string or `null`. |
| `objective-acceptable` | An `objective` item has an `acceptable` array (empty only for a single exact form, such as an MCQ letter). |
| `objective-rubric` | An `objective` item has `rubric: null`. |
| `spelling-acceptable` | A `spelling` item's `acceptable` is empty, unless `answerConfidence` is `"check"` **and** `teacherNote` explains the variant. |
| `judgement-rubric` | A `judgement` item has a rubric of ≥ 2 `{marks, desc}` bands. |
| `judgement-answer` | A `judgement` item has a non-empty short model answer in `a`. |
| `rubric-top` | The highest rubric band equals the item marks (judgement and paperOnly). |
| `rubric-zero` | The lowest rubric band is 0 (judgement and paperOnly). |
| `paperonly-rubric` | A `paperOnly` item has a rubric. |
| `paperonly-note` | A `paperOnly` item has a block `adaptation` or an item `teacherNote` saying it is done on the printed sheet. |
| `picture-missing` | A `picture` is a bare file name that exists in `app/assets/`. |
| `picture-alt` | A `picture` has a non-empty `pictureAlt`. |
| `alt-gives-answer` | `pictureAlt` does not contain `a` (of the item, or of any item in the block for a block picture). |
| `alt-gives-acceptable` | `pictureAlt` does not contain any `acceptable` string. |
| `review-sheet` | (CLI only) `sprints/v3/answer-review/wsNN.md` exists and equals `renderSheet(paper)` from `scripts/review-sheet.js`. The `ws99` fixture and anything under `tests/fixtures/` are exempt. If `scripts/review-sheet.js` does not exist, the check is skipped with a warning. |
| `json` | (CLI only) The file parses as JSON. |

"Contains", for the alt-text rules, is a whole-word match after punctuation (`। | , . ? ! " ' “ ” ‘ ’ ( ) - – —`) is turned into spaces and whitespace is collapsed. So a one-letter MCQ answer like `क` does not match inside `एक`.

## 3. Validator CLI

```
node validate.js [--dir app/data] [--assets app/assets] [--intake-dir source/intake]
                 [--review-dir sprints/v3/answer-review] [files...]
```

With no files, every `*.json` in `--dir` is checked. On success it prints `OK n papers, m items` and exits 0. Otherwise it prints one `ERROR:` line per problem to stderr and exits 1.

`require('./validate.js')` exports `validatePaper(paper, { assetsDir, intake }) → string[]`, `findDuplicateWs([{ file, paper }]) → string[]`, `parsePrintedMarks(s) → number | null` and `main(argv) → exitCode`.

## Decisions

- **Chapter papers keep the v1 rules unchanged.** `build.js` only reads and `JSON.parse`s `chapter1..7.json`; it does not check totals or section shape. So the validator applies nothing stricter to a paper without `kind`. (All seven do currently satisfy 100 = Σ sections = Σ items, but that is not enforced, so the chapter files can never be blocked by v3 tooling.) The school differences (printed totals, the paper's own sections, ½ marks) are implemented as `kind: "school"` rules, not by loosening chapter checks.
- **Section `marks` is authoritative.** Item marks are summed against it directly. Block totals are checked separately against `printedMarks` (or an explicit `block.marks`), so a single bad bracket fires only `block-sum`.
- **Teacher typos in printed marks:** keep `printedMarks` verbatim, set `block.marks` to the real total, and explain it in a `teacherNote`.
- **Rubric shape checks** (`rubric-top`, `rubric-zero`) apply to `paperOnly` rubrics as well as `judgement` ones, since both are marked by band.
- **Duplicate `ws`** is a cross-file rule, so it is reported by the CLI and `findDuplicateWs`, not by `validatePaper`.
