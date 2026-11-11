const test=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),zlib=require('node:zlib'),os=require('node:os'),path=require('node:path');
const c=require('../generated/content.json'),legacy=require('./fixtures/legacy-content.cjs');
const {initialState,parseState,assertContent}=require('../.build/core/domain');
const {MonetizedController}=require('../.build/monetization/controller');
const {renderTextbook}=require('../.build/textbook/views');
const {textbookMetrics,dailySections,searchSections}=require('../.build/textbook/learning');
const {validateContent}=require('../scripts/content-integrity.cjs');
const {build}=require('../scripts/build-textbook.cjs');
const flat=n=>[n,...(n.children??[]).flatMap(flat)];
const flatWidget=ns=>ns.flatMap(n=>[n,...flatWidget(n.children??[])]);
function setup(raw=null){let saved=structuredClone(raw),fail=false;const controller=new MonetizedController(c,{repository:{load:async()=>structuredClone(saved),save:async s=>{if(fail)throw Error('disk full');saved=structuredClone(s);},clear:async()=>{saved=null;}},clock:()=>({wall:new Date('2026-11-09T12:00:00+09:00').getTime(),mono:1,runtimeId:'textbook'}),uuid:(()=>{let i=0;return ()=>'textbook-'+(++i);})(),platform:'native'});return {controller,stored:()=>saved,fail:v=>{fail=v;}};}
test('new runtime pack has exact planned scope and original blocks, choices and rationales',()=>{
 a.doesNotThrow(()=>assertContent(c));a.equal(validateContent(c).questions,1340);a.equal(c.exams.length,20);a.equal(c.lessons.length,216);a.equal(c.textbook.chapters.length,18);a.equal(c.textbook.parts.length,5);a.equal(c.textbook.glossary.length,376);a.equal(c.textbook.flashcards.length,38);
 const html=zlib.gunzipSync(fs.readFileSync('content-source/textbook-20261109.html.gz')).toString(),d=JSON.parse(html.match(/<script type="application\/json" id="study-content">([\s\S]*?)<\/script>/)[1]);
 for(const section of d.chapters.flatMap(ch=>ch.sections)){const l=c.lessons.find(l=>l.originalId===section.id);a.deepEqual(l.blocks,section.blocks);a.equal(l.body,section.lead);a.deepEqual(l.summary,[section.summary]);a.deepEqual(l.sourceIds,section.sourceIds);}
 for(const q of d.questions){const normalized=c.questions['TB20261109:'+q.id];if(q.pool==='mock'){a.equal(normalized,undefined);continue;}a.equal(normalized.stem,q.stem);a.equal(normalized.explanation,q.explanation);a.equal(normalized.answer,String(q.answerIndex+1));a.deepEqual(normalized.blocks,q.blocks??[]);q.options.forEach((o,i)=>{a.equal(normalized.options[i].text,o.text);a.equal(normalized.optionExplanations[String(i+1)],o.explanation);});}
 a.equal(Object.values(c.questions).filter(q=>q.pool==='chapter').length,268);a.equal(Object.values(c.questions).filter(q=>q.pool==='mixed').length,72);
});
test('import is deterministic and retains the complete original source hash',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'sqld-textbook-build-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));fs.mkdirSync(path.join(root,'content-source'));fs.copyFileSync('content-source/textbook-20261109.html.gz',path.join(root,'content-source/textbook-20261109.html.gz'));
 fs.copyFileSync('content-source/mock20-20261109.html.gz',path.join(root,'content-source/mock20-20261109.html.gz'));
 const first=build(root),bytes=fs.readFileSync(path.join(root,'content-pack/content.json.gz'));a.equal(first.sha256,require('../content-pack/content.lock.json').sha256);a.deepEqual(build(root),first);a.deepEqual(fs.readFileSync(path.join(root,'content-pack/content.json.gz')),bytes);
});
test('all 37 tools have reachable native states and legal transitions with no runtime HTML',()=>{
 a.equal(Object.keys(c.textbook.widgets).length,37);let states=0;
 for(const [name,w] of Object.entries(c.textbook.widgets)){const seen=new Set([0]),todo=[0];while(todo.length){const i=todo.shift();states++;for(const n of flatWidget(w.states[i].nodes)){a.ok(!('html'in n));if(n.kind==='button'&&!n.disabled){a.ok(w.states[n.target],name);if(!seen.has(n.target)){seen.add(n.target);todo.push(n.target);}}}}a.equal(seen.size,w.states.length,name);}
 a.equal(states,271);
});
test('transaction widget commit and rollback change only the appropriate stock state',()=>{
 const w=c.textbook.widgets.transaction;const nodes=i=>flatWidget(w.states[i].nodes);const click=(i,label)=>nodes(i).find(n=>n.kind==='button'&&n.text===label).target;
 a.equal(nodes(0).find(n=>n.text==='COMMIT').disabled,true);const draft=click(0,'변경 만들기');a.equal(nodes(draft).find(n=>n.text==='변경 만들기').disabled,true);
 const committed=click(draft,'COMMIT'),rolled=click(draft,'ROLLBACK');const txt=i=>nodes(i).map(n=>n.text??'').join('\n');a.match(txt(committed),/주문 건수 · 1/);a.match(txt(committed),/남은 재고 · 4/);a.match(txt(rolled),/주문 건수 · 0/);a.match(txt(rolled),/남은 재고 · 5/);
});
test('anatomy retains whole row, column and cell highlighting',()=>{const w=c.textbook.widgets['table-anatomy'];const table=i=>flatWidget(w.states[i].nodes).find(n=>n.kind==='table');a.equal(table(0).highlight.length,12);a.equal(table(1).highlight.length,3);a.equal(table(2).highlight.length,4);a.deepEqual(table(3).highlight,[[0,1]]);});
test('legacy update resets content data, preserves settings and earned rights, and is idempotent',()=>{
 const old={...initialState(legacy),revision:23,onboarded:true,settings:{minutes:30,targetDate:'2026-12-01',theme:'dark',fontScale:1.3,weeklyGoalDays:4},readLessons:['SQLD-L001'],bookmarks:['SQLD-L001'],responses:[{questionId:'SQLD-L001-Q01'}],reviews:{x:{}},practice:{id:'old'},exams:[{id:'legacy-attempt',examId:'SQLD-M05',startedAt:20}],collections:[{id:'x'}],knownCards:['old']};
 const before=JSON.stringify(old),s=parseState(old,c);a.equal(JSON.stringify(old),before);a.deepEqual(s.settings,old.settings);a.equal(s.onboarded,true);a.equal(s.revision,23);a.equal(s.monetization.grants['SQLD-M05'].source,'legacy');a.equal(s.practice,null);a.deepEqual(s.exams,[]);a.deepEqual(s.responses,[]);a.deepEqual(s.readLessons,[]);a.deepEqual(s.bookmarks,[]);a.deepEqual(s.reviews,{});a.equal(s.collections,undefined);a.equal(s.knownCards,undefined);a.equal(s.textbookMigration.noticePending,true);a.deepEqual(parseState(s,c),s);
});
test('malformed rights and unknown source versions block destructive migration',()=>{
 const old=initialState(legacy);a.throws(()=>parseState({...old,monetization:{version:1,grants:{bad:{}},pending:null}},c),/이용 권한/);a.throws(()=>parseState({...old,contentVersion:'future'},c),/지원하지 않는/);
});
test('migration must save before entering the app; retry completes once and dismissal persists',async()=>{
 const old={...initialState(legacy),onboarded:true,revision:10},env=setup(old),ctrl=env.controller;env.fail(true);await ctrl.initialize();a.equal(ctrl.ready,false);a.equal(env.stored().contentVersion,old.contentVersion);env.fail(false);await ctrl.initialize();a.equal(ctrl.ready,true);a.equal(env.stored().contentVersion,c.manifest.version);await ctrl.dismissTextbookMigration();const restarted=setup(env.stored()).controller;await restarted.initialize();a.equal(restarted.state.textbookMigration.noticePending,false);
});
test('new install has no migration notice and all 216 lesson views render native blocks',async()=>{
 const {controller:ctrl}=setup();await ctrl.initialize();a.equal(ctrl.state.textbookMigration,undefined);await ctrl.saveSettings(true);
 for(const lesson of c.lessons){ctrl.route={name:'lesson',id:lesson.id};const nodes=flat(renderTextbook(ctrl));a.ok(nodes.some(n=>n.text===lesson.title));a.equal(nodes.filter(n=>n.kind==='widget').length,lesson.blocks.filter(b=>b.type==='widget').length);a.equal(nodes.filter(n=>n.kind==='code').length,lesson.blocks.filter(b=>b.type==='code').length);}
 for(const name of ['home','catalog','review','stats','glossary','flashcards','sources','settings','privacy','help']){ctrl.route={name};a.doesNotThrow(()=>renderTextbook(ctrl));const nodes=flat(renderTextbook(ctrl));a.ok(!nodes.some(n=>n.testId?.startsWith('exam-SQLD')));a.ok(nodes.some(n=>n.role==='tab'&&n.text==='실전'));}
});
test('practice survives restart, hides rationales until submitted, and scores exactly once',async()=>{
 const env=setup(),ctrl=env.controller;await ctrl.initialize();await ctrl.saveSettings(true);const q=Object.values(c.questions)[0];await ctrl.beginPractice([q.id]);let txt=flat(renderTextbook(ctrl)).map(n=>n.text).join('\n');a.ok(!txt.includes(q.explanation));await ctrl.selectPractice(q.answer);const restarted=setup(env.stored()).controller;await restarted.initialize();restarted.resumePractice();await restarted.answerPractice();await restarted.answerPractice();a.equal(restarted.state.responses.length,1);txt=flat(renderTextbook(restarted)).map(n=>n.text).join('\n');a.ok(txt.includes(q.explanation));await restarted.nextPractice();a.equal(restarted.state.practiceResults[0].correct,1);a.equal(restarted.state.practice,null);
});
test('reading and accuracy are separate, daily plan is bounded, search never indexes rationales',()=>{
 const s=initialState(c),ids=Object.keys(c.questions);s.readLessons=[c.lessons[0].id];s.responses=[{questionId:ids[0],correct:false},{questionId:ids[0],correct:true},{questionId:ids[1],correct:false}];const m=textbookMetrics(s,c);a.equal(m.read,1);a.equal(m.attempted,2);a.equal(m.accuracy,50);a.equal(dailySections(s,c,Date.now()).length,1);s.settings.targetDate='2026-11-10';a.equal(dailySections(s,c,new Date('2026-11-09T12:00:00+09:00').getTime()).length,108);const modified=structuredClone(c);Object.values(modified.questions)[0].explanation='SECRET_RATIONALE_TOKEN';a.equal(searchSections(modified,'SECRET_RATIONALE_TOKEN').length,0);a.ok(searchSections(c,'SELECT').length>0);
});
test('new content cannot reuse previous store approval',()=>{
 const root=path.resolve(__dirname,'..'),read=fs.readFileSync;
 const oldReview=read(path.join(root,'release/history/CONTENT_REVIEW_STATUS.phase1.20260908.1.json'));
 fs.readFileSync=function(file,...args){return String(file)===path.join(root,'release/CONTENT_REVIEW_STATUS.json')?oldReview:read.call(this,file,...args);};
 try{a.throws(()=>require('../config/release-config.cjs').checkContentRelease(root),/Content approval evidence is incomplete/);}finally{fs.readFileSync=read;}
});
test('daily assignment stays fixed after completing a section and is recalculated on a new day',async()=>{
 const {controller:ctrl}=setup();await ctrl.initialize();await ctrl.saveSettings(true);const before=structuredClone(ctrl.state.textbookDay);await ctrl.markLesson(before.sectionIds[0]);a.deepEqual(ctrl.state.textbookDay,before);const {withDailyPlan}=require('../.build/textbook/learning');const next=withDailyPlan(ctrl.state,c,ctrl.services.clock().wall+86400000);a.notEqual(next.textbookDay.day,before.day);a.ok(!next.textbookDay.sectionIds.includes(before.sectionIds[0]));
});
test('lesson retains its tab and active practice uses focused navigation',async()=>{
 const {controller:ctrl}=setup();await ctrl.initialize();await ctrl.saveSettings(true);ctrl.route={name:'lesson',id:c.lessons[0].id};a.equal(flat(renderTextbook(ctrl)).find(n=>n.testId==='tab-learn').selected,true);await ctrl.beginPractice([Object.keys(c.questions)[0]]);a.equal(flat(renderTextbook(ctrl)).filter(n=>n.role==='tab').length,0);
});
test('screen navigation offsets are isolated, validated and never persisted as learning',async()=>{
 const env=setup(),ctrl=env.controller;await ctrl.initialize();const before=JSON.stringify(env.stored());
 const position={offset:720,contentHeight:2000};ctrl.rememberScreen('settings',position);position.offset=0;
 a.equal(ctrl.screenPosition('settings').offset,720);a.equal(ctrl.screenPosition('catalog'),undefined);
 ctrl.rememberScreen('settings',{offset:NaN,contentHeight:2000});a.equal(ctrl.screenPosition('settings').offset,720);
 a.equal(JSON.stringify(env.stored()),before);a.equal(setup(env.stored()).controller.screenPosition('settings'),undefined);
});
