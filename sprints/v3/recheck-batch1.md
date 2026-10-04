# Batch 1 coordinator re-check (Task 20): ws07, ws06

Done by the coordinator, not delegated. Every item of both papers was read in full from the JSON (answer, `acceptable`, rubric, ⚑), and every ⚑ answer was re-derived from the printed passage, the textbook (ch4, ch5) or standard Hindi.

| ws | Items | Marks | ⚑ actual / intake estimate | Fixes by coordinator |
|---|---|---|---|---|
| ws07 | 35 | 40 | 25 / 26 | 1 |
| ws06 | 33 | 40 | 17 / 16 | 1 |

## Fixes
1. **ws07 व्याकरण अ) ५)** "स्वच्छ जल वातावरण को सुंदर बना देता है": `acceptable` contained **साफ़**. The question asks for the adjective *in the sentence*, and साफ़ is a synonym, not in the sentence, so it was removed. स्वच्छ (key) and सुंदर (predicative adjective, ⚑) remain.
2. **ws06 प्रश्न 6** (मात्रा लगाकर/हटाकर): added two more correct words formed only by changing matras: **भारी** (भर) and **राही** (रह).

## Checked and kept
- **ws07 पठित / अपठित answers:** checked against the passage text. आश्विन (प्र.१), रावण, मेघनाथ तथा कुंभकरण, and "सच्चाई के रास्ते पर चलना चाहिए" are all verbatim in the passage. "बुराई पर अच्छाई की जीत" is also in the passage, so accepting it is fair.
- **ws07 chapter-dependent items** (Onam date, Mahabali's boon, feast dishes, सह्य, आरन्मुला, पुक्कलम): all ⚑, with a note that the chapter was not available (Gate 0 #2). सह्य accepts both defensible readings; no hard stop.
- **ws06 Q1/Q2:** checked against ch5 "आसमान गिरा" and ch4. Q5 चौकी→लौकी, मेला→केला, चालक→पालक match the textbook exercise (पाठ 4).
- **Nukta policy (new note for the brief):** पेड़ → पेड was **not** added. ड़/ढ़ are separate letters in Hindi, not an optional nukta, so पेड is a misspelling. Only ज़/ज, फ़/फ, क़/क, ख़/ख, ग़/ग are optional-nukta pairs.

## Missed ⚑ sweep (non-⚑ objective items)
Each non-⚑ objective item has a single answer that is verbatim in the passage or exact (jumbles, इत-words, spelling). None needed a ⚑.

## Transcript re-read (10%)
ws06 p3 (Q4 क/ख, 15 lines) and ws07 p4 (शब्दावली, वर्तनी) were compared with the page images by eye. Both match exactly, including the joined words (औरसही, हीनीचे, लगाकरनए) and the quote spacing (‘ नियमित’).

## Tooling notes
- `tests/fixtures.test.js` hard-coded "OK 7 papers" and failed as soon as a worksheet existed. It now expects 7 chapters plus every `hindi-wsNN.json`.
- `scripts/consistency.js` was added for cross-paper key checks (needed from batch 2).

## Brief tightened
- Nukta: only the optional-nukta pairs above get variants; never drop the nukta from ड़/ढ़.
- Printed worked examples (e.g. `नियम ←→ नियमित`) go in the block `passage`, so they are fidelity-checked but not scored.
- A printed per-part mark such as "(1)" between instruction and item may stay in `q` if fidelity needs it.

**Parent action:** read `sprints/v3/answer-review/ws07.md` and `ws06.md` (⚑ items first) before Mily uses these worksheets.
