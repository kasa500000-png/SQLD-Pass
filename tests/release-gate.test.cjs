const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {checkContentRelease} = require('../config/release-config.cjs');
const {readInput, hash} = require('../scripts/content-integrity.cjs');
const {materialize} = require('../scripts/materialize-content.cjs');
const {assertMissingApprovalBlocked} = require('../scripts/assert-draft-blocked.cjs');

// Approval facts below are synthetic OS-temp fixtures, never actual owner approval.
// Original bytes exercise structure/identity only, not SQL correctness or human review.
const archive = fs.readFileSync(path.join(__dirname, '../content-pack/content.json.gz'));
const authoredBytes = readInput(path.join(__dirname, '../content-pack/content.json.gz'));
const authoredLock = JSON.parse(fs.readFileSync(path.join(__dirname, '../content-pack/content.lock.json'), 'utf8'));
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sqld-release-gate-'));
  t.after(() => {
    if (path.dirname(path.resolve(root)) !== path.resolve(os.tmpdir()) || !path.basename(root).startsWith('sqld-release-gate-')) throw new Error('Unsafe fixture cleanup path');
    fs.rmSync(root, {recursive: true, force: true});
  });
  for (const dir of ['generated', 'content-pack', 'release', 'config']) fs.mkdirSync(path.join(root, dir));
  const content = JSON.parse(authoredBytes.toString('utf8')), lock = structuredClone(authoredLock);
  const contentPath = path.join(root, 'generated/content.json'), lockPath = path.join(root, 'content-pack/content.lock.json');
  const reviewPath = path.join(root, 'release/CONTENT_REVIEW_STATUS.json'), approvalPath = path.join(root, 'release-approval.json');
  const supportPath = path.join(root, 'config/public-support.json');
  fs.writeFileSync(contentPath, authoredBytes);
  fs.writeFileSync(path.join(root, 'content-pack/content.json.gz'), archive);
  const writeContent = () => fs.writeFileSync(contentPath, JSON.stringify(content));
  const writeLock = () => fs.writeFileSync(lockPath, JSON.stringify(lock));
  writeLock();
  const review = {schemaVersion: 1, status: 'owner-reviewed-complete', contentSha256: lock.sha256,
    scope: {lessons: 60, questions: 1120}, declaredBy: 'Synthetic fixture owner',
    ownerStatement: 'Synthetic direct confirmation of completed content review', recordedAt: '2026-09-18T00:00:00Z',
    productionReleaseApproved: true};
  const writeReview = () => fs.writeFileSync(reviewPath, JSON.stringify(review));
  writeReview();
  const approval = {schemaVersion: 1, approvedBy: 'Synthetic fixture', approvedAt: '2026-09-19T00:00:00Z',
    contentSha256: lock.sha256, contentVersion: lock.contentVersion, humanContentReview: 'Synthetic review',
    androidDeviceQA: 'Synthetic Android',
    iosDeviceQA: 'Synthetic iOS', ownerApproval: 'Synthetic fixture only',
    privacyUrl: 'https://sqldpass.test/privacy', supportUrl: 'https://sqldpass.test/support'};
  const writeApproval = () => fs.writeFileSync(approvalPath, JSON.stringify(approval));
  writeApproval();
  fs.writeFileSync(supportPath, JSON.stringify({operatorName: 'Fixture', supportEmail: 'support@sqldpass.test', privacyUrl: approval.privacyUrl, supportUrl: approval.supportUrl}));
  return {root, content, lock, review, approval, contentPath, lockPath, reviewPath, approvalPath, supportPath, writeContent, writeLock, writeReview, writeApproval};
}

test('external full-pack approval returns only a minimal receipt without changing source flags or bytes', t => {
  const f = fixture(t);
  assert.equal(f.content.manifest.releaseReady, false); assert.equal(f.content.manifest.humanReviewed, false);
  assert.equal(f.content.manifest.officialSyllabusVerified, false);
  assert.ok([...f.content.lessons, ...Object.values(f.content.questions)].every(x => !x.releaseReady && !x.humanReviewed));
  const paths = [f.contentPath, f.lockPath, f.reviewPath, f.approvalPath], before = paths.map(p => fs.readFileSync(p));
  assert.deepEqual(checkContentRelease(f.root), {schemaVersion: 1, approved: true, contentSha256: authoredLock.sha256, contentVersion: authoredLock.contentVersion});
  paths.forEach((p, i) => assert.deepEqual(fs.readFileSync(p), before[i]));
});

test('external review and actual launch approval are separately required', t => {
  const f = fixture(t); fs.unlinkSync(f.reviewPath);
  assert.throws(() => checkContentRelease(f.root), /Content review metadata is required/);
  f.writeReview(); fs.unlinkSync(f.approvalPath);
  assert.throws(() => checkContentRelease(f.root), /release-approval.json is required/);
});

