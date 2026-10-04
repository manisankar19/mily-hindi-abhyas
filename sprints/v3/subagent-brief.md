# Sub-agent brief: author ONE school worksheet (`hindi-abhyas-site` v3)

You build **one** worksheet, `wsNN`, for a Class 4 Hindi practice site. Mily (9) writes on paper. A parent then marks her work using your answer key, in जाँच (checking) mode. The parent will trust your key, so it has to be **right and generous**: a fair answer from a 9-year-old must never be marked wrong because your key was too narrow.

Repo: `/home/ec2-user/research/projects/home-application/mily/hindi-abhyas-site`

## Read first
1. `sprints/v3/school-contract.md` §3: the JSON shape and the rules. This is binding.
2. `SCHEMA.md`: the same shape, user-facing.
3. `sprints/v3/v3-decisions.md`: the owner's Gate 0 decisions (paper-only items, adaptations, ओणम के रंग).
4. `source/transcripts/wsNN.txt`: the paper's text, already checked twice. **This is what you copy from.**
5. `source/intake/wsNN.json`: sections, marks, patterns and pictures.
6. The page images `source/page-images/wsNN-*.png`. View every page once, so you know the layout, pictures and answer space.
7. `source/textbook-text/chN.txt` for the chapters the paper covers (वीणा, कक्षा ४).
8. One existing chapter paper, e.g. `app/data/chapter6.json`, to see the tone of model answers.

## You may write ONLY
- `app/data/hindi-wsNN.json`
- `app/assets/wsNN-*.svg`
- `sprints/v3/answer-review/wsNN.md` (generated, see below; never hand-edited)

Do not touch any other file. Do not commit. Report back.

