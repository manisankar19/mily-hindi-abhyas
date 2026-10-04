# Sprint v3: Walkthrough (School Worksheets)

**A parent reads each review sheet (`sprints/v3/answer-review/wsNN.md`, ⚑ items first) before Mily uses that worksheet.** The answers were written for practice, not by the teacher.

## Summary
The school's seven Hindi worksheets are now on the live site as a **विद्यालय कार्यपत्रक** group under the seven chapter papers. Each one is copied exactly as printed (wording, typos, numbering, marks, Devanagari or Latin numerals) and has an authored answer key. Mily writes on paper in अभ्यास mode. A parent unlocks जाँच mode with the existing code. For each question it shows the model answer, the other acceptable answers, the marking rubric, a ⚑ where the answer rests on judgement, and a note on every printed mistake. Nothing answer-related is in the page before "उत्तर देखें".

- **Live:** https://mily-hindi-abhyas-nu.vercel.app (production deployment `dpl_6Q2qkYCvGE1uSX7JnwnkrocUpau4`, `index.html` sha256 `db5c95c5b2b8df92…`, byte-identical to the local build)
- **On the site:** 14 papers. That is 7 chapter papers (पाठ १–७, 100 marks each, unchanged) and 7 worksheets (400 marks, 343 items, 205 ⚑).
- **Chapter papers:** byte-identical to the sprint baseline (table below). Saved chapter marks still load.

## Owner decisions
| When | Decision |
|---|---|
| Phase 0 | Commit `source/` as the baseline (owner asked to run up to Phase 3). |
| Gate 0 | **Keep both** ws01 (Aug 2025) and ws05 (Aug 2026); they overlap, so shared questions get identical keys. **ws07 "ओणम के रंग"** is not in the textbook PDFs: answer from the passages plus general knowledge, with every chapter-dependent item ⚑. **Only सुलेख is paper-only**; circling, word grid and line-matching are answered on screen with a Hindi adaptation note. **Broken questions:** keep as printed, add a `teacherNote`, accept every defensible reading. |
| Defaults (overridable) | Worksheets are shown newest first (`app/worksheet-order.json`). ws03 Q14's ambiguous arrow keys पत्ती and also accepts फल. Header page counts that don't match the PDF are kept as printed, with a note. |
| Phase 3 | The owner asked to run Phase 3 straight through, so the batch gates did not stop for the owner. The coordinator re-check still ran after each batch. Batches 2 and 3 ran at the same time. |
| Phase 5 | Production deploy approved. The old `.env.local` token had no access to the project's team, so the owner supplied a new token. |

## Architecture
```
source/samples/*.pdf (7, text layer garbled) ─pdftoppm 200 dpi─► page images (gitignored)
        │                                                          │ typed in Unicode, then an independent
        │                                                          ▼ second reader checks word by word
        │                                  source/transcripts/wsNN.txt (+ second-read/wsNN.md)
        │                                                          │
source/textbook/*.pdf ─pdftotext─► source/textbook-text/chN.txt     ▼
                                       source/intake/wsNN.json ─merge-intake.js─► intake.json + WORKSHEETS-INTAKE.md
                                                                   │
          sub-agent per worksheet (sprints/v3/subagent-brief.md) ──► app/data/hindi-wsNN.json + app/assets/*.svg
                                                                   │
   validate.js · scripts/fidelity.js · scripts/consistency.js · scripts/review-sheet.js · scripts/check-existing.js
                                                                   ▼
   build.js ─► dist/index.html  (#papersData: 14 papers · #worksheetOrder · #assetsData: 6 SVGs once · GANESH as SHA-256)
                                                                   ▼
   vercel deploy --prod (.vercelignore: build files only) ─► live bytes = local build ─► tests/e2e-live.js
```

## How it was built
- **Transcripts, not the PDF text:** all 7 worksheets were made in MS Word with a legacy font mapping, so `pdftotext` gives `िा` for `का`. Each page was typed from the image by one agent and checked word by word by a **different** agent (300–1200 dpi). There were 6 fixes (punctuation, spacing, picture text) and 0 unresolved. The coordinator compared samples by eye: ws05 p1, ws07 p4, ws06 p3, ws01 p3 and ws03 p10.
- **Answers:** one sub-agent per worksheet followed a written brief. It covers wide `acceptable` lists for Hindi variants: synonyms, opposites, chandrabindu/anusvara, optional nukta (ज़/ज, फ़/फ, …) and both numeral systems. Spelling items have an exact target. Judgement items carry a banded rubric. The rule is "when in doubt, ⚑".
- **Coordinator re-check after every batch** (`recheck-batch1/2/3.md`, not delegated): every item was read and every ⚑ answer re-derived from the textbook text or the passage. Fixes made:
  - removed misspellings from `acceptable`: जोहरी, रात्री, दुनियाँ
  - removed a wrong synonym (महान for विशाल) and an answer not in the sentence (साफ़)
  - flagged incomplete answers that had been given full marks
  - added missing matra-words
  - established that **ड़/ढ़ are letters, not an optional nukta** (पेड is never accepted for पेड़)
- **Consistency:** `scripts/consistency.js` checks 30 questions shared across ws01/ws05 and Set A/B/2. All 30 have identical keys.

## Files created / modified

### Data and content
- `app/data/hindi-ws01..07.json`: the 7 worksheets (schema in `SCHEMA.md`). School fields: `kind`, `ws`, `header`, `shortLabel`, `answerKind`, `acceptable`, `rubric`, `answerSource`, `answerRef`, `answerConfidence`, `teacherNote`, `underline`, `options`, `pairs`/`printedRight`, `adaptation`, `printedMarks`, `marks`, `picture`/`pictureAlt`, and display-only `slot`.
- `app/assets/*.svg`: 6 original drawings (table below). The school emblem was not copied.
- `app/worksheet-order.json`: the home-page order.
- `source/transcripts/`, `source/intake/`, `source/WORKSHEETS-INTAKE.md`, `source/textbook-text/`.

### App (`app/app.js`, `app/index.html`, `app/styles.css`)
- **Papers keyed by id.** Score keys `mily.scores.wsNN`; chapters keep `mily.scores.chN`, so saved marks survive (e2e seeds old marks and checks them).
- **Lazy answers (all papers).** `buildAnswer()` creates the answer panel when "उत्तर देखें" is pressed; it is removed on hide, on "सभी उत्तर छिपाएँ" and when checking mode is locked. Before reveal, the page holds no model answer, acceptable answer, rubric, note or ⚑. v2 had kept the answer in the DOM, hidden.
- **Worksheet layout.** The printed header line by line, untitled sections, printed block marks, the adaptation note ("यहाँ ऐसे करें"), pictures with Hindi alt text, the printed match column, MCQ options, underlined words (plain string scan, no RegExp built from data), slot labels ("चित्र 1"), and a "छपे हुए पत्र पर करें" badge on सुलेख.
- **Checking panel.** ⚑ दोबारा देखें, स्वीकार्य उत्तर, अंक-योजना, टिप्पणी, स्रोत, and the line *"ये उत्तर अभ्यास के लिए लिखे गए हैं, शिक्षक ने नहीं दिए — ⚑ वाले उत्तर एक बार दोबारा देख लें।"* (checking mode on worksheets only).
- **Marks.** ½ steps on worksheets; chapters stay whole numbers. The score bar, result and home card use the printed total (40/80), and the result shows the worksheet's label and title.
- **Print.** Questions and pictures only; answers, mark buttons, banners and screen-only notes are hidden.

### Build (`build.js`)
- Discovers `chapterN.json` and `hindi-wsNN.json` (no hard-coded counts). It fails, writing nothing, on invalid JSON, a duplicate or misnamed id, a missing picture, an incomplete order file, or an unset `GANESH`.
- Inlines each SVG once as a data URI (`#assetsData`).
- **Latent v2 bug fixed:** content was inserted with `String.replace(tag, string)`, which expands `$&` and `$'`. The new `app.js` contains `$&`, so the page crashed with a SyntaxError. Content is now inserted with function replacers, and a test checks the bundle contains `app.js`/`styles.css` verbatim. In v2 the same bug would have hit any `$&` in paper data.

### Tooling (new; none existed in v2)
| Script | Purpose |
|---|---|
| `validate.js` + `SCHEMA.md` | school rules (½ sums, acceptable, rubric bands, spelling targets, pictures, alt text, intake total, review-sheet staleness); chapters keep parse-only rules |
| `scripts/fidelity.js` | every printed string vs its transcript. Does not normalise nukta, matras or numerals. Drops page footers only at page breaks. Checks that every labelled line is covered. |
| `scripts/review-sheet.js` | the parent's sheet per worksheet, ⚑ first |
| `scripts/consistency.js` | same printed question means the same key (rubric compared only at equal marks) |
| `scripts/check-existing.js` | chapter files vs preflight hashes |
| `scripts/merge-intake.js`, `scripts/render-pages.sh`, `scripts/walkthrough-tables.js` | intake merge with a duplicate check by text; page rendering; the tables below |

## Verification
| Check | Result |
|---|---|
| `npm run validate` | OK 14 papers, 743 items |
| `npm run fidelity` | OK 7 school papers |
| `npm run consistency` | OK 30 shared question groups, 0 inconsistent |
| `npm run check:existing` | 7 chapter files unchanged |
| `npm run test:fixtures` | validator 37/37 · fidelity 28/28 · review-sheet 11/11 · consistency 6/6 |
| `npm run test:build` | 13/13 |
| `npm run test:e2e` | e2e 24/24 (Tasks 32–38) · e2e-worksheets 16/16 (7 worksheets × 390/1280 px) |
| Live: sha256 | production `index.html` = local build, byte for byte |
| Live: `npm run test:live` | 8/8: chapter 6 + ws05, 390/1280 px, real code, no console errors |
| Deploy source | 28 files (build inputs only); no docs, env or PDFs |
| `npm audit` | 0 vulnerabilities |
| semgrep | `app.js`/`build.js` clean. 29 path-join audit findings in local CLI scripts (reviewed: inputs regex-checked). 1 missing-integrity on the v1 Google Fonts link (pre-existing). |

The e2e leak test reads every answer, acceptable answer, note and rubric string from all 7 worksheets. It asserts none is in the page in practice mode or in checking mode before reveal, that all are present after "सभी उत्तर दिखाएँ", and that none remain after re-locking.