test('unconfirmed review status and non-boolean release approval are insufficient', t => {
  const f = fixture(t);
  for (const status of ['owner-declared-complete', 'pending', undefined]) {
    f.review.status = status; f.writeReview(); assert.throws(() => checkContentRelease(f.root), /Content approval evidence is incomplete/);
  }
  f.review.status = 'owner-reviewed-complete';
  for (const approved of [false, 'true', 1, undefined]) {
    f.review.productionReleaseApproved = approved; f.writeReview(); assert.throws(() => checkContentRelease(f.root), /Content approval evidence is incomplete/);
  }
});

test('review must cover all 60 lessons and 1120 questions', t => {
  const f = fixture(t);
  for (const scope of [{lessons: 59, questions: 1120}, {lessons: 60, questions: 1119}, {lessons: 60, questions: 120}, {lessons: '60', questions: 1120}, null, []]) {
    f.review.scope = scope; f.writeReview(); assert.throws(() => checkContentRelease(f.root), /Content approval evidence is incomplete/);
  }
});

test('review schema and non-object metadata fail closed', t => {
  const f = fixture(t);
  for (const value of [null, [], {...f.review, schemaVersion: 2}, {...f.review, schemaVersion: undefined}]) {
    fs.writeFileSync(f.reviewPath, JSON.stringify(value)); assert.throws(() => checkContentRelease(f.root), /Content approval evidence is incomplete/);
  }
});

test('direct owner confirmation fields remain mandatory', t => {
  const f = fixture(t), baseline = structuredClone(f.review);
  for (const key of ['declaredBy', 'ownerStatement', 'recordedAt']) for (const value of [undefined, null, '  ', true, {}]) {
    Object.assign(f.review, baseline, {[key]: value}); f.writeReview(); assert.throws(() => checkContentRelease(f.root), new RegExp('Missing content review field: ' + key));
  }
});

test('direct owner confirmation does not require invented detailed review metadata', t => {
  const f = fixture(t);
  for (const key of ['reviewer', 'reviewedAt', 'targetDbmsReview', 'officialSyllabusReview']) assert.equal(Object.hasOwn(f.review, key), false);
  for (const key of ['targetDbmsReview', 'officialSyllabusReview']) assert.equal(Object.hasOwn(f.approval, key), false);
  assert.equal(checkContentRelease(f.root).approved, true);
  const before = fs.readFileSync(f.reviewPath);
  assert.equal(checkContentRelease(f.root).approved, true);
  assert.deepEqual(fs.readFileSync(f.reviewPath), before);
});

test('confirmation timestamps reject invalid calendar dates and ambiguous timestamps', t => {
  const f = fixture(t);
  for (const date of ['not a date', '0', '2026-02-30', '2026-09-18T00:00:00']) {
    f.review.recordedAt = date; f.writeReview(); assert.throws(() => checkContentRelease(f.root), /Invalid content confirmation timestamp/);
  }
  for (const date of ['2026-09-18', '2026-09-18T12:00:00+09:00']) {
    f.review.recordedAt = date; f.writeReview(); assert.equal(checkContentRelease(f.root).approved, true);
  }
});

test('review and launch approval each bind to the validated content hash', t => {
  const f = fixture(t); f.review.contentSha256 = '0'.repeat(64); f.writeReview();
  assert.throws(() => checkContentRelease(f.root), /Content review hash does not match/);
  f.review.contentSha256 = f.lock.sha256; f.writeReview(); f.approval.contentSha256 = '0'.repeat(64); f.writeApproval();
  assert.throws(() => checkContentRelease(f.root), /Content approval hash does not match/);
});

test('launch approval schema and content version are mandatory', t => {
  const f = fixture(t);
  for (const value of [null, [], {...f.approval, schemaVersion: undefined}, {...f.approval, schemaVersion: 2}]) {
    fs.writeFileSync(f.approvalPath, JSON.stringify(value)); assert.throws(() => checkContentRelease(f.root), /Invalid production approval schema/);
  }
  for (const version of [undefined, '', 'different.version']) {
    f.approval.contentVersion = version; f.writeApproval(); assert.throws(() => checkContentRelease(f.root), /Content approval version does not match/);
  }
});

test('all launch facts remain mandatory after content approval', t => {
  const f = fixture(t), baseline = structuredClone(f.approval);
  for (const key of ['approvedBy', 'approvedAt', 'humanContentReview', 'androidDeviceQA', 'iosDeviceQA', 'ownerApproval', 'privacyUrl', 'supportUrl']) {
    Object.assign(f.approval, baseline, {[key]: '  '}); f.writeApproval(); assert.throws(() => checkContentRelease(f.root), new RegExp('Missing production approval field: ' + key));
  }
});

test('launch approval rejects invalid or normalized dates', t => {
  const f = fixture(t);
  for (const date of ['not a date', '0', '2026-02-30', '2026-09-19T00:00:00']) {
    f.approval.approvedAt = date; f.writeApproval(); assert.throws(() => checkContentRelease(f.root), /Invalid production approval timestamp/);
  }
});

