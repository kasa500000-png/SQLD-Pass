'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs');
const {MonetizedController}=require('../.build/monetization/controller');
const {renderMonetized}=require('../.build/monetization/views');
const fmt=require('../.build/ui/learning-format'),{polishLearning}=require('../.build/ui/learning-polish');
const {light}=require('../.build/ui/nodes'),d=require('../.build/core/domain');
const content=require('../generated/content.json');
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const contentBefore=JSON.stringify(content);
function setup(ads){let value=null,n=0,fail=false;const clock={wall:Date.now(),mono:10,runtimeId:'ui-test'};
 const services={repository:{load:async()=>value?structuredClone(value):null,save:async s=>{if(fail)throw Error('write failure');value=structuredClone(s);},clear:async()=>{value=null;}},clock:()=>({...clock}),uuid:()=>`test-${++n}`,platform:'web',share:async()=>'shared',openURL:async()=>{}};
 const c=new MonetizedController(content,services,ads);c.ready=true;c.state.onboarded=true;
 return {c,clock,fail(v){fail=v;},services};}
function flat(n){return [n,...(n.children??[]).flatMap(flat)];}
function strings(n){return flat(n).flatMap(x=>[x.text??'',x.label??'']).join('\n');}
function view(c){return renderMonetized(c);}
function get(c,id){const n=flat(view(c)).find(n=>n.testId===id);a.ok(n,`Missing ${id}`);return n;}
async function click(c,id){const n=get(c,id);a.equal(!!n.disabled,false,`${id} disabled`);await n.action?.();}
function makeExam(c,index=0){const e=d.startExam(c.state,content.exams[index],content,c.services.clock(),'attempt-'+index);c.state.exams=[e];c.route={name:'exam',id:e.id};return e;}
function result(c,answers={}){const e=makeExam(c);e.answers=answers;const done=d.submitExam(e,c.services.clock(),'manual');c.state.exams=[done];c.route={name:'result',id:done.id};return done;}

test('collapsed question information keeps error reporting reachable after submission',async()=>{
 const {c}=setup();await c.beginPractice(content.lessons[0].questionIds);
 const q=c.getQuestion(c.state.practice.questionIds[0]);await click(c,'option-'+q.answer);await click(c,'submit-practice');
 a.equal(flat(view(c)).some(n=>n.testId==='report-'+q.id),false);
 await click(c,'question-info-'+q.id);await click(c,'report-'+q.id);
 a.equal(c.route.name,'help');a.equal(c.route.id,q.id);
});
test('home omits empty review shortcut while learning review stays reachable',async()=>{
 const {c}=setup();c.route={name:'home'};
 a.equal(flat(view(c)).some(n=>n.testId==='home-review'),false);
 c.tab('learn');await click(c,'learn-review');a.equal(c.route.name,'review');
 await click(c,'review-empty-learn');a.equal(c.route.name,'catalog');
});

test('system theme follows OS changes without overwriting the saved preference',()=>{
 const {c}=setup();c.route={name:'home'};c.state.settings.theme='system';
 const before=JSON.stringify(c.state);const lightTree=view(c);c.setSystemAppearance('dark');
 a.notEqual(JSON.stringify(view(c)),JSON.stringify(lightTree));a.equal(JSON.stringify(c.state),before);
 c.state.settings.theme='light';a.equal(c.isDark,false);
 c.state.settings.theme='dark';c.setSystemAppearance('light');a.equal(c.isDark,true);
});