## Security
- `GANESH` is still only a SHA-256 in the page. The browser tests build with a throw-away code, and the live test reads the real one in-process without printing it.
- `.vercelignore` keeps sprint docs, source PDFs, tests and env files out of the Vercel upload.
- **Finding (from before this sprint, open as Task 44):** the plaintext जाँच code is written in four committed **v2** docs (`sprints/v2/PRD.md`, `REQUIREMENTS-v2.md`, `TASKS.md`, `WALKTHROUGH.md`; commit `dad696a`). This contradicts the README. No v3 file contains it, the repo has no remote, and the docs are no longer uploaded to Vercel. The recommended fix is to rotate `GANESH`; that is the owner's decision.
- As before, the gate is a deterrent, not a security boundary: answers are embedded in the static page.

## What was NOT verified
- **Real phone and printer.** Rendering was checked in headless Chromium at 390 px and print emulation only. Devanagari and symbol fonts were installed on the build host for the screenshots, so these renderings were seen; real devices were not tested.
- **The parent's review of the 7 answer sheets** is a human step (rule at the top).
- **ws07 "ओणम के रंग"** answers that depend on the chapter were written without its text. They are all ⚑ with a note; they should be checked against the book.
- Screenshots of the score bar can catch its fill animation mid-way; the numbers are asserted, not the bar width.

## Known limitations
- Under Gate 0, only सुलेख is paper-only. Circling, word grid and line-matching are answered on screen, which differs from the printed task; each such block shows the adaptation note.
- `slot` labels ("चित्र 1", "आकृति 2") are not printed text. They exist so a child knows which picture an answer is for.
- ws03's printed word grid has a misprint (भो-ज-ज, no भोजन). Both भोजन and भोज are accepted, with a note.
- Phones with the old page open may need one refresh.

## What's next
- **Task 44:** rotate `GANESH`, and optionally redact the v2 docs.
- If the ओणम के रंग chapter PDF is added, re-check the ws07 ⚑ items against it.
- New worksheets: follow README → "Adding a new worksheet".
- `.env.local` holds two token lines; the old one no longer has project access and can be removed by the owner.

## Data (generated, do not edit by hand)
<!-- generated:start (node scripts/walkthrough-tables.js) -->

### Worksheets

| ws | Source file | Total | Items | ⚑ actual / intake estimate | teacherNotes | Pictures | Paper-only | 2nd-read fixes |
|---|---|---|---|---|---|---|---|---|
| ws01 | `3.1.1  Hindi_L6-7_WS.pdf` | 40 | 40 | 28 / 24 | 29 | 1 | 1 | 1 |
| ws02 | `3.1.2 4-Hindi_L-1-7_WS (SetA).pdf` | 80 | 65 | 33 / 30 | 46 | 2 | 1 | 2 |
| ws03 | `3.1.3 -Hindi_L-1-7_WS (SetB).pdf` | 80 | 69 | 36 / 30 | 45 | 3 | 1 | 3 |
| ws04 | `3.1.4 _Hindi_WS_Sep '26_T-1(Set 2) 26-27.pdf` | 80 | 62 | 41 / 38 | 45 | 0 | 1 | 0 |
| ws05 | `3.1.5 4_Hindi_WS_ Aug 26 L 6-7 (26-27).pdf` | 40 | 39 | 25 / 24 | 26 | 1 | 1 | 0 |
| ws06 | `3.1.6 4_Hindi_WS_ July 26 L 4-5.pdf` | 40 | 33 | 17 / 16 | 21 | 0 | 1 | 0 |
| ws07 | `3.1.7 4_Hindi_WS_ Sept 26.pdf` | 40 | 35 | 25 / 26 | 27 | 0 | 1 | 0 |
| **Total** | 7 worksheets | 400 | 343 | 205 / 188 | 239 | 7 | 7 | 6 |

### Source PDFs: SHA-256 re-checked against preflight

| ws | File | SHA-256 now | Matches preflight |
|---|---|---|---|
| ws01 | `3.1.1  Hindi_L6-7_WS.pdf` | `bddc63f3307ccc24680605a61aeb5837e0b54c1063ad6a4317361fe3d1cb312e` | yes |
| ws02 | `3.1.2 4-Hindi_L-1-7_WS (SetA).pdf` | `0efa2c1d43ff23c1d5610488e9f396a63a5fcb858e65455f1e66e72539309877` | yes |
| ws03 | `3.1.3 -Hindi_L-1-7_WS (SetB).pdf` | `418a62844cbaf8914137cd326c1d3b77563814b94aaf083ed7e7b24fda30103d` | yes |
| ws04 | `3.1.4 _Hindi_WS_Sep '26_T-1(Set 2) 26-27.pdf` | `0b5af0cc437f36272a83fe260c943cfbecd6a1d3b8e1f75d4838149c7a0728c6` | yes |
| ws05 | `3.1.5 4_Hindi_WS_ Aug 26 L 6-7 (26-27).pdf` | `9b946946855f1c12b6ffdde3e785951fb3f3407526f2536645e6f775863d41cd` | yes |
| ws06 | `3.1.6 4_Hindi_WS_ July 26 L 4-5.pdf` | `9f75250d89361d0056f24c72fc081043ec0f5b1801b56f99edbe36ec1d88d6f8` | yes |
| ws07 | `3.1.7 4_Hindi_WS_ Sept 26.pdf` | `7217e862c888155e26cff4d08000e895e702a6b9c89e4b186d870cb569089c6b` | yes |

### Chapter papers: byte-identical to preflight

| File | SHA-256 (preflight = now) | Identical |
|---|---|---|
| `app/data/chapter1.json` | `436bf8c5c47a825a340a47d145b8bda289157c351c72b868eb741a5947d2f0a4` | yes |
| `app/data/chapter2.json` | `6edc3ac4934ad0eb46f63fbfd84ce1bae0180786ff73024bb4dc8b7b19edcdd0` | yes |
| `app/data/chapter3.json` | `918ad1a3abe710aa30621ba4e52157be800eedd042b17b6d6cb653a47a43b4c6` | yes |
| `app/data/chapter4.json` | `806ba219dead07c0ceb00c1cf5eebe25a1e4f7ed651ab96e22053885bfc2dae8` | yes |
| `app/data/chapter5.json` | `5984d333c18d24780be91c42adeb51f8425fa2547a91ca37424afe7825fa67d2` | yes |
| `app/data/chapter6.json` | `717b22cc7411881c0a800fe03f431152bf1c4e6853bcb2ba919eab7e19c39453` | yes |
| `app/data/chapter7.json` | `732f24e54ad373fabc681246dfb3ef871b1716cf87ee39ec15114163f35fdb1f` | yes |

### Pictures (original SVGs, each viewed at 2× by the coordinator)

| File | Used by | Alt text (Hindi, does not give the answer) |
|---|---|---|
| `shared-postbox.svg` | ws01 प्रश्न 10.; ws05 प्रश्न 4. | सड़क किनारे खड़ी एक लाल वस्तु, जिसकी ऊपरी टोपी गोल है, आगे एक पतली काली दरार और लिफ़ाफ़े का चिह्न है, नीचे काला आधार है। |
| `ws02-q5kh.svg` | ws02 (ख) | धूप वाले दिन बाहर खुले मैदान में खेलते हुए तीन बच्चे; पीछे घर, लाल रंग की इमारत, पेड़, बादल और लकड़ी की बाड़ |
| `ws02-q6aa.svg` | ws02 आ. | दो सादी रेखा-आकृतियाँ, जिनके नीचे 1 और 2 लिखा है |
| `ws03-q13.svg` | ws03 प्रश्न-13 | मिट्टी की भूरी पट्टी पर उगे बारह सब्ज़ी के पौधे, दो पंक्तियों में; कुछ की उपज मिट्टी के ऊपर तनों पर लगी है, कुछ की उपज मिट्टी के अंदर जड़ों में दिख रही है। |
| `ws03-q14.svg` | ws03 प्रश्न-14 | घास पर खड़ा एक घना पेड़; बाईं ओर 1 और 2 नंबर के दो खाली डिब्बों से दो तीर पेड़ के ऊपरी हिस्से की ओर जाते हैं। |
| `ws03-q18.svg` | ws03 प्रश्न-18 | 1 से 4 नंबर वाले चार चित्र: फूलों की बाली वाली छोटी टहनी, एक लंबा चौड़ा धारीदार पत्ता, तीन मोटे गहरे हरे अंडाकार पत्ते, और लंबी नुकीली नोक वाला दिल के आकार का पत्ता। |

### Adapted layouts (shown under the printed instruction; screen only)

**ws01**

- प्रश्न 6.: रेखा खींचने के बदले हर शब्द के सामने उसका सही अर्थ चुनिए।
- प्रश्न 8.: तालिका की हर पंक्ति के लिए उस समय (काल) का एक वाक्य लिखिए।
- प्रश्न 9.: हर पंक्ति में खाली खाना (उपसर्ग / मूल शब्द / नया शब्द) भरिए और नए शब्द से एक वाक्य लिखिए।
- प्रश्न 11.: यहाँ सही शब्द लिखिए।
- प्रश्न 13.: यह प्रश्न छपे हुए पत्र पर करें; अभिभावक जाँचेंगे।

**ws02**

- प्र.५ (क): दोनों में से कोई एक लिखिए।
- प्र.–६ अ.: हर शब्द के आगे दाईं ओर के शब्दों में से उसका सही अर्थ लिखिए।
- आ.: आकृति 1 और आकृति 2 का नाम क्रम से लिखिए।
- इ.: ऊपर छपा उदाहरण (बस → बीस) अंक के लिए नहीं है। कोई भी सही, सार्थक शब्द मान्य है।
- (आ): ऊपर छपा उदाहरण (प्रदूषित) अंक के लिए नहीं है।
- (ई): ऊपर छपा उदाहरण (नियम → नियमित) अंक के लिए नहीं है।
- (ए): सही विराम चिह्न लगाकर पूरा वाक्य यहाँ लिखिए।
- प्र.८ अ.: कोष्ठक में से सही वर्तनी वाला शब्द चुनकर रिक्त स्थान में लिखिए।
- इ.: यहाँ सही शब्द लिखिए।
- प्र.९): यह प्रश्न छपे हुए पत्र पर करें; अभिभावक जाँचेंगे।

**ws03**

- प्रश्न -7: ऊपर छपा उदाहरण (वि + शेष = विशेष) अंक के लिए नहीं है। हर पंक्ति में नया शब्द और उससे बना एक वाक्य लिखिए।
- प्रश्न-14: चित्र में तीरों के पास 1 और 2 नंबर के डिब्बे हैं; हर नंबर के लिए भाग का नाम लिखिए।
- प्रश्न-15: ग्रिड में मिला शब्द लिखिए।
- प्रश्न-16: हर शब्द के आगे लिखिए कि वह स्त्रीलिंग है या पुल्लिंग।
- प्रश्न-18: चित्र 1, 2, 3, 4 के लिए दाईं ओर दिए नामों में से सही नाम लिखिए।
- प्रश्न 21–: रेखाएँ खींचने के बजाय हर बाएँ शब्द के आगे दाईं ओर से सही अर्थ लिखिए। वृद्ध → बूढ़ा छपा हुआ उदाहरण है, उसके अंक नहीं।
- प्रश्न–22: यह प्रश्न छपे हुए पत्र पर करें; अभिभावक जाँचेंगे।

