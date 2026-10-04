# Sprint v3 — Preflight (2026-10-04)

Hashes: `sprints/v3/preflight-hashes.json` (existing app files, 7 worksheets, 7 textbook PDFs).

## Tools
| Tool | Version / state |
|---|---|
| pdftoppm / pdftotext | 24.08.0 |
| node | v22.23.2 |
| Playwright | 1.63.0 (dev dependency in `package.json`; Chromium already cached) |
| semgrep | present (`~/.local/bin/semgrep`) |
| Devanagari font | **none at start** → installed `google-noto-sans-devanagari-fonts` + `google-noto-serif-devanagari-fonts` via dnf (Task 3). `fc-list` now lists 72 Devanagari faces. |

## Sources
- `source/samples/`: 7 PDFs (42 pages), mapped ws01…ws07 in filename order. All 7 were made with MS Word LTSC, and the text layer is garbled by a legacy font mapping. The page images are the reference.
- `source/textbook/`: 7 PDFs (InDesign, clean Unicode text layer). `source/textbook-text/ch1..7.txt` extracted with `pdftotext`. `ch1.txt` opens with the prayer "ऐसा वर दो" before पाठ १ "चिड़िया का गीत".

## Repo
- `git status` before the sprint: clean except untracked `source/` and `sprints/v3/`. HEAD `4f0ad65`.
- `.env.local` (root) and `app/.env.local` are both git-ignored by the `.env*` rule.

## Build and secret
- `node build.js` → `dist/index.html` (264.5 KB).
- The `GANESH_HASH` in `dist/index.html` is a 64-hex hash, and it equals the SHA-256 of the local `GANESH` value.
- The plaintext code occurs 0 times in `dist/index.html`. Token or JWT patterns occur 0 times. No secret was printed.

## Live
- `https://mily-hindi-abhyas-nu.vercel.app` → HTTP 200.

## Task 3 font check
`tests/font-check.js` logs in and opens पाठ ६ in headless Chromium. It saves `tests/screenshots/task3-01-chapter6-devanagari.png`, where the Hindi renders correctly, and checks that 9 Devanagari glyphs give at least 4 distinct widths. Tofu boxes are all one width. Result: PASS.

The first version of the check compared `क` with a lone `ि`, and that gave a false FAIL even though the font was installed. The test was wrong, not the font, and it was replaced. The red case, with the font absent, was not re-run because the font would have to be uninstalled.
