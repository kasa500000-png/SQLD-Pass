const test=require('node:test'),a=require('node:assert/strict');
const content=require('./fixtures/mock60.cjs')(),{MonetizedController}=require('../.build/monetization/controller'),{renderTextbook}=require('../.build/textbook/views');
const flat=n=>[n,...(n.children??[]).flatMap(flat)];
function harness(raw=null){let saved=structuredClone(raw),seq=0,shows=0,time=100000;const c=new MonetizedController(content,{repository:{load:async()=>structuredClone(saved),save:async s=>{saved=structuredClone(s);},clear:async()=>{}},clock:()=>({wall:time,mono:time,runtimeId:'volume-ui'}),uuid:()=>`ui-${++seq}`,platform:'native'},{mode:'test',adultConfirmed:false,confirmAdult(){this.adultConfirmed=true;},privacyOptions:async()=>{},showReward:async cb=>{shows++;await cb();return 'closed';}},'rewarded');return {c,saved:()=>saved,shows:()=>shows};}
async function ready(){const h=harness();await h.c.initialize();await h.c.saveSettings(true);h.c.tab('exams');return h;}
const nodes=c=>flat(renderTextbook(c)),get=(c,id)=>nodes(c).find(n=>n.testId===id),rows=c=>nodes(c).filter(n=>/^mock-SQLD-M\d+$/.test(n.testId??'')).map(n=>n.testId);
async function click(c,id){const n=get(c,id);a.ok(n,id);a.equal(n.disabled,false,id);await n.action();}
test('three volume tabs show20 exact rows without persisting browsing or requesting ads',async()=>{
 const h=await ready(),c=h.c,before=structuredClone(h.saved());a.equal(get(c,'mock-volume-vol1').selected,true);
 for(const [v,first,last] of [['vol1',1,20],['vol2',21,40],['vol3',41,60]]){await click(c,'mock-volume-'+v);a.deepEqual(rows(c),Array.from({length:20},(_,i)=>'mock-SQLD-M'+String(first+i).padStart(2,'0')));a.equal(get(c,'mock-volume-'+v).role,'tab');a.ok(get(c,'mock-SQLD-M'+last));}
 a.deepEqual(h.saved(),before);a.equal(h.shows(),0);c.tab('today');c.tab('exams');a.equal(c.mockVolumeId,'vol3');const restarted=harness(h.saved());await restarted.c.initialize();a.equal(restarted.c.mockVolumeId,'vol1');
});
test('single filter opens a draft, cancel preserves conditions and apply combines status/access',async()=>{
 const {c}=await ready();a.equal(get(c,'exam-filter-completed'),undefined);await click(c,'mock-filters');await click(c,'exam-filter-completed');await click(c,'mock-filter-close');a.equal(c.examProgressFilter,'all');a.equal(rows(c).length,20);
 await click(c,'mock-filters');await click(c,'mock-filter-available');await click(c,'mock-filter-apply');a.equal(rows(c).length,4);await click(c,'mock-volume-vol2');a.equal(rows(c).length,0);a.ok(get(c,'mock-clear-filters'));await click(c,'mock-clear-filters');a.equal(rows(c).length,20);
 await click(c,'mock-filters');await click(c,'exam-filter-completed');c.back();a.equal(c.mockFiltersOpen,false);a.equal(c.examProgressFilter,'all');a.equal(c.route.name,'exams');
});
test('active paused exam remains available above every volume and suppresses all advertisements',async()=>{
 const {c,shows}=await ready();await c.beginExam('SQLD-M01','timed');await c.updateExamAnswer('2');await c.pauseExam();c.tab('exams');await click(c,'mock-volume-vol3');a.ok(get(c,'resume-mock'));await click(c,'mock-SQLD-M41');a.equal(get(c,'unlock-mock'),undefined);a.ok(get(c,'resume-mock'));await click(c,'resume-mock');a.equal(c.activeExam().examId,'SQLD-M01');a.equal(c.route.name,'examPause');a.equal(c.showBanner,false);a.equal(shows(),0);
});
test('locked volume2 intro uses its own assumptions and explicit reward never auto-starts',async()=>{
 const {c,shows}=await ready();await click(c,'mock-volume-vol2');await click(c,'mock-SQLD-M21');a.equal(shows(),0);a.ok(get(c,'unlock-mock'));await click(c,'exam-rules');const texts=nodes(c).map(n=>n.text);for(const x of content.mockPack.volumes[1].assumptions)a.ok(texts.includes(x));await click(c,'unlock-mock');a.equal(shows(),1);a.equal(c.activeExam(),undefined);a.equal(c.route.name,'examIntro');a.ok(get(c,'start-mock-timed'));
});
test('result returns to owning volume while filters and original score stay intact',async()=>{
 const {c}=await ready();await c.watchAdToUnlock('SQLD-M41');await c.beginExam('SQLD-M41','study');await c.updateExamAnswer('2');await c.finishExam('manual');const original=structuredClone(c.state.exams);c.selectMockVolume('vol1');await click(c,'result-exam-list');a.equal(c.route.name,'exams');a.equal(c.mockVolumeId,'vol3');await click(c,'mock-filters');await click(c,'exam-filter-completed');await click(c,'mock-filter-apply');a.deepEqual(rows(c),['mock-SQLD-M41']);a.deepEqual(c.state.exams,original);
});
test('volume/filter scroll contexts are isolated and restored within a session',async()=>{
 const {c,saved}=await ready(),before=structuredClone(saved());let scroll=get(c,'learning-content');const context=scroll?.catalog?.context??nodes(c).find(n=>n.catalog)?.catalog.context;a.ok(context);c.rememberScreen(context,{offset:500,contentHeight:1800});c.selectMockVolume('vol2');const next=nodes(c).find(n=>n.catalog)?.catalog;a.notEqual(next.context,context);a.equal(next.position,undefined);c.selectMockVolume('vol1');a.equal(nodes(c).find(n=>n.catalog)?.catalog.position.offset,500);a.deepEqual(saved(),before);
});
