const test=require('node:test'),a=require('node:assert/strict');
const content=require('./fixtures/memory-notes.cjs')(),d=require('../.build/core/domain');
const {MonetizedController}=require('../.build/monetization/controller'),{renderTextbook}=require('../.build/textbook/views');
const flat=n=>[n,...(n.children??[]).flatMap(flat)];
test('result return is always outside scroller, single back from result, preserves other origins and scores',()=>{
 const clock={wall:10000,mono:10000,runtimeId:'fixed'},c=new MonetizedController(content,{repository:{load:async()=>null,save:async()=>{}},clock:()=>clock,uuid:()=>'',platform:'native'});c.ready=true;c.state.onboarded=true;
 const active=d.startExam(c.state,content.exams[0],content,clock,'done','study');active.answers[active.snapshots[0].id]=active.snapshots[0].answer;
 const done=d.submitExam(active,clock,'manual');c.state.exams=[done];const before=JSON.stringify(done);
 for(const origin of [{name:'result',id:'done'},{name:'mockSaved'},{name:'collection',id:'collection'}]){
  c.route=origin;c.stack=[];c.navigate({name:'examReview',id:'done',index:49});let tree=renderTextbook(c),title=tree.children.find(n=>n.testId==='screen-titlebar'),scroll=tree.children.find(n=>n.scroll);
  a.equal(flat(title).filter(n=>n.testId==='result-summary').length,1);a.ok(!flat(scroll).some(n=>n.testId==='result-summary'));
  a.equal(flat(title).some(n=>n.testId==='screen-back'),origin.name!=='result');
  if(origin.name!=='result'){c.back();a.deepEqual(c.route,origin);c.navigate({name:'examReview',id:'done',index:49});}
  c.mockResultFilter='wrong';tree=renderTextbook(c);flat(tree).find(n=>n.testId==='result-summary').action();a.deepEqual(c.route,{name:'result',id:'done'});a.equal(JSON.stringify(done),before);
 }
});
