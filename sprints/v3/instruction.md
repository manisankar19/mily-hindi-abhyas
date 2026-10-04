# Instruction: School Worksheets sprint (`hindi-abhyas-site` v3)

**Your first job:** read this file, `README.md`, `build.js`, `app/app.js`, `app/data/chapter6.json` (the current paper schema) and `sprints/v2/WALKTHROUGH.md`. For how this was done for EVS, read `../mily-evs-abhyas/sprints/v2/instruction.md`, `../mily-evs-abhyas/sprints/v2/WALKTHROUGH.md` and `../mily-evs-abhyas/sprints/v3/WALKTHROUGH.md`. Run §10 (preflight), write `sprints/v3/PRD.md`, then **stop**.

## 1. Goal
The school has given Hindi worksheets / practice papers with **no answer keys**. Put each one on the site **exactly as printed**, in Hindi, with authored answers. They go in a **"विद्यालय कार्यपत्रक" (School Worksheets)** group after the seven chapter papers (पाठ १–७). Practice mode (अभ्यास), checking mode (जाँच) and the result page work as they do for chapter papers.

This is the EVS v2 + v3 work done again for Hindi. The differences are listed below: Hindi text, a garbled PDF text layer, and a smaller app with no validator or test suite yet.

## 2. Source
| What | Path | Rule |
|---|---|---|
| Worksheets | `source/samples/*.pdf` (7 files, `3.1.1` … `3.1.7`) | Read-only. Never move, rename or edit them. |
| Textbook | `source/textbook/dhve101 hindi.pdf` … `dhve107.pdf` (वीणा, कक्षा ४, पाठ १–७) | Read-only. |

Map worksheets to `ws01…ws07` in filename order.

### What preflight already found (2026-10-04)
- **The worksheet text layer is unusable.** All 7 were made in MS Word with a legacy font mapping. `pdftotext` gives text such as `िा` for `का` and `द्रिखिए` for `लिखिए`. **The page images are the source of truth.** The pages render cleanly.
- **The textbook text layer is clean Unicode.** Use it for answers.
- `3.1.7 … Sept 26.pdf` covers **"ओणम के रंग"**, which is not in पाठ १–७. The owner decides at Gate 0: add that chapter's PDF, or answer from the worksheet's own passage plus general knowledge, with every such answer ⚑.
- `3.1.1` (Aug 2025, पाठ 6–7) and `3.1.5` (Aug 2026, पाठ 6–7) cover the same lessons. Check them for duplication by comparing transcribed text, not bytes.
- `3.1.4` prints "प्रश्न 6" twice. Keep it as printed and add a `teacherNote`.
- The papers mix Devanagari numerals (१, २) and Latin numerals (1, 2). Keep each as printed.
- 19 embedded images across the 7 PDFs, which are logos, leaves, a picture to identify and similar.

## 3. Intake → `source/WORKSHEETS-INTAKE.md` (+ `source/intake.json`)
- Render **every page** with `pdftoppm -r 200 -png` and view all of them. Page images are gitignored.
- **Transcription:** type every printed string in Unicode Devanagari from the page images into `source/transcripts/wsNN.txt` (committed). Type what is printed, including spacing quirks, typos and `|` used in place of `।`.
- **Second reading:** a second, independent pass checks each transcript against the page images, word by word, and records any disagreements. Fidelity checking (§6) is only as good as this transcript, so this pass is mandatory.
- Per paper, record: printed header lines, month/year, set, total marks, portion (पाठ), every section heading and question pattern quoted exactly, every picture and what the question needs from it, the PDF SHA-256, and the estimated ⚑ count.
- Mark arithmetic: do the printed section marks add up to the printed total? Show the sum.

## 4. What differs from chapter papers: implement as `"kind": "school"`, not by loosening checks
| Chapter papers (पाठ १–७) | School worksheets |
|---|---|
| Total 100 | Total = **printed** total (40 / 80) |
| Fixed 7-section blueprint (क–छ) | The paper's own sections, order, headings and numbering, verbatim |
| Original passages | Passages copied exactly |
| Whole-number marks | ½ marks allowed where a printed mark is split |

**The seven existing chapter JSONs must stay byte-identical**, and their rendering must not change.