## 1. Copy the paper exactly
- Copy every heading, instruction, passage, question, option and match column **from the transcript, character for character**. Keep typos, the `|` danda, missing spaces, numerals as printed (१ or 1) and the printed numbering, even when it is duplicated or skips. `<u>`/`<b>` words go into the item's `underline` array, and the tags are not written into `q`.
- **Never correct the teacher. Never drop a question.** If the format can't work on screen (circle on a grid, draw lines to match, handwriting, drawing), keep the printed text. Add a short Hindi `adaptation` to the block, such as "यहाँ सही शब्द लिखिए।" or "यह प्रश्न छपे हुए पत्र पर करें; अभिभावक जाँचेंगे।", and use `answerKind: "paperOnly"` with a rubric where the work is done on paper.
- **Printed worked examples** (e.g. `नियम ←→ नियमित`) go in the block `passage`. They are fidelity-checked but never scored. A printed per-part mark like "(1)" that sits between the instruction and the item may stay inside `q` if fidelity needs it.
- **Broken question** (typo, duplicate number, marks that don't add up, two right options): keep it as printed, explain it in `teacherNote` (Hindi, 1–2 sentences), and accept every defensible reading.
- **Block marks:** the validator reads each block's total from `printedMarks` (the number after the last `=`, otherwise the only number; Devanagari digits and ½ are understood). When the print gives no block total, or gives a wrong one, set a numeric `block.marks` that matches the section arithmetic. Say why in `teacherNote` on the block's first item.
- **Marks:** use the printed marks. If a printed total has to be split across parts (e.g. "(5M)" over 5 parts), split it evenly. ½ is allowed. Say how you split it in `teacherNote` on the first item.

## 2. Answers
| Question type | Where the answer comes from | `answerSource` / `answerRef` |
|---|---|---|
| पठित गद्यांश / पाठ्यपुस्तक | the textbook text | `textbook`, `पाठ N, पृ. P` (page from the `=== page` / page number in chN.txt, or "पाठ N, '<first words of the sentence>'") |
| अपठित गद्यांश / पद्यांश | the printed passage | `passage`, `प्रश्न N गद्यांश, वाक्य K` |
| व्याकरण / शब्द भंडार / वर्तनी | standard Hindi | `authored`, `—` |
| रचनात्मक (पत्र, अनुच्छेद, चित्र-वर्णन, पंक्तियाँ) | rubric + short model answer | `authored`, `—` |

### `acceptable`: make it WIDE (except spelling)
List every answer a Class 4 child could write that deserves full marks:
- **Short forms and full sentences:** "पार्क", "पार्क में", "राम पार्क जाता है।"
- **Synonyms** (पर्यायवाची/समानार्थी): give several, e.g. रात → रात्रि, निशा, रजनी. **Opposites** (विलोम): every correct pair.
- **Standard spelling variants** a child or teacher may use: chandrabindu/anusvara (पहुँच/पहुंच, आँख/आंख), nukta and no nukta (ज़/ज, फ़/फ, ड़ only where both forms are standard), गए/गये, हुए/हुये, नई/नयी.
- **Nukta, precisely:** only the optional-nukta pairs ज़/ज, फ़/फ, क़/क, ख़/ख, ग़/ग get both forms. **ड़/ढ़ are separate letters**, so पेड (for पेड़) or पढना (for पढ़ना) is a misspelling and is never accepted.
- **Numerals:** Devanagari and Latin both (१४ / 14).
- **Verb gender** where the subject could be either.
- For "वाक्य बनाओ" or any "write a sentence" item, use `answerKind: "judgement"`: any correct sentence using the word in its proper sense. Give 1–2 model sentences and a rubric.

### Spelling items (`answerKind: "spelling"`) are the exception
सही शब्द पर गोला, अक्षरों से सार्थक शब्द, मात्रा लगाकर/हटाकर, शुद्ध वर्तनी: `acceptable` is **empty**. The target is exact. If a second standard form can be argued, set `answerConfidence: "check"` and explain it in `teacherNote` instead.

### Judgement items (`answerKind: "judgement"`)
For पत्र, अनुच्छेद, चित्र-वर्णन, "पाँच पंक्तियाँ", reasons and opinions, the `rubric` bands go from full marks down to 0. Use ½ steps where natural. Write the bands in plain Hindi a parent can apply in 10 seconds. For **पत्र**, the bands cover the format: पता, दिनांक, संबोधन, अभिवादन, विषय-वस्तु, समापन, नाम. Model answers are in simple Class-4 Hindi, 2–5 short sentences for a 5-mark answer.

### ⚑ `answerConfidence: "check"`: flag generously
Set ⚑ whenever **any** of these is true:
- the answer rests on judgement
- a child could reasonably use a different word or form
- you chose between two readings
- the answer is not in the textbook or passage (general knowledge)
- the question is broken
- you split the marks yourself

The EVS sprint under-flagged badly (estimates 18/16/15, actual 22/40/30 after re-check). **When in doubt, flag.** A flagged-but-correct answer costs the parent 5 seconds. An unflagged wrong one costs Mily a mark she earned.

### Stops
- **No defensible answer at all:** do not guess. Put it in your report under "HARD STOP" and leave the item's `a` as `"??"`. The coordinator will ask the owner.
- **Merely uncertain:** use ⚑ and a `teacherNote`. This is not a stop.

## 3. Pictures
- Draw each picture as an **original** simple SVG in `app/assets/wsNN-qK.svg` (viewBox-based, no external refs, no text that gives away the answer). Never copy the school emblem.
- A picture the question asks the child to **identify, name parts of, match, or write about MUST be drawn**, well enough that the question is answerable **from your drawing alone**. Render it and check at 2×: `npx playwright screenshot` or a tiny HTML page, with the screenshot saved under `/tmp/claude-1000/-home-ec2-user-research-projects/d0ead838-40d7-4a6f-803c-b02e3946cba6/scratchpad/`.
- Parts the child must label are **numbered blanks** (1, 2, 3 …), never written names.
- `pictureAlt` is in Hindi, describes the scene **without the answer** (validator-checked), e.g. "चटाई पर बैठा एक जानवर", not "बिल्ली".

## 4. Commands that must pass before you report
```bash
node validate.js app/data/hindi-wsNN.json
node scripts/fidelity.js wsNN
node scripts/review-sheet.js wsNN          # writes sprints/v3/answer-review/wsNN.md
node validate.js                            # all papers incl. the 7 chapters
node scripts/check-existing.js              # chapter files unchanged
node build.js                               # still builds
node tests/fixtures.test.js && node tests/fidelity.test.js   # tooling still green
```

## 5. Report (short)
- Items, marks, ⚑ count against the intake estimate.
- Every `teacherNote`, as a one-line list.
- Every adaptation and paper-only item.
- Every picture: the file, what it shows, and confirmation that the question can be answered from it at 2×.
- HARD STOPs, if any.
- Any item where you hesitated but did **not** flag, with your reason, so the coordinator can check it.
