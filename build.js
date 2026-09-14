#!/usr/bin/env node
/* हिंदी अभ्यास — v2 build step.
 *
 * Reads the split source under app/, injects the SHA-256 hash of the
 * जाँच-mode secret code (env var GANESH) in place of the __GANESH_HASH__
 * placeholder, inlines styles.css, app.js and the seven chapter data files,
 * and writes the single self-contained dist/index.html.
 *
 * Zero npm dependencies — only Node's built-in fs, path and crypto modules.
 *
 * Usage: node build.js
 *   GANESH env var is read first (how Vercel injects Project env vars at
 *   build time); if it is not set at all, a local .env.local at the repo
 *   root is parsed for a GANESH=... line as a fallback for local builds.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const APP_DIR = path.join(ROOT, 'app');
const DATA_DIR = path.join(APP_DIR, 'data');
const DIST_DIR = path.join(ROOT, 'dist');
const CHAPTER_COUNT = 7;
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

  // ---- app/data/chapter1..7.json: validate + assemble papersData ----
  const chapters = {};
  for (let n = 1; n <= CHAPTER_COUNT; n++) {
    const chapterPath = path.join(DATA_DIR, `chapter${n}.json`);
    let raw;
    try {
      raw = fs.readFileSync(chapterPath, 'utf8');
    } catch (err) {
      fail(`Could not read ${chapterPath}: ${err.message}`);
      return;
    }
    try {
      chapters[String(n)] = JSON.parse(raw);
    } catch (err) {
      fail(`app/data/chapter${n}.json is not valid JSON: ${err.message}`);
      return;
    }
  }

  let papersJson = JSON.stringify(chapters);
  // Defensive HTML-safety: if any chapter content ever contained the literal
  // substring "</script", it would prematurely close the embedded <script>
  // tag. Escaping it as "<\/script" keeps the JSON valid (JSON.parse()
  // correctly unescapes it back to "</script" at runtime).
  papersJson = papersJson.split('</script').join('<\\/script');

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
    '<script type="application/json" id="papersData">' + papersJson + '</script>';
  const inlinedAppScript = '<script>\n' + patchedAppJs + '\n</script>';
  html = html.replace(APP_SCRIPT_TAG, papersDataTag + '\n' + inlinedAppScript);

  // ---- write dist/index.html — only after every validation above passed ----
  fs.mkdirSync(DIST_DIR, { recursive: true });
  const outPath = path.join(DIST_DIR, 'index.html');
  fs.writeFileSync(outPath, html, 'utf8');

  const sizeKb = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(1);
  process.stdout.write(`Built dist/index.html (${sizeKb} KB)\n`);
  process.exit(0);
}

main();
