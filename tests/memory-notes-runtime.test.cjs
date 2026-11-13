const test=require('node:test'),a=require('node:assert/strict'),path=require('node:path');
const prior=require('./fixtures/curated60.cjs')(),content=structuredClone(prior);
require('../scripts/add-memory-notes.cjs').addMemoryNotes(content,path.resolve(__dirname,'..'));
const d=require('../.build/core/domain'),{searchMemoryNotes}=require('../.build/memory/domain');
const {MonetizedController}=require('../.build/monetization/controller'),{renderTextbook}=require('../.build/textbook/views');
const flat=n=>[n,...(n.children??[]).flatMap(flat)],clock={wall:1e6,mono:1e6,runtimeId:'notes'};
function harness(raw=null){let saved=structuredClone(raw),fail=false;const c=new MonetizedController(content,{repository:{load:async()=>structuredClone(saved),save:async s=>{if(fail)throw Error('disk full');saved=structuredClone(s);}},clock:()=>clock,uuid:()=>'',platform:'native'});return {c,saved:()=>saved,fail:v=>fail=v};}
test('every root opens notes, restores origin and search context; focus screens never offer notes or banners',async()=>{
 const {c}=harness();await c.initialize();await c.saveSettings(true);
 for(const [tab,route] of [['today','home'],['learn','catalog'],['review','review'],['exams','exams'],['records','stats']]){
  c.tab(tab);await flat(renderTextbook(c)).find(n=>n.testId==='open-memory-notes').action();a.equal(c.route.name,'memoryNotes');a.equal(c.memoryOrigin,route);a.equal(c.showBanner,false);a.equal(flat(renderTextbook(c)).find(n=>n.testId==='tab-'+tab).selected,true);
  c.memorySearch='NVL';c.memoryFilter='priority';const context=renderTextbook(c).children.find(n=>n.scroll).catalog.context;c.rememberScreen(context,{offset:150,contentHeight:1500});
  c.openMemoryCategory('functions','functions-20');const tree=renderTextbook(c),scroll=tree.children.find(n=>n.scroll);a.equal(scroll.reading.anchorIndex,17);a.equal(flat(tree).filter(n=>n.testId?.startsWith('memory-note-')).length,17);a.equal(flat(tree).some(n=>n.testId==='open-memory-notes'),false);
  c.back();a.equal(c.memorySearch,'NVL');a.equal(c.memoryFilter,'priority');a.equal(renderTextbook(c).children.find(n=>n.scroll).catalog.position.offset,150);c.back();a.equal(c.route.name,route);
 }
 c.route={name:'practice'};a.equal(flat(renderTextbook(c)).some(n=>n.testId==='open-memory-notes'),false);
});
test('search uses corrected explanations and SQL; filters and empty state are independent of textbook search',()=>{
 const p=content.memoryNotes;a.equal(searchMemoryNotes(p,'','priority',[]).length,45);a.equal(searchMemoryNotes(p,'','saved',['group-12']).length,1);
 a.ok(searchMemoryNotes(p,'비동등','all',[]).some(n=>n.id==='group-04'));
 a.ok(searchMemoryNotes(p,"NVL(' ',",'all',[]).some(n=>n.id==='functions-19'));
 a.equal(searchMemoryNotes(p,'unmatched gibberish','all',[]).length,0);
 const {c}=harness();c.ready=true;c.state.onboarded=true;c.route={name:'memoryNotes'};c.search='교재';c.memoryFilter='saved';a.ok(flat(renderTextbook(c)).some(n=>n.text==='저장한 노트가 없습니다'));flat(renderTextbook(c)).find(n=>n.testId==='memory-reset').action();a.equal(c.search,'교재');
});
test('bookmarks and reading survive restart; failed writes retain original state and never show success',async()=>{
 const h=harness(),c=h.c;await c.initialize();await c.saveSettings(true);const untouched={readLessons:c.state.readLessons,exams:c.state.exams,studyDays:c.state.studyDays};
 await c.bookmarkMemoryNote('functions-19');await c.rememberMemoryReading('functions',{offset:430,contentHeight:8500});const stored=structuredClone(h.saved());
 const next=harness(stored);await next.c.initialize();a.deepEqual(next.c.state.memoryNotes,c.state.memoryNotes);a.equal(next.c.memoryPosition('functions').offset,430);
 h.fail(true);await c.bookmarkMemoryNote('functions-19');a.deepEqual(h.saved(),stored);a.deepEqual(c.state.memoryNotes,stored.memoryNotes);a.match(c.notice,/실패/);a.equal(await c.rememberMemoryReading('model',{offset:1,contentHeight:10}),false);
 a.deepEqual({readLessons:c.state.readLessons,exams:c.state.exams,studyDays:c.state.studyDays},untouched);
 h.fail(false);await c.bookmarkMemoryNote('functions-19');a.deepEqual(c.state.memoryNotes.bookmarks,[]);
 for(const mutation of [s=>s.memoryNotes.bookmarks.push('invalid'),s=>s.memoryNotes.positions.functions.offset=-1]){const bad=structuredClone(stored);mutation(bad);a.throws(()=>d.parseState(bad,content),/원본/);}
});
test('0.5 and0.6 upgrades preserve submitted snapshots, paused modes, grants and practice without mutation',()=>{
 for(const version of ['textbook.20261112.2','textbook.20261113.1'])for(const mode of ['timed','study']){
  const raw=d.initialState(prior);raw.onboarded=true;raw.contentVersion=version;raw.reading={lastLessonId:prior.lessons[0].id,positions:{[prior.lessons[0].id]:{offset:50,contentHeight:500,lessonVersion:prior.lessons[0].version}}};
  const done=d.submitExam(d.startExam(raw,prior.exams[0],prior,clock,'done','study'),clock,'manual');
  const active=d.pauseExam(d.startExam(raw,prior.exams[1],prior,clock,'active',mode),clock);active.answers[active.snapshots[7].id]='2';active.index=7;raw.exams=[done,active];raw.readLessons=[prior.lessons[0].id];
  raw.monetization={version:1,grants:{'SQLD-M40':{examId:'SQLD-M40',source:'reward',mode:'live',requestId:'old',grantedAt:1}},pending:null};
  const before=structuredClone(raw),next=d.parseState(raw,content);a.deepEqual(next,{...before,contentVersion:content.manifest.version});a.deepEqual(raw,before);a.deepEqual(d.parseState(next,content),next);
 }
});
