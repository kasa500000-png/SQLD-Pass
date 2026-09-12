'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'); const os = require('node:os'); const path = require('node:path'); const zlib = require('node:zlib');
const {validateContent,validateBuffer,readInput,atomicWrite,hash,MAX_RAW_BYTES} = require('../scripts/content-integrity.cjs');
const {materialize} = require('../scripts/materialize-content.cjs');
const {importContent} = require('../scripts/import-content.cjs');
function fixture() {
  const c = {manifest:{schema:1,version:'fixture.1',releaseReady:false,humanReviewed:false,officialSyllabusVerified:false,adsEnabled:false,analyticsEnabled:false,
    counts:{lessons:60,practice:120,exams:20,examQuestions:1000},sourceHashes:{'fixture.json':'fixture'}},lessons:[],questions:{},exams:[],days:[],sources:{}};
  function question(id,subject,lessonId,examId=null) { return {id,subject,lessonIds:[lessonId],stem:'Test stem',tables:[],sql:'',options:['A','B','C','D'].map(id => ({id,text:`Option ${id}`})),answer:'A',explanation:'Test explanation',optionExplanations:{A:'Reason A',B:'Reason B',C:'Reason C',D:'Reason D'},sourceIds:[],examId,releaseReady:false,humanReviewed:false}; }
  for (let i=1;i<=60;i++) {
    const id = `SQLD-L${String(i).padStart(3,'0')}`; const subject = i<=14?'S1':'S2';
    const qs = [1,2].map(n=>`${id}-Q0${n}`);
    c.lessons.push({id,subject,title:`Lesson ${i}`,body:'Original body',summary:['Summary'],objectives:['Objective'],prerequisites:[],sourceIds:[],questionIds:qs,releaseReady:false,humanReviewed:false});
    for (const q of qs) c.questions[q]=question(q,subject,id);
  }
  for (let e=1;e<=20;e++) {
    const id=`SQLD-M${String(e).padStart(2,'0')}`; const ids=[];
    for (let n=1;n<=50;n++) { const qid=`${id}-Q${String(n).padStart(2,'0')}`; ids.push(qid);c.questions[qid]=question(qid,n<=10?'S1':'S2',n<=10?'SQLD-L001':'SQLD-L015',id); }
    c.exams.push({id,order:e,version:'1.0.0',durationSeconds:5400,questionIds:ids});
  }
  const examDays={22:'SQLD-M01',25:'SQLD-M02',27:'SQLD-M03',29:'SQLD-M04'};
  for (let day=1;day<=30;day++) c.days.push({day,lessonIds:c.lessons.slice((day-1)*2,day*2).map(l=>l.id),examId:examDays[day]||null});
  return c;
}
function encode(c) { return Buffer.from(JSON.stringify(c)); }
function lock(c,b=encode(c)) { return {schema:1,bytes:b.length,sha256:hash(b),contentVersion:c.manifest.version,sourceHashes:c.manifest.sourceHashes}; }
function temp(t) { const p=fs.mkdtempSync(path.join(os.tmpdir(),'sqld-content-')); t.after(()=>fs.rmSync(p,{recursive:true,force:true})); return p; }
function seed(root,c=fixture()) { fs.mkdirSync(path.join(root,'content-pack'),{recursive:true});fs.mkdirSync(path.join(root,'generated'),{recursive:true});fs.writeFileSync(path.join(root,'content-pack/content.lock.json'),JSON.stringify(lock(c)));fs.writeFileSync(path.join(root,'generated/content.json'),JSON.stringify({migrationIncomplete:true})); return c; }
const corruptions = {
  'placeholder is never complete':c=>{c.migrationIncomplete=true;},
  'empty lesson list':c=>{c.lessons=[];},
  'missing question':c=>{delete c.questions['SQLD-M20-Q50'];},
  'duplicate lesson ID':c=>{c.lessons[1].id=c.lessons[0].id;},
  'question key differs from ID':c=>{c.questions['SQLD-M01-Q01'].id='different';},
  'empty theory body':c=>{c.lessons[0].body=' ';},
  'unknown prerequisite':c=>{c.lessons[0].prerequisites=['SQLD-L999'];},
  'self prerequisite':c=>{c.lessons[0].prerequisites=['SQLD-L001'];},
  'unknown source reference':c=>{c.lessons[0].sourceIds=['missing'];},
  'missing answer choice':c=>{c.questions['SQLD-M01-Q01'].answer='E';},
  'duplicate choice ID':c=>{c.questions['SQLD-M01-Q01'].options[1].id='A';},
  'empty choice text':c=>{c.questions['SQLD-M01-Q01'].options[0].text='';},
  'missing explanation':c=>{c.questions['SQLD-M01-Q01'].explanation='';},
  'missing per-option explanation':c=>{delete c.questions['SQLD-M01-Q01'].optionExplanations.B;},
  'unknown related lesson':c=>{c.questions['SQLD-M01-Q01'].lessonIds=['missing'];},
  'SQL not a string':c=>{c.questions['SQLD-M01-Q01'].sql=null;},
  'table row width mismatch':c=>{c.questions['SQLD-M01-Q01'].tables=[{columns:['A','B'],rows:[[1]]}];},
  'exam with 49 questions':c=>{c.exams[0].questionIds.pop();},
  'duplicate exam question':c=>{c.exams[0].questionIds[1]=c.exams[0].questionIds[0];},
  'exam questions from another set':c=>{c.exams[0].questionIds[0]='SQLD-M02-Q01';},
  'assessment mixed into practice':c=>{c.lessons[0].questionIds[0]='SQLD-M01-Q01';},
  'wrong subject ratio':c=>{c.questions['SQLD-M01-Q01'].subject='S2';},
  'invalid subject':c=>{c.questions['SQLD-M01-Q01'].subject='S3';},
  'wrong duration':c=>{c.exams[0].durationSeconds=3600;},
  'duplicate exam order':c=>{c.exams[1].order=1;},
  'wrong canonical exam order':c=>{c.exams[0].order=20;},
  'duplicate study day':c=>{c.days[1].day=1;},
  'unknown daily lesson':c=>{c.days[0].lessonIds=['missing'];},
  'rewarded exam inserted into free curriculum':c=>{c.days[21].examId='SQLD-M05';},
  'curriculum omits lessons':c=>{c.days[0].lessonIds=[];},
  'lying manifest counts':c=>{c.manifest.counts.practice=0;},
  'non-boolean review flag':c=>{c.questions['SQLD-M01-Q01'].humanReviewed='yes';},
};
test('complete independent synthetic fixture validates',()=>assert.equal(validateContent(fixture()).questions,1120));
for (const [name,mutate] of Object.entries(corruptions)) test(name,()=>{const c=fixture();mutate(c);assert.throws(()=>validateContent(c),/CONTENT_INVALID/);});
test('byte-identical pack matches pinned lock',()=>{const c=fixture();assert.equal(validateBuffer(encode(c),lock(c)).sha256,hash(encode(c)));});
test('same-length text edit fails SHA check',()=>{const c=fixture(), l=lock(c);c.lessons[0].body='Modified body';assert.throws(()=>validateBuffer(encode(c),l),/SHA-256/);});
test('review flag change cannot silently change approval',()=>{const c=fixture(),l=lock(c);c.manifest.releaseReady=true;assert.throws(()=>validateBuffer(encode(c),l),/SHA-256/);});
test('lock content version must agree',()=>{const c=fixture(),l=lock(c);l.contentVersion='other';assert.throws(()=>validateBuffer(encode(c),l),/version mismatch/);});
test('lock provenance must agree',()=>{const c=fixture(),l=lock(c);l.sourceHashes={};assert.throws(()=>validateBuffer(encode(c),l),/provenance mismatch/);});
test('invalid UTF-8 is rejected',()=>assert.throws(()=>validateBuffer(Buffer.from([0xff]),{})));
test('gzip expansion is bounded',t=>{const root=temp(t),file=path.join(root,'bomb.gz');fs.writeFileSync(file,zlib.gzipSync(Buffer.alloc(MAX_RAW_BYTES+1)));assert.throws(()=>readInput(file));});
test('missing archive is pending only for source editing',t=>{const root=temp(t);seed(root);assert.equal(materialize(root).status,'pending');});
test('missing archive blocks required native build',t=>{const root=temp(t);seed(root);assert.throws(()=>materialize(root,{required:true}),/CONTENT_MISSING/);});
test('valid gzip replaces placeholder with identical bytes',t=>{const root=temp(t),c=seed(root),b=encode(c);fs.writeFileSync(path.join(root,'content-pack/content.json.gz'),zlib.gzipSync(b));assert.equal(materialize(root,{required:true}).status,'ready');assert.deepEqual(fs.readFileSync(path.join(root,'generated/content.json')),b);});
test('already materialized exact content works without archive',t=>{const root=temp(t),c=seed(root);fs.writeFileSync(path.join(root,'generated/content.json'),encode(c));assert.equal(materialize(root,{required:true}).status,'ready');});
test('corrupt archive leaves previous content untouched',t=>{const root=temp(t);seed(root);const target=path.join(root,'generated/content.json'),before=fs.readFileSync(target);fs.writeFileSync(path.join(root,'content-pack/content.json.gz'),'bad');assert.throws(()=>materialize(root,{required:true}));assert.deepEqual(fs.readFileSync(target),before);});
test('conflicting secondary archive is not ignored',t=>{const root=temp(t),c=seed(root),target=path.join(root,'generated/content.json'),before=fs.readFileSync(target);fs.writeFileSync(path.join(root,'content-pack/content.json.gz'),zlib.gzipSync(encode(c)));fs.writeFileSync(path.join(root,'generated/content.json.gz'),zlib.gzipSync(Buffer.from('{}')));assert.throws(()=>materialize(root,{required:true}));assert.deepEqual(fs.readFileSync(target),before);});
test('valid raw import creates a decompressible archive',t=>{const root=temp(t),c=seed(root),file=path.join(root,'incoming.json');fs.writeFileSync(file,encode(c));assert.equal(importContent(root,file).status,'ready');assert.deepEqual(readInput(path.join(root,'content-pack/content.json.gz')),encode(c));});
test('invalid raw import leaves both destinations unchanged',t=>{const root=temp(t),c=seed(root),target=path.join(root,'generated/content.json'),before=fs.readFileSync(target),file=path.join(root,'incoming.json');c.lessons[0].body='Modified';fs.writeFileSync(file,encode(c));assert.throws(()=>importContent(root,file));assert.equal(fs.existsSync(path.join(root,'content-pack/content.json.gz')),false);assert.deepEqual(fs.readFileSync(target),before);});
test('repeated materialize is idempotent',t=>{const root=temp(t),c=seed(root),file=path.join(root,'incoming.json');fs.writeFileSync(file,encode(c));const first=importContent(root,file);assert.deepEqual(materialize(root,{required:true}),first);});
test('atomic write leaves no temporary files',t=>{const root=temp(t),target=path.join(root,'file.json');atomicWrite(target,Buffer.from('abc'));atomicWrite(target,Buffer.from('def'));assert.equal(fs.readFileSync(target,'utf8'),'def');assert.deepEqual(fs.readdirSync(root),['file.json']);});
test('failed rename cleans temporary file',t=>{const root=temp(t),target=path.join(root,'existing');fs.mkdirSync(target);assert.throws(()=>atomicWrite(target,Buffer.from('abc')));assert.deepEqual(fs.readdirSync(root),['existing']);});