**ws04**

- ख): पत्र पर नाम नहीं छपे हैं। पाठ्यपुस्तक (पाठ 4) में यह उदाहरण-पंक्ति है: आम \| परवल \| दही \| गाजर। इसी तरह हर स्तंभ में चार-चार नाम लिखिए।
- ड़): हर पंक्ति के उदाहरण जैसा, उसी समय (काल) का एक नया वाक्य लिखिए।
- च): ऊपर दिए चिह्नों (, ? ! ।) में से सही चिह्न लगाकर पूरा वाक्य लिखिए।
- घ): यहाँ सही शब्द लिखिए।
- प्रश्न 8.: यह प्रश्न छपे हुए पत्र पर करें; अभिभावक जाँचेंगे।

**ws05**

- प्रश्न 6.: तालिका की हर पंक्ति के लिए उस समय (काल) का एक वाक्य लिखिए।
- प्रश्न 7.: हर पंक्ति में खाली खाना (उपसर्ग / मूल शब्द / नया शब्द) भरिए और नए शब्द से एक वाक्य लिखिए।
- प्रश्न 8.: रेखा खींचने के बदले हर शब्द के सामने उसका सही अर्थ चुनिए।
- प्रश्न 10.: यहाँ सही शब्द लिखिए।
- प्रश्न 12.: यह प्रश्न छपे हुए पत्र पर करें; अभिभावक जाँचेंगे।

**ws06**

- (ख): ऊपर छपा उदाहरण (नियम → नियमित) अंक के लिए नहीं है।
- प्रश्न 5.: ऊपर छपा उदाहरण (भालू → आलू) अंक के लिए नहीं है।
- प्रश्न 6.: ऊपर छपे उदाहरण (बस → बीस, चला → चल) अंक के लिए नहीं हैं। कोई भी सही, सार्थक शब्द मान्य है।
- प्रश्न 7.: यह प्रश्न छपे हुए पत्र पर करें; अभिभावक जाँचेंगे।

**ws07**

- अ): यहाँ सही शब्द लिखिए।
- —: यह प्रश्न छपे हुए पत्र पर करें; अभिभावक जाँचेंगे।

### Paper-only items (done on the printed sheet, parent marks with the rubric)

- ws01 प्रश्न 13. (5 marks)
- ws02 प्र.९) (5 marks)
- ws03 प्रश्न–22 (5 marks)
- ws04 प्रश्न 8. (5 marks)
- ws05 प्रश्न 12. (5 marks)
- ws06 प्रश्न 7. (2 marks)
- ws07 — (3 marks)

### Every teacherNote

**ws01** (29)

| Question | ⚑ | Note |
|---|---|---|
| प्रश्न 1. (क) | ⚑ | ‘जयपुर के पास’ (दूरी के बिना) भी स्वीकार है; अभिभावक चाहें तो पूरी दूरी (लगभग चौदह किलोमीटर) पर पूरे अंक दें। |
| प्रश्न 1. (ग) | ⚑ | गद्यांश में यह सीधे नहीं लिखा; 'राजस्थान के लोक नृत्य' और 'राजस्थान का विशेष व्यंजन' से अनुमान लगता है। उत्तर सामान्य ज्ञान से: राजस्थान। |
| प्रश्न 1. (घ) | ⚑ | छपे (1) अंक को दो खाली स्थानों में बाँटा गया: हर सही शब्द ½ अंक (यह बँटवारा हमारा है)। |
| प्रश्न 1. | ⚑ | (घ) का दूसरा खाली स्थान, ½ अंक (बँटवारा हमारा)। |
| प्रश्न 1. (ड) | ⚑ | छपे (1) अंक को दो खाली स्थानों में बाँटा गया: हर सही शब्द ½ अंक (यह बँटवारा हमारा है)। 'बडा' (ड़ का बिंदु छूटा) वर्तनी की गलती है, उसे न मानें। |
| प्रश्न 1. | ⚑ | (ड) का दूसरा खाली स्थान, ½ अंक (बँटवारा हमारा)। |
| प्रश्न 2. (क) | ⚑ | प्रश्न 2 का कुल अंक नहीं छपा; हर भाग के छपे अंक (1+1+1+2+1) जोड़कर 6 रखा गया। सूची वाला उत्तर है; पूरी सूची ज़रूरी नहीं। तीन या अधिक सही नाम पर पूरा अंक। |
| प्रश्न 2. (ग) | ⚑ | ‘जोहरी’ लिखा हो तो अर्थ सही है पर वर्तनी गलत (सही: जौहरी) — अंक अभिभावक तय करें। |
| प्रश्न 2. (घ) | ⚑ | अपने शब्दों में लिखा उत्तर भी पूरा माना जाए: 'सब दरबारियों को, क्योंकि उन्होंने झूठी प्रशंसा की' = 2 अंक। |
| प्रश्न 2. (ड) | ⚑ | पाठ में यह अनुमान वाला प्रश्न है; उत्तर पाठ में लिखा नहीं, सामान्य ज्ञान से है। |
| प्रश्न 3. (क) | ⚑ | कई उत्तर सही हैं: प्रिय मित्र / नमस्ते / सप्रेम नमस्ते / ढेर सारा प्यार / मधुर स्मृति। बच्चा संबोधन (प्रिय मित्र) या अभिवादन (नमस्ते) में से कोई भी लिखे, पूरा अंक। |
| प्रश्न 3. (ख) | ⚑ | कई उत्तर सही हैं: सादर नमस्ते / सादर प्रणाम / प्रणाम / नमस्कार / आदरणीय गुरुजी। आदर वाला कोई भी अभिवादन पूरा अंक। |
| प्रश्न 4. (क) | ⚑ | खुला प्रश्न। अन्य उदाहरण: 'हमने झूम-झूमकर नाच किया/नाचे।', 'हमने झूम-झूमकर मेले का आनंद लिया।' |
| प्रश्न 4. (ख) | ⚑ | खुला प्रश्न। अन्य उदाहरण: 'हमने उछल-उछलकर पेड़ से आम तोड़े।', 'हमने उछल-उछलकर खुशी मनाई।' |
| प्रश्न 5. (क) | ⚑ | कोई भी सही वाक्य मान्य है। दूसरा उदाहरण: दादाजी धीरे-धीरे सीढ़ियाँ चढ़ते हैं। |
| प्रश्न 5. (ख) | ⚑ | कोई भी सही वाक्य मान्य है। दूसरा उदाहरण: राम और श्याम साथ-साथ खेलते हैं। |
| प्रश्न 5. (ग) | ⚑ | कोई भी सही वाक्य मान्य है। दूसरा उदाहरण: राजा ने कहा, "आपके उत्तर के लिए धन्यवाद।" |
| प्रश्न 6. | ⚑ | छपा प्रश्न (2M) चार जोड़ों में बराबर बाँटा गया: हर सही जोड़ी ½ अंक (बँटवारा हमारा)। कागज़ पर रेखा खींचनी थी; यहाँ हर शब्द का अर्थ चुनना है। |
| प्रश्न 7. | ⚑ | छपा प्रश्न (2M) चार शब्दों में बराबर बाँटा गया: हर सही विलोम ½ अंक (बँटवारा हमारा)। |
| प्रश्न 7. | ⚑ | संज्ञा का विलोम संज्ञा होनी चाहिए; 'अप्रसन्नता' मानक है, दुख/उदासी भी सही हैं। 'अप्रसन्न'/'दुखी' (विशेषण रूप) लिखे तो अर्थ सही है पर शब्द-भेद अलग; पूरा ½ देना है या नहीं, अभिभावक तय करें। |
| प्रश्न 8. | ⚑ | हर पंक्ति 1 अंक (3M ÷ 3)। कोई भी सही भविष्यत् काल का वाक्य मान्य है, जैसे 'मैं कल नानी के घर जाऊँगी।' |
| प्रश्न 8. | ⚑ | कोई भी सही वर्तमान काल का वाक्य मान्य है, जैसे 'बच्चे मैदान में खेल रहे हैं।' 'मैं रोज़ स्कूल जाती हूँ' (सामान्य वर्तमान) भी मान लें। |
| प्रश्न 8. | ⚑ | कोई भी सही भूतकाल का वाक्य मान्य है, जैसे 'मैंने खाना खा लिया।' या 'कल बारिश हुई थी।' |
| प्रश्न 9. | ⚑ | हर पंक्ति 1 अंक: खाली खाना ½ + वाक्य ½ (बँटवारा हमारा)। पत्र (और पाठ्यपुस्तक) 'भर' को उपसर्ग मानता है, इसलिए यहाँ वही रखा है। 'भर पेट' (अलग लिखा) भी मान लें। |
| प्रश्न 9. | ⚑ | खाली खाना ½ + वाक्य ½। वाक्य में 'अनुशासन' शब्द आना चाहिए। |
| प्रश्न 9. | ⚑ | खाली खाना ½ + वाक्य ½। वाक्य में 'सुविचार' शब्द आना चाहिए। |
| प्रश्न 10. | ⚑ | अंक बँटवारा हमारा: नाम 1 + तीन वाक्य 2 = 3। नाम के सभी रूप मान्य: लेटर बॉक्स / पत्र-पेटी / डाक-पेटी / पोस्ट बॉक्स (जुड़े, अलग या हाइफ़न के साथ)। 'डाकखाना/डाकघर' गलत है। |
| प्रश्न 10. तीन वाक्य | ⚑ | तीन वाक्यों के 2 अंक (नाम 1 अंक अलग)। कोई भी सही बात मान्य: लाल रंग, चिट्ठियाँ डालते हैं, डाकिया चिट्ठियाँ निकालता है, सड़क किनारे/डाकघर के पास होती है। |
| प्रश्न 13. |  | सुलेख छपे हुए पत्र पर ही होता है; अभिभावक लिखावट देखकर अंक दें। |

**ws02** (46)

