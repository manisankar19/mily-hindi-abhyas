#!/usr/bin/env node
/* हिंदी अभ्यास — v2 build step.
 *
 * Reads the split source under app/, injects the SHA-256 hash of the
 * जाँच-mode secret code (env var GANESH) in place of the __GANESH_HASH__
 * placeholder, inlines styles.css, app.js, every paper in app/data
 * (chapterN.json + hindi-wsNN.json, discovered — no hard-coded counts), the
 * worksheet display order (app/worksheet-order.json) and each referenced
 * picture once (app/assets/*.svg as data URIs), and writes the single
 * self-contained dist/index.html.
 *
 * Zero npm dependencies — only Node's built-in fs, path and crypto modules.
 *
 * Usage: node build.js
 *   GANESH env var is read first (how Vercel injects Project env vars at
 *   build time); if it is not set at all, a local .env.local at the repo
 *   root is parsed for a GANESH=... line as a fallback for local builds.
 *   HINDI_DATA_DIR / HINDI_ASSETS_DIR / HINDI_ORDER_FILE / HINDI_DIST_DIR
 *   override the input/output locations (used by tests/build.test.js).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const APP_DIR = path.join(ROOT, 'app');
const DATA_DIR = process.env.HINDI_DATA_DIR || path.join(APP_DIR, 'data');
const ASSETS_DIR = process.env.HINDI_ASSETS_DIR || path.join(APP_DIR, 'assets');
const ORDER_FILE = process.env.HINDI_ORDER_FILE || path.join(APP_DIR, 'worksheet-order.json');
const DIST_DIR = process.env.HINDI_DIST_DIR || path.join(ROOT, 'dist');
const PAPER_FILE = /^(?:chapter(\d+)|hindi-(ws\d{2}))\.json$/;
const ASSET_NAME = /^[a-z0-9-]+\.svg$/;
const PLACEHOLDER = '__GANESH_HASH__';
const STYLESHEET_TAG = '<link rel="stylesheet" href="styles.css">';
const APP_SCRIPT_TAG = '<script src="app.js"></script>';

function fail(message) {
  process.stderr.write('ERROR: ' + message + '\n');
  process.exit(1);
}

/**
 * Resolve the GANESH secret value.
 * - If process.env.GANESH is set at all (even to an empty string — e.g. the
 *   shell invocation `GANESH= node build.js`), that value is authoritative
 *   and no fallback is attempted, so an explicitly-empty env var still fails
 *   loudly instead of silently picking up .env.local.
 * - Otherwise (the var is entirely absent from process.env), fall back to a
 *   minimal manual parse of .env.local's `GANESH=...` line, for local
 *   convenience. The unrelated `Vercel Token = ...` line in the same file is
 *   ignored by this parser (it never matches the GANESH= pattern).
 */
function resolveGanesh() {
  if (process.env.GANESH !== undefined) {
    return process.env.GANESH;
  }

  const envLocalPath = path.join(ROOT, '.env.local');
  if (!fs.existsSync(envLocalPath)) {
    return '';
  }

  const contents = fs.readFileSync(envLocalPath, 'utf8');
  const lines = contents.split(/\r?\n/);
  for (const line of lines) {
    const match = /^GANESH=(.*)$/.exec(line);
    if (match) {
      return match[1];
    }
  }
  return '';
}

