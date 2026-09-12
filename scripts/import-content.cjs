'use strict';
// Imports only the authored immutable runtime pack. Does not change approvals, secrets or SQLite.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const {readInput,validateBuffer,atomicWrite} = require('./content-integrity.cjs');
const {materialize} = require('./materialize-content.cjs');
function importContent(root, input) {
  const lock = JSON.parse(fs.readFileSync(path.join(root,'content-pack/content.lock.json'),'utf8'));
  const bytes = readInput(path.resolve(input));
  validateBuffer(bytes,lock); // No write occurs before identity, schema and references pass.
  atomicWrite(path.join(root,'content-pack/content.json.gz'),zlib.gzipSync(bytes,{level:9}));
  return materialize(root,{required:true});
}
if (require.main === module) {
  try {
    if (process.argv.length !== 3) throw new Error('Usage: node scripts/import-content.cjs <content.json or content.json.gz>');
    console.log(JSON.stringify(importContent(path.resolve(__dirname,'..'),process.argv[2]),null,2));
  } catch (e) { console.error(e.message); process.exitCode = 1; }
}
module.exports = {importContent};