| Question | ⚑ | Note |
|---|---|---|
| प्र.१) i. |  | प्रश्न 1 में खंड का कुल अंक नहीं छपा; हर भाग पर (१) छपा है, इसलिए खंड का कुल 5 अंक रखा गया। गद्यांश पाठ 2 'बगीचे का घोंघा' से है। |
| प्र.१) ii. | ⚑ | पूरा उत्तर 'छोटा और सुंदर' है। केवल 'छोटा' या केवल 'सुंदर' लिखा हो तो ½ अंक दें। |
| प्र.१) iv. | ⚑ | माँ की बात के दो भाग हैं; 'वहाँ (बाहर) कभी मत जाना' मुख्य बात है, उतना लिखने पर भी पूरा अंक दिया गया है। केवल 'वह दुनिया अलग है' लिखा हो तो ½ अंक। |
| प्र.१) v. | ⚑ | (क) और (ख) दोनों के लिए एक ही (१) छपा है, इसलिए हर भाग ½ अंक का रखा गया। गद्यांश में 'जग' के अर्थ वाला शब्द 'दुनिया' ही है; 'संसार' सही अर्थ है पर गद्यांश में नहीं है — अभिभावक चाहें तो उसे भी पूरा ½ दें। |
| प्र.१) (ख) | ⚑ | छपे (१) को ½ + ½ में बाँटा गया है। गद्यांश में 'बगीचा/बगीचे' दोनों रूप हैं, दोनों सही। 'बाग' या 'उद्यान' सही अर्थ हैं पर गद्यांश में नहीं हैं। |
| प्र. २) i. |  | प्रश्न 2 में भी खंड का कुल अंक नहीं छपा; पाँच भाग × (१) = 5 अंक रखे गए। गद्यांश पाठ 5 'आसमान गिरा' से है। |
| प्र. २) ii. | ⚑ | 'ज़ोर की आवाज़' और 'धम्म' दोनों सही हैं; नुक्ता (ज़/ज) वैकल्पिक है। |
| प्र.३) १. |  | प्रश्न 3 में खंड का कुल अंक नहीं छपा; भागों के अंक 1+1+1+1+2+2+1+1 = 10, इसलिए खंड का कुल 10 रखा गया। गद्यांश में 'रूपयों' और 'रुपयों' दोनों रूप छपे हैं — ये अध्यापक के छापे हुए हैं, बदले नहीं गए। |
| प्र.३) ५. | ⚑ | (२) दो शब्दों का है: हर शब्द 1 अंक (हमारा बँटवारा)। गद्यांश से ढूँढना है, इसलिए 'पाठशाला' ही उत्तर है; 'विद्यालय' सही अर्थ है पर गद्यांश में नहीं — अभिभावक चाहें तो ½ दें। |
| प्र.३) ६. | ⚑ | (२) दो शब्दों का है: हर शब्द 1 अंक (हमारा बँटवारा)। ग़लत/गलत दोनों (नुक्ता वैकल्पिक); 'अशुद्ध' भी विपरीत अर्थ है। |
| प्र.३) ७. | ⚑ | दोनों भाग (किसने = नमिता, किससे = पिता/राजू) होने पर 1 अंक; केवल एक भाग सही हो तो ½ अंक। |
| प्र.३) ८. | ⚑ | 'सबंधित' अध्यापक की छपाई है (शुद्ध: संबंधित), बदला नहीं गया। उत्तर 'माली' गद्यांश में है; 'फूलवाला' भी कोई लिखे तो अभिभावक ½ दे सकते हैं। |
| प्र.४ - (क) | ⚑ | प्रश्न 4 में खंड का कुल अंक नहीं छपा; भागों के अंक 2+2+2+2+1+1 = 10, इसलिए खंड का कुल 10 रखा गया। यह 'बातचीत' वाला प्रश्न है, उत्तर बच्चे के अपने शब्दों में होगा। |
| प्र.४ - (ख) | ⚑ | यह प्रश्न पाठ 1 'चिड़िया का गीत' के 'बातचीत के लिए' से है (पाठ 2 से नहीं)। मत पूछा गया है; अपेक्षित उत्तर 'हाँ' है, पर कोई बच्चा 'नहीं' के साथ समझदारी भरा कारण दे तो भी पूरे अंक दें। |
| प्र.४ - (ग) | ⚑ | अंक-पट्टी हमारी है: चार सही चीज़ें = 2 अंक (ws04/ws05 जैसी)। 'दुर्ग' की जगह 'किला' लिखना सही है। दाल-बाटी चूरमा देखा नहीं, खाया था — उसे न गिनें, पर उसके लिए अंक न काटें। |
| प्र.४ - (घ) | ⚑ | उत्तर बच्चे के अपने शब्दों में होगा; 'दुनिया देखना चाहता था' या 'बाहर क्या है यह जानना चाहता था' — दोनों पूरे अंक। |
| प्र.४ - (ङ) | ⚑ | पाठ में रोगों के नाम नहीं दिए; पाठ स्वयं 'पता करके लिखिए' कहता है, इसलिए उत्तर सामान्य ज्ञान से है। कोई भी दो सही रोग = 1 अंक। |
| प्र.४ - (च) | ⚑ | बच्चा उस दरबारी को कई तरह से पहचान सकता है (नौजवान, सच बोलने वाला, चुप खड़ा रहने वाला, असली हीरा पाने वाला); सब पूरे अंक। केवल 'दरबारी को' लिखा हो तो ½ अंक। |
| प्र.५ (क) | ⚑ | 'अथवा' है: बच्चा दोनों में से कोई एक विषय लिखे, उसी के पाँच वाक्य जाँचें। दोनों लिखे हों तो जिसमें अधिक अंक बनें वही गिनें। भ्रमण-स्थल कोई भी हो सकता है (जयपुर, समुद्र-तट, पहाड़, चिड़ियाघर, पार्क आदि)। बीच के अंकों के लिए ½ भी दे सकते हैं। |
| (ख) | ⚑ | चित्र हमारा बनाया हुआ है (छपे चित्र जैसा: झूले पर लड़की, पतंग उड़ाता लड़का, गेंद पकड़ती लड़की, घर, खलिहान, बाड़, रास्ता)। चित्र में जो दिखता है उससे जुड़ा हर सही वाक्य लगभग 1 अंक; बच्चे के नाम रखना (जैसे 'रीना झूला झूल रही है') भी ठीक है। |
| प्र.–६ अ. |  | हर सही जोड़ी 1 अंक (4 जोड़ियाँ = 4)। |
| प्र.–६ अ. |  | दुःख/दुख दोनों मानक रूप हैं। |
| आ. आकृति 1 | ⚑ | चित्र की आकृति 1 (बाईं ओर)। 'दिए गए आकृतियों' अध्यापक की छपाई है (शुद्ध: दी गई आकृतियों), बदली नहीं गई। 'चतुर्भुज' भी सही है (आयत एक चतुर्भुज है), इसलिए पूरा अंक; 'वर्ग' गलत है। अंग्रेज़ी नाम (रेक्टेंगल/rectangle) हिंदी शब्द-भंडार के प्रश्न में पूरा अंक नहीं — अभिभावक चाहें तो ½ दें। |
| आ. आकृति 2 | ⚑ | चित्र की आकृति 2 (दाईं ओर)। त्रिभुज/त्रिकोण दोनों मानक हिंदी नाम हैं। अंग्रेज़ी नाम (ट्रायंगल/triangle) पूरा अंक नहीं — अभिभावक चाहें तो ½ दें। |
| इ. (i) | ⚑ | कई सही शब्द बन सकते हैं; छपे उदाहरण (बस → बीस) की तरह कोई भी सार्थक शब्द जो केवल मात्रा लगाने से बने, पूरा अंक। 'फेल' अंग्रेज़ी शब्द है, न मानें। |
| इ. (ii) | ⚑ | कई सही शब्द बन सकते हैं (राह, रहा, रही, रहे, रहो, राही, रूह); कोई भी सार्थक शब्द पूरा अंक। |
| ई. i. | ⚑ | 'किया जाता हैं' अध्यापक की छपाई है (शुद्ध: किया जाता है), बदली नहीं गई। 'संग्रहालय' की तरह '-आलय' वाला शब्द 'विद्यालय' अपेक्षित है; पाठशाला/स्कूल भी सही अर्थ हैं, इसलिए पूरे अंक। |
| ई. ii. | ⚑ | अपेक्षित उत्तर 'पुस्तकालय'। ग्रंथालय मानक पर्याय है; वाचनालय (पढ़ने का कमरा) और लाइब्रेरी भी स्वीकार किए गए। |
| प्र. - ७ (अ) ii) |  | पाठ 7 में हीरे दरबारियों को दिए गए थे; वाक्य में 'मंत्री' अध्यापक का लिखा है, उत्तर पर असर नहीं। |
| (आ) (i) | ⚑ | खुला प्रश्न है; कोई भी सही 'प्र'-उपसर्ग वाला शब्द मानें। छपा उदाहरण (प्रदूषित) दोबारा लिखा हो तो ½ अंक। |
| (आ) (ii) | ⚑ | दूसरा शब्द पहले से अलग होना चाहिए। |
| (इ) i) | ⚑ | 'पुलिंग' आम बोलचाल का रूप है; मानक 'पुल्लिंग/पुंलिंग'। तीनों स्वीकार। |
| (उ) (i) | ⚑ | पाठ में 'ठहरना — रुकना' दिया है; थमना/टिकना भी समान अर्थ वाले शब्द हैं। |
| (उ) (ii) | ⚑ | कई पर्यायवाची सही हैं; सूची के सभी पूरे अंक के हैं। |
| (ऊ) (i) | ⚑ | कोई भी सही वाक्य मानें (सड़क, रेखा, नदी, पगडंडी आदि)। 'टेढ़ा-मेढ़ा' रूप में सही वाक्य भी पूरा अंक। |
| (ए) (i) |  | तीन अल्प विराम (,) और अंत में पूर्ण विराम (। या \|) चाहिए। अल्प विराम सही पर पूर्ण विराम छूटा हो, या एक अल्प विराम छूटा हो, तो ½ अंक। |
| (ए) (ii) |  | 'वाह' के बाद ! ज़रूरी है; अंत में । (या \|) या ! दोनों सही। केवल ! सही और अंत का चिह्न छूटा हो तो ½ अंक। |
| (ऐ) (i) | ⚑ | खुला प्रश्न है; पत्थर का गुण/आकार/रंग बताने वाला कोई भी विशेषण पूरा अंक। |
| (ऐ) (ii) | ⚑ | खुला प्रश्न है; पेड़ का गुण बताने वाला कोई भी विशेषण पूरा अंक। |
| प्र.८ अ. i. |  | 'शुध्द' अध्यापक की छपाई है (शुद्ध: शुद्ध), बदली नहीं गई। विकल्पों में गलत वर्तनियाँ जानबूझकर दी गई हैं। |
| आ. i. |  | 'नाम' पुल्लिंग है, इसलिए 'तुम्हारी' → 'तुम्हारा'। |
| आ. ii. | ⚑ | 'रंग' बहुवचन है: 'होता हैं' → 'होते हैं'। इन्द्रधनुष/इंद्रधनुष (पंचमाक्षर/अनुस्वार) दोनों मानक हैं और पूर्ण विराम । या \| दोनों चलेंगे — इसलिए ये रूप भी मान्य। |
| ई. i. | ⚑ | ज़/ज का नुक्ता वैकल्पिक है, इसलिए 'सब्जियाँ' भी सही। जाँचने की बात 'ी' → 'ि' है; 'सब्जीयाँ' या 'सब्ज़ीयाँ' गलत। |
| उ. i. |  | 'आसमान' पाठ 5 'आसमान गिरा' का शब्द है। |
| उ. ii. |  | 'सलाहकार' पाठ 7 'नकली हीरे' का शब्द है। |
| प्र.९) |  | सुलेख छपे हुए पत्र पर ही होता है; अभिभावक लिखावट देखकर अंक दें। अनुच्छेद में 'महत्व' जैसा छपा है वैसा ही लिखना ठीक है (मानक 'महत्त्व' भी सही)। |

