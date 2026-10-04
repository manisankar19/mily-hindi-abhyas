# Sprint v3 — Owner decisions

## Gate 0 (2026-10-04, after intake)

| # | Question | Decision |
|---|---|---|
| 1 | ws01 (Aug 2025) and ws05 (Aug 2026) overlap (54.7% exact-line, more by question) | **Keep both.** Shared questions must have identical answers (`a`, `acceptable`, rubric). The coordinator checks this at the batch 2 re-check (Task 23). |
| 2 | ws07 "ओणम के रंग" is not in the textbook PDFs | **General knowledge, all ⚑.** Answer from the printed passages plus general knowledge. Every item that needs the chapter gets `answerConfidence: "check"`, with a `teacherNote` saying the chapter text was not available. An item with no defensible answer (possibly सह्य) is a HARD STOP and goes back to the owner. |
| 3 | Paper-only items | **Only सुलेख on paper** (`answerKind: "paperOnly"` + rubric). Everything else is answered on screen, with a Hindi `adaptation` note: "गोला लगाओ" → "यहाँ सही शब्द लिखिए।"; the ws03 word grid → "ग्रिड में मिला शब्द लिखिए।"; "रेखा खींचकर मिलाइए" → a match item; the अथवा choice (ws02 Q5 क) → the child picks one, and both get model answers and rubrics. |
| 4 | Broken questions and unprinted per-part marks | **Keep, note, accept all.** Keep the question as printed and add a `teacherNote`. Accept every defensible reading: ws03 grid भोजन **and** भोज; ws03 Q21 ठहराना/ठहरना; ws01/ws05 (ग) राजस्थान by inference, ⚑. ws04 Q5 ख: show the textbook's example row (पाठ 4) as an `adaptation`, with a 5-mark banded rubric. Unprinted marks are split evenly (½ where needed), with `block.marks` set and ⚑ on the item where the split was ours. |

## Defaults taken by the coordinator (owner can override)
- **Display order** of the "विद्यालय कार्यपत्रक" group is newest first: ws04 (सितंबर 2026), ws07 (सितंबर 2026), ws05 (अगस्त 2026), ws06 (जुलाई 2026), ws02 (सितंबर 2025, सेट अ), ws03 (सितंबर 2025, सेट ब), ws01 (अगस्त 2025).
- **ws03 Q13 picture:** the plant that can't be identified (broad lobed leaves, roots only) is drawn as printed, but no answer depends on it. Its `teacherNote` says so.
- **ws03 Q14 upper arrow:** key पत्ती/पत्तियाँ, and also accept फल/आम, ⚑.
- **Header page-count mismatches** (ws05 says 05, ws06 says 06 and ws07 says 6, but each PDF has 4 pages): the papers are complete (marks add up). The header is kept as printed and the mismatch recorded in `teacherNote` on the first item.
