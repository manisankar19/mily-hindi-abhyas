#!/usr/bin/env node
/* हिंदी अभ्यास — v3 paper validator.
 *
 * Chapter papers (no `kind` field) get exactly the checks build.js applies
 * today: the file must be readable and parse as JSON. Nothing stricter.
 * School worksheets (`kind: "school"`) get the rules in
 * sprints/v3/school-contract.md §3; see SCHEMA.md for the full list.
 *
 * Every error is "<where>: [rule-tag] message" so tests and humans can tell
 * which rule fired.
 *
 * Zero npm dependencies — only Node's built-in fs and path modules.
 *
 * Usage: node validate.js [--dir app/data] [--assets app/assets]
 *                         [--intake-dir source/intake] [--review-dir sprints/v3/answer-review]
 *                         [files...]
 *   With no files, every *.json in --dir is checked.
 *   Prints "OK n papers, m items" (exit 0) or the errors (exit 1).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DEFAULTS = {
  dir: path.join(ROOT, 'app', 'data'),
  assets: path.join(ROOT, 'app', 'assets'),
  intakeDir: path.join(ROOT, 'source', 'intake'),
  reviewDir: path.join(ROOT, 'sprints', 'v3', 'answer-review'),
  reviewSheetModule: path.join(ROOT, 'scripts', 'review-sheet.js'),
};
const FIXTURE_WS = 'ws99';
const WS_RE = /^ws\d{2}$/; // also keeps ws-derived file names inside their directories

const ANSWER_KINDS = ['objective', 'spelling', 'judgement', 'paperOnly'];
const CONFIDENCE = ['ok', 'check'];

// ---------------------------------------------------------------- helpers --

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const nonEmptyStr = (v) => typeof v === 'string' && v.trim() !== '';
const isHalf = (v) => isNum(v) && v >= 0 && Number.isInteger(v * 2);
// Compare marks in ½ units so 0.5 + 0.5 + … never drifts.
const halves = (v) => Math.round(v * 2);
const fmt = (h) => String(h / 2);

const DEVANAGARI_DIGITS = '०१२३४५६७८९';

/**
 * Read the block's mark total out of a printed bracket such as "(5M)", "(2)",
 * "(1X5=5)", "(½×4=2)", "10 अंक" or "(५)". If there is an "=", the number after
 * the last one wins; otherwise the bracket must hold exactly one number.
 * Returns a number, or null when nothing can be read reliably.
 */
function parsePrintedMarks(printed) {
  if (typeof printed !== 'string') return null;
  let s = printed.replace(/[०-९]/g, (d) => String(DEVANAGARI_DIGITS.indexOf(d)));
  s = s.replace(/(\d*)\s*½/g, (m, whole) => String((whole ? Number(whole) : 0) + 0.5));
  const eq = s.lastIndexOf('=');
  if (eq !== -1) s = s.slice(eq + 1);
  const nums = s.match(/\d+(?:\.\d+)?/g);
  if (!nums || nums.length !== 1) return null;
  return Number(nums[0]);
}