**ws03** (45)

| Question | ⚑ | Note |
|---|---|---|
| प्रश्न-1 क) |  | प्रश्न 1 पर कुल (10) छपा है, भागों पर अंक नहीं; दस भाग हैं, इसलिए हर भाग 1 अंक। च) पृष्ठ बदलने पर छपा है, इसलिए च)–ञ) को अलग खंड (5 अंक) में रखा गया; क)–ङ) का खंड 5 अंक। |
| प्रश्न-1 ग) | ⚑ | गद्यांश में "रास्ते में" फूल देखने की बात है (वाक्य 5), पर आगे रास्ते में ही हिरण भी दिखा (वाक्य 7); दोनों उत्तर पूरे अंक के हैं। |
| प्रश्न-1 ङ) | ⚑ | प्रश्न में "सहेलियों" छपा है, पर गद्यांश में "दोस्तों" है; उत्तर गद्यांश से (गर्व)। केवल "उत्साह/खुशी" लिखे तो अभिभावक ½ अंक दे सकते हैं। |
| च) | ⚑ | "जंगल" के कई पर्यायवाची सही हैं; गद्यांश में "वन" शब्द आया है (वाक्य 10)। |
| च) छ) | ⚑ | 1 अंक दो खाली स्थानों पर बँटा है (½ + ½); यह बँटवारा हमारा है। |
| प्रश्न-2 ग) | ⚑ | केवल "दाल-बाटी" लिखा हो तो भी पूरे अंक दिए गए हैं (चूरमा छूट जाना छोटी चूक है); अभिभावक चाहें तो ½ दें। |
| प्रश्न-2 ङ) | ⚑ | "विशेष" के कई पर्यायवाची सही हैं; सूची के सभी शब्द पूरे अंक के हैं। |
| प्रश्न-3 क) | ⚑ | ककड़ी और खीरा को सब्ज़ी भी माना जाता है और फल भी; दोनों में से किसी भी सूची में हों, सही मानें। |
| प्रश्न-3 ग) | ⚑ | सूची वाला उत्तर है; तीन-चार नाम पूरे अंक, एक-दो नाम ½ अंक (यह बँटवारा हमारा है)। |
| प्रश्न-3 घ) | ⚑ | ककड़ी/खीरा फल या सब्ज़ी दोनों माने जाते हैं; खरबूज/खरबूजा और अमरूद/अमरुद दोनों वर्तनी मानें। |
| प्रश्न-3 ङ) |  | प्रश्न में "अमरुद" छपा है, कविता में "अमरूद"; उत्तर पर इसका असर नहीं। |
| प्रश्न -4 1. | ⚑ | हर पंक्ति 1 अंक: स्वास्थ्यवर्धक ½ + हानिकारक ½ (10 खाने, 5 अंक — बँटवारा हमारा)। कोई भी सही खाद्य मान्य है; एक ही नाम दो पंक्तियों में दोहराया हो तो दूसरी बार अंक न दें। |
| प्रश्न-5 | ⚑ | अनुच्छेद का मूल्यांकन रूब्रिक से करें; कविता "नीम" (पाठ 3) की बातें और सामान्य ज्ञान दोनों मान्य हैं। |
| प्रश्न-6 क) |  | प्रश्न 6 पर खंड का कुल अंक नहीं छपा; भागों के अंक 1+1+2+2+2+2 = 10, इसलिए खंड का कुल 10 रखा गया। इस भाग में केवल "दरबारियों को" भी पूरे अंक का है। |
| प्रश्न-6 ख) | ⚑ | क्रम ज़रूरी है: खरगोश, लोमड़ी, भालू, हाथी, शेर। क्रम में एक-दो की गड़बड़ हो तो अभिभावक ½ अंक दे सकते हैं। |
| प्रश्न-6 ग) | ⚑ | उत्तर विद्यार्थी के अपने शब्दों में होगा; कोई भी दो उचित कारण पूरे अंक के हैं। |
| प्रश्न-6 घ) | ⚑ | यह पाठ्यपुस्तक का बातचीत वाला प्रश्न है, उत्तर पाठ में सीधा नहीं लिखा; कोई भी उचित आधार मान्य है। |
| प्रश्न-6 ङ) | ⚑ | कल्पना वाला प्रश्न है; कविता में चीज़ें गिनाई नहीं गई हैं, इसलिए कोई भी उचित चीज़ें मान्य हैं। |
| प्रश्न-6 च) | ⚑ | उत्तर विद्यार्थी के शब्दों में होगा; पाठ की दोनों बातें आ जाएँ तो पूरे अंक। |
| प्रश्न -7 | ⚑ | हर पंक्ति 1 अंक: नया शब्द ½ + वाक्य ½ (बँटवारा हमारा)। कोई भी सही वाक्य मान्य है; दूसरा नमूना: "मैं पेंसिल का उपयोग लिखने के लिए करता हूँ।" |
| प्रश्न -7 | ⚑ | कोई भी सही वाक्य मान्य है; दूसरा नमूना: "सेना में अनुशासन का बहुत महत्व है।" |
| प्रश्न -8 | ⚑ | मित्र को पत्र में बराबर वालों का अभिवादन (सप्रेम नमस्ते/नमस्ते/प्रिय मित्र) सही है। "सादर प्रणाम" या "चरण स्पर्श" (बड़ों के लिए) गलत है। |
| प्रश्न-10 | ⚑ | 2 अंक: अर्थ 1 + वाक्य 1 (बँटवारा हमारा)। दूसरा नमूना वाक्य: "माँ के बाहर जाते ही भाई-बहन ने घर में आसमान सिर पर उठा लिया।" |
| प्रश्न -11 ख) | ⚑ | "वाह" के बाद विस्मयादिबोधक चिह्न (!) ज़रूरी है; वाक्य के अंत में ! या । दोनों मान्य। "वाह" के बाद ! न हो तो अंक न दें (या ½)। |
| प्रश्न-13 क) | ⚑ | प्रश्न 13 पर खंड का कुल अंक नहीं छपा; क) (2) + ख) (2) = 4। दो खाली जगहें हैं, इसलिए हर सही नाम 1 अंक (बँटवारा हमारा)। चित्र में ऊपर की पंक्ति का चौथा पौधा (कटे-फटे चौड़े पत्ते, नीचे केवल जड़ें) पहचाना नहीं जा सकता; कोई उत्तर उस पर निर्भर नहीं, बच्चा उसे न लिखे तो कोई बात नहीं। छपे चित्र में सफ़ेद गाँठ लहसुन जैसी भी लगती है, इसलिए लहसुन भी मान्य। |
| प्रश्न-13 ख) | ⚑ | हर सही नाम 1 अंक। चित्र के बाहर की कोई सही सब्ज़ी (जैसे भिंडी, लौकी) भी लिखी हो तो सही मानें, क्योंकि प्रश्न केवल नाम पूछता है। |
| प्रश्न-14 डिब्बा 1 | ⚑ | डिब्बा 1 (ऊपर वाला तीर)। तीर पत्तियों की ओर है; छपे चित्र में तीर की नोक के पास एक आम भी था, इसलिए फल/आम भी मान्य। |
| प्रश्न-14 डिब्बा 2 |  | डिब्बा 2 (नीचे वाला तीर)। |
| प्रश्न-15 |  | असीम: पहला स्तंभ, ऊपर से नीचे (अ-सी-म)। |
| प्रश्न-15 | ⚑ | छपी पहेली में गलती है: तीसरा स्तंभ भो-ज-ज पढ़ता है, इसलिए "भोजन" पहेली में नहीं मिलता, केवल "भोज" मिलता है (पाठ्यपुस्तक की पहेली में भो-ज-न है)। भोजन और भोज दोनों पूरे अंक के हैं। |
| प्रश्न-15 |  | तरकारी: पाँचवीं पंक्ति, बाएँ से दाएँ। |
| प्रश्न-15 |  | उपवन: चौथी पंक्ति, दूसरे खाने से दाएँ। |
| प्रश्न-16 |  | 6 शब्द × ½ = 3 अंक। |
| प्रश्न-17 शब्द 1 | ⚑ | कोई भी दो अलग शब्द जिनमें "प्र" उपसर्ग हो (प्र + मूल शब्द) सही हैं; सूची केवल उदाहरण है। प्रेम, प्रश्न, प्रिय, प्रति जैसे शब्दों में "प्र" उपसर्ग नहीं है — इन पर अभिभावक चाहें तो ½ दें। दोनों खानों में एक ही शब्द हो तो एक का अंक। |
| प्रश्न-17 शब्द 2 | ⚑ | पहले खाने से अलग कोई भी सही "प्र" उपसर्ग वाला शब्द। |
| प्रश्न-18 चित्र 1 |  | चित्र 1 (फूलों की बाली वाली छोटी टहनी)। चार चित्र × ½ = 2 अंक। |
| प्रश्न-18 चित्र 2 |  | चित्र 2 (लंबा, चौड़ा पत्ता, सीधी धारियाँ)। |
| प्रश्न-18 चित्र 3 |  | चित्र 3 (तीन मोटे, गहरे हरे, अंडाकार पत्ते)। |
| प्रश्न-18 चित्र 4 |  | चित्र 4 (दिल के आकार का पत्ता, लंबी नुकीली नोक)। |
| प्रश्न –19 ख) | ⚑ | "सोइए" का विलोम "जागिए"; "उठिए" भी इसी अर्थ में सही है। |
| प्रश्न –19 ग) | ⚑ | "गर्मी" का विलोम सर्दी/ठंड/जाड़ा — सभी पूरे अंक के हैं। |
| प्रश्न-20 क) | ⚑ | यह पाठ्यपुस्तक का उदाहरण है (बस → बीस)। प्रश्न यह नहीं बताता कि किसमें मात्रा लगानी है और किसमें हटानी, इसलिए मात्रा लगाकर बना कोई भी सही शब्द (बास, बसा, बसी, बसे, बसो) मान्य है; वर्तनी सही होनी चाहिए। |
| प्रश्न-20 ख) | ⚑ | पाठ्यपुस्तक का उदाहरण: चला → चल (मात्रा हटाकर)। मात्रा बदलकर बने सही शब्द (चली, चले, चलो) भी मान्य हैं; वर्तनी सही होनी चाहिए। |
| प्रश्न 21– | ⚑ | वृद्ध → बूढ़ा छपा हुआ उदाहरण है, उसके अंक नहीं; बाकी 4 जोड़ियाँ × ½ = 2 अंक। पत्र में "ठहराना" छपा है, पर "रुकना" का सही जोड़ा "ठहरना" है; बच्चा ठहराना या ठहरना किसी को भी रुकना से मिलाए, सही मानें। |
| प्रश्न–22 |  | सुलेख छपे पत्र पर ही होगा; अभिभावक लिखावट देखकर रूब्रिक से अंक दें। |

