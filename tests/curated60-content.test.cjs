const test=require('node:test'),a=require('node:assert/strict'),path=require('node:path'),crypto=require('node:crypto');
const candidate=require('./fixtures/curated60.cjs'),prior=require('./fixtures/mock40.cjs');
const {readVolume}=require('../scripts/add-mock-volumes.cjs'),{SOURCE,addCuratedVolume}=require('../scripts/add-curated-volume.cjs'),{validateContent}=require('../scripts/content-integrity.cjs');
const root=path.resolve(__dirname,'..'),sha=c=>crypto.createHash('sha256').update(JSON.stringify(c)).digest('hex');
test('curated60 appends a third volume while all2340 retained questions and catalog objects remain identical',()=>{
 const old=prior(),c=candidate();a.equal(sha(old),'48e1214183bb4123a218a46bbce1362933778e34914cd79a7485d06d233be9b3');
 a.equal(validateContent(c).questions,3340);a.deepEqual(c.lessons,old.lessons);a.deepEqual(c.textbook,old.textbook);a.deepEqual(c.exams.slice(0,40),old.exams);a.deepEqual(c.mockPack.volumes.slice(0,2),old.mockPack.volumes);a.deepEqual(c.mockPack.topics.slice(0,100),old.mockPack.topics);
 for(const [id,q] of Object.entries(old.questions))a.deepEqual(c.questions[id],q,id);for(const [id,s] of Object.entries(old.sources))a.deepEqual(c.sources[id],s,id);
 a.deepEqual(c.exams.map(e=>e.displayNumber),Array.from({length:60},(_,i)=>i+1));a.deepEqual(c.mockPack.freeExamIds,[21,22,23,24,25,41,42,43,44,45,61,62,63,64,65].map(n=>'SQLD-M'+n));a.ok(!Object.keys(c.questions).some(id=>id.startsWith('ME20261109:')));a.deepEqual(c,candidate());a.throws(()=>addCuratedVolume(c,root),/curated40/);
 const {build}=require('../scripts/build-textbook.cjs');a.deepEqual(build(root,{mockCatalog:'curated60',write:false}),c);a.equal(sha(build(root,{mockCatalog:'curated40',write:false})),sha(old));
});
test('all1000 authored Vol4 questions,680 result tables and provenance map without content edits',()=>{
 const d=readVolume(root,SOURCE),c=candidate(),v=c.mockPack.volumes[2];a.equal(v.id,'vol4');a.equal(v.displayNumber,3);
 for(const k of ['editorialNote','assumptions','quality','integrationNote'])a.deepEqual(v[k],d[k]);
 a.equal(d.questions.filter(q=>q.result).length,680);
 for(const q of d.questions){const n=c.questions['MEV4:'+q.id];
  for(const k of ['stem','blocks','explanation','result','explanationBlocks','answerType','validation','number','difficulty'])a.deepEqual(n[k],q[k],q.id+':'+k);
  a.equal(n.originalId,q.id);a.equal(n.answer,String(q.answerIndex+1));a.deepEqual(n.lessonIds,['TB20261109:'+q.sectionId]);a.equal(n.chapterId,'TB20261109:'+q.chapterId);a.equal(n.topic,q.skill);a.equal(n.conceptId,'MEV4:topic:'+q.conceptId);
  a.deepEqual(n.options,q.options.map((o,i)=>({id:String(i+1),text:o.text,format:'text'})));a.deepEqual(n.optionExplanations,Object.fromEntries(q.options.map((o,i)=>[String(i+1),o.explanation])));a.deepEqual(n.sourceIds,q.sourceIds.map(id=>'MEV4:source:'+id));
 }
 for(const e of d.exams){const n=c.exams.find(x=>x.id==='SQLD-M'+e.number);a.equal(n.originalId,e.id);a.equal(n.title,e.title);a.equal(n.displayNumber,e.number-20);a.deepEqual(n.questionIds,e.questionIds.map(id=>'MEV4:'+id));}
 for(const s of d.sources)a.deepEqual(c.sources['MEV4:source:'+s.id],{...s,id:'MEV4:source:'+s.id,originalId:s.id,provider:s.kind});
 for(const t of d.topics)a.deepEqual(c.mockPack.topics.find(x=>x.id==='MEV4:topic:'+t.id),{...t,id:'MEV4:topic:'+t.id,originalId:t.id,sectionId:'TB20261109:'+t.sectionId,sourceIds:t.sourceIds.map(id=>'MEV4:source:'+id)});
});
test('curated60 rejects legacy pack confusion, retired IDs, cross-volume references and excess free access',()=>{
 for(const change of [c=>c.mockPack.version='mock60.20261112.1',c=>c.exams[40].displayNumber=61,c=>c.exams[40].id='SQLD-M01',c=>c.mockPack.freeExamIds.push('SQLD-M66'),c=>c.mockPack.volumes[2].displayNumber=4,c=>c.mockPack.volumes[2].topicIds=c.mockPack.volumes[0].topicIds,c=>c.questions[c.exams[40].questionIds[0]].sourceIds=c.mockPack.volumes[0].sourceIds,c=>c.questions[c.exams[40].questionIds[0]].blocks.push({type:'table',headers:['a'],rows:[[1,2]]})]){const c=candidate();change(c);a.throws(()=>validateContent(c),/CONTENT_INVALID/);}
});