New fields (school only): `kind`, `ws`, `sourceFile`, `header`, `shortLabel`, `label` (printed प्रश्न 1 / (क) / (i)), `heading`, `pictureDescription`, `picture`, `underline` spans (रेखांकित शब्द), `acceptable`, `rubric`, `modelAnswer`, `answerSource` (`"textbook" | "passage" | "authored"`), `answerRef` (पाठ + page/line), `answerConfidence` (`"ok" | "check"`), `teacherNote`, `adaptation`, `fallbackText`, `paperOnly`.

## 5. Replication
- One JSON per paper: `app/data/hindi-wsNN.json`. Copy wording, spelling, matras, punctuation, numerals and marks exactly. Never correct the teacher. Never drop a question: use the nearest item type and explain the adaptation in Hindi under the printed instruction.
- **Broken question** (typo, duplicate number, wrong mark bracket): keep it as printed, add a `teacherNote`, and accept every defensible reading.
- **Pictures:** draw original SVGs in `app/assets/`. Do not copy the school emblem, which is decorative and not needed. A picture the question asks the child to identify, name parts of, match or write about **must** be drawn, for example a leaf-to-name match or a "चित्र देखकर" question. Check each picture question can be answered from your drawing alone, with the drawing viewed at 2×. Labels the child must write are numbered blanks, never filled in.
- **Paper-only items** are done on the printout, and the parent marks them with a rubric. These include सुलेख (handwriting), गोला लगाओ on a grid, रेखा खींचकर मिलाइए, and drawing.

## 6. Fidelity check: `scripts/fidelity.js`, hard fail
- Every heading, instruction, passage, question and option in the JSON must match `source/transcripts/wsNN.txt`. Matching normalises whitespace, `|`/`।`, curly quotes and dash variants. It must **not** normalise nukta, chandrabindu/anusvara or matras.
- The total, section count and section marks must match the intake.
- `pdftotext` may be used only as a weak cross-check of Latin digits and English header text.
- Prove the check works with fixtures: one altered matra, one wrong section mark and one missing question must each fail.

## 7. Answers
- **पठित गद्यांश / पाठ्यपुस्तक questions:** answer from the textbook text. Record पाठ + page/line in `answerRef`.
- **अपठित गद्यांश / पद्यांश:** answer from the printed passage.
- **शब्द भंडार / व्याकरण** (विलोम, पर्यायवाची, समानार्थी, लिंग, वचन, उपसर्ग/प्रत्यय, मुहावरे, विराम चिह्न, "कौन" लगाकर प्रश्न): give the standard answer, and in `acceptable` list **every** form a Class 4 child could correctly write. Hindi needs extra width here:
  - Synonyms: list several (e.g. राति → रात, रात्रि, निशा).
  - Opposites with more than one correct pair.
  - Standard spelling variants: chandrabindu vs anusvara (पहुँच/पहुंच), nukta (ज़/ज, ड़/ड), गए/गये, हुए/हुये.
  - Devanagari and Latin numerals.
  - Masculine/feminine verb forms where the subject is open.
  - "वाक्य बनाओ" answers are judgement items: any correct sentence that uses the word correctly.
- **वर्तनी (spelling) items are the exception.** "सही शब्द पर गोला", "अक्षरों से सार्थक शब्द" and "मात्रा लगाकर/हटाकर" have an exact target, and `acceptable` must never contain a misspelling. If a standard variant could be argued, mark the item ⚑ and explain in `teacherNote`.
- **रचनात्मक लेखन** (पत्र, अनुच्छेद, चित्र-वर्णन, "पाँच पंक्तियाँ"): judgement items with a band rubric scaled to the printed marks, plus a short model answer. For पत्र, the rubric covers format: पता, दिनांक, संबोधन, अभिवादन, विषय-वस्तु, समापन and नाम.
- `answerConfidence: "check"` (⚑) applies whenever the answer rests on judgement, or a child could reasonably use a different word. **Under-flagging was the EVS lesson:** the estimates were 18/16/15, and the actual ⚑ counts were 22/40/30.
- **MCQ with two defensible options:** accept both and add a `teacherNote`.
- **No defensible answer at all:** list it and ask, as a hard stop. If you are only uncertain, use ⚑ rather than stopping.
- Produce a review sheet per paper, `sprints/v3/answer-review/wsNN.md`, with ⚑ items first. It is generated from the JSON, and the validator fails if it is stale.

