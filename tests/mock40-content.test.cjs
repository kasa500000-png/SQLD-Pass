const test=require('node:test'),a=require('node:assert/strict');
const prior=require('./fixtures/mock60.cjs'),candidate=require('./fixtures/mock40.cjs');
const {validateContent}=require('../scripts/content-integrity.cjs');
test('curated40 preserves all retained authored objects and separates display identity',()=>{
 const old=prior(),c=candidate();a.equal(validateContent(c).questions,2340);
 a.deepEqual(c.lessons,old.lessons);a.deepEqual(c.textbook,old.textbook);
 for(const [id,q] of Object.entries(c.questions))a.deepEqual(q,old.questions[id],id);
 a.equal(Object.keys(c.questions).filter(id=>id.startsWith('ME20261109:')).length,0);
 a.deepEqual(c.exams.map(({displayNumber,...e})=>e),old.exams.slice(20));
 a.deepEqual(c.exams.map(e=>e.displayNumber),Array.from({length:40},(_,i)=>i+1));
 a.deepEqual(c.mockPack.volumes.map(({displayNumber,...v})=>v),old.mockPack.volumes.slice(1));
 a.deepEqual(c.mockPack.freeExamIds,[21,22,23,24,25,41,42,43,44,45].map(n=>'SQLD-M'+n));
 a.deepEqual(candidate(),c);
 for(const id of old.mockPack.volumes[0].sourceIds)a.equal(c.sources[id],undefined);
 for(const id of Object.keys(c.sources))a.deepEqual(c.sources[id],old.sources[id]);
});
test('curated catalog rejects reused identity, display ordering, cross-volume grants and leftover material',()=>{
 for(const change of [c=>c.exams[0].id='SQLD-M01',c=>c.exams[0].displayNumber=21,c=>c.mockPack.volumes[0].displayNumber=2,c=>c.mockPack.freeExamIds.push('SQLD-M26'),c=>c.mockPack.topics.push(prior().mockPack.topics[0]),c=>c.questions['ME20261109:bad']=prior().questions[prior().exams[0].questionIds[0]]]){const c=candidate();change(c);a.throws(()=>validateContent(c),/CONTENT_INVALID/);}
});
