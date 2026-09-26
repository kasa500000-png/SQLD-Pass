const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const {checkContentRelease} = require('../config/release-config.cjs');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sqld-release-gate-'));
  t.after(() => {
    if (path.dirname(path.resolve(root)) !== path.resolve(os.tmpdir()) || !path.basename(root).startsWith('sqld-release-gate-')) throw new Error('Unsafe fixture cleanup path');
    fs.rmSync(root, {recursive: true, force: true});
  });
  fs.mkdirSync(path.join(root, 'generated'));
  const content = {manifest: {releaseReady: true, humanReviewed: true, officialSyllabusVerified: true},
    lessons: [{releaseReady: true, humanReviewed: true}], questions: {q: {releaseReady: true, humanReviewed: true, stem: 'fixture only'}}};
  const writeContent = () => fs.writeFileSync(path.join(root, 'generated/content.json'), JSON.stringify(content));
  writeContent();
  const approval = {approvedBy: 'Test fixture', approvedAt: '2026-09-19T00:00:00Z',
    humanContentReview: 'fixture review', targetDbmsReview: 'fixture DBMS', officialSyllabusReview: 'fixture syllabus',
    androidDeviceQA: 'fixture Android', iosDeviceQA: 'fixture iOS', ownerApproval: 'fixture only',
    privacyUrl: 'https://sqldpass.test/privacy', supportUrl: 'https://sqldpass.test/support',
    contentSha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'generated/content.json'))).digest('hex')};
  const writeApproval = () => fs.writeFileSync(path.join(root, 'release-approval.json'), JSON.stringify(approval));
  writeApproval();
  fs.mkdirSync(path.join(root, 'config'));
  fs.writeFileSync(path.join(root, 'config/public-support.json'), JSON.stringify({operatorName: 'Fixture', supportEmail: 'support@sqldpass.test', privacyUrl: approval.privacyUrl, supportUrl: approval.supportUrl}));
  return {root, content, approval, writeContent, writeApproval};
}
test('release gate binds approval to exact reviewed content bytes', t => {
  const f = fixture(t); assert.equal(checkContentRelease(f.root).contentSha256, f.approval.contentSha256);
  f.content.questions.q.stem = 'changed after review'; f.writeContent();
  assert.throws(() => checkContentRelease(f.root), /hash does not match/);
});
test('manifest approval cannot hide an unreviewed question or lesson', t => {
  const f = fixture(t); f.content.questions.q.humanReviewed = false; f.writeContent();
  assert.throws(() => checkContentRelease(f.root), /Content approval evidence is incomplete/);
  f.content.questions.q.humanReviewed = true; f.content.lessons[0].releaseReady = false; f.writeContent();
  assert.throws(() => checkContentRelease(f.root), /Content approval evidence is incomplete/);
});
test('blank evidence and invalid timestamp are rejected', t => {
  const f = fixture(t); f.approval.iosDeviceQA = '  '; f.writeApproval();
  assert.throws(() => checkContentRelease(f.root), /iosDeviceQA/);
  f.approval.iosDeviceQA = 'fixture'; f.approval.approvedAt = 'not a date'; f.writeApproval();
  assert.throws(() => checkContentRelease(f.root), /timestamp/);
});
test('release gate rejects placeholder, insecure and credential-bearing URLs', t => {
  const f = fixture(t);
  for (const url of ['http://sqldpass.test/privacy', 'https://example.com/privacy', 'https://localhost/privacy', 'https://user:password@sqldpass.test/privacy']) {
    f.approval.privacyUrl = url; f.writeApproval();
    assert.throws(() => checkContentRelease(f.root), /HTTPS URL required/);
  }
});
test('published support configuration must match the approval', t => {
  const f = fixture(t);
  fs.writeFileSync(path.join(f.root, 'config/public-support.json'), JSON.stringify({operatorName: 'Fixture', supportEmail: 'support@sqldpass.test', privacyUrl: 'https://different.test/privacy', supportUrl: f.approval.supportUrl}));
  assert.throws(() => checkContentRelease(f.root), /support URLs must match/);
});
