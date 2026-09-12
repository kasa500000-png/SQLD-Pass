const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const content = JSON.parse(fs.readFileSync(path.join(root, 'generated/content.json'), 'utf8'));
if (content.migrationIncomplete) throw new Error('Content migration is incomplete. Production release blocked.');
const m = content.manifest ?? {};
if (!m.releaseReady || !m.humanReviewed || !m.officialSyllabusVerified) {
  throw new Error('Content approval evidence is incomplete. Production release blocked.');
}
const approvalPath = path.join(root, 'release-approval.json');
if (!fs.existsSync(approvalPath)) throw new Error('release-approval.json is required for production release.');
const a = JSON.parse(fs.readFileSync(approvalPath, 'utf8'));
for (const key of ['approvedBy','approvedAt','humanContentReview','targetDbmsReview','officialSyllabusReview','androidDeviceQA','iosDeviceQA','ownerApproval','privacyUrl','supportUrl']) {
  if (!a[key] || typeof a[key] !== 'string') throw new Error(`Missing production approval field: ${key}`);
}
console.log('SQLD Pass production release gate passed.');