test('authored payload identity is unchanged',()=>a.equal(hash(fs.readFileSync(require.resolve('../generated/content.json'))),'08b6d35d539ed9b7c225befed155b126bf35809c1ec331e1ca12de6576fb0ead'));
test('Markdown headings and fenced SQL are semantic nodes',()=>{const blocks=fmt.lessonBlocks('### 소제목\n\n설명\n```sql\nSELECT a | b;\n```',light);a.equal(blocks[0].heading,true);a.equal(blocks[0].text,'소제목');a.equal(blocks[2].kind,'code');a.equal(blocks[2].text,'SELECT a | b;');});
test('pipe table handles escaped pipes without splitting data',()=>{const n=fmt.lessonBlocks('| A | B |\n| --- | --- |\n| a\\|b | 0 |',light)[0];a.equal(n.kind,'table');a.deepEqual(n.rows,[['a|b','0']]);});
test('SQL text and HTML are not interpreted as executable markup',()=>{const n=fmt.lessonBlocks('```sql\n<script>alert(1)</script>\n```',light)[0];a.equal(n.kind,'code');a.equal(n.text,'<script>alert(1)</script>');});
test('zero, NULL, empty string and missing cell remain distinct',()=>a.deepEqual([0,null,'',undefined].map(fmt.displayCell),['0','NULL',"'' (빈 문자열)",'—']));
test('all dialect names remain explicit',()=>{for(const q of Object.values(content.questions))a.ok(fmt.dialectLabel(q.dialect));a.equal(fmt.dialectLabel('oracle_sqlserver'),'Oracle / SQL Server 비교');});
test('body keywords are searchable, not just titles',()=>{const {c}=setup(),l=content.lessons[24];c.route={name:'catalog'};c.search='COALESCE';a.ok(flat(view(c)).some(n=>n.testId==='lesson-'+l.id));});
test('Hangul NULL alias and subject filters both apply',()=>{const all=fmt.searchLessons(content.lessons,'널','all',null);a.ok(all.length);a.ok(fmt.searchLessons(content.lessons,'널','S2',null).every(l=>l.subject==='S2'));});
test('catalog empty search has reset action',async()=>{const {c}=setup();c.route={name:'catalog'};c.search='no-match-98765';a.match(strings(view(c)),/검색 결과가 없어요/);await click(c,'reset-lesson-search');a.equal(c.search,'');a.equal(flat(view(c)).filter(n=>n.testId?.startsWith('lesson-SQLD')).length,60);});
test('bookmark filter shows only selected theory',()=>{const {c}=setup();c.route={name:'catalog'};c.bookmarkedOnly=true;c.state.bookmarks=['SQLD-L001'];a.deepEqual(flat(view(c)).filter(n=>n.testId?.startsWith('lesson-SQLD')).map(n=>n.testId),['lesson-SQLD-L001']);});
test('every day exposes all assigned lessons rather than only first',()=>{const {c}=setup();c.route={name:'plan'};for(let n=1;n<=30;n++)c.expanded.add('day:'+n);const tree=flat(view(c));for(const day of content.days)for(const id of day.lessonIds)a.ok(tree.find(n=>n.key==='day-'+day.day).children.flatMap(flat).some(n=>n.testId==='lesson-'+id));a.doesNotMatch(strings(view(c)),/null분|undefined분|NaN/);});
test('current day can collapse and reopen',async()=>{const {c}=setup();c.route={name:'plan'};const id=c.currentDay().lessonIds[0];a.ok(flat(view(c)).some(n=>n.testId==='lesson-'+id));await click(c,'day-1-toggle');a.equal(flat(view(c)).some(n=>n.testId==='lesson-'+id),false);await click(c,'day-1-toggle');a.ok(flat(view(c)).some(n=>n.testId==='lesson-'+id));});
test('all 60 lesson bodies and examples render without changing source',()=>{const {c}=setup();for(const l of content.lessons){c.route={name:'lesson',id:l.id};const out=view(c);a.ok(strings(out).includes(l.title));a.ok(get(c,'lesson-practice'));if(l.example?.sql)a.ok(flat(out).some(n=>n.kind==='code'&&n.text===l.example.sql));}a.equal(JSON.stringify(content),contentBefore);});
test('read status and confirmation progress are separate',()=>{const {c}=setup(),l=content.lessons[0];c.state.readLessons=[l.id];a.match(fmt.lessonStatus(l,c.state),/읽음 · 확인 0\/2/);});
test('all 120 confirmation screens withhold rationale before submission',()=>{const {c}=setup();for(const l of content.lessons)for(const id of l.questionIds){c.state.practice={id:'p',questionIds:[id],index:0,selected:null,uncertain:false,submitted:false,mode:'lesson',sessionCorrect:0,sessionAnswered:0};c.route={name:'practice'};const q=content.questions[id],out=view(c);a.ok(strings(out).includes(q.stem));a.ok(get(c,'submit-practice').disabled);a.equal(strings(out).includes(q.explanation),false);}});
test('explicit submission reveals explanation and related theory',async()=>{const {c}=setup();await c.beginPractice(content.lessons[0].questionIds);const q=c.getQuestion(c.state.practice.questionIds[0]);await click(c,'option-'+q.answer);a.equal(strings(view(c)).includes(q.explanation),false);await click(c,'submit-practice');a.ok(strings(view(c)).includes(q.explanation));a.ok(get(c,'related-'+q.lessonIds[0]));});
test('practice has only one sticky submit/next primary action',async()=>{const {c}=setup();await c.beginPractice(content.lessons[0].questionIds);const out=view(c),footer=out.children.find(n=>n.key==='learning-footer');a.ok(footer);a.equal(flat(out).filter(n=>n.testId==='submit-practice').length,1);a.equal(flat(out.children.find(n=>n.scroll)).some(n=>n.testId==='submit-practice'),false);});
test('radio semantics include selection and non-color status',async()=>{const {c}=setup();await c.beginPractice(content.lessons[0].questionIds);const q=c.getQuestion(c.state.practice.questionIds[0]);await click(c,'option-'+q.options[0].id);const n=get(c,'option-'+q.options[0].id);a.equal(n.role,'radio');a.equal(n.checked,true);a.match(n.label,/선택됨/);});
test('unfinished practice resumes without discarding a selection',async()=>{const {c}=setup();await c.beginPractice(content.lessons[0].questionIds);await c.selectPractice('1');c.route={name:'home'};await click(c,'home-resume-practice');a.equal(c.route.name,'practice');a.equal(c.state.practice.selected,'1');});
test('available exam filter lists exactly the free four in ads-off mode',async()=>{const {c}=setup();c.route={name:'exams'};a.equal(get(c,'exams-available').text,'응시 가능 4회');await click(c,'exams-available');a.equal(flat(view(c)).filter(n=>n.testId?.match(/^exam-SQLD-M/)).length,4);});
test('ads-off catalog keeps all 20 sets and marks locked sets without dead actions',()=>{
 const {c}=setup();c.route={name:'exams'};
 a.equal(flat(view(c)).filter(n=>n.testId?.startsWith('exam-card-')).length,20);
 for(const exam of content.exams.slice(4)){
  const card=get(c,'exam-card-'+exam.id);a.match(strings(card),/이용 불가/);
  a.equal(flat(card).some(n=>n.kind==='button'),false);a.equal(c.hasAccess(exam.id),false);
 }
 a.equal(c.dialog,null);
});
test('active exam disables starting other sets without touching access policy',()=>{const {c}=setup();makeExam(c);c.route={name:'exams'};a.equal(get(c,'exam-SQLD-M02').disabled,true);a.equal(flat(view(c)).some(n=>n.testId==='exam-SQLD-M05'),false);a.equal(get(c,'exam-SQLD-M01').disabled,false);});
test('both intro return paths restore each exam filter without persisting learning data',async()=>{
 for(const filtered of [false,true])for(const headerBack of [false,true]){
  const {c,services}=setup();c.tab('learn');const theoryPosition={offset:800,contentHeight:5000};
  get(c,'learning-content').catalog.onRemember(theoryPosition);c.tab('exams');
  if(filtered)await click(c,'exams-available');
  const before=JSON.stringify(c.state),revision=c.getSnapshot(),position={offset:1200,contentHeight:5000};
  get(c,'learning-content').catalog.onRemember(position);
  a.equal(c.getSnapshot(),revision);a.equal(await services.repository.load(),null);
  await click(c,'exam-SQLD-M04');a.equal(c.route.name,'examIntro');
  a.equal(get(c,'learning-content').catalog,undefined);a.match(strings(view(c)),/1과목 10문항/);a.match(strings(view(c)),/2과목 40문항/);
  if(headerBack)c.back();else await click(c,'back-exams');
  a.equal(c.route.name,'exams');a.equal(get(c,'exams-available').selected,filtered);
  a.deepEqual(get(c,'learning-content').catalog.position,position);a.deepEqual(c.catalogPosition(),theoryPosition);
  a.equal(get(c,'learning-content').reading,undefined);a.equal(c.lastReadingLesson(),undefined);
  a.equal(JSON.stringify(c.state),before);a.equal(await services.repository.load(),null);
 }
});
test('exam filter and active attempt changes reject stale positions while timer ticks preserve browsing',async()=>{
 const {c,clock,services}=setup();c.tab('exams');const all=get(c,'learning-content').catalog;
 all.onRemember({offset:2000,contentHeight:9000});await click(c,'exams-available');
 a.equal(c.examCatalogPosition(),undefined);all.onRemember({offset:2200,contentHeight:9000});a.equal(c.examCatalogPosition(),undefined);
 const filtered=get(c,'learning-content').catalog;filtered.onRemember({offset:300,contentHeight:3000});
 const attempt=makeExam(c);a.equal(get(c,'learning-content').catalog,undefined);
 c.tab('exams');a.equal(c.examCatalogPosition(),undefined);
 filtered.onRemember({offset:400,contentHeight:3000});a.equal(c.examCatalogPosition(),undefined);
 const before=JSON.stringify(attempt),position={offset:400,contentHeight:3200},scroll=get(c,'learning-content');
 scroll.catalog.onRemember(position);clock.wall+=5000;clock.mono+=5000;
 a.equal(get(c,'learning-content').key,scroll.key);a.deepEqual(c.examCatalogPosition(),position);
 a.equal(JSON.stringify(attempt),before);a.equal(await services.repository.load(),null);
 await c.beginPractice(content.lessons[0].questionIds);a.equal(get(c,'learning-content').catalog,undefined);
});
test('available count follows grant mode and invalidates positions when access changes',async()=>{
 // Synthetic wallet and driver only: no device grants or advertising calls.
 const ads={mode:'off',privacyOptions:async()=>{},showReward:async()=>{throw Error('unexpected ad request');}};
 const {c}=setup(ads);c.tab('exams');await click(c,'exams-available');
 const prior=get(c,'learning-content').catalog;prior.onRemember({offset:200,contentHeight:2000});
 const grant=(id,mode)=>({examId:id,requestId:'fixture-'+id,grantedAt:1,source:'reward',mode});
 c.state.monetization={version:1,pending:null,grants:{'SQLD-M05':grant('SQLD-M05','live'),'SQLD-M06':grant('SQLD-M06','test')}};
 a.equal(c.examCatalogPosition(),undefined);prior.onRemember({offset:300,contentHeight:2000});a.equal(c.examCatalogPosition(),undefined);
 for(const [mode,count] of [['off',5],['test',6],['live',5]]){
  ads.mode=mode;const list=get(c,'learning-content');a.equal(list.catalog.position,undefined);
  a.equal(get(c,'exams-available').text,`응시 가능 ${count}회`);
  a.equal(flat(view(c)).filter(n=>n.testId?.startsWith('exam-card-')).length,count);
  a.equal(flat(view(c)).some(n=>n.testId==='exam-SQLD-M06'),mode==='test');
  list.catalog.onRemember({offset:200,contentHeight:2000});
 }
});
test('test and live catalog actions request opt-in for the selected set without auto-showing ads',async()=>{
 for(const mode of ['test','live']){
  let shows=0;const {c}=setup({mode,privacyOptions:async()=>{},showReward:async()=>{shows++;return 'unavailable';}});
  c.tab('exams');a.match(get(c,'exam-SQLD-M05').label,/제05회 모의고사, 광고 1회/);
  await click(c,'exam-SQLD-M05');a.ok(c.dialog.title.includes(content.exams[4].title));
  a.equal(shows,0);c.cancelDialog();a.equal(c.hasAccess('SQLD-M05'),false);
  makeExam(c);c.tab('exams');a.equal(get(c,'exam-SQLD-M05').disabled,true);
 }
});
test('exam cards retain scores, results and list position with contextual action labels',async()=>{
 const {c}=setup();const first=result(c),retry=d.startExam(c.state,content.exams[0],content,c.services.clock(),'retry');
 const latest=d.submitExam(retry,c.services.clock(),'manual');c.state.exams.push(latest);c.tab('exams');
 a.match(strings(get(c,'exam-card-SQLD-M01')),/첫 응시 0점 · 최근 0점/);
 a.equal(get(c,'exam-SQLD-M01').label,'제01회 모의고사, 다시 응시하기');
 a.equal(get(c,'result-SQLD-M01').label,'제01회 모의고사, 결과·해설 보기');
 const position={offset:200,contentHeight:5000};get(c,'learning-content').catalog.onRemember(position);
 await click(c,'result-SQLD-M01');a.equal(c.route.id,latest.id);a.notEqual(c.route.id,first.id);
 c.back();a.deepEqual(c.examCatalogPosition(),position);
});
test('all 1000 timed exam screens withhold answers and explanations',()=>{const {c}=setup();for(let e=0;e<20;e++){c.state.exams=[];const attempt=makeExam(c,e);for(let i=0;i<50;i++){attempt.index=i;const q=attempt.snapshots[i],out=view(c);a.ok(strings(out).includes(q.stem));a.equal(strings(out).includes(q.explanation),false);a.ok(out.children.find(n=>n.key==='exam-status'));a.equal(out.children.some(n=>n.key==='monetization-banner'),false);}}});
test('exam scroll key changes on next question but not timer ticks',async()=>{const {c,clock}=setup();makeExam(c);const key=()=>view(c).children.find(n=>n.scroll).key;const before=key();clock.wall+=1000;clock.mono+=1000;a.equal(key(),before);await click(c,'exam-next');a.notEqual(key(),before);});
test('exam clears selected answer without removing independent flag',async()=>{const {c}=setup();const e=makeExam(c);await c.updateExamAnswer(e.snapshots[0].options[0].id);await c.flagExam();await click(c,'exam-clear');a.equal(Object.keys(c.activeExam().answers).length,0);a.equal(c.activeExam().flagged.length,1);});
test('sheet differentiates answered and flagged; jumps to first unanswered',async()=>{const {c}=setup();const e=makeExam(c);await c.updateExamAnswer(e.snapshots[0].answer);await c.flagExam();c.route={name:'sheet',id:e.id};a.match(strings(view(c)),/응답 1 · 미응답 49 · 보류 1/);a.match(get(c,'sheet-1').label,/선택, 보류/);await click(c,'sheet-missing');a.equal(c.activeExam().index,1);});
test('submitting from sheet still requires confirmation',async()=>{const {c}=setup();const e=makeExam(c);c.route={name:'sheet',id:e.id};await click(c,'submit-exam');a.ok(c.dialog);a.equal(c.activeExam().status,'active');c.cancelDialog();a.equal(c.activeExam().status,'active');});
test('result shows subject minimums and time-trust caveat',()=>{const {c}=setup();const e=result(c);e.timeTrusted=false;a.match(strings(view(c)),/과락 기준 미달/);a.match(strings(view(c)),/시간 검증이 끊겨/);a.match(strings(view(c)),/공식 시험 합격 판정이나 합격 확률이 아닙니다/);});
test('wrong-only review uses saved exam snapshots in order',async()=>{const {c}=setup();const e=result(c);e.answers[e.snapshots[0].id]=e.snapshots[0].answer;await click(c,'result-wrong');a.equal(c.route.index,1);a.match(strings(view(c)),/시험 2번/);await click(c,'explain-next');a.equal(c.route.index,2);});
test('perfect score disables wrong-only action and has an empty filter state',async()=>{const {c}=setup();const qs=content.exams[0].questionIds.map(id=>content.questions[id]);const e=result(c,Object.fromEntries(qs.map(q=>[q.id,q.answer])));a.equal(get(c,'result-wrong').disabled,true);c.route={name:'examReview',id:e.id};await click(c,'review-exam-wrong');a.match(strings(view(c)),/오답·미응답이 없어요/);await click(c,'explain-next');a.equal(c.route.name,'result');});
test('result review does not use a newly changed current question answer',()=>{const {c}=setup();const e=result(c),q=e.snapshots[0];c.route={name:'examReview',id:e.id,index:0};const before=q.answer;const live=content.questions[q.id],saved=live.answer;try{live.answer='not-a-choice';a.match(strings(view(c)),new RegExp('정답 '+before+'번'));}finally{live.answer=saved;}});
test('reward processing locks all updated buttons',()=>{const {c}=setup();c.route={name:'exams'};c.rewardBusy=true;a.ok(flat(view(c)).filter(n=>n.kind==='button').every(n=>n.disabled));});
test('reward save retry control survives screen replacement',()=>{const {c}=setup();c.route={name:'exams'};Object.defineProperty(c,'needsRewardSave',{get:()=>true});a.ok(get(c,'retry-reward-save'));});
test('reward feedback resets the catalog to its notice without resetting timed questions',()=>{
 const {c}=setup();c.route={name:'exams'};const key=()=>view(c).children.find(n=>n.scroll).key;
 const prior=get(c,'learning-content').catalog;prior.onRemember({offset:2000,contentHeight:10000});
 const catalog=key();c.notice='광고를 표시하지 못했습니다.';a.notEqual(key(),catalog);
 a.equal(c.examCatalogPosition(),undefined);prior.onRemember({offset:2100,contentHeight:10000});a.equal(c.examCatalogPosition(),undefined);
 a.match(strings(view(c)),/광고를 표시하지 못했습니다/);const settled=key();c.notify();a.equal(key(),settled);
 makeExam(c);const exam=key();c.notice='저장 상태 안내';a.equal(key(),exam);
});
test('font controls only persist supported scale and preserve grants',async()=>{const {c}=setup();c.state.monetization={version:1,grants:{},pending:null};c.route={name:'settings'};await click(c,'font-1.3');a.equal(c.state.settings.fontScale,1.3);a.ok(c.state.monetization);});
test('rendering is deterministic and has no state persistence side effects',()=>{const {c}=setup();c.route={name:'catalog'};const before=JSON.stringify(c.state);view(c);view(c);a.equal(JSON.stringify(c.state),before);a.equal(JSON.stringify(content),contentBefore);});
test('failed practice answer save does not display a new answer key',async()=>{const x=setup(),c=x.c;await c.beginPractice(content.lessons[0].questionIds);const q=c.getQuestion(c.state.practice.questionIds[0]);await c.selectPractice(q.answer);x.fail(true);await c.answerPractice();a.equal(c.state.practice.submitted,false);a.equal(strings(view(c)).includes(q.explanation),false);a.match(strings(view(c)),/저장\/처리 실패/);});
test('startup failures are left intact, not hidden by new presentation',()=>{const {c}=setup();c.ready=false;const root={kind:'box',children:[{kind:'box',scroll:true,children:[{kind:'text',text:'CONTENT MISSING'}]}]};a.equal(polishLearning(c,root),root);a.match(strings(root),/CONTENT MISSING/);});