**ws04** (45)

| Question | ⚑ | Note |
|---|---|---|
| प्रश्न1. 1. | ⚑ | इस प्रश्न के भागों पर अलग अंक नहीं छपे; खंड के अंक हर भाग पर बराबर (1-1) बाँटे गए हैं। 'गांधी/गाँधी' और 'करमचंद/करमचन्द' दोनों रूप सही हैं। |
| प्रश्न1. 2. | ⚑ | प्रश्न के दो भाग हैं (तारीख और राज्य)। केवल एक भाग सही हो तो ½ अंक दें। केवल 'पोरबंदर' लिखा हो तो वह शहर है, राज्य नहीं — राज्य वाले भाग का अंक न दें। |
| प्रश्न1. 3. |  | केवल एक नाम लिखा हो तो ½ अंक दें। |
| प्रश्न1. 4. |  | गद्यांश में दोनों नाम हैं, इसलिए सही विकल्प घ) है; केवल क) या ख) चुनने पर अंक नहीं। |
| प्रश्न1. 5. | ⚑ | गद्यांश में लिखा है कि गांधी जी स्वयं सत्य और अहिंसा के रास्ते पर चलते थे; प्रश्न उसी से बना है, इसलिए 'सत्य और अहिंसा' पूरा उत्तर है। केवल एक (सत्य या अहिंसा) लिखा हो तो ½ अंक। |
| प्रश्न1. 8. | ⚑ | सत्य के तीनों विलोम सही हैं: असत्य, झूठ, मिथ्या। |
| प्रश्न1. 9. | ⚑ | गद्यांश में अर्थ कोष्ठक में दिया है (किसी को चोट न पहुँचाना); अपने शब्दों में यही भाव (हिंसा न करना, किसी को दुख न देना) हो तो पूरा अंक। |
| प्रश्न2. 1. | ⚑ | इस प्रश्न के भागों पर अलग अंक नहीं छपे; खंड के अंक हर भाग पर बराबर (1-1) बाँटे गए हैं। तीनों पक्षियों के नाम या 'सभी पक्षियों से' — दोनों पूरे उत्तर हैं; केवल एक-दो नाम हों तो ½ अंक। |
| प्रश्न2. 2. | ⚑ | बच्चा अपने शब्दों में लिखेगा; गंदी/अशुद्ध हवा का भाव हो तो पूरा अंक दें। |
| प्रश्न2. 3. | ⚑ | प्रश्न में 'भागता' छपा है, जो 'भगाता' होना चाहिए। यह भाव दो पंक्तियों में है; इनमें से एक या दोनों पंक्तियाँ लिखने पर पूरा अंक दें। |
| प्रश्न2. 5. | ⚑ | मुख्य विलोम 'अशुद्ध' है; कविता के संदर्भ (प्रदूषित वायु) में 'दूषित/प्रदूषित' भी मान लें। कविता में 'शद्ध' छपा है, जो 'शुद्ध' ही है। |
| प्रश्न3. 1. | ⚑ | इस प्रश्न के भागों पर अलग अंक नहीं छपे; खंड के अंक हर भाग पर बराबर (1-1) बाँटे गए हैं। |
| प्रश्न3. 4. | ⚑ | बुद्धिमान के कई विलोम सही हैं: मूर्ख, बुद्धिहीन, निर्बुद्धि, मूढ़, नासमझ। |
| प्रश्न 4. 1) | ⚑ | इस प्रश्न के भागों पर अंक नहीं छपे; खंड के 10 अंक पाँच भागों में 2-2 बाँटे गए। यह राय वाला प्रश्न है; बिना जाँचे न भागने और सच्चाई पता करने का कोई भी उचित उत्तर मानें। |
| प्रश्न 4. 2) | ⚑ | 'दुर्ग' की जगह 'किला' लिखना सही है। दाल-बाटी-चूरमा देखा नहीं, खाया था — उसे न गिनें, पर उसके लिए अंक न काटें। |
| प्रश्न 4. 3) | ⚑ | पाठ में कारण सीधे नहीं लिखा, पर घोंघे का धीरे चलना पूरे पाठ से स्पष्ट है ('बगीचे में तो सबकुछ धीरे-धीरे चलता था')। धीमी चाल वाला कोई भी उत्तर पूरा मानें। |
| प्रश्न 4. 4) | ⚑ | पाठ्यपुस्तक में इसका उत्तर नहीं छपा; यह सोचकर लिखने वाला प्रश्न है, इसलिए कोई भी उचित कारण मानें। प्रश्न में 'चहचहाट' छपा है (पाठ में 'चहचहाहट'); उत्तर पर असर नहीं। |
| प्रश्न 4. 5 | ⚑ | 'ताज़ा/ताजा' दोनों सही। प्रश्न में 'क्यां' छपा है ('क्या' के लिए); उत्तर पर असर नहीं। |
| प्रश्न -5 क) | ⚑ | रचनात्मक उत्तर है; कोई भी शहर या दर्शनीय स्थल चलेगा। बीच के अंकों के लिए ½ अंक भी दे सकते हैं। |
| ख) | ⚑ | प्रश्न टूटा हुआ है: 'दिए गए नामों के आधार पर' लिखा है, पर कोई नाम नहीं छपा। पाठ 4 की उदाहरण-पंक्ति (आम, परवल, दही, गाजर) ऊपर दिखाई है; हर स्तंभ में कोई भी सही नाम मानें (वे चार नाम भी)। टमाटर/खीरा/ककड़ी/मूली साग-भाजी या सलाद किसी भी स्तंभ में चल सकते हैं; दूध वाले स्तंभ में दही, पनीर, घी, मक्खन, मलाई, खोया, छाछ, लस्सी, खीर, रबड़ी आदि सही हैं। |
| प्रश्न 6 क) 1. | ⚑ | इस खंड (व्याकरण, 15 अंक) के किसी भाग पर अंक नहीं छपे; हर भाग 1-1 अंक का माना गया है। |
| ग) 1. | ⚑ | कोई भी सही वाक्य मानें। |
| ग) 2. | ⚑ | कोई भी सही वाक्य मानें (सड़क, रेखा, नदी, पगडंडी आदि)। |
| घ) | ⚑ | अर्थ अपने शब्दों में होगा; 'बहुत मेहनत करना' का भाव हो तो पूरा अंक। |
| घ) | ⚑ | 'ज़मीन/जमीन' दोनों रूप सही। कोई भी सही वाक्य मानें। |
| ड़) | ⚑ | निर्देश अस्पष्ट है ('उपयुक्त वाक्य'); हमने इसे 'उसी काल का एक और वाक्य लिखिए' समझा है। उस काल का कोई भी सही वाक्य मानें। |
| ड़) | ⚑ | उस काल का कोई भी सही वाक्य मानें (जैसे 'मैं पढ़ रही हूँ।')। |
| ड़) | ⚑ | उस काल का कोई भी सही वाक्य मानें (जैसे 'हम कल पिकनिक पर जाएँगे।')। |
| च) 1. | ⚑ | 'अरे' के बाद विस्मयादिबोधक चिह्न (!) मुख्य है; अंत में ! या । दोनों मानें, और 'अरे,' के साथ अंत में ! भी सही। दंड । या \| दोनों चलेंगे। |
| च) 3. | ⚑ | तीन अल्पविराम (खरगोश, लोमड़ी, भालू के बाद) और अंत में पूर्ण विराम (। या \|) चाहिए। 'और' से पहले एक अतिरिक्त अल्पविराम हो तो भी पूरा अंक; कोई अल्पविराम छूटा हो तो ½ अंक। |
| प्रश्न 6. क) 1. | ⚑ | 'प्रश्न 6' दो बार छपा है (व्याकरण में और यहाँ शब्दावली में); दोनों को जैसा छपा वैसा रखा है। इस खंड (10 अंक) के भागों पर अंक नहीं छपे; हर भाग 1-1 अंक (औषधीय पौधों वाले भाग में दो नाम = 2 अंक)। |
| प्रश्न 6. क) 2. | ⚑ | अर्थ के कई रूप सही हैं: बिना संदेह के, बेशक, निश्चित रूप से, अवश्य। |
| ख) 1. | ⚑ | सामान्य ज्ञान का प्रश्न (पाठ में नहीं)। हावड़ा ब्रिज का नया नाम रवीन्द्र सेतु है; विद्यासागर सेतु भी कोलकाता का प्रसिद्ध पुल है — तीनों सही। |
| ख) 2. | ⚑ | सामान्य ज्ञान का प्रश्न। मुख्य उत्तर लाल किला; पुराना किला भी दिल्ली का प्रसिद्ध किला है, इसलिए मान लें। |
| ग) 1. | ⚑ | कोई भी एक सही विशेषता काफ़ी है। |
| ग) 2. | ⚑ | कोई भी एक सही विशेषता काफ़ी है। |
| घ) | ⚑ | एक पंक्ति पर दो खाली स्थान हैं; हर सही नाम का 1 अंक (हमारा बँटवारा)। पाठ 3 में नीम को औषधीय वृक्ष कहा गया है। |
| ड़) 1. | ⚑ | पाठ्यपुस्तक में पहेली का उत्तर नहीं छपा। पगरी, गगरी, नगरी तीनों में 'गरी' है; गरी (नारियल) खाई जाती है और उसका तेल सिर पर लगाया जाता है — 'नारियल' या 'गरी' दोनों पूरे उत्तर। |
| ड़) 2. |  | पहेली में 'मध्य हेट' छपा है, जो पाठ में 'मध्य हटे' है; उत्तर पर असर नहीं (क-रे-ला: बीच का हटे तो 'कला', पहला हटे तो 'रेला')। |
| प्रश्न 7. क) 1. | ⚑ | इस खंड (10 अंक) के भागों पर अंक नहीं छपे; हर भाग 1-1 अंक माना गया है। दिए गए वर्णों में 'रं' है, इसलिए लक्ष्य 'अपरंपार' ही है। |
| ग) 1) | ⚑ | कई सही शब्द बन सकते हैं: कला, काल, कली, कील, कुल, कुली, काला, काली, केला, किला। केवल सही वर्तनी वाला सार्थक शब्द मानें; 'क' और 'ल' नहीं बदलने चाहिए। |
| ग) 2) | ⚑ | मुख्य उत्तर 'सेब' है; 'सूबा' (प्रांत) भी सही शब्द है। 'साब' मानक शब्द नहीं है ('साहब' होता है), इसलिए अंक न दें। |
| ड़) 1. | ⚑ | शब्दों का सही क्रम लगाना है; 'भैया ने स्वादिष्ट भोजन बनाया।' मुख्य उत्तर है, दूसरे सही क्रम भी मानें। दंड । या \| दोनों चलेंगे। |
| ड़) 2. | ⚑ | पाठ 5 का वाक्य है। 'भागते-भागते' योजक चिह्न के साथ या बिना — दोनों मानें; शब्दों का दूसरा सही क्रम भी चलेगा। |
| प्रश्न 8. |  | सुलेख छपे हुए पत्र पर ही होता है; अभिभावक लिखावट देखकर अंक दें। |