test('question, SQL, answer, provenance, version and source flag changes invalidate pinned bytes', t => {
  const f = fixture(t);
  const mutations = [c => {c.questions['SQLD-M01-Q11'].stem += ' changed';}, c => {c.questions['SQLD-M01-Q11'].sql = 'SELECT 1';},
    c => {const q = c.questions['SQLD-M01-Q11']; q.answer = q.options.find(o => o.id !== q.answer).id;},
    c => {c.manifest.sourceHashes[Object.keys(c.manifest.sourceHashes)[0]] = 'changed';}, c => {c.manifest.version = 'changed.version';},
    c => {c.manifest.releaseReady = true; c.questions['SQLD-M01-Q11'].humanReviewed = true;}];
  for (const mutate of mutations) {
    const changed = JSON.parse(authoredBytes.toString('utf8')); mutate(changed); fs.writeFileSync(f.contentPath, JSON.stringify(changed));
    assert.throws(() => checkContentRelease(f.root), /source SHA-256\/byte length mismatch/);
  }
});

test('lock version and source provenance are checked independently of raw hash', t => {
  const f = fixture(t); f.lock.contentVersion = 'changed.version'; f.writeLock();
  assert.throws(() => checkContentRelease(f.root), /content version mismatch/);
  f.lock.contentVersion = authoredLock.contentVersion; f.lock.sourceHashes[Object.keys(f.lock.sourceHashes)[0]] = 'changed'; f.writeLock();
  assert.throws(() => checkContentRelease(f.root), /source provenance mismatch/);
});

test('true source flags cannot bypass missing external review or launch approval', t => {
  const f = fixture(t); Object.assign(f.content.manifest, {releaseReady: true, humanReviewed: true, officialSyllabusVerified: true});
  for (const x of [...f.content.lessons, ...Object.values(f.content.questions)]) Object.assign(x, {releaseReady: true, humanReviewed: true});
  f.writeContent(); const changed = fs.readFileSync(f.contentPath); Object.assign(f.lock, {bytes: changed.length, sha256: hash(changed)}); f.writeLock();
  fs.unlinkSync(f.reviewPath); assert.throws(() => checkContentRelease(f.root), /Content review metadata is required/);
  f.review.contentSha256 = f.lock.sha256; f.writeReview(); fs.unlinkSync(f.approvalPath);
  assert.throws(() => checkContentRelease(f.root), /release-approval.json is required/);
});

test('malformed full pack is blocked before approval is considered', t => {
  const f = fixture(t); f.content.questions = {}; f.writeContent();
  assert.throws(() => checkContentRelease(f.root), /expected 60 lessons, 20 exams, 1120 questions/);
});

test('launch gate rejects placeholder, insecure and credential-bearing URLs', t => {
  const f = fixture(t);
  for (const url of ['http://sqldpass.test/privacy', 'https://example.com/privacy', 'https://localhost/privacy', 'https://user:password@sqldpass.test/privacy']) {
    f.approval.privacyUrl = url; f.writeApproval(); assert.throws(() => checkContentRelease(f.root), /HTTPS URL required/);
  }
  f.approval.privacyUrl = 'not a URL'; f.writeApproval(); assert.throws(() => checkContentRelease(f.root), /Invalid production URL/);
});

test('published support configuration must match both reviewed URLs', t => {
  const f = fixture(t);
  for (const key of ['privacyUrl', 'supportUrl']) {
    const support = {operatorName: 'Fixture', supportEmail: 'support@sqldpass.test', privacyUrl: f.approval.privacyUrl, supportUrl: f.approval.supportUrl};
    support[key] = 'https://different.test/page'; fs.writeFileSync(f.supportPath, JSON.stringify(support)); assert.throws(() => checkContentRelease(f.root), /support URLs must match/);
  }
});

test('operator and valid support email remain mandatory', t => {
  const f = fixture(t);
  for (const support of [{operatorName: '', supportEmail: 'support@sqldpass.test'}, {operatorName: 'Fixture', supportEmail: 'invalid'}]) {
    fs.writeFileSync(f.supportPath, JSON.stringify({...support, privacyUrl: f.approval.privacyUrl, supportUrl: f.approval.supportUrl}));
    assert.throws(() => checkContentRelease(f.root), /operator and support email are required/);
  }
});

test('repeat materialization preserves byte identity and external approval', t => {
  const f = fixture(t), reviewBefore = fs.readFileSync(f.reviewPath), approvalBefore = fs.readFileSync(f.approvalPath);
  for (let i = 0; i < 2; i++) {
    assert.equal(materialize(f.root, {required: true}).status, 'ready'); assert.deepEqual(fs.readFileSync(f.contentPath), authoredBytes);
    assert.deepEqual(fs.readFileSync(f.reviewPath), reviewBefore); assert.deepEqual(fs.readFileSync(f.approvalPath), approvalBefore);
    assert.equal(checkContentRelease(f.root).contentSha256, authoredLock.sha256);
  }
});

test('CI missing-approval fixture works even when its real input is approved', t => {
  const f = fixture(t); assert.equal(checkContentRelease(f.root).approved, true);
  assert.doesNotThrow(() => assertMissingApprovalBlocked(f.root));
  assert.equal(checkContentRelease(f.root).approved, true); assert.deepEqual(fs.readFileSync(f.contentPath), authoredBytes);
});
