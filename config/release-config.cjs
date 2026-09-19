'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function checkContentRelease(root) {
  const bytes = fs.readFileSync(path.join(root, 'generated/content.json'));
  const content = JSON.parse(bytes);
  if (content.migrationIncomplete) throw new Error('Content migration is incomplete. Production release blocked.');
  const m = content.manifest ?? {};
  if (m.releaseReady !== true || m.humanReviewed !== true || m.officialSyllabusVerified !== true ||
      !Array.isArray(content.lessons) || !content.lessons.length || !content.questions ||
      !Object.keys(content.questions).length ||
      ![...content.lessons, ...Object.values(content.questions)].every(x => x.releaseReady === true && x.humanReviewed === true)) {
    throw new Error('Content approval evidence is incomplete. Production release blocked.');
  }
  const approvalPath = path.join(root, 'release-approval.json');
  if (!fs.existsSync(approvalPath)) throw new Error('release-approval.json is required for production release.');
  const a = JSON.parse(fs.readFileSync(approvalPath, 'utf8'));
  for (const key of ['approvedBy', 'approvedAt', 'humanContentReview', 'targetDbmsReview', 'officialSyllabusReview', 'androidDeviceQA', 'iosDeviceQA', 'ownerApproval', 'privacyUrl', 'supportUrl']) {
    if (typeof a[key] !== 'string' || !a[key].trim()) throw new Error(`Missing production approval field: ${key}`);
  }
  if (!Number.isFinite(Date.parse(a.approvedAt))) throw new Error('Invalid production approval timestamp.');
  const hash = crypto.createHash('sha256').update(bytes).digest('hex');
  if (a.contentSha256 !== hash) throw new Error('Content approval hash does not match the reviewed content.');
  for (const key of ['privacyUrl', 'supportUrl']) {
    let url;
    try { url = new URL(a[key]); } catch { throw new Error(`Invalid production URL: ${key}`); }
    if (url.protocol !== 'https:' || url.username || url.password ||
        /(^|\.)(localhost|example\.(com|org|net))$/.test(url.hostname) || !url.hostname.includes('.')) {
      throw new Error(`Owned public HTTPS URL required: ${key}`);
    }
  }
  const support = JSON.parse(fs.readFileSync(path.join(root, 'config/public-support.json'), 'utf8'));
  if (!support.operatorName?.trim() || !/^[-\w.+]+@[-\w.]+\.[a-z]{2,}$/i.test(support.supportEmail ?? '')) {
    throw new Error('Production operator and support email are required.');
  }
  if (support.privacyUrl !== a.privacyUrl || support.supportUrl !== a.supportUrl) {
    throw new Error('App support URLs must match the reviewed release approval.');
  }
  return {contentSha256: hash};
}
module.exports = {checkContentRelease};
