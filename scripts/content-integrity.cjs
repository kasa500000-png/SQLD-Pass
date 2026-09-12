'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const {TextDecoder} = require('node:util');
const MAX_RAW_BYTES = 8 * 1024 * 1024;
const MAX_ARCHIVE_BYTES = 2 * 1024 * 1024;
function insist(ok, message) { if (!ok) throw new Error(`CONTENT_INVALID: ${message}`); }
function object(x) { return x !== null && typeof x === 'object' && !Array.isArray(x); }
function text(x) { return typeof x === 'string' && x.trim().length > 0; }
function uniqueIds(items, label) {
  insist(Array.isArray(items), `${label} must be an array`);
  const ids = new Set();
  for (const item of items) {
    insist(object(item) && text(item.id) && !ids.has(item.id), `${label} has a missing/duplicate ID`);
    ids.add(item.id);
  }
  return ids;
}
function references(ids, known, label) {
  insist(Array.isArray(ids) && new Set(ids).size === ids.length, `${label} has duplicate/missing references`);
  for (const id of ids) insist(known.has(id), `${label} references unknown ${id}`);
}
function validateContent(c) {
  insist(object(c) && !c.migrationIncomplete, 'full authored pack is required; placeholder is not content');
  const m = c.manifest;
  insist(object(m) && m.schema === 1 && text(m.version), 'manifest schema/version');
  insist(object(c.questions) && object(c.sources), 'questions/sources must be objects');
  const lessons = uniqueIds(c.lessons, 'lessons');
  const exams = uniqueIds(c.exams, 'exams');
  const questionIds = new Set(Object.keys(c.questions));
  const sourceIds = new Set(Object.keys(c.sources));
  insist(lessons.size === 60 && exams.size === 20 && questionIds.size === 1120, 'expected 60 lessons, 20 exams, 1120 questions');
  const practice = new Set(); const examQuestions = new Set(); const orders = new Set();
  for (const l of c.lessons) {
    insist(/^SQLD-L\d{3}$/.test(l.id), 'lesson ID');
    insist(['S1','S2'].includes(l.subject) && text(l.title) && text(l.body), `${l.id}: subject/title/body`);
    insist(Array.isArray(l.objectives) && l.objectives.length > 0 && l.objectives.every(text), `${l.id}: objectives`);
    insist(Array.isArray(l.summary) && l.summary.length > 0 && l.summary.every(text), `${l.id}: summary`);
    references(l.prerequisites, lessons, `${l.id}: prerequisites`);
    insist(!l.prerequisites.includes(l.id), `${l.id}: self prerequisite`);
    references(l.sourceIds, sourceIds, `${l.id}: sources`);
    references(l.questionIds, questionIds, `${l.id}: questions`);
    insist(l.questionIds.length === 2, `${l.id}: expected 2 confirmation questions`);
    for (const id of l.questionIds) {
      const q = c.questions[id];
      insist(!q.examId && !practice.has(id) && q.subject === l.subject && q.lessonIds.includes(l.id), `${id}: practice ownership`);
      practice.add(id);
    }
  }
  for (const [id,q] of Object.entries(c.questions)) {
    insist(object(q) && id === q.id && /^SQLD-(?:L\d{3}-Q\d{2}|M\d{2}-Q\d{2})$/.test(id), `${id}: key/ID mismatch`);
    insist(['S1','S2'].includes(q.subject) && text(q.stem) && text(q.explanation), `${id}: subject/stem/explanation`);
    const options = uniqueIds(q.options, `${id}: options`);
    insist(options.size === 4 && options.has(q.answer) && q.options.every(o => text(o.text)), `${id}: four choices and one answer required`);
    insist(typeof q.sql === 'string' && Array.isArray(q.tables), `${id}: SQL/tables types`);
    references(q.lessonIds, lessons, `${id}: lessons`);
    references(q.sourceIds, sourceIds, `${id}: sources`);
    if (q.examId) {
      insist(exams.has(q.examId), `${id}: unknown exam`);
      insist(object(q.optionExplanations) && [...options].every(o => text(q.optionExplanations[o])), `${id}: per-choice explanations`);
    }
    for (const table of q.tables) {
      insist(object(table) && Array.isArray(table.columns) && Array.isArray(table.rows), `${id}: malformed table`);
      insist(table.rows.every(r => Array.isArray(r) && r.length === table.columns.length), `${id}: table column/row width mismatch`);
    }
  }
  for (const e of c.exams) {
    insist(Number.isInteger(e.order) && e.order >= 1 && e.order <= 20 && !orders.has(e.order), `${e.id}: exam order`);
    insist(e.id === `SQLD-M${String(e.order).padStart(2,'0')}`, `${e.id}: canonical exam ID`); orders.add(e.order);
    insist(e.durationSeconds === 5400 && text(e.version), `${e.id}: duration/version`);
    references(e.questionIds, questionIds, `${e.id}: questions`);
    insist(e.questionIds.length === 50, `${e.id}: expected 50 questions`);
    let s1 = 0;
    for (const id of e.questionIds) {
      const q = c.questions[id];
      insist(q.examId === e.id && !examQuestions.has(id) && !practice.has(id), `${id}: mixed/reused exam question`);
      examQuestions.add(id); if (q.subject === 'S1') s1++;
    }
    insist(s1 === 10, `${e.id}: expected S1=10 and S2=40`);
  }
  insist(practice.size === 120 && examQuestions.size === 1000, 'practice/exam totals');
  insist(Array.isArray(c.days) && c.days.length === 30, 'expected 30 study days');
  const days = new Set(); const assigned = new Set(); const examDays = {22:'SQLD-M01',25:'SQLD-M02',27:'SQLD-M03',29:'SQLD-M04'};
  for (const d of c.days) {
    insist(Number.isInteger(d.day) && d.day >= 1 && d.day <= 30 && !days.has(d.day), 'duplicate/invalid study day'); days.add(d.day);
    references(d.lessonIds, lessons, `day ${d.day}`);
    for (const id of d.lessonIds) assigned.add(id);
    insist((d.examId || null) === (examDays[d.day] || null), `day ${d.day}: free exam curriculum mapping`);
  }
  insist(assigned.size === 60, 'curriculum must cover all lessons');
  const expected = {lessons:60,practice:120,exams:20,examQuestions:1000};
  for (const [key,n] of Object.entries(expected)) insist(m.counts?.[key] === n, `manifest count ${key}`);
  for (const key of ['releaseReady','humanReviewed','officialSyllabusVerified','adsEnabled','analyticsEnabled']) insist(typeof m[key] === 'boolean', `manifest flag ${key}`);
  for (const x of [...c.lessons,...Object.values(c.questions)]) insist(typeof x.releaseReady === 'boolean' && typeof x.humanReviewed === 'boolean', 'item review flags');
  return {...expected,questions:1120,days:30};
}
function hash(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex'); }
function validateBuffer(bytes, lock) {
  insist(Buffer.isBuffer(bytes) && bytes.length <= MAX_RAW_BYTES, 'content exceeds size limit');
  const decoded = new TextDecoder('utf-8',{fatal:true}).decode(bytes);
  const content = JSON.parse(decoded); const counts = validateContent(content);
  insist(object(lock) && lock.schema === 1, 'lock schema');
  insist(bytes.length === lock.bytes && hash(bytes) === lock.sha256, 'source SHA-256/byte length mismatch');
  insist(content.manifest.version === lock.contentVersion, 'content version mismatch');
  insist(JSON.stringify(content.manifest.sourceHashes) === JSON.stringify(lock.sourceHashes), 'source provenance mismatch');
  return {content,counts,sha256:hash(bytes)};
}
function readInput(file) {
  insist(fs.statSync(file).isFile(), 'input must be a regular file');
  const compressed = file.endsWith('.gz');
  insist(fs.statSync(file).size <= (compressed ? MAX_ARCHIVE_BYTES : MAX_RAW_BYTES), 'input exceeds size limit');
  const bytes = fs.readFileSync(file);
  return compressed ? zlib.gunzipSync(bytes,{maxOutputLength:MAX_RAW_BYTES}) : bytes;
}
function atomicWrite(file, bytes) {
  fs.mkdirSync(path.dirname(file),{recursive:true});
  const temp = `${file}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`;
  let fd;
  try {
    fd = fs.openSync(temp,'wx',0o600); fs.writeFileSync(fd,bytes); fs.fsyncSync(fd); fs.closeSync(fd); fd = undefined;
    fs.renameSync(temp,file);
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
    if (fs.existsSync(temp)) fs.unlinkSync(temp);
  }
}
module.exports = {validateContent,validateBuffer,readInput,atomicWrite,hash,MAX_RAW_BYTES,MAX_ARCHIVE_BYTES};
