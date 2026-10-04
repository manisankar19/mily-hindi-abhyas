# Batch 3 coordinator re-check (Task 30): ws04, ws02, ws03

Done by the coordinator, not delegated. To save time, batches 2 and 3 ran at the same time (owner asked to run Phase 3 straight through). The batch 1 lessons (nukta policy, worked examples) were already in the brief. Every item of the three papers was read in full; every ⚑ answer was re-derived from the textbook text (ch1–ch7) or the printed passage. All five new pictures were viewed at 2× by the coordinator.

| ws | Items | Marks | ⚑ actual / intake estimate | Coordinator fixes |
|---|---|---|---|---|
| ws04 | 62 | 80 | 41 / 38 | 1 (consistency) |
| ws02 | 65 | 80 | 33 / 30 | 3 |
| ws03 | 69 | 80 | 36 / 30 | 1 (slots) |

## Fixes
1. **ws02 प्र.३ passage split:** the passage runs over the footer "प्रष्ठ 2/8", so it failed fidelity as one string. The agent moved its first two lines into the block `instruction`, which would have shown them as part of the instruction on screen. Fixed at the root: `scripts/fidelity.js` now drops a printed footer only when it is the last line before a page break (tests 28/28, with a test that footer-like text elsewhere is kept). The two lines are back in `passage`.
2. **ws02 प्र.१ v (क) जग:** `acceptable` had **दुनियाँ** (non-standard). The question says to find the word in the passage, where it is printed **दुनिया**, so it was removed.
3. **Unlabelled answer slots** (ws01 Q10 sentences, ws02 आ. shapes, ws03 Q14 boxes, Q17 words, Q18 leaves): these items had neither a printed label nor question text, so on screen the child could not tell which slot belonged to which picture. A new **display-only `slot`** field was added (e.g. "चित्र 1", "आकृति 2", "डिब्बा 1"). Fidelity does not check it, because it is not printed. It is documented in SCHEMA.md and the contract, and the review sheet shows it (test added, review-sheet 11/11).
4. **ws04 प्रश्न 4 (2) "अमर ने जयपुर में क्या-क्या देखा?":** the model answer's wording was aligned with ws05 (`consistency.js`).

## Checked and kept
- **ws04 riddles:** नारियल/गरी (the riddle "कच्ची खाओ, पक्की खाओ, सिर पर उसका तेल लगाओ" is printed in ch3 "बूझो तो जानें"; गरी is hidden in पगरी/गगरी/नगरी) and करेला ("मध्य हटे कला बन जाऊँ"). Both are correct.
- **ws04 Q5 ख:** the textbook's example row (पाठ 4) is shown as the adaptation, with a 5-mark banded rubric (Gate 0 #4).
- **ws04 duplicate "प्रश्न 6":** kept, with a note.
- **ws03 Q15 grid:** असीम, तरकारी and उपवन are findable. आहार accepts भोजन **and** भोज, because the printed grid has the misprint भो-ज-ज (Gate 0 #4).
- **ws03 Q21:** ठहराना/ठहरना are both accepted. The example is not scored.
- **ws03 Q14:** the upper arrow ends among the leaves near a mango, so पत्ती is the key, फल/आम are also accepted, and the item is ⚑ (v3-decisions default).
- **ws02 Q6 आ:** आयत/त्रिभुज (+ चतुर्भुज/त्रिकोण, ⚑). English names are not accepted, because this is a Hindi शब्द-भंडार item; the parent may give ½.

## Pictures (viewed at 2× by the coordinator)
| File | Shows | Answerable from the drawing alone |
|---|---|---|
| `ws02-q5kh.svg` | Children playing: girl on a tree swing, boy with a kite, girl chasing a ball; house, barn, fence, path, sun | yes (open description) |
| `ws02-q6aa.svg` | Rectangle (1) and triangle (2), no names | yes |
| `ws03-q13.svg` | 12 vegetable plants on a soil band; produce clearly above or below the soil line; one unidentified plant (no answer depends on it) | yes |
| `ws03-q14.svg` | Mango tree; arrow 1 to the leaves, arrow 2 to a mango; empty numbered boxes | yes (arrow 1 ⚑) |
| `ws03-q18.svg` | Four numbered leaves: tulsi sprig, banana, banyan, peepal (drip tip) | yes (banyan is the weakest drawing; it can be matched by elimination) |

## Cross-paper consistency
`node scripts/consistency.js` gives **OK, 30 shared question groups across 7 papers, 0 inconsistent** (Set A / Set B / Set 2 / ws01 / ws05).

## Transcript re-read (10%)
ws03 p10 (the agent did not view it) was viewed by the coordinator. It holds only 13 answer lines and the footer, so nothing was missed. The ws01 p3 and ws06 p3 re-reads are in the batch 1 and 2 notes.

## For Phase 4 (app)
- MCQ / choice `options` (ws04 Q1.4, Q3.1–2, Q7 घ; ws02 Q8 अ/इ) are stored **only** in `options`, and some items have an empty `q`. The renderer must show `options` and `slot` (Task 34).
- Some `q` strings keep a printed "(1)" or line break (`\n`) where fidelity needs it. The renderer should keep line breaks.

**Parent action:** read `sprints/v3/answer-review/ws04.md`, `ws02.md` and `ws03.md` (⚑ first) before use.
