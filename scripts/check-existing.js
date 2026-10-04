#!/usr/bin/env node
// Existing-paper guard (sprints/v3/school-contract.md §4): the SHA-256 of app/data/chapter1..7.json
// must equal the "existing" map in sprints/v3/preflight-hashes.json. Exit 0 if all match, 1 otherwise.
// Usage: node scripts/check-existing.js [DATA_DIR]   (DATA_DIR defaults to app/data; used by the tests)
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');

function main(argv) {
  const dataDir = argv[0] ? path.resolve(argv[0]) : path.join(ROOT, 'app', 'data');
  const recorded = JSON.parse(fs.readFileSync(path.join(ROOT, 'sprints', 'v3', 'preflight-hashes.json'), 'utf8')).existing || {};
  const keys = Object.keys(recorded).filter(k => /^app\/data\/chapter[1-7]\.json$/.test(k)).sort();
  let bad = 0;
  if (keys.length !== 7) { console.log(`ERROR expected 7 chapter hashes in preflight-hashes.json, found ${keys.length}`); bad++; }
  for (const key of keys) {
    const file = path.join(dataDir, path.basename(key));
    if (!fs.existsSync(file)) { console.log(`MISSING ${key}`); bad++; continue; }
    const sha = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    if (sha === recorded[key]) console.log(`OK ${key}`);
    else { console.log(`CHANGED ${key} (now ${sha}, recorded ${recorded[key]})`); bad++; }
  }
  console.log(bad ? `check-existing: ${bad} problem(s)` : `check-existing: all ${keys.length} chapter files unchanged`);
  return bad ? 1 : 0;
}

if (require.main === module) process.exit(main(process.argv.slice(2)));
