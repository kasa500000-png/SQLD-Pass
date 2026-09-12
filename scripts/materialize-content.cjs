'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {validateBuffer,readInput,atomicWrite} = require('./content-integrity.cjs');
function materialize(root, {required = false} = {}) {
  const target = path.join(root,'generated/content.json');
  const lock = JSON.parse(fs.readFileSync(path.join(root,'content-pack/content.lock.json'),'utf8'));
  const candidates = ['content-pack/content.json.gz','generated/content.json.gz'].map(p => path.join(root,p)).filter(p => fs.existsSync(p));
  if (candidates.length > 0) {
    let selected;
    // Every supplied archive must match. A corrupt second archive must not be silently ignored.
    for (const file of candidates) { const bytes = readInput(file); validateBuffer(bytes,lock); selected = bytes; }
    const result = validateBuffer(selected,lock);
    atomicWrite(target,selected);
    return {status:'ready',sha256:result.sha256,counts:result.counts};
  }
  if (fs.existsSync(target)) {
    const raw = readInput(target);
    const parsed = JSON.parse(raw.toString('utf8'));
    if (!parsed.migrationIncomplete) {
      const result = validateBuffer(raw,lock);
      return {status:'ready',sha256:result.sha256,counts:result.counts};
    }
  }
  if (required) throw new Error('CONTENT_MISSING: import the authored pack with node scripts/import-content.cjs <content.json or content.json.gz>. Native build blocked.');
  return {status:'pending',message:'Content pack is absent. Placeholder is retained for source editing only; native builds and content checks remain blocked.'};
}
if (require.main === module) {
  try { console.log(JSON.stringify(materialize(path.resolve(__dirname,'..'),{required:process.argv.includes('--required')}))); }
  catch (e) { console.error(e.message); process.exitCode = 1; }
}
module.exports = {materialize};
