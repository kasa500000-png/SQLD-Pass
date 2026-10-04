'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {readInput, validateBuffer} = require('../scripts/content-integrity.cjs');

function isObject(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function isText(value) { return typeof value === 'string' && value.trim().length > 0; }
function isReviewDate(value) {
  if (!isText(value) || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value)) return false;
  if (!Number.isFinite(Date.parse(value))) return false;
  // Date.parse normalizes dates such as February 30 instead of rejecting them.
  return new Date(`${value.slice(0, 10)}T00:00:00Z`).toISOString().slice(0, 10) === value.slice(0, 10);
}

function checkContentRelease(root) {
  const bytes = readInput(path.join(root, 'generated/content.json'));
  const lock = JSON.parse(fs.readFileSync(path.join(root, 'content-pack/content.lock.json'), 'utf8'));
  const {content, counts, sha256} = validateBuffer(bytes, lock);
  // Supplied editorial flags stay byte-identical. The owner's confirmation lives outside the pack.
  const reviewPath = path.join(root, 'release/CONTENT_REVIEW_STATUS.json');
  if (!fs.existsSync(reviewPath)) throw new Error('Content review metadata is required for production release.');
  const review = JSON.parse(fs.readFileSync(reviewPath, 'utf8'));
  if (!isObject(review) || review.schemaVersion !== 1 || review.status !== 'owner-reviewed-complete' ||
      review.productionReleaseApproved !== true || !isObject(review.scope) ||
      review.scope.lessons !== counts.lessons || review.scope.questions !== counts.questions) {
    throw new Error('Content approval evidence is incomplete. Production release blocked.');
  }
  // The owner removed the separate DBMS/syllabus evidence requirement on 2026-10-04.
  // Record the actual confirmation, without inventing a review date or verification method.
  for (const key of ['declaredBy', 'ownerStatement', 'recordedAt']) {
    if (!isText(review[key])) throw new Error(`Missing content review field: ${key}`);
  }
  if (!isReviewDate(review.recordedAt)) throw new Error('Invalid content confirmation timestamp.');
  if (review.contentSha256 !== sha256) throw new Error('Content review hash does not match the reviewed content.');
  const approvalPath = path.join(root, 'release-approval.json');
  if (!fs.existsSync(approvalPath)) throw new Error('release-approval.json is required for production release.');
  const a = JSON.parse(fs.readFileSync(approvalPath, 'utf8'));
  if (!isObject(a) || a.schemaVersion !== 1) throw new Error('Invalid production approval schema.');
  for (const key of ['approvedBy', 'approvedAt', 'humanContentReview', 'androidDeviceQA', 'iosDeviceQA', 'ownerApproval', 'privacyUrl', 'supportUrl']) {
    if (!isText(a[key])) throw new Error(`Missing production approval field: ${key}`);
  }
  if (!isReviewDate(a.approvedAt)) throw new Error('Invalid production approval timestamp.');
  if (a.contentSha256 !== sha256) throw new Error('Content approval hash does not match the reviewed content.');
  if (a.contentVersion !== content.manifest.version) throw new Error('Content approval version does not match the reviewed content.');
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
  return {schemaVersion: 1, approved: true, contentSha256: sha256, contentVersion: content.manifest.version};
}
module.exports = {checkContentRelease};
