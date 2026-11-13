const test=require('node:test'),a=require('node:assert/strict');
const content=require('../generated/content.json'),candidate=require('./fixtures/curated60.cjs');
const {MonetizedController}=require('../.build/monetization/controller'),{renderTextbook}=require('../.build/textbook/views');
const {startExam,submitExam,publicQuestion}=require('../.build/core/domain');
const flat=n=>[n,...(n.children??[]).flatMap(flat)];
test('activated curated60 runtime exactly matches candidate and renders all3000 questions without early answers',()=>{
 a.deepEqual(content,candidate());
 const clock={wall:1e6,mono:1e6,runtimeId:'runtime-60'},c=new MonetizedController(content,{repository:{load:async()=>null,save:async()=>{},clear:async()=>{}},clock:()=>clock,uuid:()=>'',platform:'native'});c.ready=true;c.state.onboarded=true;
 let seen=0;for(const exam of content.exams){
  const e=startExam(c.state,exam,content,clock,'render-'+exam.id,'study');c.state.exams=[e];c.route={name:'exam',id:e.id};
  for(let i=0;i<50;i++){e.index=i;const q=e.snapshots[i],nodes=flat(renderTextbook(c)),pub=publicQuestion(q);a.ok(nodes.some(n=>n.text===q.stem),q.id);a.ok(!nodes.some(n=>n.text===q.explanation),q.id);a.equal(pub.answer,undefined);a.equal(nodes.filter(n=>n.kind==='table').length,q.blocks.filter(b=>b.type==='table').length);seen++;}
  const result=submitExam(e,clock,'manual');c.state.exams=[result];
  for(let i=0;i<50;i++){const q=result.snapshots[i];c.route={name:'examReview',id:e.id,index:i};const nodes=flat(renderTextbook(c));a.ok(nodes.some(n=>n.text===q.explanation),q.id);a.equal(nodes.filter(n=>n.kind==='table').length,q.blocks.filter(b=>b.type==='table').length+(q.result?1:0)+(q.explanationBlocks??[]).filter(b=>b.type==='table').length);}
  a.equal(result.score.unanswered,50);a.equal(result.score.points,0);
 }a.equal(seen,3000);
});