## 8. App
- Add a "विद्यालय कार्यपत्रक" group below the chapter grid, in the order the owner confirms. Each card shows the printed title, month and total.
- The paper page renders labels, the printed header, headings, passages, underlines, pictures, adaptations and ½ marks.
- **Checking mode (school worksheets)**, behind the existing `GANESH` gate with no new passcode, shows: model answer, स्वीकार्य उत्तर (`acceptable`), rubric, ⚑, `teacherNote`, `answerRef`, and this line: *"ये उत्तर अभ्यास के लिए लिखे गए हैं, शिक्षक ने नहीं दिए — ⚑ वाले उत्तर एक बार दोबारा देख लें।"*
- **No answer hints before "उत्तर देखें"** (the EVS v3 lesson). Nothing answer-derived goes in the DOM in practice mode, and nothing beyond the question and the marks row appears in checking mode until the answer is revealed. This rules out topic chips, `acceptable` text and similar.
- Marks buttons go in ½ steps when an item's marks are fractional or split. The result page uses the printed total and the printed title, not "पाठ N".
- Scores are stored under a key per paper id (`ws01`…), so they never collide with chapter scores.
- `build.js` discovers papers from `app/data/` with no hard-coded counts (`CHAPTER_COUNT` goes). It inlines SVGs once and still fails loudly if `GANESH` is missing.
- The existing login (`Mily` / `2026`) and the `GANESH` code are unchanged.

## 9. Tooling (new for this repo)
The Hindi site has no validator or tests yet. Add them as the EVS repo did, and keep the deployed page dependency-free:
- `validate.js`: chapter rules as they are today, plus the school rules: marks sum per block, section and printed total; `acceptable` on every objective item; a rubric on every judgement item; review sheet up to date; and the asset and alt-text-gives-away-the-answer checks. Include bad fixtures that must fail.
- `scripts/fidelity.js`, `scripts/review-sheet.js` and `scripts/check-existing.js`, which checks the chapter JSON hashes against preflight.
- Playwright e2e (dev dependency, local only, not on Vercel). It covers one chapter paper in both modes (regression) and every worksheet in both modes, and checks that no answer text is present in practice mode or before reveal, ½ marks, the result total and that pictures load.
- Install a Devanagari font on the build host (e.g. Noto Sans Devanagari) before taking screenshots. EVS screenshots showed empty boxes without one.

## 10. Preflight
- Tools present: `pdftoppm`, `pdftotext`, `node`, Playwright, and a Devanagari font (`fc-list | grep -i devanagari`; **none at 2026-10-04**).
- 7 PDFs in `source/samples/`, 7 in `source/textbook/`. Record their hashes.
- `git status` is clean apart from `source/` (currently untracked; commit `source/` as the baseline first, after owner OK).
- `node build.js` succeeds. `dist/index.html` contains the hash only, never the plaintext `GANESH`, and no `.env*` file is in the build output (note that `app/.env.local` exists).
- Record SHA-256 of `app/data/chapter1..7.json`.
- The live URL `https://mily-hindi-abhyas-nu.vercel.app` loads. Use the Vercel token only to get HTTP 200, and never print it.

## 11. Gates (stop and ask the owner)
- **Gate 0 (after intake):** the paper list and order; duplicates (`3.1.1` vs `3.1.5`); the ओणम के रंग source decision; which items are paper-only; and any shortened adaptations.
- **Batch gates:** papers go in batches of 2–3, with one sub-agent per paper. A sub-agent writes only its own JSON and assets, then runs validate, fidelity and the review sheet. Do papers with no pictures first. After each batch the coordinator re-check (§12) runs, and the parent reads the sheets.
- **Deploy gate:** deploy to production only after the owner approves.

## 12. Coordinator re-check after EACH batch (not delegated)
Re-derive every ⚑ answer from the textbook text or passage. Sweep every non-⚑ objective item for a missed ⚑ or an `acceptable` list that is too narrow. Re-read 10% of transcript lines against the page images. Make answers consistent where the same question appears in several papers, since Set A, Set B and Set 2 share many. If the sub-agent brief is under-flagging, tighten it.

## 13. Hard stops
- An unreadable page, or a transcript disagreement that cannot be resolved.
- A picture question that cannot be drawn well enough to answer.
- A question with no defensible answer.
- A change that would alter an existing chapter paper or weaken a check on it.
- A secret would be printed or committed.
- `node build.js` or `validate.js` fails on existing papers.

## 14. Walkthrough (end of sprint)
Include: ⚑ count per paper (actual vs estimate), every `teacherNote`, every adaptation, the pictures, the paper-only items, transcript second-read disagreements, PDF hashes re-checked, and existing chapters byte-identical. State plainly that **the parent reads every review sheet before Mily uses that worksheet**, and what was not verified (real phone, printer).