function main() {
  const ganesh = resolveGanesh();

  if (!ganesh || !ganesh.trim()) {
    fail(
      'GANESH environment variable is not set. Set it in Vercel Project ' +
      'Settings (Production/Preview/Development) or in a local .env.local file.'
    );
    return;
  }

  const hash = crypto.createHash('sha256').update(ganesh.trim(), 'utf8').digest('hex');

  // ---- app/app.js: validate placeholder, patch in memory only ----
  const appJsPath = path.join(APP_DIR, 'app.js');
  const appJsSource = fs.readFileSync(appJsPath, 'utf8');
  if (!appJsSource.includes(PLACEHOLDER)) {
    fail(
      `Placeholder ${PLACEHOLDER} not found in app/app.js. The committed source ` +
      'must keep this placeholder for the build to inject the secret hash ' +
      '(see REQUIREMENTS-v2 §9 pitfall 5).'
    );
    return;
  }
  const patchedAppJs = appJsSource.split(PLACEHOLDER).join(hash);

  // ---- app/styles.css: read verbatim for inlining ----
  const stylesCssPath = path.join(APP_DIR, 'styles.css');
  const stylesCss = fs.readFileSync(stylesCssPath, 'utf8');

  // ---- app/data: every chapterN.json and hindi-wsNN.json ----
  const papers = {};
  const files = fs.readdirSync(DATA_DIR).filter(f => PAPER_FILE.test(f)).sort();
  if (!files.some(f => f.startsWith('chapter'))) { fail(`No chapter papers found in ${DATA_DIR}`); return; }
  for (const file of files) {
    const [, chapterNo, wsFromName] = PAPER_FILE.exec(file);
    let paper;
    try {
      paper = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'));
    } catch (err) {
      fail(`app/data/${file} is not valid JSON: ${err.message}`);
      return;
    }
    const id = chapterNo ? String(Number(chapterNo)) : paper.ws;
    if (!chapterNo && (paper.kind !== 'school' || paper.ws !== wsFromName)) {
      fail(`app/data/${file}: expected kind "school" and ws "${wsFromName}", got ws "${paper.ws}" (duplicate or misnamed worksheet id)`);
      return;
    }
    if (papers[id]) { fail(`duplicate paper id "${id}" (app/data/${file})`); return; }
    papers[id] = paper;
  }
  const wsIds = Object.keys(papers).filter(k => /^ws\d{2}$/.test(k)).sort();

  // ---- worksheet display order: must list every worksheet exactly once ----
  let order = [];
  if (wsIds.length) {
    try {
      order = JSON.parse(fs.readFileSync(ORDER_FILE, 'utf8'));
    } catch (err) {
      fail(`Could not read worksheet order ${ORDER_FILE}: ${err.message}`);
      return;
    }
    const missing = wsIds.filter(w => !order.includes(w));
    const extra = order.filter(w => !wsIds.includes(w));
    if (!Array.isArray(order) || missing.length || extra.length || new Set(order).size !== order.length) {
      fail(`worksheet-order.json must list every worksheet once (missing: ${missing.join(', ') || '—'}; unknown: ${extra.join(', ') || '—'})`);
      return;
    }
  }

  // ---- pictures: each referenced SVG inlined once as a data URI ----
  const assets = {};
  for (const paper of Object.values(papers)) {
    for (const sec of paper.sections || []) for (const blk of sec.blocks || []) {
      for (const name of [blk.picture, ...(blk.items || []).map(i => i.picture)]) {
        if (!name || assets[name]) continue;
        if (!ASSET_NAME.test(name)) { fail(`bad picture name "${name}" in ${paper.ws || 'chapter ' + paper.chapter}`); return; }
        const file = path.join(ASSETS_DIR, name);
        if (!fs.existsSync(file)) { fail(`picture not found: app/assets/${name} (used by ${paper.ws || 'chapter ' + paper.chapter})`); return; }
        assets[name] = 'data:image/svg+xml;base64,' + fs.readFileSync(file).toString('base64');
      }
    }
  }

  // Defensive HTML-safety: if any content ever contained the literal substring
  // "</script", it would prematurely close the embedded <script> tag. Escaping
  // it as "<\/script" keeps the JSON valid (JSON.parse() unescapes it).
  const safeJson = v => JSON.stringify(v).split('</script').join('<\\/script');
  const papersJson = safeJson(papers);

  // ---- app/index.html: template, never touched on disk ----
  const indexHtmlPath = path.join(APP_DIR, 'index.html');
  let html = fs.readFileSync(indexHtmlPath, 'utf8');

  if (!html.includes(STYLESHEET_TAG)) {
    fail(`Expected tag not found in app/index.html: ${STYLESHEET_TAG}`);
    return;
  }
  html = html.replace(STYLESHEET_TAG, '<style>\n' + stylesCss + '\n</style>');

  if (!html.includes(APP_SCRIPT_TAG)) {
    fail(`Expected tag not found in app/index.html: ${APP_SCRIPT_TAG}`);
    return;
  }
  const papersDataTag =
    '<script type="application/json" id="papersData">' + papersJson + '</script>\n' +
    '<script type="application/json" id="worksheetOrder">' + safeJson(order) + '</script>\n' +
    '<script type="application/json" id="assetsData">' + safeJson(assets) + '</script>';
  const inlinedAppScript = '<script>\n' + patchedAppJs + '\n</script>';
  html = html.replace(APP_SCRIPT_TAG, papersDataTag + '\n' + inlinedAppScript);

  // ---- write dist/index.html — only after every validation above passed ----
  fs.mkdirSync(DIST_DIR, { recursive: true });
  const outPath = path.join(DIST_DIR, 'index.html');
  fs.writeFileSync(outPath, html, 'utf8');

  const sizeKb = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(1);
  process.stdout.write(`Built dist/index.html (${sizeKb} KB; ${Object.keys(papers).length} papers, ${wsIds.length} worksheets, ${Object.keys(assets).length} pictures)\n`);
  process.exit(0);
}

main();