test('four tabs retain learning access and review belongs to Learning',async()=>{const {c}=setup();c.route={name:'home'};a.deepEqual(flat(view(c)).filter(n=>n.role==='tab').map(n=>n.label),['홈','학습','실전','기록']);await click(c,'tab-learn');await click(c,'learn-review');a.equal(c.route.name,'review');a.equal(get(c,'tab-learn').selected,true);await click(c,'bookmarked-only');a.equal(c.route.name,'catalog');a.equal(c.bookmarkedOnly,true);await click(c,'learn-theory');a.equal(c.bookmarkedOnly,false);await click(c,'tab-records');a.equal(c.route.name,'stats');});
test('home continues unanswered confirmation questions after reading theory',async()=>{const {c}=setup();const day=c.currentDay();c.state.readLessons=[...day.lessonIds];c.route={name:'home'};a.equal(get(c,'home-study').text,'확인 문제 이어하기');await click(c,'home-study');a.equal(c.route.name,'practice');a.deepEqual(c.state.practice.questionIds,content.lessons.find(l=>l.id===day.lessonIds[0]).questionIds);});
test('first home starts learning, then resumes the most recently visited unfinished lesson',async()=>{
 const {c}=setup();c.route={name:'home'};a.equal(get(c,'home-study').text,'학습 시작');
 a.match(strings(view(c)),/이론 0\/3 · 확인 0\/6/);a.match(strings(view(c)),/이번 이론 약 9분/);
 await click(c,'home-study');a.equal(c.route.id,content.lessons[0].id);
 const later=content.lessons[4];await c.rememberReading(later.id,{offset:780,contentHeight:3000});c.tab('today');
 a.equal(get(c,'home-study').text,'이어서 읽기');a.match(strings(view(c)),new RegExp(later.title));a.match(strings(view(c)),/읽던 이론 · Day 2/);
 await click(c,'home-study');a.equal(c.route.id,later.id);
 const reading=get(c,'learning-content').reading;a.equal(reading.position.offset,780);
});
test('today progress counts unique submitted confirmation questions and explicit read marks',async()=>{
 const {c}=setup(),l=content.lessons[0],q=content.questions[l.questionIds[0]];
 await c.markLesson(l.id);await c.beginPractice([q.id]);await c.selectPractice(q.answer);await c.answerPractice();await c.nextPractice();
 await c.beginPractice([q.id]);await c.selectPractice(q.answer);await c.answerPractice();c.tab('today');
 a.match(strings(view(c)),/이론 1\/3 · 확인 1\/6/);a.match(strings(view(c)),/전체 과정 · 0\/30일 완료/);
 a.equal(c.state.responses.length,2);
});
test('reading restoration is limited to lessons and does not change exam or practice scrolling',async()=>{
 const {c}=setup();c.route={name:'lesson',id:content.lessons[0].id};
 a.ok(get(c,'learning-content').reading);
 await c.beginPractice(content.lessons[0].questionIds);a.equal(get(c,'learning-content').reading,undefined);
 makeExam(c);a.equal(get(c,'learning-content').reading,undefined);
});
test('exam days retain the mock exam action without empty theory counters',async()=>{
 const {c}=setup(),day=content.days.find(d=>d.examId);c.state.completedDays=content.days.filter(d=>d.day<day.day).map(d=>d.day);c.tab('today');
 a.equal(get(c,'home-study').text,'오늘의 모의고사 안내');a.doesNotMatch(strings(view(c)),/이론 0\/0/);
 await click(c,'home-study');a.deepEqual(c.route,{name:'examIntro',id:day.examId});
});
test('record details use saved exam result and retain return path',async()=>{const {c}=setup();const e=result(c);c.tab('records');const before=JSON.stringify(c.state);await click(c,'history-'+e.id);a.equal(c.route.id,e.id);a.equal(c.route.name,'result');c.back();a.equal(c.route.name,'stats');a.equal(JSON.stringify(c.state),before);});
test('first-answer accuracy separates uncertainty without counting repeats',()=>{const {c}=setup();c.state.responses=[{questionId:'q1',correct:true,uncertain:true},{questionId:'q1',correct:true,uncertain:false},{questionId:'q2',correct:false,uncertain:false}];c.tab('records');a.match(strings(view(c)),/첫 풀이 정답률 50%/);a.match(strings(view(c)),/확신 있게 맞힌 비율 0%/);});

