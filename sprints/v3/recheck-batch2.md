# Batch 2 coordinator re-check (Task 23): ws01, ws05

Done by the coordinator, not delegated. One sub-agent authored ws01 and then ws05 from a single source of answers, so that shared questions agree by construction (Gate 0 #1). Every item was read in full; every ⚑ answer was re-derived from ch6/ch7 or the printed passage.

| ws | Items | Marks | ⚑ actual / intake estimate | Coordinator fixes |
|---|---|---|---|---|
| ws01 | 40 | 40 | 27 / 24 | 4 |
| ws05 | 39 | 40 | 24 / 24 | 5 |

## Fixes (applied identically in both papers where the question is shared)
1. **जौहरी:** `acceptable` contained the misspelling **जोहरी से**. It was removed, the item became ⚑, and the `teacherNote` now says "the meaning is right but the spelling is wrong; the parent decides". The agent's earlier note said the misspelling was accepted, and it was replaced, not appended to.
2. **दिन x ____:** `acceptable` contained the misspelling **रात्री** (for रात्रि), which was removed.
3. **विशाल - ____:** `acceptable` contained **महान** ("great", not "big"), which was removed.
4. **आमेर का दुर्ग कहाँ है?** `acceptable` includes the vague "जयपुर के पास" (no distance). It was kept, but the item is now ⚑ with a note so the parent decides.
5. **ws05 Q2 ख "चूहा कहाँ रहता था?":** "पेड़ के नजदीक" and "पेड़ के पास" (without बिल) were accepted for full marks. They were removed, the item became ⚑, and the note offers ½ for the incomplete answer.

## Checked and kept
- (ग) राजस्थान is an inference from "राजस्थान के लोक नृत्य", ⚑ as Gate 0 #4 requires.
- Match: बुद्धिमान→विवेकवान, निस्संदेह→संदेह न होना, वृद्ध→बूढ़ा, श्रेष्ठ→सर्वोत्तम. These were checked against the printed right column (`printedRight`).
- Post box: `app/assets/shared-postbox.svg` was viewed at 2× by the coordinator. It is clearly an Indian pillar post box (domed red cap, slot, envelope plate, door, black base) and has no text. ws01 gives 1 mark for the name and 2 for the sentences. ws05 prints no "नाम लिखो", so the name earns no marks and the 3 sentences carry all 3. The difference is deliberate and explained in a `teacherNote`.
- Spelling targets प्रसन्न, संग्रहालय, वेधशाला, दरबार are exact, with `acceptable` empty.

## Consistency
`scripts/consistency.js` was made marks-aware: rubric bands are compared only between items with the same marks. The answer key must still match everywhere. Tests: 6/6. Result after the fixes: **OK, 0 inconsistent** across ws01/04/05/06/07. ws04 प्रश्न 4 (2) "अमर ने जयपुर में क्या-क्या देखा?" is worth 2 marks there and 1 in ws05; its model answer was aligned to the ws05 wording.

## Transcript re-read (10%)
ws01 p3 (tense table, उपसर्ग table, Q10 heading) was compared with the page image by eye. It matches exactly, including the cells that are blank in print (मूल शब्द in row 2, उपसर्ग in row 3).

## Brief
No change needed. The agent applied the batch 1 nukta policy correctly: बडा is rejected and ज़मीन/जमीन are both accepted.

**Parent action:** read `sprints/v3/answer-review/ws01.md` and `ws05.md` (⚑ first) before use.
