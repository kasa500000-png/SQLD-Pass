'use strict';
const path = require('node:path');
const fs = require('node:fs');
const {validateBuffer,readInput} = require('./content-integrity.cjs');
try {
  const root = path.resolve(__dirname,'..');
  const lock = JSON.parse(fs.readFileSync(path.join(root,'content-pack/content.lock.json'),'utf8'));
  const result = validateBuffer(readInput(path.join(root,'generated/content.json')),lock);
  console.log(JSON.stringify({status:'valid',counts:result.counts,sha256:result.sha256,releaseReady:result.content.manifest.releaseReady},null,2));
} catch (e) { console.error(e.message); process.exitCode = 1; }