test('switching the new main tabs preserves timed answers and suppresses ads',async()=>{const {c,clock}=setup();const e=makeExam(c);await c.updateExamAnswer(e.snapshots[0].options[0].id);const answers=JSON.stringify(c.activeExam().answers);const remaining=c.remaining();for(const tab of ['today','learn','records','exams']){c.tab(tab);a.equal(c.showBanner,false);a.equal(JSON.stringify(c.activeExam().answers),answers);}clock.wall+=5000;clock.mono+=5000;await c.checkpoint();a.ok(c.remaining()<=remaining-5000);});

test('returning from theory restores catalog browsing without saving learning progress',async()=>{
 const {c,services}=setup();c.tab('learn');const before=JSON.stringify(c.state),revision=c.getSnapshot();
 const position={offset:2400,contentHeight:10000};get(c,'learning-content').catalog.onRemember(position);
 a.equal(JSON.stringify(c.state),before);a.equal(c.getSnapshot(),revision);a.equal(await services.repository.load(),null);
 await click(c,'lesson-SQLD-L007');a.equal(get(c,'learning-content').catalog,undefined);
 c.back();a.equal(c.route.name,'catalog');a.deepEqual(get(c,'learning-content').catalog.position,position);
 a.equal(get(c,'learning-content').reading,undefined);a.equal(c.lastReadingLesson(),undefined);
});
test('search, subject and bookmark changes do not reuse a different result list position',async()=>{
 const {c}=setup();c.tab('learn');const first=get(c,'learning-content'),key=first.key;
 first.catalog.onRemember({offset:2400,contentHeight:10000});
 c.setSearch('NULL');a.equal(get(c,'learning-content').catalog.position,undefined);
 first.catalog.onRemember({offset:2500,contentHeight:10000});a.equal(c.catalogPosition(),undefined);
 a.equal(get(c,'learning-content').key,key,'typing must not remount the search input');
 get(c,'learning-content').catalog.onRemember({offset:500,contentHeight:6000});
 c.setSubject('S2');a.equal(c.catalogPosition(),undefined);
 get(c,'learning-content').catalog.onRemember({offset:600,contentHeight:6000});
 await click(c,'bookmarked-only');a.equal(c.catalogPosition(),undefined);
 c.state.bookmarks=['SQLD-L015','SQLD-L016'];const bookmarked=get(c,'learning-content').catalog;
 bookmarked.onRemember({offset:100,contentHeight:1000});await c.bookmark('SQLD-L015');
 a.equal(c.catalogPosition(),undefined);bookmarked.onRemember({offset:200,contentHeight:1000});a.equal(c.catalogPosition(),undefined);
});
test('review empty action opens unfiltered theory after visiting bookmarks',async()=>{
 const {c}=setup();c.tab('learn');await click(c,'bookmarked-only');c.setSubject('S2');c.setSearch('missing-term');
 await click(c,'learn-review');await click(c,'review-empty-learn');
 a.equal(c.route.name,'catalog');a.equal(get(c,'learn-theory').selected,true);
 a.equal(c.search,'');a.equal(c.subject,'all');a.match(strings(view(c)),/60개 이론/);
});
test('empty bookmarks explain saving and offer a direct route to theory',async()=>{
 const {c}=setup();c.tab('learn');await click(c,'bookmarked-only');c.setSearch('missing-term');
 a.match(strings(view(c)),/저장한 북마크가 없어요/);a.match(strings(view(c)),/북마크에 저장/);
 a.doesNotMatch(strings(view(c)),/조건에 맞는 북마크|검색·필터 초기화/);
 await click(c,'bookmarks-empty-learn');a.equal(get(c,'learn-theory').selected,true);a.equal(c.search,'');
});
test('filtered bookmarks reset query and subject while keeping the saved collection selected',async()=>{
 const {c}=setup();await c.bookmark('SQLD-L001');c.tab('learn');await click(c,'bookmarked-only');
 c.setSubject('S2');c.setSearch('missing-term');a.match(strings(view(c)),/조건에 맞는 북마크가 없어요/);
 await click(c,'reset-lesson-search');a.equal(get(c,'bookmarked-only').selected,true);
 a.equal(c.search,'');a.equal(c.subject,'all');a.match(strings(view(c)),/1개 이론/);a.ok(get(c,'lesson-SQLD-L001'));
});
test('valid reading history shows reading in progress without marking completion',async()=>{
 const {c}=setup(),lesson=content.lessons[0];c.tab('learn');a.match(get(c,'lesson-'+lesson.id).label,/읽기 전/);
 await c.rememberReading(lesson.id,{offset:0,contentHeight:2000});
 a.match(get(c,'lesson-'+lesson.id).label,/읽는 중/);a.deepEqual(c.state.readLessons,[]);a.deepEqual(c.state.completedDays,[]);
 c.state.reading.positions[lesson.id].lessonVersion='stale';a.match(get(c,'lesson-'+lesson.id).label,/읽기 전/);
 c.state.reading.positions[lesson.id]={offset:NaN,contentHeight:2000,lessonVersion:lesson.version};a.match(get(c,'lesson-'+lesson.id).label,/읽기 전/);
 await c.rememberReading(lesson.id,{offset:500,contentHeight:2000});await c.markLesson(lesson.id);
 a.match(get(c,'lesson-'+lesson.id).label,/읽음 · 확인 0\/2/);
});
test('reset clears browsing memory and rejects late callbacks without restoring learning history',async()=>{
 for(const full of [false,true]){
  const {c}=setup();c.tab('learn');const memory=get(c,'learning-content').catalog;
  memory.onRemember({offset:500,contentHeight:2000});
  c.tab('exams');const exams=get(c,'learning-content').catalog;exams.onRemember({offset:900,contentHeight:5000});
  if(full)c.requestReset();else c.requestLearningReset();await c.acceptDialog();
  memory.onRemember({offset:600,contentHeight:2000});a.equal(c.catalogPosition(),undefined);a.equal(c.state.onboarded,false);
  exams.onRemember({offset:1000,contentHeight:5000});a.equal(c.examCatalogPosition(),undefined);
 }
});
test('theory shortcut respects reward processing lock and cannot change filters or navigation',()=>{
 const {c}=setup();c.route={name:'review'};c.bookmarkedOnly=true;c.search='NULL';c.subject='S2';c.rewardBusy=true;
 a.equal(get(c,'review-empty-learn').disabled,true);c.openTheory();
 a.equal(c.route.name,'review');a.equal(c.bookmarkedOnly,true);a.equal(c.search,'NULL');a.equal(c.subject,'S2');
});