**ws05** (26)

| Question | ⚑ | Note |
|---|---|---|
| प्रश्न 1. (क) | ⚑ | शीर्ष पर 'मुद्रित पृष्ठों की संख्या : 05' छपा है, पर PDF में 4 ही पृष्ठ हैं; सभी प्रश्नों के अंक जोड़कर 40 होते हैं, इसलिए पत्र पूरा है। ‘जयपुर के पास’ (दूरी के बिना) भी स्वीकार है; अभिभावक चाहें तो पूरी दूरी (लगभग चौदह किलोमीटर) पर पूरे अंक दें। |
| प्रश्न 1. (ग) | ⚑ | गद्यांश में यह सीधे नहीं लिखा; 'राजस्थान के लोक नृत्य' और 'राजस्थान का विशेष व्यंजन' से अनुमान लगता है। उत्तर सामान्य ज्ञान से: राजस्थान। |
| प्रश्न 1. (घ) | ⚑ | छपे (1) अंक को दो खाली स्थानों में बाँटा गया: हर सही शब्द ½ अंक (यह बँटवारा हमारा है)। |
| प्रश्न 1. | ⚑ | (घ) का दूसरा खाली स्थान, ½ अंक (बँटवारा हमारा)। |
| प्रश्न 1. (ड) | ⚑ | छपे (1) अंक को दो खाली स्थानों में बाँटा गया: हर सही शब्द ½ अंक (यह बँटवारा हमारा है)। 'बडा' (ड़ का बिंदु छूटा) वर्तनी की गलती है, उसे न मानें। |
| प्रश्न 1. | ⚑ | (ड) का दूसरा खाली स्थान, ½ अंक (बँटवारा हमारा)। |
| प्रश्न 2. क. | ⚑ | गद्यांश के पहले वाक्य में 'शेर' है; चूहा भी उसी जंगल में पेड़ के पास रहता था, इसलिए 'शेर और चूहा' भी माना गया। हर भाग 1 अंक (5M ÷ 5)। |
| प्रश्न 2. ख | ⚑ | पूरा उत्तर ‘पेड़ के नजदीक बिल में’ है; केवल ‘पेड़ के पास’ (बिल के बिना) अधूरा है — अभिभावक चाहें तो ½ दें। |
| प्रश्न 2. घ . | ⚑ | प्रश्न में 'चुन कर' लिखा है पर कोई विकल्प नहीं छपे (और 'लिखा' छपा है, 'लिखो' नहीं)। उत्तर गद्यांश से: शरीर; उसी अर्थ का कोई भी सही शब्द (बदन/तन) मान्य। |
| प्रश्न 3 . (क) | ⚑ | प्रश्न 3 का कुल अंक अलग से नहीं छपा; हर भाग के छपे अंक (1+1+1+2+1) जोड़कर 6 रखा गया (खंड-शीर्षक में भी 06 अंक)। सूची वाला उत्तर है; पूरी सूची ज़रूरी नहीं। तीन या अधिक सही नाम पर पूरा अंक। |
| प्रश्न 3 . (ग) | ⚑ | ‘जोहरी’ लिखा हो तो अर्थ सही है पर वर्तनी गलत (सही: जौहरी) — अंक अभिभावक तय करें। |
| प्रश्न 3 . (घ) | ⚑ | अपने शब्दों में लिखा उत्तर भी पूरा माना जाए: 'सब दरबारियों को, क्योंकि उन्होंने झूठी प्रशंसा की' = 2 अंक। |
| प्रश्न 3 . (ड) | ⚑ | पाठ में यह अनुमान वाला प्रश्न है; उत्तर पाठ में लिखा नहीं, सामान्य ज्ञान से है। |
| प्रश्न 4. | ⚑ | इस पत्र के निर्देश में 'नाम लिखो' नहीं है (ws01 में था), पर 'नाम - ____' रेखा छपी है; इसलिए 3 अंक तीन वाक्यों के हैं (हर वाक्य 1), नाम का अलग अंक नहीं। नाम के सभी रूप सही: लेटर बॉक्स / लेटरबॉक्स / पत्र-पेटी / पत्र पेटी / डाक-पेटी / डाक पेटी / डाकपेटी / पोस्ट बॉक्स / पोस्टबॉक्स। |
| प्रश्न 5. (क) | ⚑ | कोई भी सही वाक्य मान्य है। दूसरा उदाहरण: दादाजी धीरे-धीरे सीढ़ियाँ चढ़ते हैं। |
| प्रश्न 5. (ख) | ⚑ | कोई भी सही वाक्य मान्य है। दूसरा उदाहरण: राम और श्याम साथ-साथ खेलते हैं। |
| प्रश्न 6. | ⚑ | हर पंक्ति 1 अंक (3M ÷ 3)। कोई भी सही भविष्यत् काल का वाक्य मान्य है, जैसे 'मैं कल नानी के घर जाऊँगी।' |
| प्रश्न 6. | ⚑ | कोई भी सही वर्तमान काल का वाक्य मान्य है, जैसे 'बच्चे मैदान में खेल रहे हैं।' 'मैं रोज़ स्कूल जाती हूँ' (सामान्य वर्तमान) भी मान लें। |
| प्रश्न 6. | ⚑ | कोई भी सही भूतकाल का वाक्य मान्य है, जैसे 'मैंने खाना खा लिया।' या 'कल बारिश हुई थी।' |
| प्रश्न 7. | ⚑ | हर पंक्ति 1 अंक: खाली खाना ½ + वाक्य ½ (बँटवारा हमारा)। पत्र (और पाठ्यपुस्तक) 'भर' को उपसर्ग मानता है, इसलिए यहाँ वही रखा है। 'भर पेट' (अलग लिखा) भी मान लें। |
| प्रश्न 7. | ⚑ | खाली खाना ½ + वाक्य ½। वाक्य में 'अनुशासन' शब्द आना चाहिए। |
| प्रश्न 7. | ⚑ | खाली खाना ½ + वाक्य ½। वाक्य में 'सुविचार' शब्द आना चाहिए। |
| प्रश्न 8. | ⚑ | छपा प्रश्न (2M) चार जोड़ों में बराबर बाँटा गया: हर सही जोड़ी ½ अंक (बँटवारा हमारा)। कागज़ पर रेखा खींचनी थी; यहाँ हर शब्द का अर्थ चुनना है। |
| प्रश्न 9. | ⚑ | छपा प्रश्न (2M) चार शब्दों में बराबर बाँटा गया: हर सही विलोम ½ अंक (बँटवारा हमारा)। |
| प्रश्न 9. | ⚑ | संज्ञा का विलोम संज्ञा होनी चाहिए; 'अप्रसन्नता' मानक है, दुख/उदासी भी सही हैं। 'अप्रसन्न'/'दुखी' (विशेषण रूप) लिखे तो अर्थ सही है पर शब्द-भेद अलग; पूरा ½ देना है या नहीं, अभिभावक तय करें। |
| प्रश्न 12. |  | सुलेख छपे हुए पत्र पर ही होता है; अभिभावक लिखावट देखकर अंक दें। |

**ws06** (21)

