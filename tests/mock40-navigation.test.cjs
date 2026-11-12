const test=require('node:test'),a=require('node:assert/strict');
const content=require('./fixtures/mock40.cjs')(),{MonetizedController}=require('../.build/monetization/controller'),{renderTextbook}=require('../.build/textbook/views');
const {mockVolumes,mockVolumeRange,mockExamTitle,mockQuestionOrigin}=require('../.build/mocks/domain');
const {selectionStyle,selectionGroup,light,dark,button}=require('../.build/ui/nodes');
const flat=n=>[n,...(n.children??[]).flatMap(flat)];
test('two volume tabs show new numbers, correct free badges and unchanged stable IDs',async()=>{
 let seq=0,shows=0;const c=new MonetizedController(content,{repository:{load:async()=>null,save:async()=>{}},clock:()=>({wall:1e6,mono:1e6,runtimeId:'nav40'}),uuid:()=>''+(++seq),platform:'native'},{mode:'test',adultConfirmed:false,confirmAdult(){},showReward:async cb=>{shows++;await cb();return 'closed';}},'rewarded');await c.initialize();await c.saveSettings(true);
 const vs=mockVolumes(content);a.deepEqual(vs.map(v=>v.title),['1권','2권']);a.deepEqual(vs.map(v=>mockVolumeRange(content,v)),['1~20회','21~40회']);a.equal(c.mockVolumeId,'vol2');
 for(const [v,first] of [['vol2',1],['vol3',21]]){
  c.tab('exams');c.selectMockVolume(v);const ns=flat(renderTextbook(c)),rows=ns.filter(n=>n.testId?.startsWith('mock-SQLD-'));
  a.equal(rows.length,20);a.equal(rows[0].text,`제${String(first).padStart(2,'0')}회 실전 모의고사`);a.equal(rows.filter(n=>n.subtitle.includes('무료')).length,5);a.equal(ns.find(n=>n.testId==='mock-volume-'+v).selected,true);
  await rows[0].action();a.ok(flat(renderTextbook(c)).some(n=>n.testId==='start-mock-timed'));a.ok(!flat(renderTextbook(c)).some(n=>n.testId==='unlock-mock'));
 }
 a.equal(shows,0);await c.beginExam('SQLD-M41','study');await c.finishExam('manual');const e=c.state.exams[0],before=structuredClone(e);
 a.equal(e.title,'41회 실전 모의고사');a.equal(mockExamTitle(content,e),'제21회 실전 모의고사');a.match(mockQuestionOrigin(content,e.snapshots[0]),/^2권 · 제21회/);
 a.ok(flat(renderTextbook(c)).some(n=>n.text==='제21회 실전 모의고사 · 학습 모드'));
 await flat(renderTextbook(c)).find(n=>n.testId==='result-exam-list').action();a.equal(c.mockVolumeId,'vol3');a.deepEqual(e,before);
 c.tab('review');const practice=flat(renderTextbook(c));a.equal(practice.find(n=>n.testId==='batch-10').checked,true);a.equal(practice.find(n=>n.testId==='batch-5').checked,false);
});
test('selection semantics and contrast are explicit without styling ordinary actions as selected tabs',()=>{
 function lum(h){const x=h.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return x[0]*.2126+x[1]*.7152+x[2]*.0722;}
 const contrast=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
 for(const p of [light,dark])for(const kind of ['tabs','segments'])for(const selected of [false,true]){const s=selectionStyle({selected},p,kind);a.ok(contrast(s.color,s.backgroundColor)>=4.5);a.ok(contrast(s.borderColor,s.backgroundColor)>=3);a.ok(s.minHeight>=48);a.equal(s.fontSize,15);}
 const n=selectionGroup([button('10문항',()=>{},{},{selected:true}),button('20문항',()=>{})]);a.equal(n.children[0].icon,'check');a.equal(n.children[0].checked,true);a.equal(n.children[1].checked,false);a.equal(button('다음',()=>{}).selectionStyle,undefined);
});