/** Lower-noise form for "does the alt text give the answer away" checks. */
function normForAlt(s) {
  return String(s)
    .replace(/[।|,.?!;:"'“”‘’()\[\]{}\-–—…/\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** True when `answer` appears in `alt` as whole word(s). */
function altContains(alt, answer) {
  const a = normForAlt(answer);
  if (!a) return false;
  return (' ' + normForAlt(alt) + ' ').includes(' ' + a + ' ');
}

// ------------------------------------------------------------ chapter rules --

/**
 * Chapter papers: build.js only reads and JSON.parses chapter1..7.json, so a
 * parsed chapter paper has nothing further to fail. Kept as a function so the
 * rule set stays explicit (SCHEMA.md "Decisions").
 */
function validateChapter(/* paper */) {
  return [];
}

// ------------------------------------------------------------- school rules --

function validateSchool(paper, opts) {
  const errors = [];
  const ws = typeof paper.ws === 'string' ? paper.ws : '?';
  const err = (where, tag, msg) => errors.push(`${where}: [${tag}] ${msg}`);
  const assetsDir = opts.assetsDir || DEFAULTS.assets;
  const intake = opts.intake || null;

  if (paper.kind !== 'school') {
    err(ws, 'kind', `kind must be "school" (or absent for a chapter paper), got ${JSON.stringify(paper.kind)}`);
    return errors;
  }
  if (!WS_RE.test(ws)) err(ws, 'ws-id', `ws must look like "ws01", got ${JSON.stringify(paper.ws)}`);

  if (!isHalf(paper.totalMarks)) {
    err(ws, 'marks-half', `totalMarks must be a multiple of 0.5, got ${JSON.stringify(paper.totalMarks)}`);
  }
  if (!Array.isArray(paper.sections) || paper.sections.length === 0) {
    err(ws, 'shape', 'sections must be a non-empty array');
    return errors;
  }

  let sectionSumH = 0;
  let sectionsOk = true;
  paper.sections.forEach((sec, si) => {
    const sWhere = `${ws} §${isObj(sec) && sec.code != null ? sec.code : si + 1}`;
    if (!isObj(sec) || !Array.isArray(sec.blocks) || sec.blocks.length === 0) {
      err(sWhere, 'shape', 'section must be an object with a non-empty blocks array');
      sectionsOk = false;
      return;
    }
    if (!isHalf(sec.marks)) {
      err(sWhere, 'marks-half', `section marks must be a multiple of 0.5, got ${JSON.stringify(sec.marks)}`);
      sectionsOk = false;
    } else {
      sectionSumH += halves(sec.marks);
    }

    let secItemsH = 0;
    let secItemsOk = true;
    sec.blocks.forEach((block, bi) => {
      const bWhere = `${sWhere} › ${isObj(block) && block.num != null ? block.num : '#' + (bi + 1)}`;
      if (!isObj(block) || !Array.isArray(block.items) || block.items.length === 0) {
        err(bWhere, 'shape', 'block must be an object with a non-empty items array');
        secItemsOk = false;
        return;
      }

      // Block picture + alt.
      checkPicture(block, block.items, bWhere, assetsDir, err);

      let blockH = 0;
      let blockOk = true;
      block.items.forEach((item, ii) => {
        const iWhere = `${bWhere} › ${isObj(item) && item.label ? item.label : '#' + (ii + 1)}`;
        if (!isObj(item)) {
          err(iWhere, 'shape', 'item must be an object');
          blockOk = false;
          return;
        }
        if (!isHalf(item.marks)) {
          err(iWhere, 'marks-half', `item marks must be a multiple of 0.5, got ${JSON.stringify(item.marks)}`);
          blockOk = false;
        } else {
          blockH += halves(item.marks);
        }
        checkItem(item, block, iWhere, err);
        if (item.picture != null || item.pictureAlt != null) checkPicture(item, [item], iWhere, assetsDir, err);
      });

      if (!blockOk) {
        secItemsOk = false;
        return;
      }
      secItemsH += blockH;

      // Block total: an explicit numeric `marks` wins, else the printed bracket.
      let declared = null;
      if (block.marks !== undefined) {
        if (!isHalf(block.marks)) {
          err(bWhere, 'marks-half', `block marks must be a multiple of 0.5, got ${JSON.stringify(block.marks)}`);
        } else {
          declared = block.marks;
        }
      } else {
        declared = parsePrintedMarks(block.printedMarks);
      }
      if (declared !== null && halves(declared) !== blockH) {
        err(bWhere, 'block-sum',
          `item marks add up to ${fmt(blockH)} but the block says ${declared}` +
          (block.marks === undefined ? ` (printedMarks ${JSON.stringify(block.printedMarks)})` : ''));
      }
    });

    if (secItemsOk && isHalf(sec.marks) && secItemsH !== halves(sec.marks)) {
      err(sWhere, 'section-sum', `item marks add up to ${fmt(secItemsH)} but section marks is ${sec.marks}`);
    }
  });

  if (sectionsOk && isHalf(paper.totalMarks) && sectionSumH !== halves(paper.totalMarks)) {
    err(ws, 'total-sum', `section marks add up to ${fmt(sectionSumH)} but totalMarks is ${paper.totalMarks}`);
  }

  if (intake && intake.printedTotal !== undefined && intake.printedTotal !== null &&
      paper.totalMarks !== intake.printedTotal) {
    err(ws, 'intake-total', `totalMarks ${paper.totalMarks} ≠ intake printedTotal ${intake.printedTotal}`);
  }

  return errors;
}

function checkItem(item, block, where, err) {
  const kind = item.answerKind;
  if (!ANSWER_KINDS.includes(kind)) {
    err(where, 'answer-kind', `answerKind must be one of ${ANSWER_KINDS.join(' | ')}, got ${JSON.stringify(kind)}`);
  }
  if (!CONFIDENCE.includes(item.answerConfidence)) {
    err(where, 'answer-confidence', `answerConfidence must be "ok" or "check", got ${JSON.stringify(item.answerConfidence)}`);
  }
  if (item.teacherNote !== undefined && item.teacherNote !== null && typeof item.teacherNote !== 'string') {
    err(where, 'teacher-note', `teacherNote must be a string or null, got ${JSON.stringify(item.teacherNote)}`);
  }

  const hasRubric = item.rubric !== undefined && item.rubric !== null;

  if (kind === 'objective') {
    if (!Array.isArray(item.acceptable)) {
      err(where, 'objective-acceptable', 'objective item needs an acceptable array (it may be empty only for a single exact form)');
    }
    if (hasRubric) err(where, 'objective-rubric', 'objective item must have rubric null');
  }

  if (kind === 'spelling') {
    const acc = item.acceptable;
    if (acc !== undefined && !Array.isArray(acc)) {
      err(where, 'spelling-acceptable', 'acceptable must be an array');
    } else if (Array.isArray(acc) && acc.length > 0) {
      if (item.answerConfidence !== 'check') {
        err(where, 'spelling-acceptable', 'spelling item has acceptable variants but answerConfidence is not "check" (⚑)');
      } else if (!nonEmptyStr(item.teacherNote)) {
        err(where, 'spelling-acceptable', 'spelling item with acceptable variants needs a teacherNote explaining the variant');
      }
    }
  }

  if (kind === 'judgement') {
    if (!hasRubric) err(where, 'judgement-rubric', 'judgement item needs a rubric');
    if (!nonEmptyStr(item.a)) err(where, 'judgement-answer', 'judgement item needs a short model answer in a');
  }

  if (kind === 'paperOnly') {
    if (!hasRubric) err(where, 'paperonly-rubric', 'paperOnly item needs a rubric');
    if (!nonEmptyStr(block.adaptation) && !nonEmptyStr(item.teacherNote)) {
      err(where, 'paperonly-note', 'paperOnly item needs block adaptation or item teacherNote saying it is done on the printed sheet');
    }
  }

  if ((kind === 'judgement' || kind === 'paperOnly') && hasRubric) checkRubric(item, where, err);
}

function checkRubric(item, where, err) {
  const r = item.rubric;
  if (!Array.isArray(r) || r.length < 2 || !r.every((b) => isObj(b) && isHalf(b.marks) && typeof b.desc === 'string')) {
    err(where, 'judgement-rubric', 'rubric must be an array of ≥2 {marks (multiple of 0.5), desc} bands');
    return;
  }
  const top = Math.max(...r.map((b) => b.marks));
  const bottom = Math.min(...r.map((b) => b.marks));
  if (isHalf(item.marks) && halves(top) !== halves(item.marks)) {
    err(where, 'rubric-top', `rubric top band is ${top} but the item is worth ${item.marks}`);
  }
  if (bottom !== 0) err(where, 'rubric-zero', `rubric needs a 0 band (lowest is ${bottom})`);
}

/** `owner` is a block or item carrying picture/pictureAlt; `items` are the answers it must not reveal. */
function checkPicture(owner, items, where, assetsDir, err) {
  const pic = owner.picture;
  if (pic === undefined || pic === null) return;
  if (typeof pic !== 'string' || pic === '' || path.basename(pic) !== pic) {
    err(where, 'picture-missing', `picture must be a bare file name, got ${JSON.stringify(pic)}`);
  } else if (!fs.existsSync(path.join(assetsDir, pic))) {
    err(where, 'picture-missing', `picture ${pic} not found in ${path.relative(ROOT, assetsDir) || assetsDir}`);
  }
  if (!nonEmptyStr(owner.pictureAlt)) {
    err(where, 'picture-alt', 'picture needs a non-empty Hindi pictureAlt');
    return;
  }
  for (const item of items) {
    if (!isObj(item)) continue;
    if (typeof item.a === 'string' && altContains(owner.pictureAlt, item.a)) {
      err(where, 'alt-gives-answer', `pictureAlt contains the answer ${JSON.stringify(item.a)}`);
    }
    if (Array.isArray(item.acceptable)) {
      for (const acc of item.acceptable) {
        if (typeof acc === 'string' && altContains(owner.pictureAlt, acc)) {
          err(where, 'alt-gives-acceptable', `pictureAlt contains the acceptable answer ${JSON.stringify(acc)}`);
        }
      }
    }
  }
}

// ------------------------------------------------------------------- public --

/**
 * validatePaper(paper, { assetsDir, intake }) → string[] errors.
 * No `kind` → chapter rules (as build.js today); otherwise school rules.
 */
function validatePaper(paper, opts) {
  opts = opts || {};
  if (!isObj(paper)) return ['?: [shape] paper must be a JSON object'];
  if (paper.kind === undefined) return validateChapter(paper);
  return validateSchool(paper, opts);
}

/** Cross-file rule: entries are [{ file, paper }]; returns duplicate-ws errors. */
function findDuplicateWs(entries) {
  const seen = new Map();
  const errors = [];
  for (const { file, paper } of entries) {
    if (!isObj(paper) || paper.kind === undefined || typeof paper.ws !== 'string') continue;
    if (seen.has(paper.ws)) {
      errors.push(`${paper.ws}: [duplicate-ws] ${file} reuses the ws id of ${seen.get(paper.ws)}`);
    } else {
      seen.set(paper.ws, file);
    }
  }
  return errors;
}

function countItems(paper) {
  let n = 0;
  if (!isObj(paper) || !Array.isArray(paper.sections)) return 0;
  for (const s of paper.sections) {
    if (!isObj(s) || !Array.isArray(s.blocks)) continue;
    for (const b of s.blocks) if (isObj(b) && Array.isArray(b.items)) n += b.items.length;
  }
  return n;
}

// ---------------------------------------------------------------------- CLI --

function parseArgs(argv) {
  const opts = { dir: DEFAULTS.dir, assets: DEFAULTS.assets, intakeDir: DEFAULTS.intakeDir, reviewDir: DEFAULTS.reviewDir, files: [] };
  const flags = { '--dir': 'dir', '--assets': 'assets', '--intake-dir': 'intakeDir', '--review-dir': 'reviewDir' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (flags[a]) {
      if (i + 1 >= argv.length) throw new Error(`${a} needs a value`);
      opts[flags[a]] = path.resolve(argv[++i]);
    } else if (a.startsWith('--')) {
      throw new Error(`unknown option ${a}`);
    } else {
      opts.files.push(path.resolve(a));
    }
  }
  return opts;
}

function displayPath(file) {
  const rel = path.relative(ROOT, file);
  return rel && !rel.startsWith('..') && !path.isAbsolute(rel) ? rel.split(path.sep).join('/') : file;
}

function isFixture(paper, file) {
  const rel = path.relative(ROOT, file).split(path.sep).join('/');
  return paper.ws === FIXTURE_WS || rel.startsWith('tests/fixtures/');
}

function main(argv) {
  let opts;
  try {
    opts = parseArgs(argv);
  } catch (e) {
    process.stderr.write('ERROR: ' + e.message + '\n');
    return 1;
  }

  let files = opts.files;
  if (files.length === 0) {
    if (!fs.existsSync(opts.dir)) {
      process.stderr.write(`ERROR: ${opts.dir} does not exist\n`);
      return 1;
    }
    files = fs.readdirSync(opts.dir).filter((f) => f.endsWith('.json')).sort().map((f) => path.join(opts.dir, f));
  }

  const errors = [];
  const entries = [];
  let items = 0;
  let renderSheet = null;
  let warnedSheet = false;

  for (const file of files) {
    const rel = displayPath(file);
    let paper;
    try {
      paper = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) {
      errors.push(`${rel}: [json] ${e.message}`);
      continue;
    }
    entries.push({ file: rel, paper });
    items += countItems(paper);

    let intake = null;
    if (isObj(paper) && paper.kind !== undefined && WS_RE.test(paper.ws)) {
      const intakeFile = path.join(opts.intakeDir, paper.ws + '.json');
      if (fs.existsSync(intakeFile)) {
        try {
          intake = JSON.parse(fs.readFileSync(intakeFile, 'utf8'));
        } catch (e) {
          errors.push(`${displayPath(intakeFile)}: [json] ${e.message}`);
        }
      }
    }

    for (const e of validatePaper(paper, { assetsDir: opts.assets, intake })) errors.push(`${rel}: ${e}`);

    // Review-sheet staleness (school papers only; the ws99 fixture is exempt).
    if (isObj(paper) && paper.kind === 'school' && WS_RE.test(paper.ws) && !isFixture(paper, file)) {
      if (renderSheet === null && fs.existsSync(DEFAULTS.reviewSheetModule)) {
        renderSheet = require(DEFAULTS.reviewSheetModule).renderSheet;
      }
      if (typeof renderSheet !== 'function') {
        if (!warnedSheet) {
          process.stderr.write('WARN: scripts/review-sheet.js not found; review-sheet staleness check skipped\n');
          warnedSheet = true;
        }
      } else {
        const sheet = path.join(opts.reviewDir, paper.ws + '.md');
        const sheetRel = displayPath(sheet);
        if (!fs.existsSync(sheet)) {
          errors.push(`${rel}: ${paper.ws}: [review-sheet] ${sheetRel} is missing; run npm run review-sheets`);
        } else if (fs.readFileSync(sheet, 'utf8') !== renderSheet(paper)) {
          errors.push(`${rel}: ${paper.ws}: [review-sheet] ${sheetRel} is stale; run npm run review-sheets`);
        }
      }
    }
  }

  errors.push(...findDuplicateWs(entries));

  if (errors.length) {
    for (const e of errors) process.stderr.write('ERROR: ' + e + '\n');
    process.stderr.write(`${errors.length} error(s) in ${files.length} file(s)\n`);
    return 1;
  }
  process.stdout.write(`OK ${entries.length} papers, ${items} items\n`);
  return 0;
}

module.exports = { validatePaper, findDuplicateWs, parsePrintedMarks, main };

if (require.main === module) {
  process.exit(main(process.argv.slice(2)));
}
