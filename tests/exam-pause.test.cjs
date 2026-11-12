const test=require('node:test'),assert=require('node:assert/strict');
const content=require('../generated/content.json');
const domain=require('../.build/core/domain');
const {MonetizedController}=require('../.build/monetization/controller');
const {renderTextbook}=require('../.build/textbook/views');
const flat=n=>[n,...(n.children??[]).flatMap(flat)];
function harness(raw=null){
 let saved=structuredClone(raw),wall=Date.parse('2026-11-11T09:00:00Z'),mono=1000,fail=false,hold,seq=0;
 const services={repository:{load:async()=>structuredClone(saved),save:async s=>{if(hold){const wait=hold;hold=undefined;await wait;}if(fail)throw Error('disk full');saved=structuredClone(s);},clear:async()=>{}},clock:()=>({wall,mono,runtimeId:'pause-test'}),uuid:()=>`pause-${++seq}`,platform:'native',openURL:async()=>{}};
 const ads={mode:'test',adultConfirmed:true,privacyOptions:async()=>{},showReward:async()=>{throw Error('must not request an ad');}};
 const c=new MonetizedController(content,services,ads,'rewarded');
 return {c,saved:()=>structuredClone(saved),advance:ms=>{wall+=ms;mono+=ms;},wall:ms=>{wall+=ms;},fail:v=>{fail=v;},holdNext:()=>{let release;hold=new Promise(r=>release=r);return ()=>release();}};
}
async function ready(raw){const h=harness(raw);await h.c.initialize();assert.equal(h.c.ready,true,h.c.startupError);if(!h.c.state.onboarded)await h.c.saveSettings(true);return h;}
test('pause freezes time, answers and index; restart and explicit resume preserve the attempt',async()=>{
 const h=await ready(),c=h.c;await c.beginExam(content.exams[0].id);await c.updateExamAnswer('2');await c.moveExam(7);await c.flagExam();h.advance(12345);await c.pauseExam();
 const before=structuredClone(c.activeExam());assert.equal(before.remainingMs,5400000-12345);assert.equal(before.pauseCount,1);
 h.advance(7*86400000);await c.pulse();await c.checkpoint();await c.updateExamAnswer('3');await c.moveExam(20);await c.flagExam();assert.deepEqual(c.activeExam(),before);
 const restarted=await ready(h.saved());assert.deepEqual(restarted.c.activeExam(),before);restarted.c.navigate({name:'exam',id:before.id});assert.equal(restarted.c.route.name,'examPause');
 await restarted.c.resumeExam();restarted.advance(5000);assert.equal(restarted.c.remaining(),before.remainingMs-5000);assert.deepEqual(restarted.c.activeExam().answers,before.answers);
});
test('background interruptions pause both modes, hide questions and never auto-resume',async()=>{
 for(const mode of ['timed','study']){const {c,advance}=await ready();await c.beginExam(content.exams[0].id,mode);advance(1000);await c.onAppBackground();c.onAppForeground();await c.onAppBackground();c.onAppForeground();
 assert.equal(c.route.name,'examPause');assert.equal(c.activeExam().pauseCount,1);assert.ok(domain.isExamPaused(c.activeExam()));
 const nodes=flat(renderTextbook(c));assert.ok(!nodes.some(n=>n.testId==='mock-option-1'));assert.ok(nodes.some(n=>n.testId==='resume-paused-mock'));assert.equal(nodes.filter(n=>n.role==='tab').length,0);
 c.tab('today');assert.equal(c.showBanner,false);await c.watchAdToUnlock(content.exams[5].id);assert.equal(c.hasAccess(content.exams[5].id),false);await c.beginExam(content.exams[1].id);assert.equal(c.state.exams.length,1);
 }
});
test('pause save failure retains intent and blocks leaving/resume/submit until durable retry',async()=>{
 const h=await ready(),c=h.c;await c.beginExam(content.exams[0].id);await c.updateExamAnswer('2');h.advance(10000);h.fail(true);assert.equal(await c.pauseExam(),false);
 const held=c.remaining();h.advance(60000);assert.equal(c.remaining(),held);c.tab('today');c.navigate({name:'settings'});assert.equal(c.route.name,'examPause');assert.equal(await c.resumeExam(),false);await c.finishExam('manual');assert.equal(c.activeExam().status,'active');
 assert.ok(flat(renderTextbook(c)).some(n=>n.testId==='retry-pause'));h.fail(false);await c.pauseExam();assert.equal(c.activeExam().remainingMs,held);assert.equal(c.activeExam().pauseCount,1);assert.equal(Object.keys(h.saved().exams[0].answers).length,1);
});
test('answer already queued before pause is saved; later inputs cannot change it',async()=>{
 const h=await ready(),c=h.c;await c.beginExam(content.exams[0].id);const release=h.holdNext();const answer=c.updateExamAnswer('2');await Promise.resolve();const pause=c.pauseExam();const late=c.updateExamAnswer('3');release();await Promise.all([answer,pause,late]);
 assert.equal(c.activeExam().answers[c.activeExam().snapshots[0].id],'2');assert.equal(h.saved().exams[0].pauseCount,1);
});
test('queued answer belongs to the displayed question, not a later navigation index',async()=>{
 const {c}=await ready();await c.beginExam(content.exams[0].id);const first=c.activeExam().snapshots[0].id;await Promise.all([c.moveExam(1),c.updateExamAnswer('2')]);assert.equal(c.activeExam().answers[first],'2');assert.equal(Object.keys(c.activeExam().answers).length,1);
});
test('expired time takes precedence over pause and is scored exactly once',async()=>{
 const h=await ready(),c=h.c;await c.beginExam(content.exams[0].id);h.advance(5400001);await Promise.all([c.pauseExam(),c.pulse(),c.pauseExam()]);assert.equal(c.activeExam(),undefined);assert.equal(c.state.exams.length,1);assert.equal(c.state.exams[0].submitReason,'expired');assert.equal(c.state.exams[0].remainingMs,0);assert.equal(c.route.name,'result');
});
test('paused manual submission preserves score history and cannot be timed out',async()=>{
 const h=await ready(),c=h.c;await c.beginExam(content.exams[0].id);await c.updateExamAnswer(c.activeExam().snapshots[0].answer);await c.pauseExam();h.advance(86400000);await c.finishExam('expired');assert.ok(c.activeExam());await Promise.all([c.finishExam('manual'),c.finishExam('manual')]);
 assert.equal(c.state.exams.length,1);assert.equal(c.state.exams[0].score.points,2);assert.equal(c.state.exams[0].score.unanswered,49);assert.equal(c.state.exams[0].pauseCount,1);assert.equal(c.state.exams[0].remainingMs,5400000);
 const score=structuredClone(c.state.exams[0].score);const q=c.state.exams[0].snapshots[1];await c.beginPractice([q.id],'review');await c.selectPractice(q.answer);await c.answerPractice();assert.deepEqual(c.state.exams[0].score,score);
});
test('background during resume persistence returns to pause instead of running offscreen',async()=>{
 const h=await ready(),c=h.c;await c.beginExam(content.exams[0].id);await c.pauseExam();const release=h.holdNext();const resume=c.resumeExam();await Promise.resolve();await c.onAppBackground();release();await resume;assert.ok(domain.isExamPaused(c.activeExam()));assert.equal(c.route.name,'examPause');
});
test('legacy records remain readable; corrupt pause metadata is rejected without deleting data',async()=>{
 const {c,saved}=await ready();await c.beginExam(content.exams[0].id);await c.finishExam('manual');const old=saved();delete old.exams[0].pausedAt;delete old.exams[0].pauseCount;const before=JSON.stringify(old);domain.parseState(old,content);assert.equal(JSON.stringify(old),before);
 const bad=structuredClone(old);bad.exams[0].pauseCount=-1;assert.throws(()=>domain.parseState(bad,content),/일시정지/);assert.equal(bad.exams.length,1);
});
test('unpaused recovery charges unverifiable elapsed time conservatively before pausing',async()=>{
 const h=await ready();await h.c.beginExam(content.exams[0].id);const raw=h.saved();raw.exams[0].checkpoint.wall-=60000;raw.exams[0].checkpoint.runtimeId='previous-process';const next=await ready(raw);
 assert.equal(next.c.activeExam().remainingMs,5340000);assert.ok(domain.isExamPaused(next.c.activeExam()));assert.equal(next.c.activeExam().timeTrusted,false);
});
test('clock rollback while running never increases remaining time; paused wall changes do not consume time',async()=>{
 const h=await ready();await h.c.beginExam(content.exams[0].id);h.advance(5000);h.wall(-300000);await h.c.pauseExam();assert.equal(h.c.activeExam().remainingMs,5395000);assert.equal(h.c.activeExam().timeTrusted,false);h.wall(9999999);await h.c.resumeExam();h.advance(2000);assert.equal(h.c.remaining(),5393000);
});
