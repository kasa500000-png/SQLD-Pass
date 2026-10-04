'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {validateBuffer,readInput} = require('./content-integrity.cjs');
const {checkContentRelease} = require('../config/release-config.cjs');

function assertMissingApprovalBlocked(root) {
  const lock = JSON.parse(fs.readFileSync(path.join(root, 'content-pack/content.lock.json'), 'utf8'));
  const bytes = readInput(path.join(root, 'generated/content.json'));
  validateBuffer(bytes, lock);
  // A negative fixture remains meaningful after the real content has been approved.
  // It never changes the repository's actual review/approval metadata or source bytes.
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'sqld-missing-approval-'));
  try {
    fs.mkdirSync(path.join(fixture, 'generated'));
    fs.mkdirSync(path.join(fixture, 'content-pack'));
    fs.writeFileSync(path.join(fixture, 'generated/content.json'), bytes);
    fs.writeFileSync(path.join(fixture, 'content-pack/content.lock.json'), JSON.stringify(lock));
    assert.throws(() => checkContentRelease(fixture), /Content review metadata is required for production release/,
      'Invalid content, missing dependencies or unrelated errors are not proof of the approval gate');
  } finally {
    if (path.dirname(path.resolve(fixture)) !== path.resolve(os.tmpdir()) || !path.basename(fixture).startsWith('sqld-missing-approval-')) throw new Error('Unsafe fixture cleanup path');
    fs.rmSync(fixture, {recursive: true, force: true});
  }
}

if (require.main === module) {
  assertMissingApprovalBlocked(path.resolve(__dirname, '..'));
  console.log('Verified exact production rejection without external review metadata; source content remains unchanged.');
}
module.exports = {assertMissingApprovalBlocked};
