const test=require('node:test'),a=require('node:assert/strict');
const content=require('./fixtures/curated60.cjs')(),d=require('../.build/core/domain');
const {MonetizedController}=require('../.build/monetization/controller'),{renderTextbook}=require('../.build/textbook/views');
const flat=n=>[n,...(n.children??[]).flatMap(flat)];
test('all1000 added questions read prompt, options and solution directly with immutable answer states',()=>{
 const clock={wall:1e6,mono:1e6,runtimeId:'study40'},c=new MonetizedController(content,{repository:{load:async()=>null,save:async()=>{}},clock:()=>clock,uuid:()=>'',platform:'native'});c.ready=true;c.state.onboarded=true;
 let seen=0;for(const exam of content.exams.slice(40)){
  const active=d.startExam({...c.state,exams:[]},exam,content,clock,exam.id,'study');
  active.answers[active.snapshots[0].id]=active.snapshots[0].answer;active.answers[active.snapshots[1].id]=active.snapshots[1].options.find(o=>o.id!==active.snapshots[1].answer).id;
  const e=d.submitExam(active,clock,'manual'),before=structuredClone(e);c.state.exams=[e];
  for(let i=0;i<50;i++){
   const q=e.snapshots[i];c.route={name:'examReview',id:e.id,index:i};const ns=flat(renderTextbook(c));
   a.ok(ns.findIndex(n=>n.text===q.stem)<ns.findIndex(n=>n.testId==='explanation-option-1'));a.ok(ns.findIndex(n=>n.testId==='explanation-option-4')<ns.findIndex(n=>n.text===q.explanation));
   a.ok(!ns.some(n=>n.testId==='review-original'));const choices=ns.filter(n=>n.testId?.startsWith('explanation-option-'));a.equal(choices.length,4);a.ok(choices.every(n=>n.disabled));a.equal(choices.filter(n=>n.selected).length,i<2?1:0);
   a.equal(ns.find(n=>n.testId==='mock-review-previous').disabled,i===0);a.equal(ns.find(n=>n.testId==='mock-review-next').disabled,i===49);seen++;
  }
  c.route={name:'mockQuestion',id:e.snapshots[1].id};const saved=flat(renderTextbook(c));a.ok(saved.some(n=>n.text===e.snapshots[1].stem));a.equal(saved.find(n=>n.testId==='explanation-option-'+e.answers[e.snapshots[1].id]).selected,true);a.deepEqual(e,before);a.equal(e.score.points,2);a.equal(e.score.unanswered,48);
 }a.equal(seen,1000);
});
