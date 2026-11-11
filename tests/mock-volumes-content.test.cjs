const test=require('node:test'),a=require('node:assert/strict'),path=require('node:path');
const {addMockVolumes,readVolume,SOURCES}=require('../scripts/add-mock-volumes.cjs');
const {validateContent}=require('../scripts/content-integrity.cjs');
const baseline=require('./fixtures/textbook20.cjs'),candidate=require('./fixtures/mock60.cjs'),root=path.resolve(__dirname,'..');
test('60-exam candidate preserves every existing learning object and namespaced source exactly',()=>{
 const c=candidate();a.equal(validateContent(c).questions,3340);a.equal(c.exams.length,60);
 a.deepEqual(c.exams.slice(0,20),baseline.exams);a.deepEqual(c.lessons,baseline.lessons);a.deepEqual(c.textbook,baseline.textbook);
 for(const [id,q] of Object.entries(baseline.questions))a.deepEqual(c.questions[id],q,id);
 for(const [id,s] of Object.entries(baseline.sources))a.deepEqual(c.sources[id],s,id);
 a.equal(c.manifest.theoryVersion,baseline.manifest.theoryVersion);a.deepEqual(candidate(),c);
 a.throws(()=>addMockVolumes(c,root),/unmodified/);
});
test('all2000 added questions preserve authored fields and exact volume references',()=>{
 const c=candidate();
 for(const spec of SOURCES){const d=readVolume(root,spec),prefix=`MEV${spec.number}:`,v=c.mockPack.volumes[spec.number-1];
  for(const field of ['editorialNote','assumptions','quality','integrationNote'])a.deepEqual(v[field],d[field]);
  for(const q of d.questions){const n=c.questions[prefix+q.id];
   for(const k of ['stem','blocks','explanation','result','explanationBlocks','answerType','validation','number','difficulty'])a.deepEqual(n[k],q[k],q.id+':'+k);
   a.equal(n.originalId,q.id);a.equal(n.answer,String(q.answerIndex+1));a.deepEqual(n.lessonIds,['TB20261109:'+q.sectionId]);a.equal(n.chapterId,'TB20261109:'+q.chapterId);a.equal(n.topic,q.skill);a.equal(n.conceptId,prefix+'topic:'+q.conceptId);
   a.deepEqual(n.options,q.options.map((o,i)=>({id:String(i+1),text:o.text,format:'text'})));a.deepEqual(n.optionExplanations,Object.fromEntries(q.options.map((o,i)=>[String(i+1),o.explanation])));a.deepEqual(n.sourceIds,q.sourceIds.map(id=>prefix+'source:'+id));
  }
  for(const e of d.exams){const n=c.exams.find(x=>x.order===e.number);a.equal(n.id,`SQLD-M${e.number}`);a.deepEqual(n.questionIds,e.questionIds.map(id=>prefix+id));a.equal(n.title,e.title);}
  for(const s of d.sources)a.deepEqual(c.sources[prefix+'source:'+s.id],{...s,id:prefix+'source:'+s.id,originalId:s.id,provider:s.kind});
  for(const t of d.topics)a.deepEqual(c.mockPack.topics.find(x=>x.id===prefix+'topic:'+t.id),{...t,id:prefix+'topic:'+t.id,originalId:t.id,sectionId:'TB20261109:'+t.sectionId,sourceIds:t.sourceIds.map(id=>prefix+'source:'+id)});
 }
});
test('volume validation rejects crossed topics, sources, order, IDs and malformed tables',()=>{
 for(const alter of [c=>c.questions[c.exams[20].questionIds[0]].conceptId='m01',c=>c.mockPack.volumes[1].examIds[0]='SQLD-M01',c=>c.exams.reverse(),c=>c.mockPack.volumes[2].topicIds=c.mockPack.volumes[1].topicIds,c=>c.questions[c.exams[40].questionIds[0]].sourceIds=['missing'],c=>c.questions[c.exams[20].questionIds[0]].blocks.push({type:'table',headers:['a'],rows:[[1,2]]})]){const c=candidate();alter(c);a.throws(()=>validateContent(c),/CONTENT_INVALID/);}
});