| Question | ⚑ | Note |
|---|---|---|
| प्रश्न 1. (क) |  | शीर्ष पर 'कुल मुद्रित पृष्ठों की संख्या: 06' छपा है, पर PDF में 4 ही पृष्ठ हैं; प्रश्न 1–7 के अंक जोड़कर 40 होते हैं, इसलिए पत्र पूरा है। प्रश्न 1 में खंड का कुल अंक नहीं छपा, हर भाग पर (1) है; इसलिए पठित गद्यांश का कुल 5 अंक रखा गया। |
| प्रश्न 1. (ग) | ⚑ | केवल 'कहाँ भागे जा रहे हो?' लिखने पर भी पूरा अंक दें; 'ज़रा सुनो तो' अकेला लिखा हो तो अभिभावक तय करें। |
| प्रश्न 1. (घ) | ⚑ | वृक्ष के कई पर्यायवाची सही हैं (पेड़, तरु, विटप, द्रुम, पादप, रूख); इनमें से कोई एक काफ़ी है। |
| (क) |  | अपठित गद्यांश पर भी हर भाग पर (1) छपा है, कुल नहीं; इसलिए इस भाग का कुल 5 अंक रखा गया। |
| (ग) | ⚑ | शिक्षा बच्चे के अपने शब्दों में होगी; कहानी से जुड़ी हर उचित शिक्षा को पूरा अंक दें। |
| प्रश्न 2. (क) |  | प्रश्न 2 में कोई निर्देश-पंक्ति और कुल अंक नहीं छपे; भागों के अंक (1)+(2)+(2) = 5, इसलिए खंड का कुल 5 रखा गया। |
| प्रश्न 2. (ख) | ⚑ | उत्तर बच्चे के अपने शब्दों में होगा; पेट खराब होना, बीमार पड़ना या पछताना — कोई भी उचित कारण मानें। |
| प्रश्न 2. (ग) | ⚑ | यह पाठ्यपुस्तक का प्रश्न 3(घ) है; कविता में कई सलाहें हैं (ढंग से, ताजा, सलाद, भूख से कम), कोई भी उचित सलाह और उसका कारण मानें। |
| प्रश्न 3. | ⚑ | रचनात्मक उत्तर है; हर सही, हाथी से जुड़ा वाक्य लगभग 1 अंक। बीच के अंकों के लिए ½ अंक भी दे सकते हैं। |
| प्रश्न 4.(क) | ⚑ | विलोम के एक से अधिक सही रूप हो सकते हैं; सूची के सभी रूप पूरे अंक के हैं। |
| प्रश्न 4.(क) | ⚑ | विलोम के एक से अधिक सही रूप हो सकते हैं; सूची के सभी रूप पूरे अंक के हैं। |
| प्रश्न 4.(क) | ⚑ | विलोम के एक से अधिक सही रूप हो सकते हैं; सूची के सभी रूप पूरे अंक के हैं। 'जागिए' और 'उठिए' दोनों सही हैं। |
| (ख) | ⚑ | 'सुगन्धित' (पंचमाक्षर वाला रूप) भी शुद्ध है, पूरा अंक दें। |
| प्रश्न 5. | ⚑ | 'जीरा' भी बनता है पर वह मसाला है, फल या साग-तरकारी नहीं; अभिभावक चाहें तो आधा अंक दें। |
| प्रश्न 5. | ⚑ | 'बेर' (फल) भी मात्रा बदले बिना बनता है, पर इसमें दोनों वर्ण बदलते हैं; उसे भी पूरा अंक दें। |
| प्रश्न 6. | ⚑ | कई सही शब्द बन सकते हैं |
| प्रश्न 6. | ⚑ | कई सही शब्द बन सकते हैं; यहाँ मात्रा हटाकर 'पढ़' बनता है, मात्रा बदलकर पढ़ा/पढ़े/पढ़ो भी सही हैं। बिना नुक्ते का 'पढ' अशुद्ध है। |
| प्रश्न 6. | ⚑ | कई सही शब्द बन सकते हैं |
| प्रश्न 6. | ⚑ | कई सही शब्द बन सकते हैं; यहाँ मात्रा हटाकर 'कह' बनता है, मात्रा बदलकर कहा/कहे/कहो भी सही हैं। |
| प्रश्न 6. | ⚑ | कई सही शब्द बन सकते हैं |
| प्रश्न 7. |  | सुलेख छपे हुए पत्र पर ही होता है; अभिभावक लिखावट देखकर अंक दें। |

**ws07** (27)

| Question | ⚑ | Note |
|---|---|---|
| • प्र.१ | ⚑ | शीर्षक में 'कुल मुद्रित पृष्ठों की संख्या: 6' छपा है, पर पत्र में 4 ही पृष्ठ हैं; अंक पूरे 40 बनते हैं, इसलिए पत्र पूरा है। पठित गद्यांश के (५) अंक हमने ऐसे बाँटे: प्र.१, प्र.२, प्र.3. — 1-1 अंक, और प्र.४ के दो शब्द — 1-1 अंक (कुल 5)। |
| प्र.४ १) | ⚑ | यह उत्तर सामान्य ज्ञान पर आधारित है (गद्यांश में अर्थ नहीं दिया गया)। कदम, डग, पैर, पाँव, चरण — इनमें से कोई भी पूरे अंक का है। |
| प्र.४ २) | ⚑ | पाठ 'ओणम के रंग' का पाठ उत्तर लिखने वाले के पास उपलब्ध नहीं था; यह उत्तर गद्यांश और सामान्य ज्ञान पर आधारित है। कृपया पुस्तक से मिलान कर लें। त्रिविक्रम विष्णु का नाम है (तीन पगों में तीनों लोक नापने वाले); 'वामन' लिखे तो पुस्तक की शब्दावली देखकर तय करें। |
| • प्र.१ | ⚑ | 'अश्विन' (बिना ा) भी स्वीकार करें। अगर बच्चा 'अक्टूबर' या 'सितंबर-अक्टूबर' लिखे तो वह गद्यांश से नहीं है; अपने विवेक से तय करें। |
| • प्र.३ | ⚑ | गद्यांश में 'मेघनाथ' और 'कुंभकरण' छपा है; मानक रूप 'मेघनाद' और 'कुंभकर्ण' हैं — दोनों रूप स्वीकार करें। दोनों नाम हों तभी पूरा अंक; एक नाम पर ½ अंक दे सकते हैं। |
| • प्र.४ | ⚑ | गद्यांश का उत्तर 'सच्चाई के रास्ते पर चलना' है; 'बुराई पर अच्छाई की जीत' भी गद्यांश में है, इसलिए उसे भी स्वीकार किया है। शब्द थोड़े अलग हों तो भाव देखकर अंक दें। |
| • प्र.५ |  | प्रश्न में 'लिखे' छपा है (सही 'लिखें'); उत्तर पर असर नहीं। |
| प्र.१ | ⚑ | पाठ 'ओणम के रंग' का पाठ उत्तर लिखने वाले के पास उपलब्ध नहीं था; यह उत्तर गद्यांश और सामान्य ज्ञान पर आधारित है। कृपया पुस्तक से मिलान कर लें। पाठ्य प्रश्न के (5) अंक: पाँच प्रश्न, 1-1 अंक (छपा नहीं, हमने बाँटा)। केवल 'हर साल' लिखे तो ½ अंक दे सकते हैं। |
| प्र.२ | ⚑ | पाठ 'ओणम के रंग' का पाठ उत्तर लिखने वाले के पास उपलब्ध नहीं था; यह उत्तर गद्यांश और सामान्य ज्ञान पर आधारित है। कृपया पुस्तक से मिलान कर लें। |
| प्र.3. | ⚑ | पाठ 'ओणम के रंग' का पाठ उत्तर लिखने वाले के पास उपलब्ध नहीं था; यह उत्तर गद्यांश और सामान्य ज्ञान पर आधारित है। कृपया पुस्तक से मिलान कर लें। ओणम साद्या के कई पकवान हैं; पुस्तक में जो नाम हों (जैसे पायसम, अवियल, केले के चिप्स) वे भी पूरे अंक के हैं। 'खीर' = पायसम मानें। |
| प्र.४. | ⚑ | पाठ 'ओणम के रंग' का पाठ उत्तर लिखने वाले के पास उपलब्ध नहीं था; यह उत्तर गद्यांश और सामान्य ज्ञान पर आधारित है। कृपया पुस्तक से मिलान कर लें। |
| प्र.५. | ⚑ | बच्चे का अपना अनुभव है; कोई भी उचित काम सही है। |
| १) | ⚑ | पाठ 'ओणम के रंग' का पाठ उत्तर लिखने वाले के पास उपलब्ध नहीं था; यह उत्तर गद्यांश और सामान्य ज्ञान पर आधारित है। कृपया पुस्तक से मिलान कर लें। हर सही वाक्य का 1 अंक; मात्रा की छोटी गलतियों पर अंक न काटें। |
| २) | ⚑ | बच्चे की अपनी पसंद है; कोई भी त्योहार और उचित कारण सही है। |
| अ) २) | ⚑ | इस वाक्य में दो विशेषण हैं (ठंडी-ठंडी, तेज) और अंक 1 है; हमने ½ + ½ बाँटा है। अगर अध्यापक एक विशेषण पर पूरा अंक देते हों तो वैसा करें। |
| अ) ३) | ⚑ | पत्र में 'उँचे उँचे' छपा है; मानक रूप 'ऊँचे-ऊँचे' है — दोनों स्वीकार करें। |
| अ) ५) | ⚑ | मुख्य विशेषण 'स्वच्छ' है (जल की विशेषता); 'सुंदर' भी विशेषण (विधेय विशेषण) है, इसलिए 'सुंदर' या दोनों लिखने पर भी पूरा अंक दें। |
| आ) १) | ⚑ | पाठ 'ओणम के रंग' का पाठ उत्तर लिखने वाले के पास उपलब्ध नहीं था; यह उत्तर गद्यांश और सामान्य ज्ञान पर आधारित है। कृपया पुस्तक से मिलान कर लें। शब्दकोश में 'सह्य' = सहने योग्य; पर केरल के पाठ में यह 'सह्य पर्वत / सह्याद्रि (पश्चिमी घाट)' भी हो सकता है — दोनों अर्थ स्वीकार किए हैं, पुस्तक की शब्दावली देख लें। |
| आ) २) | ⚑ | सामान्य ज्ञान से; पाठ की शब्दावली का शब्द अलग हो सकता है। सूची के अलावा कोई सही समानार्थी भी स्वीकार करें। |
| अ) २) | ⚑ | पाठ 'ओणम के रंग' का पाठ उत्तर लिखने वाले के पास उपलब्ध नहीं था; यह उत्तर गद्यांश और सामान्य ज्ञान पर आधारित है। कृपया पुस्तक से मिलान कर लें। 'आरन्मुला' केरल का वह स्थान है जहाँ ओणम पर नौका दौड़ होती है; दिए अक्षरों से यही शब्द बनता है। आरनमुला/अरनमुला भी स्वीकार करें। |
| आ) १) | ⚑ | सामान्य ज्ञान से; पाठ की शब्दावली का शब्द अलग हो सकता है। भाव सही हो तो पूरा अंक दें। |
| आ) २) | ⚑ | सामान्य ज्ञान से; पाठ की शब्दावली का शब्द अलग हो सकता है। भाव सही हो तो पूरा अंक दें। |
| अ) १) | ⚑ | पाठ 'ओणम के रंग' का पाठ उत्तर लिखने वाले के पास उपलब्ध नहीं था; यह उत्तर गद्यांश और सामान्य ज्ञान पर आधारित है। कृपया पुस्तक से मिलान कर लें। ओणम की फूलों की रंगोली को सामान्यतः 'पूकलम/पूक्कलम' लिखते हैं, जो विकल्पों में नहीं है; 'क्क' वाला एकमात्र विकल्प 'पुक्कलम' है, इसलिए वही चुना है। पुस्तक में लिखी वर्तनी से मिलान करें। |
| आ) १) | ⚑ | कोई भी सही वाक्य मान्य है; क्रिया का कोई भी रूप (चमकता, चमकी, चमक रहे) चलेगा। |
| आ) २) | ⚑ | कोई भी सही वाक्य मान्य है; 'मँडराना' (चंद्रबिंदु) भी सही है। |
| आ) ३) | ⚑ | कोई भी सही वाक्य मान्य है; 'थमना' का अर्थ है रुकना। |
| — |  | सुलेख छपे हुए पत्र पर ही करें; अभिभावक रुब्रिक से जाँचें। सुलेख (३) का अनुच्छेद 'ओणम के रंग' से नहीं है। |

<!-- generated:end -->
