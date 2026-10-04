'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs');
const {MonetizedController}=require('../.build/monetization/controller');
const {renderMonetized}=require('../.build/monetization/views');
const fmt=require('../.build/ui/learning-format'),{polishLearning}=require('../.build/ui/learning-polish');
const {questionContext}=require('../.build/ui/question-context');
const {light}=require('../.build/ui/nodes'),d=require('../.build/core/domain');
const content=require('../generated/content.json');
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const contentBefore=JSON.stringify(content);
function setup(ads,accessPolicy){let value=null,n=0,fail=false;const clock={wall:Date.now(),mono:10,runtimeId:'ui-test'};
 const services={repository:{load:async()=>value?structuredClone(value):null,save:async s=>{if(fail)throw Error('write failure');value=structuredClone(s);},clear:async()=>{value=null;}},clock:()=>({...clock}),uuid:()=>`test-${++n}`,platform:'web',share:async()=>'shared',openURL:async()=>{}};
 const c=new MonetizedController(content,services,ads,accessPolicy);c.ready=true;c.state.onboarded=true;
 return {c,clock,fail(v){fail=v;},services};}
function flat(n){return [n,...(n.children??[]).flatMap(flat)];}
function strings(n){return flat(n).flatMap(x=>[x.text??'',x.label??'']).join('\n');}
function view(c){return renderMonetized(c);}
function get(c,id){const n=flat(view(c)).find(n=>n.testId===id);a.ok(n,`Missing ${id}`);return n;}
async function click(c,id){const n=get(c,id);a.equal(!!n.disabled,false,`${id} disabled`);await n.action?.();}
function makeExam(c,index=0){const e=d.startExam(c.state,content.exams[index],content,c.services.clock(),'attempt-'+index);c.state.exams=[e];c.route={name:'exam',id:e.id};return e;}
function result(c,answers={}){const e=makeExam(c);e.answers=answers;const done=d.submitExam(e,c.services.clock(),'manual');c.state.exams=[done];c.route={name:'result',id:done.id};return done;}

test('review pagination exposes every saved item and keeps scheduled review ordering',async()=>{
 const {c,clock}=setup(),ids=content.lessons.flatMap(l=>l.questionIds).slice(0,51);
 c.state.reviews=Object.fromEntries(ids.map(questionId=>[questionId,{questionId,dueDay:d.dayKey(clock.wall),step:0,lastAnsweredDay:'',lastCorrect:false}]));
 c.tab('review');await click(c,'review-all');
 const visible=()=>flat(view(c)).filter(n=>n.testId?.startsWith('review-SQLD-')).map(n=>n.testId.slice(7));
 a.deepEqual(visible(),ids.slice(0,20));await click(c,'review-more');a.deepEqual(visible(),ids.slice(0,40));
 await click(c,'review-more');a.deepEqual(visible(),ids);a.match(strings(view(c)),/51\/51문항 표시/);
 a.equal(flat(view(c)).some(n=>n.testId==='review-more'),false);
 await click(c,'review-'+ids[50]);a.deepEqual(c.state.practice.questionIds,[ids[50]]);
 c.back();await click(c,'review-due');a.equal(visible().length,20);
 c.state.practice=null;await click(c,'start-review');a.deepEqual(c.state.practice.questionIds,d.dueReviews(c.state,content,clock.wall).slice(0,10));
});

test('support feedback describes the share UI without claiming delivery and stays on help',async()=>{
 for(const outcome of ['shared','cancelled']){
  const {c,services}=setup();await c.beginPractice(content.lessons[0].questionIds);c.navigate({name:'help',id:'SQLD-L001-Q01'});
  services.share=async()=>outcome;c.supportText='test';await c.report(c.route.id);
  a.match(strings(view(c)),/공유창을 (열었|닫았)습니다/);a.doesNotMatch(strings(view(c)),/공유 동작을 완료/);a.equal(c.notice,'');
  c.back();a.equal(c.route.name,'practice');a.equal(c.supportNotice,'');a.doesNotMatch(strings(view(c)),/공유창을 (열었|닫았)습니다/);
 }
});

test('late share results cannot leak to another screen',async()=>{
 const {c,services}=setup();let finish;services.share=()=>new Promise(resolve=>finish=resolve);
 c.tab('learn');c.navigate({name:'help'});const pending=c.report();c.back();finish('shared');await pending;
 a.equal(c.route.name,'catalog');a.equal(c.notice,'');a.equal(c.supportNotice,'');
});

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

test('review distinguishes future scheduled items from a truly empty collection',async()=>{
 const {c,clock}=setup(),ids=content.lessons[0].questionIds;
 const next=d.dayKey(clock.wall+86400000);
 c.state.reviews=Object.fromEntries(ids.map(questionId=>[questionId,{questionId,dueDay:next,step:1,lastAnsweredDay:d.dayKey(clock.wall),lastCorrect:true}]));
 c.tab('review');a.match(strings(view(c)),/오늘 예정된 복습이 없어요/);a.ok(strings(view(c)).includes(`다음 복습 · ${next} · 2문항`));
 a.equal(flat(view(c)).some(n=>n.testId==='start-review'),false);
 await click(c,'review-show-all');for(const id of ids)a.ok(get(c,'review-'+id));
 a.deepEqual(d.dueReviews(c.state,content,clock.wall),[]);
});

test('launch-free settings and privacy omit advertising choices',async()=>{
 let opens=0;const {c}=setup({mode:'off',privacyOptions:async()=>{opens++;},showReward:async()=>{throw Error('must not load');}});
 for(const name of ['settings','privacy']){c.navigate({name});const out=view(c);a.equal(flat(out).some(n=>n.testId?.startsWith('ad-privacy')),false);}
 await c.openAdPrivacy();a.equal(opens,0);a.doesNotMatch(c.notice,/열지 못했습니다/);
});

test('launch-free catalog exposes every exam directly without rewarded access filters',async()=>{
 const {c}=setup();c.expanded.add('exams:available');c.tab('exams');
 const out=view(c);a.equal(flat(out).filter(n=>n.testId?.startsWith('exam-card-')).length,20);
 a.equal(flat(out).some(n=>['exams-all','exams-available'].includes(n.testId)),false);
 a.doesNotMatch(strings(out),/광고|보상|시청|열림|이용 불가|1~4회|5~20회/);
 for(const exam of content.exams){
  a.equal(get(c,'exam-'+exam.id).disabled,false);await click(c,'exam-'+exam.id);
  a.equal(c.route.name,'examIntro');a.equal(c.route.id,exam.id);a.equal(c.dialog,null);
  a.doesNotMatch(strings(view(c)),/광고|보상|시청|해제 필요/);await click(c,'back-exams');
 }
});

test('all 20 launch-free intros start the selected exam without requesting advertising',async()=>{
 let requests=0;const ads={mode:'off',privacyOptions:async()=>{requests++;},showReward:async()=>{requests++;throw Error('unexpected advertisement');}};
 for(const exam of content.exams){
  const {c}=setup(ads);c.navigate({name:'examIntro',id:exam.id});await click(c,'start-exam');
  a.equal(c.route.name,'exam');a.equal(c.state.exams.length,1);a.equal(c.state.exams[0].examId,exam.id);
  a.deepEqual(c.state.exams[0].snapshots.map(q=>q.id),exam.questionIds);a.equal(c.dialog,null);
 }
 a.equal(requests,0);
});

test('launch-free navigation, support and settings have no ad or testing UI',()=>{
 const {c}=setup();
 for(const name of ['welcome','setup','home','catalog','review','exams','stats','settings','privacy','help','notices']){
  c.route={name};const out=view(c);
  a.doesNotMatch(strings(out),/광고|보상|시청|테스트|열린 회차|이용 불가|1~4회|5~20회/,name);
  a.equal(flat(out).some(n=>n.testId?.startsWith('ad-privacy')||n.testId==='report-ad'||n.testId==='retry-reward-save'||n.key==='monetization-banner'),false,name);
 }
 c.route={name:'settings'};a.match(strings(view(c)),/모의고사 20회를 무료/);
 a.equal(get(c,'reset-learning').text,'학습 기록만 초기화');a.equal(get(c,'reset-all').text,'전체 데이터 삭제');
 for(const name of ['settings','privacy']){
  c.route={name};const out=strings(view(c));
  a.match(out,/앱 자체 기록 복원·기기 간 동기화는 제공하지 않습니다/);a.match(out,/기록 유지나 복원은 보장하지 않습니다/);a.match(out,/이 버전의 모의고사 20회는 계속 무료/);
  a.doesNotMatch(out,/복원할 수 없습니다|이용 권한.*복원|열린 회차/);
 }
 c.requestLearningReset();a.match(c.dialog.body,/20회는 계속 무료/);a.doesNotMatch(c.dialog.body,/열린 회차/);c.dialog=null;
 c.requestReset();a.match(c.dialog.body,/앱 자체 기록 복원 기능은 제공하지/);a.match(c.dialog.body,/기록의 유지·복원을 보장하지/);a.match(c.dialog.body,/20회는 계속 무료/);a.doesNotMatch(c.dialog.body,/복원할 수 없습니다|열린 회차/);
 const rewarded=setup(undefined,'rewarded').c;rewarded.requestReset();a.match(rewarded.dialog.body,/광고 시청으로 열린 회차도 모두 삭제되며 복원할 수 없습니다/);
});

test('launch-free active exam disables starting every other set and preserves resume',()=>{
 const {c}=setup();makeExam(c,19);c.tab('exams');
 for(const exam of content.exams)a.equal(get(c,'exam-'+exam.id).disabled,exam.id!=='SQLD-M20');
 a.equal(get(c,'exam-SQLD-M20').label,'제20회 모의고사, 시험 이어하기');
 a.equal(get(c,'catalog-resume').disabled,false);
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

test('catalog continuation uses valid incomplete reading and preserves search input identity and filters',async()=>{
 const {c}=setup(),first=content.lessons[0],later=content.lessons[4];c.tab('learn');a.ok(get(c,'catalog-continue').label.includes(first.title));
 await c.rememberReading(later.id,{offset:640,contentHeight:2400});const before=JSON.stringify(c.state),contentKey=get(c,'learning-content').key,inputKey=get(c,'lesson-search').key;
 a.match(get(c,'catalog-continue').label,/이어서 읽기/);a.ok(get(c,'catalog-continue').label.includes(later.title));view(c);a.equal(JSON.stringify(c.state),before);
 await click(c,'catalog-continue');a.equal(c.route.id,later.id);a.equal(get(c,'learning-content').reading.position.offset,640);c.back();
 c.setSearch('NULL');a.equal(flat(view(c)).some(n=>n.testId==='catalog-continue'),false);a.equal(get(c,'lesson-search').key,inputKey);a.equal(get(c,'learning-content').key,contentKey);a.equal(get(c,'lesson-search').value,'NULL');
 c.setSearch('');c.setSubject('S2');a.equal(flat(view(c)).some(n=>n.testId==='catalog-continue'),false);a.equal(get(c,'lesson-search').key,inputKey);
 c.setSubject('all');await click(c,'bookmarked-only');a.equal(flat(view(c)).some(n=>n.testId==='catalog-continue'),false);a.equal(get(c,'lesson-search').key,inputKey);await click(c,'bookmarked-only');
 c.state.reading.positions[later.id].lessonVersion='stale';a.ok(get(c,'catalog-continue').label.includes(first.title));a.doesNotMatch(get(c,'catalog-continue').label,/이어서 읽기/);
 c.state.reading.positions[later.id].lessonVersion=later.version;
 c.state.responses=later.questionIds.map((id,i)=>{const q=content.questions[id];return {id:'confirmed-'+i,questionId:id,version:q.version,selected:q.answer,correct:true,uncertain:false,answeredAt:c.services.clock().wall,mode:'review'};});
 a.ok(get(c,'catalog-continue').label.includes(first.title));a.deepEqual(c.state.readLessons,[]);
 await c.markLesson(first.id);a.match(get(c,'catalog-continue').label,/확인 문제 이어하기/);await click(c,'catalog-continue');a.equal(c.route.name,'practice');a.deepEqual(c.state.practice.questionIds,first.questionIds);
});

test('catalog has no continuation when all confirmation questions are complete',()=>{
 const {c}=setup();c.state.responses=content.lessons.flatMap(l=>l.questionIds).map((id,i)=>{const q=content.questions[id];return {id:'done-'+i,questionId:id,version:q.version,selected:q.answer,correct:true,uncertain:false,answeredAt:c.services.clock().wall,mode:'review'};});
 const l=content.lessons[0];c.state.reading={lastLessonId:l.id,positions:{[l.id]:{offset:200,contentHeight:2000,lessonVersion:l.version}}};c.tab('learn');
 a.equal(flat(view(c)).some(n=>n.testId==='catalog-continue'),false);a.deepEqual(c.state.readLessons,[]);a.equal(get(c,'lesson-search').key,'lesson-search');
});
test('bookmark filter shows only selected theory',()=>{const {c}=setup();c.route={name:'catalog'};c.bookmarkedOnly=true;c.state.bookmarks=['SQLD-L001'];a.deepEqual(flat(view(c)).filter(n=>n.testId?.startsWith('lesson-SQLD')).map(n=>n.testId),['lesson-SQLD-L001']);});
test('every day exposes all assigned lessons rather than only first',()=>{const {c}=setup();c.route={name:'plan'};for(let n=1;n<=30;n++)c.expanded.add('day:'+n);const tree=flat(view(c));for(const day of content.days)for(const id of day.lessonIds)a.ok(tree.find(n=>n.key==='day-'+day.day).children.flatMap(flat).some(n=>n.testId==='lesson-'+id));a.doesNotMatch(strings(view(c)),/null분|undefined분|NaN/);});
test('current day can collapse and reopen',async()=>{const {c}=setup();c.route={name:'plan'};const id=c.currentDay().lessonIds[0];a.ok(flat(view(c)).some(n=>n.testId==='lesson-'+id));await click(c,'day-1-toggle');a.equal(flat(view(c)).some(n=>n.testId==='lesson-'+id),false);await click(c,'day-1-toggle');a.ok(flat(view(c)).some(n=>n.testId==='lesson-'+id));});
test('collapsed plan days keep only their overview and expose actions when expanded',async()=>{
 const {c}=setup();c.route={name:'plan'};const day=content.days[1];
 const card=()=>flat(view(c)).find(n=>n.key==='day-'+day.day);
 a.equal(flat(card()).filter(n=>n.kind==='button').length,1);a.equal(get(c,'day-2-toggle').expanded,false);
 await click(c,'day-2-toggle');a.equal(get(c,'day-2-toggle').expanded,true);a.ok(strings(card()).includes(day.task));
 for(const id of day.lessonIds)a.ok(get(c,'lesson-'+id));a.ok(get(c,'day-2-practice'));
 await click(c,'day-2-toggle');a.equal(flat(card()).filter(n=>n.kind==='button').length,1);
});
test('all 60 lesson bodies and examples render without changing source',()=>{const {c}=setup();for(const l of content.lessons){c.route={name:'lesson',id:l.id};const out=view(c);a.ok(strings(out).includes(l.title));a.ok(get(c,'lesson-practice'));if(l.example?.sql)a.ok(flat(out).some(n=>n.kind==='code'&&n.text===l.example.sql));}a.equal(JSON.stringify(content),contentBefore);});
test('read status and confirmation progress are separate across topic practice, catalog and lesson',async()=>{
 const {c}=setup(),l=content.lessons[0];c.state.readLessons=[l.id];a.match(fmt.lessonStatus(l,c.state),/읽음 · 확인 0\/2/);
 c.state.readLessons=[];await c.beginTopicPractice({lessonIds:[l.id],source:'confirmation'});a.equal(c.state.practice.mode,'review');
 for(const id of l.questionIds){const q=c.getQuestion(id);await c.selectPractice(q.answer);await c.answerPractice();await c.nextPractice();}
 a.deepEqual(c.state.readLessons,[]);a.match(fmt.lessonStatus(l,c.state),/읽기 전 · 확인 2\/2/);a.equal(d.lessonProgress(c.state,content,l.id).confirmationComplete,true);
 c.tab('learn');a.match(strings(get(c,'lesson-'+l.id)),/읽기 전 · 확인 2\/2/);
 c.navigate({name:'lesson',id:l.id});a.match(strings(view(c)),/읽기 전 · 확인 2\/2/);
 c.tab('today');a.ok(strings(view(c)).includes(`개념 확인 1/${content.lessons.filter(x=>x.subject===l.subject).length} · 읽음 0/`));
});
test('all 120 confirmation screens withhold rationale before submission',()=>{const {c}=setup();for(const l of content.lessons)for(const id of l.questionIds){c.state.practice={id:'p',questionIds:[id],index:0,selected:null,uncertain:false,submitted:false,mode:'lesson',sessionCorrect:0,sessionAnswered:0};c.route={name:'practice'};const q=content.questions[id],out=view(c);a.ok(strings(out).includes(q.stem));a.ok(get(c,'submit-practice').disabled);a.equal(strings(out).includes(q.explanation),false);}});
test('explicit submission reveals explanation and related theory',async()=>{const {c}=setup();await c.beginPractice(content.lessons[0].questionIds);const q=c.getQuestion(c.state.practice.questionIds[0]);await click(c,'option-'+q.answer);a.equal(strings(view(c)).includes(q.explanation),false);await click(c,'submit-practice');a.ok(strings(view(c)).includes(q.explanation));a.ok(get(c,'related-'+q.lessonIds[0]));});

test('three contextual practice questions remain independently solvable in learning and standalone review',async()=>{
 for(const id of ['SQLD-L025-Q02','SQLD-L027-Q02','SQLD-L034-Q02'])for(const mode of ['lesson','review']){
  const {c}=setup(),q=content.questions[id],l=content.lessons.find(l=>l.id===q.lessonIds[0]);
  await c.beginPractice([id],mode);a.deepEqual(c.state.practice.questionIds,[id]);a.equal(c.state.responses.length,0);
  const out=view(c),nodes=flat(out),inputs=l.example.tables.map(t=>({name:t.name,columns:t.columns,rows:t.rows}));
  a.deepEqual(nodes.filter(n=>n.kind==='table').map(n=>({name:n.label,columns:n.columns,rows:n.rows})),inputs);
  a.ok(strings(out).includes(q.stem));a.equal(strings(out).includes(q.explanation),false);
  a.equal(nodes.some(n=>n.kind==='text'&&n.text?.startsWith('정답 ')),false);
  const sql=nodes.filter(n=>n.kind==='code');
  a.deepEqual(sql.map(n=>n.text),id==='SQLD-L034-Q02'?[l.example.sql]:[]);
  if(sql.length)a.equal(sql[0].label,'기준 SQL');
  await click(c,'option-'+q.answer);await click(c,'submit-practice');
  a.ok(strings(view(c)).includes(q.explanation));
 }
 a.equal(JSON.stringify(content),contentBefore);
});

test('question-owned input tables and SQL take precedence over supplemental practice inputs',()=>{
 for(const id of ['SQLD-L025-Q02','SQLD-L027-Q02','SQLD-L034-Q02']){
  const tables=[{name:'own_input',columns:['n'],rows:[[7]]}],q={...content.questions[id],tables,sql:'SELECT n FROM own_input;'};
  const before=JSON.stringify(q),ctx=questionContext(q,content);
  a.equal(ctx.tables,tables);a.equal(ctx.sql,q.sql);a.equal(ctx.sqlLabel,undefined);a.equal(JSON.stringify(q),before);
 }
 const original=content.questions['SQLD-L034-Q02'],example=content.lessons.find(l=>l.id==='SQLD-L034').example;
 const ownTables=[{name:'own_input',columns:['n'],rows:[[7]]}];
 const tablesOnly=questionContext({...original,tables:ownTables},content);a.equal(tablesOnly.tables,ownTables);a.equal(tablesOnly.sql,example.sql);
 const sqlOnly=questionContext({...original,sql:'SELECT 1;'},content);a.equal(sqlOnly.tables,example.tables);a.equal(sqlOnly.sql,'SELECT 1;');a.equal(sqlOnly.sqlLabel,undefined);
});

test('supplemental context never copies example output rows or changes other questions and exam snapshots',()=>{
 const local=structuredClone(content),sentinel='ANSWER_OUTPUT_MUST_STAY_HIDDEN';
 for(const l of local.lessons)if(l.example)l.example.rows=[[sentinel]];
 for(const q of Object.values(local.questions)){
  const ctx=questionContext(q,local),target=['SQLD-L025-Q02','SQLD-L027-Q02','SQLD-L034-Q02'].includes(q.id);
  a.equal(JSON.stringify(ctx).includes(sentinel),false,q.id);
  if(!target){a.equal(ctx.tables,q.tables,q.id);a.equal(ctx.sql,q.sql,q.id);a.equal(ctx.sqlLabel,undefined,q.id);}
  if(target){
   const snapshot={...q,examId:'SQLD-M01'},before=JSON.stringify(snapshot),saved=questionContext(snapshot,local);
   a.equal(saved.tables,snapshot.tables);a.equal(saved.sql,snapshot.sql);a.equal(saved.sqlLabel,undefined);a.equal(JSON.stringify(snapshot),before);
  }
 }
 const wrongLesson={...local.questions['SQLD-L034-Q02'],lessonIds:['SQLD-L001']};
 a.deepEqual(questionContext(wrongLesson,local),{tables:wrongLesson.tables,sql:wrongLesson.sql});
 a.equal(JSON.stringify(content),contentBefore);
});
test('rationale prioritizes the chosen wrong answer and keeps every other rationale expandable',async()=>{
 const {c}=setup(),q=content.questions['SQLD-M01-Q02'];
 const wrong=q.options.find(o=>o.id!==q.answer).id;result(c,{[q.id]:wrong});await click(c,'result-all');c.moveExamReview(1);
 const cards=()=>flat(view(c)).filter(n=>n.key?.startsWith('option-rationale-'));
 a.deepEqual(cards().map(n=>n.key),['option-rationale-'+wrong]);a.match(strings(cards()[0]),/내가 선택한 보기/);
 const nodes=flat(view(c));a.ok(nodes.findIndex(n=>n.testId==='related-'+q.lessonIds[0])<nodes.findIndex(n=>n.testId==='other-options-'+q.id));
 await click(c,'other-options-'+q.id);a.equal(cards().length,q.options.length-1);
 for(const o of q.options.filter(o=>o.id!==q.answer))a.ok(strings(cards().find(n=>n.key==='option-rationale-'+o.id)).includes(q.optionExplanations[o.id]));
 await click(c,'other-options-'+q.id);a.equal(cards().length,1);
});
test('practice has only one sticky submit/next primary action',async()=>{const {c}=setup();await c.beginPractice(content.lessons[0].questionIds);const out=view(c),footer=out.children.find(n=>n.key==='learning-footer');a.ok(footer);a.equal(flat(out).filter(n=>n.testId==='submit-practice').length,1);a.equal(flat(out.children.find(n=>n.scroll)).some(n=>n.testId==='submit-practice'),false);});
test('radio semantics include selection and non-color status',async()=>{const {c}=setup();await c.beginPractice(content.lessons[0].questionIds);const q=c.getQuestion(c.state.practice.questionIds[0]);await click(c,'option-'+q.options[0].id);const n=get(c,'option-'+q.options[0].id);a.equal(n.role,'radio');a.equal(n.checked,true);a.match(n.label,/선택됨/);});
test('unfinished practice resumes without discarding a selection',async()=>{const {c}=setup();await c.beginPractice(content.lessons[0].questionIds);await c.selectPractice('1');c.route={name:'home'};await click(c,'home-resume-practice');a.equal(c.route.name,'practice');a.equal(c.state.practice.selected,'1');});
test('rewarded policy filter lists exactly the free four with ads off',async()=>{const {c}=setup(undefined,'rewarded');c.route={name:'exams'};a.equal(get(c,'exams-available').text,'응시 가능 4회');await click(c,'exams-available');a.equal(flat(view(c)).filter(n=>n.testId?.match(/^exam-SQLD-M/)).length,4);});
test('rewarded policy with ads off keeps all 20 sets and marks locked sets without dead actions',()=>{
 const {c}=setup(undefined,'rewarded');c.route={name:'exams'};
 a.equal(flat(view(c)).filter(n=>n.testId?.startsWith('exam-card-')).length,20);
 for(const exam of content.exams.slice(4)){
  const card=get(c,'exam-card-'+exam.id);a.match(strings(card),/이용 불가/);
  a.equal(flat(card).some(n=>n.kind==='button'),false);a.equal(c.hasAccess(exam.id),false);
 }
 a.equal(c.dialog,null);
});
test('active exam disables starting other sets without touching rewarded access policy',()=>{const {c}=setup(undefined,'rewarded');makeExam(c);c.route={name:'exams'};a.equal(get(c,'exam-SQLD-M02').disabled,true);a.equal(flat(view(c)).some(n=>n.testId==='exam-SQLD-M05'),false);a.equal(get(c,'exam-SQLD-M01').disabled,false);});
test('both intro return paths restore each exam filter without persisting learning data',async()=>{
 for(const filtered of [false,true])for(const headerBack of [false,true]){
  const {c,services}=setup(undefined,'rewarded');c.tab('learn');const theoryPosition={offset:800,contentHeight:5000};
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
 const {c,clock,services}=setup(undefined,'rewarded');c.tab('exams');const all=get(c,'learning-content').catalog;
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
 const {c}=setup(ads,'rewarded');c.tab('exams');await click(c,'exams-available');
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
test('review picker jumps by original number and filters saved snapshots without changing the attempt',async()=>{
 const {c}=setup(),q=content.questions[content.exams[0].questionIds[0]];const e=result(c,{[q.id]:q.answer});
 const before=JSON.stringify(c.state);await click(c,'result-all');await click(c,'review-question-picker');
 a.equal(flat(view(c)).filter(n=>n.testId?.startsWith('review-jump-')).length,50);a.match(get(c,'review-jump-1').label,/정답/);
 await click(c,'review-jump-50');a.equal(c.route.index,49);a.equal(c.reviewPickerOpen,false);a.equal(get(c,'explain-next').text,'결과로');
 await click(c,'review-question-picker');c.back();a.equal(c.reviewPickerOpen,false);a.equal(c.route.index,49);
 await click(c,'review-exam-wrong');await click(c,'review-question-picker');a.equal(flat(view(c)).filter(n=>n.testId?.startsWith('review-jump-')).length,49);
 a.equal(flat(view(c)).some(n=>n.testId==='review-jump-1'),false);c.moveExamReview(0);a.equal(c.route.index,1);
 await click(c,'review-jump-40');a.equal(c.route.index,39);a.equal(JSON.stringify(c.state),before);
 c.route={name:'exam',id:e.id};c.openReviewPicker();a.equal(c.reviewPickerOpen,false);
});

test('related theory returns to the review filter, original question and reading position',async()=>{
 const {c}=setup(),e=result(c);await click(c,'result-wrong');c.moveExamReview(1);
 const memory=get(c,'learning-content').catalog,position={offset:900,contentHeight:2400};memory.onRemember(position);
 const before=JSON.stringify(c.state);await click(c,'related-'+e.snapshots[1].lessonIds[0]);a.equal(c.route.name,'lesson');c.back();
 a.equal(c.route.name,'examReview');a.equal(c.route.index,1);a.equal(get(c,'review-exam-wrong').selected,true);
 a.deepEqual(get(c,'learning-content').catalog.position,position);a.equal(JSON.stringify(c.state),before);
 c.moveExamReview(2);a.equal(get(c,'learning-content').catalog.position,undefined);
 memory.onRemember({offset:1000,contentHeight:2400});a.equal(get(c,'learning-content').catalog.position,undefined);
});

test('leaving the last explanation returns to results once, then back to the original history',async()=>{
 const {c}=setup(),e=result(c);c.tab('records');await click(c,'history-'+e.id);await click(c,'result-all');
 c.moveExamReview(49);await click(c,'explain-next');a.equal(c.route.name,'result');c.back();a.equal(c.route.name,'stats');
});
test('reward processing locks all updated buttons',()=>{const {c}=setup(undefined,'rewarded');c.route={name:'exams'};c.rewardBusy=true;a.ok(flat(view(c)).filter(n=>n.kind==='button').every(n=>n.disabled));});
test('reward save retry control survives screen replacement',()=>{const {c}=setup(undefined,'rewarded');c.route={name:'exams'};Object.defineProperty(c,'needsRewardSave',{get:()=>true});a.ok(get(c,'retry-reward-save'));});
test('reward feedback resets the catalog to its notice without resetting timed questions',()=>{
 const {c}=setup(undefined,'rewarded');c.route={name:'exams'};const key=()=>view(c).children.find(n=>n.scroll).key;
 const prior=get(c,'learning-content').catalog;prior.onRemember({offset:2000,contentHeight:10000});
 const catalog=key();c.notice='광고를 표시하지 못했습니다.';a.notEqual(key(),catalog);
 a.equal(c.examCatalogPosition(),undefined);prior.onRemember({offset:2100,contentHeight:10000});a.equal(c.examCatalogPosition(),undefined);
 a.match(strings(view(c)),/광고를 표시하지 못했습니다/);const settled=key();c.notify();a.equal(key(),settled);
 makeExam(c);const exam=key();c.notice='저장 상태 안내';a.equal(key(),exam);
});
test('font controls only persist supported scale and preserve grants',async()=>{const {c}=setup();c.state.monetization={version:1,grants:{},pending:null};c.route={name:'settings'};await click(c,'font-1.3');a.equal(c.state.settings.fontScale,1.3);a.ok(c.state.monetization);});
test('goal date uses a calendar, validates inline, supports clearing, and appears on home only after saving',async()=>{
 const {c,clock}=setup(),before={...c.state.settings},next=d.dayKey(clock.wall+86400000);c.navigate({name:'setup'});
 a.equal(get(c,'target-date').kind,'date');a.equal(get(c,'target-date').minimumDate,d.dayKey(clock.wall));
 get(c,'target-date').onChange('2001-01-01');await click(c,'finish-setup');a.equal(c.route.name,'setup');a.deepEqual(c.state.settings,before);
 a.equal(get(c,'target-date-error').alert,true);a.equal(c.notice,'');
 get(c,'target-date').onChange(next);a.equal(c.settingsError,'');await click(c,'minutes-60');
 c.back();a.deepEqual(c.state.settings,before);c.navigate({name:'setup'});a.equal(c.draftSettings.targetDate,before.targetDate);
 get(c,'target-date').onChange(next);await click(c,'minutes-60');await click(c,'finish-setup');
 a.equal(c.route.name,'home');a.ok(strings(view(c)).includes(`하루 60분 목표 · 시험일 ${next}`));
 c.navigate({name:'setup'});get(c,'target-date').onChange('');await click(c,'finish-setup');a.match(strings(view(c)),/하루 60분 목표/);a.doesNotMatch(strings(view(c)),/시험일 \d/);
});
test('rendering is deterministic and has no state persistence side effects',()=>{const {c}=setup();c.route={name:'catalog'};const before=JSON.stringify(c.state);view(c);view(c);a.equal(JSON.stringify(c.state),before);a.equal(JSON.stringify(content),contentBefore);});
test('failed practice answer save does not display a new answer key',async()=>{const x=setup(),c=x.c;await c.beginPractice(content.lessons[0].questionIds);const q=c.getQuestion(c.state.practice.questionIds[0]);await c.selectPractice(q.answer);x.fail(true);await c.answerPractice();a.equal(c.state.practice.submitted,false);a.equal(strings(view(c)).includes(q.explanation),false);a.match(strings(view(c)),/저장\/처리 실패/);});
test('startup failures are left intact, not hidden by new presentation',()=>{const {c}=setup();c.ready=false;const root={kind:'box',children:[{kind:'box',scroll:true,children:[{kind:'text',text:'CONTENT MISSING'}]}]};a.equal(polishLearning(c,root),root);a.match(strings(root),/CONTENT MISSING/);});

test('four tabs retain learning access and review belongs to Learning',async()=>{const {c}=setup();c.route={name:'home'};a.deepEqual(flat(view(c)).filter(n=>n.role==='tab').map(n=>n.label),['홈','학습','실전','기록']);await click(c,'tab-learn');await click(c,'learn-review');a.equal(c.route.name,'review');a.equal(get(c,'tab-learn').selected,true);await click(c,'bookmarked-only');a.equal(c.route.name,'catalog');a.equal(c.bookmarkedOnly,true);await click(c,'learn-theory');a.equal(c.bookmarkedOnly,false);await click(c,'tab-records');a.equal(c.route.name,'stats');});
test('home continues unanswered confirmation questions after reading theory',async()=>{const {c}=setup();const day=c.currentDay();c.state.readLessons=[...day.lessonIds];c.route={name:'home'};a.equal(get(c,'home-study').text,'확인 문제 이어하기');await click(c,'home-study');a.equal(c.route.name,'practice');a.deepEqual(c.state.practice.questionIds,content.lessons.find(l=>l.id===day.lessonIds[0]).questionIds);});
test('first home starts learning, then resumes the most recently visited unfinished lesson',async()=>{
 const {c}=setup();c.route={name:'home'};a.equal(get(c,'home-study').text,'학습 시작');
 a.match(strings(view(c)),/이론 0\/3 · 확인 0\/6/);a.match(strings(view(c)),/개념 \+ 확인 2문항 · 약 13분/);
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
 const {c}=setup(),day=content.days.find(d=>d.examId);const completed=content.days.filter(d=>d.day<day.day).map(d=>d.day);c.state.planProgress={version:2,completedDays:completed,legacyCompletedDays:[]};c.tab('today');
 a.equal(get(c,'home-study').text,'오늘의 모의고사 안내');a.doesNotMatch(strings(view(c)),/이론 0\/0/);
 await click(c,'home-study');a.deepEqual(c.route,{name:'examIntro',id:day.examId});
});
test('record details restore the list position without changing saved results or learning history',async()=>{
 const {c,services}=setup(),e=result(c),position={offset:480,contentHeight:1600};
 c.tab('learn');get(c,'learning-content').catalog.onRemember({offset:700,contentHeight:9000});
 c.tab('exams');get(c,'learning-content').catalog.onRemember({offset:1200,contentHeight:6000});
 c.tab('records');const before=JSON.stringify(c.state),revision=c.getSnapshot();
 get(c,'learning-content').catalog.onRemember(position);
 a.equal(c.getSnapshot(),revision);a.equal(await services.repository.load(),null);
 await click(c,'history-'+e.id);a.equal(c.route.id,e.id);a.equal(c.route.name,'result');
 a.equal(get(c,'learning-content').catalog,undefined);c.back();a.equal(c.route.name,'stats');
 a.deepEqual(get(c,'learning-content').catalog.position,position);a.equal(JSON.stringify(c.state),before);
 a.deepEqual(c.catalogPosition(),{offset:700,contentHeight:9000});a.deepEqual(c.examCatalogPosition(),{offset:1200,contentHeight:6000});
 a.equal(c.lastReadingLesson(),undefined);a.equal(get(c,'learning-content').reading,undefined);
});
test('first confirmation accuracy separates uncertainty and ignores repeats and unrelated questions',()=>{
 const {c}=setup(),[q1,q2]=content.lessons[0].questionIds;
 c.state.responses=[
  {questionId:q1,correct:true,uncertain:true,mode:'review'},
  {questionId:q1,correct:true,uncertain:false,mode:'lesson'},
  {questionId:q2,correct:false,uncertain:false,mode:'lesson'},
  {questionId:q2,correct:true,uncertain:false,mode:'review'},
  {questionId:content.exams[0].questionIds[0],correct:true,uncertain:false,mode:'review'},
  {questionId:'unknown',correct:true,uncertain:false,mode:'lesson'}
 ];
 c.tab('records');a.match(strings(view(c)),/첫 풀이 정답률 50%/);a.match(strings(view(c)),/확신 있게 맞힌 비율 0%/);
 a.match(strings(view(c)),/2문항 기준/);a.equal(c.expanded.has('stats:details'),false);
 a.deepEqual(d.confirmationAccuracy(c.state,content),{total:2,correct:1,confidentCorrect:0,percent:50,confidentPercent:0});
});
test('reviewing a submitted mock does not create confirmation statistics or alter stored answers',async()=>{
 const {c}=setup();await c.beginExam('SQLD-M01');await c.finishExam('manual');
 const examBefore=JSON.stringify(c.state.exams),q=c.state.exams[0].snapshots[0];
 await c.beginPractice([q.id],'review');await c.selectPractice(q.answer);await c.answerPractice();await c.nextPractice();
 a.equal(c.state.responses.length,1);a.equal(c.state.responses[0].correct,true);a.equal(c.state.responses[0].mode,'review');
 c.tab('records');const before=JSON.stringify(c.state);a.match(strings(view(c)),/아직 풀이 기록이 없어요/);
 a.doesNotMatch(strings(get(c,'confirmation-stats')),/첫 풀이 정답률|확신.*비율|계산 기준|문항 기준/);
 a.equal(d.confirmationAccuracy(c.state,content).total,0);
 a.ok(get(c,'history-'+c.state.exams[0].id));a.equal(JSON.stringify(c.state),before);a.equal(JSON.stringify(c.state.exams),examBefore);
});
test('confirmation statistics distinguish no answers from zero correct and use saved correctness',()=>{
 const {c}=setup(),q=content.questions[content.lessons[0].questionIds[0]];c.tab('records');
 a.deepEqual(d.confirmationAccuracy(c.state,content),{total:0,correct:0,confidentCorrect:0,percent:null,confidentPercent:null});
 a.doesNotMatch(strings(get(c,'confirmation-stats')),/NaN|확신.*비율|계산 기준|문항 기준/);
 // Even if an answer key changed, records must reflect the result saved when answered.
 c.state.responses=[{questionId:q.id,selected:q.answer,correct:false,uncertain:false,mode:'lesson'}];
 a.match(strings(view(c)),/첫 풀이 정답률 0%/);a.match(strings(view(c)),/확신 있게 맞힌 비율 0%/);a.match(strings(view(c)),/1문항 기준/);
});
test('confirmation sample size counts every lesson question once across repeated reviews',()=>{
 const {c}=setup(),ids=content.lessons.flatMap(l=>l.questionIds);
 c.state.responses=ids.map((questionId,i)=>({questionId,correct:i%2===0,uncertain:false,mode:i%2?'review':'lesson'}));
 c.state.responses.push(...ids.map(questionId=>({questionId,correct:true,uncertain:false,mode:'review'})));
 c.state.responses.push(...content.exams.flatMap(e=>e.questionIds).map(questionId=>({questionId,correct:true,uncertain:false,mode:'review'})));
 const before=JSON.stringify(c.state);a.equal(ids.length,120);
 a.deepEqual(d.confirmationAccuracy(c.state,content),{total:120,correct:60,confidentCorrect:60,percent:50,confidentPercent:50});
 c.tab('records');a.match(strings(view(c)),/120문항 기준/);a.equal(JSON.stringify(c.state),before);
});
test('records return to the top after new learning, submitted results or a notice and reject stale callbacks',()=>{
 for(const change of [
  c=>c.state.responses.push({questionId:content.lessons[0].questionIds[0],correct:true,uncertain:false}),
  c=>c.state.readLessons.push(content.lessons[0].id),
  c=>c.state.studyDays.push('2026-09-26'),
  c=>result(c),
  c=>{c.notice='저장 상태를 확인해 주세요.';}
 ]){
  const {c}=setup();c.tab('records');const memory=get(c,'learning-content').catalog;
  memory.onRemember({offset:480,contentHeight:1600});a.ok(c.recordsPosition());change(c);
  a.equal(c.recordsPosition(),undefined);memory.onRemember({offset:500,contentHeight:1600});a.equal(c.recordsPosition(),undefined);
 }
});
test('active exam ticks and answers preserve records browsing memory and cannot be changed by it',async()=>{
 const {c,clock}=setup(),e=makeExam(c);c.tab('records');const memory=get(c,'learning-content').catalog,position={offset:480,contentHeight:1600};
 memory.onRemember(position);await c.updateExamAnswer(e.snapshots[0].options[0].id);
 clock.wall+=5000;clock.mono+=5000;await c.checkpoint();
 a.deepEqual(c.recordsPosition(),position);a.equal(c.recordsContext(),memory.context);
 const before=JSON.stringify(c.state),revision=c.getSnapshot();memory.onRemember({offset:NaN,contentHeight:1600});
 a.deepEqual(c.recordsPosition(),position);a.equal(JSON.stringify(c.state),before);a.equal(c.getSnapshot(),revision);
});

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
 a.equal(c.search,'');a.equal(c.subject,'all');a.match(strings(view(c)),/60개 개념/);
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
 a.equal(c.search,'');a.equal(c.subject,'all');a.match(strings(view(c)),/1개 개념/);a.ok(get(c,'lesson-SQLD-L001'));
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
  c.tab('records');const records=get(c,'learning-content').catalog;records.onRemember({offset:480,contentHeight:1600});
  const e=result(c);await click(c,'result-all');const review=get(c,'learning-content').catalog;review.onRemember({offset:750,contentHeight:2200});
  if(full)c.requestReset();else c.requestLearningReset();await c.acceptDialog();
  memory.onRemember({offset:600,contentHeight:2000});a.equal(c.catalogPosition(),undefined);a.equal(c.state.onboarded,false);
  exams.onRemember({offset:1000,contentHeight:5000});a.equal(c.examCatalogPosition(),undefined);
  records.onRemember({offset:500,contentHeight:1600});a.equal(c.recordsPosition(),undefined);
  review.onRemember({offset:800,contentHeight:2200});a.equal(c.examReviewPosition(),undefined);c.route={name:'examReview',id:e.id,index:0};a.equal(c.examReviewPosition(),undefined);
 }
});
test('theory shortcut respects reward processing lock and cannot change filters or navigation',()=>{
 const {c}=setup();c.route={name:'review'};c.bookmarkedOnly=true;c.search='NULL';c.subject='S2';c.rewardBusy=true;
 a.equal(get(c,'review-empty-learn').disabled,true);c.openTheory();
 a.equal(c.route.name,'review');a.equal(c.bookmarkedOnly,true);a.equal(c.search,'NULL');a.equal(c.subject,'S2');
});

test('home places one primary recommendation first and preserves reading with a 15 versus 30 minute short-session choice',async()=>{
 for(const [minutes,expected] of [[15,content.lessons[0]],[30,content.lessons[58]]]){
  const {c}=setup(),long=content.lessons[58];c.state.settings.minutes=minutes;
  await c.rememberReading(long.id,{offset:200,contentHeight:2000});c.tab('today');
  const scroll=get(c,'learning-content'),hero=get(c,'home-recommendation');
  a.ok(scroll.children.indexOf(hero)<scroll.children.findIndex(n=>strings(n).includes('최근 7일')));
  a.equal(flat(hero).filter(n=>n.kind==='button'&&n.style?.backgroundColor===light.blue).length,1);a.ok(strings(hero).includes(long.title));
  a.match(strings(hero),new RegExp(`전체 분량 · 개념 \\+ 확인 ${long.questionIds.length}문항 · 약 ${long.minutes+long.questionIds.length*2}분`));
  await click(c,'home-study');a.equal(c.route.name,'lesson');a.equal(c.route.id,long.id);a.equal(get(c,'learning-content').reading.position.offset,200);c.tab('today');
  if(minutes===15){a.match(get(c,'home-short-session').text,/약 13분/);await click(c,'home-short-session');a.equal(c.route.name,'lesson');a.equal(c.route.id,expected.id);}
  else a.equal(flat(view(c)).some(n=>n.testId==='home-short-session'),false);
 }
});

test('home resumes valid unfinished reading before due review while offering the bounded short review',async()=>{
 const {c,clock}=setup(),lesson=content.lessons[4],ids=content.lessons.flatMap(l=>l.questionIds).slice(0,12);c.state.settings.minutes=15;
 await c.rememberReading(lesson.id,{offset:780,contentHeight:3000});c.state.reviews=Object.fromEntries(ids.map(questionId=>[questionId,{questionId,dueDay:d.dayKey(clock.wall),step:0,lastAnsweredDay:'',lastCorrect:false}]));
 c.tab('today');a.ok(strings(get(c,'home-recommendation')).includes(lesson.title));a.equal(get(c,'home-study').text,'이어서 읽기');a.equal(flat(view(c)).some(n=>n.testId==='home-review'),false);
 a.match(get(c,'home-short-session').text,/짧은 복습 · 약 14분/);await click(c,'home-study');a.equal(c.route.id,lesson.id);a.equal(get(c,'learning-content').reading.position.offset,780);
 c.tab('today');await click(c,'home-short-session');a.equal(c.route.name,'practice');a.deepEqual(c.state.practice.questionIds,ids.slice(0,7));
});

test('home prioritizes an active exam then unfinished practice before bounded due review',async()=>{
 const {c,clock}=setup(),ids=content.lessons.flatMap(l=>l.questionIds).slice(0,12);
 c.state.settings.minutes=15;c.state.reviews=Object.fromEntries(ids.map(questionId=>[questionId,{questionId,dueDay:d.dayKey(clock.wall),step:0,lastAnsweredDay:'',lastCorrect:false}]));
 c.tab('today');a.equal(flat(get(c,'home-recommendation')).filter(n=>n.kind==='button').length,1);
 a.equal(flat(view(c)).some(n=>n.testId==='home-study'),false);a.match(strings(get(c,'home-recommendation')),/복습 7문항 · 약 14분/);
 await click(c,'home-review');a.deepEqual(c.state.practice.questionIds,ids.slice(0,7));
 await c.selectPractice('1');c.tab('today');await click(c,'home-resume-practice');a.equal(c.state.practice.selected,'1');
 const practiceBefore=JSON.stringify(c.state.practice),e=makeExam(c);c.tab('today');
 a.equal(flat(view(c)).some(n=>n.testId==='home-resume-practice'||n.testId==='home-review'),false);
 await click(c,'home-resume-exam');a.equal(c.route.id,e.id);a.equal(JSON.stringify(c.state.practice),practiceBefore);
});

test('home activity states its count scope and topic progress starts the entire selected group',async()=>{
 const {c}=setup();await c.beginPractice([content.lessons[0].questionIds[0]]);const q=c.getQuestion(c.state.practice.questionIds[0]);
 await c.selectPractice(q.answer);await c.answerPractice();await c.nextPractice();await c.returnPracticeHome();
 a.match(strings(view(c)),/확인·복습 1문항 · 정답 1문항/);
 a.match(strings(view(c)),/풀이 수는 확인 문제·복습 기준/);a.equal(flat(view(c)).filter(n=>n.key?.startsWith('activity-')).length,7);
 await click(c,'home-topics');await click(c,'home-topic-model');a.equal(c.route.name,'practiceSetup');
 a.match(strings(view(c)),/7개 주제 선택/);await click(c,'practice-count-20');await click(c,'practice-setup-start');
 a.deepEqual(c.state.practice.questionIds,content.lessons.slice(0,7).flatMap(l=>l.questionIds));
});

test('seven-day activity keeps short date labels, exact numeric counts and aligned seven columns in home and records',()=>{
 const {c,clock}=setup();clock.wall=Date.UTC(2026,9,4,12);c.state.settings.fontScale=1.3;c.state.settings.theme='dark';
 const days=['2026-09-28','2026-09-29','2026-09-30','2026-10-01','2026-10-02','2026-10-03','2026-10-04'],counts=[0,1,12,123,999,1000,25],weekday=['월','화','수','목','금','토','일'],q=content.questions[content.lessons[0].questionIds[0]];
 c.state.responses=days.flatMap((day,i)=>Array.from({length:counts[i]},(_,j)=>({id:`daily-${i}-${j}`,questionId:q.id,version:q.version,selected:q.answer,correct:true,uncertain:false,answeredAt:Date.parse(`${day}T12:00:00Z`),mode:'review'})));
 for(const name of ['home','stats']){c.route={name};const before=JSON.stringify(c.state),activity=get(c,'learning-activity'),week=activity.children.find(n=>n.children?.every(child=>child.key?.startsWith('activity-'))&&n.children.length===7);
  a.ok(week);a.equal(week.style.alignItems,'stretch');a.equal(week.style.gap,5);a.equal(get(c,'activity-period').text,'09/28–10/04');
  a.deepEqual(week.children.map(n=>n.key),days.map(day=>'activity-'+day));
  week.children.forEach((cell,i)=>{a.equal(cell.style.flex,1);a.equal(cell.style.flexBasis,0);a.equal(cell.style.minWidth,0);a.equal(cell.children.length,4);
   const [dayName,date,icon,count]=cell.children;a.equal(dayName.text,weekday[i]);a.equal(date.text,days[i].slice(-2));a.equal(count.text,String(counts[i]));a.equal(date.style.fontSize,13);a.equal(dayName.style.fontSize,13);a.equal(count.style.fontSize,13);a.equal(date.style.lineHeight,21);
   a.equal(icon.label,`${days[i]}, ${counts[i]?'학습함':'학습 기록 없음'}, 확인 문제·복습 ${counts[i]}문항`);
  });a.equal(JSON.stringify(c.state),before);
 }
});

test('activity period distinguishes a year boundary and weekdays stay correct in a negative timezone',()=>{
 const {c,clock}=setup();clock.wall=Date.UTC(2027,0,4,12);c.tab('today');a.equal(get(c,'activity-period').text,'2026/12/29–2027/01/04');
 const cp=require('node:child_process'),program=`
 const {MonetizedController}=require('./.build/monetization/controller'),{renderMonetized}=require('./.build/monetization/views'),content=require('./generated/content.json');
 const c=new MonetizedController(content,{clock:()=>({wall:Date.UTC(2027,0,4,12),mono:1,runtimeId:'timezone'}),uuid:()=> 'tz',repository:{load:async()=>null,save:async()=>{},clear:async()=>{}},platform:'web'});c.ready=true;c.state.onboarded=true;c.route={name:'home'};
 const flat=n=>[n,...(n.children??[]).flatMap(flat)];
 console.log(JSON.stringify(flat(renderMonetized(c)).filter(n=>n.key?.startsWith('activity-')).map(n=>[n.key,n.children[0].text,n.children[1].text,n.children[2].label])));
 `;
 for(const timezone of ['UTC','America/Los_Angeles']){const child=cp.spawnSync(process.execPath,['-e',program],{encoding:'utf8',env:{...process.env,TZ:timezone}});a.equal(child.status,0,child.stderr);const cells=JSON.parse(child.stdout.trim());
  a.deepEqual(cells.map(n=>n.slice(0,3)),[['activity-2026-12-29','화','29'],['activity-2026-12-30','수','30'],['activity-2026-12-31','목','31'],['activity-2027-01-01','금','01'],['activity-2027-01-02','토','02'],['activity-2027-01-03','일','03'],['activity-2027-01-04','월','04']]);
  for(const [key,,,label] of cells)a.equal(label,`${key.slice(9)}, 학습 기록 없음, 확인 문제·복습 0문항`);
 }
});

test('concept groups cover all 60 lessons once while icons retain names and four tab targets',async()=>{
 const {c}=setup();c.tab('learn');const nodes=flat(view(c)),lessons=nodes.filter(n=>n.testId?.startsWith('lesson-SQLD-'));
 a.equal(lessons.length,60);a.equal(new Set(lessons.map(n=>n.testId)).size,60);
 a.equal(nodes.filter(n=>n.key?.startsWith('group-')).length,9);a.equal(get(c,'app-settings').icon,'settings');a.equal(get(c,'app-settings').label,'설정');
 for(const [id,icon] of [['today','home'],['learn','book'],['exams','timer'],['records','chart']]){a.equal(get(c,'tab-'+id).icon,icon);a.equal(get(c,'tab-'+id).iconPosition,'above');}
 await click(c,'lesson-SQLD-L001');a.equal(get(c,'lesson-bookmark').icon,'bookmark');await click(c,'lesson-bookmark');a.equal(get(c,'lesson-bookmark').selected,true);
});

test('responsive catalog keeps each topic heading with its filtered lesson list as one section',()=>{
 const {c}=setup(),groups=require('../.build/ui/learning-retention').learningGroups(content);c.route={name:'catalog'};c.state.settings.fontScale=1.3;
 for(const filter of [{search:'',subject:'all',bookmarkedOnly:false},{search:'조인',subject:'S2',bookmarkedOnly:false},{search:'',subject:'all',bookmarkedOnly:true}]){
  c.search=filter.search;c.subject=filter.subject;c.bookmarkedOnly=filter.bookmarkedOnly;c.state.bookmarks=['SQLD-L015','SQLD-L031'];
  const before=JSON.stringify(c.state),grid=flat(view(c)).find(n=>n.key==='lesson-grid'),expected=fmt.searchLessons(content.lessons,c.search,c.subject,c.bookmarkedOnly?c.state.bookmarks:null);
  a.equal(grid.layout,'lesson-sections');a.equal(grid.children.some(n=>n.kind==='text'||n.heading),false);a.equal(grid.children.length,groups.filter(group=>group.lessons.some(l=>expected.some(e=>e.id===l.id))).length);
  const actual=[];for(const section of grid.children){a.match(section.key,/^lesson-section-/);a.equal(section.children.length,2);const [title,list]=section.children,group=groups.find(g=>'lesson-section-'+g.id===section.key);a.ok(group);a.equal(title.heading,true);a.ok(title.text.includes(group.title));a.equal(list.key,'group-'+group.id);
   const ids=list.children.map(n=>n.testId.slice(7));a.deepEqual(ids,group.lessons.filter(l=>expected.some(e=>e.id===l.id)).map(l=>l.id));actual.push(...ids);
  }a.deepEqual(actual,expected.map(l=>l.id));a.equal(JSON.stringify(c.state),before);a.equal(get(c,'lesson-search').key,'lesson-search');
 }
});

test('adaptive layout is explicit for summaries while chips, activity, header and timed footer remain ordinary rows',()=>{
 const {row,adaptiveRow,text}=require('../.build/ui/nodes'),children=[text('제목'),text('정보')];a.equal(row(children).layout,undefined);a.equal(adaptiveRow(children).layout,'adaptive-row');a.equal(adaptiveRow(children).style.flexWrap,'wrap');
 const {c}=setup();c.expanded.add('home:topics');c.route={name:'home'};a.ok(flat(view(c)).some(n=>n.layout==='adaptive-row'));a.equal(view(c).children[0].layout,undefined);
 const activity=get(c,'learning-activity');a.equal(activity.children.find(n=>n.children?.length===7).layout,undefined);
 for(const name of ['catalog','practiceSetup','review','exams']){c.route={name};const nodes=flat(view(c)),chips=nodes.filter(n=>n.style?.flexDirection==='row'&&n.children?.length&&n.children.every(child=>child.kind==='button'&&child.role!=='tab'));for(const chipRow of chips){a.equal(chipRow.layout,undefined);a.equal(chipRow.style.flexWrap,'wrap');}}
 c.route={name:'stats'};a.ok(flat(view(c)).some(n=>n.layout==='adaptive-row'&&n.children.length===2&&n.children.every(child=>child.kind==='box')));
 makeExam(c);const root=view(c),footer=root.children.find(n=>n.key==='learning-footer');a.equal(footer.children[0].layout,undefined);a.equal(footer.children[0].style.flexWrap,'wrap');
 a.equal(JSON.stringify(content),contentBefore);
});

test('reading and interaction screens request a bounded content frame without narrowing the four main catalogs',()=>{
 const {c}=setup();for(const name of ['home','catalog','exams','stats']){c.route={name};a.equal(get(c,'learning-content').contentWidth,undefined,name);}
 for(const name of ['lesson','practice','exam','examReview','practiceSetup','practiceResult','result','setup','settings','help','examIntro','privacy','notices','review','plan']){c.route={name};a.equal(get(c,'learning-content').contentWidth,'reading',name);}
});

test('the fixed lesson action records reading only after a successful save before opening confirmation',async()=>{
 const x=setup(),c=x.c,l=content.lessons[0];c.navigate({name:'lesson',id:l.id});
 a.equal(flat(view(c)).filter(n=>n.testId==='lesson-practice').length,1);a.equal(flat(get(c,'learning-content')).some(n=>n.testId==='lesson-practice'),false);
 a.equal(get(c,'lesson-practice').text,'읽기 완료하고 확인 문제');x.fail(true);await click(c,'lesson-practice');
 a.equal(c.route.name,'lesson');a.deepEqual(c.state.readLessons,[]);a.equal(c.state.practice,null);a.match(strings(view(c)),/저장\/처리 실패/);
 x.fail(false);await click(c,'lesson-practice');a.equal(c.route.name,'practice');a.deepEqual(c.state.readLessons,[l.id]);a.deepEqual(c.state.practice.questionIds,l.questionIds);
 a.equal(JSON.stringify(content),contentBefore);
});

test('practice setup retains the learning tabs, limits choices, and never previews an unsubmitted mock',async()=>{
 const {c}=setup();c.tab('learn');await click(c,'learn-questions');a.equal(c.route.name,'practiceSetup');a.equal(get(c,'tab-learn').selected,true);
 a.deepEqual(flat(view(c)).filter(n=>n.role==='tab').map(n=>n.label),['홈','학습','실전','기록']);
 a.match(strings(view(c)),/선택한 조건에 120문항/);a.equal(get(c,'practice-setup-start').disabled,false);
 const hidden=content.questions[content.exams[1].questionIds[0]];a.equal(strings(view(c)).includes(hidden.stem),false);a.equal(strings(view(c)).includes(hidden.explanation),false);
 await click(c,'practice-source-submitted-exams');a.equal(get(c,'practice-setup-start').disabled,true);a.match(strings(view(c)),/모의고사를 제출하거나/);
 makeExam(c);c.navigate({name:'practiceSetup'});a.equal(get(c,'practice-setup-start').disabled,true);
 await c.finishExam('manual');const examBefore=JSON.stringify(c.state.exams);c.openPracticeSetup();a.equal(get(c,'practice-setup-start').disabled,false);
 await click(c,'practice-count-5');await click(c,'practice-setup-start');a.equal(c.state.practice.questionIds.length,5);
 a.ok(c.state.practice.questionIds.every(id=>content.exams[0].questionIds.includes(id)));a.equal(JSON.stringify(c.state.exams),examBefore);
});

test('topic, answer-state and source choices affect the saved session without marking theory read',async()=>{
 const {c}=setup(),l=content.lessons[0],[first,second]=l.questionIds;
 await c.beginPractice([first]);const q=c.getQuestion(first);await c.selectPractice(q.options.find(o=>o.id!==q.answer).id);await c.uncertain();await c.answerPractice();await c.nextPractice();
 c.openPracticeSetup();await click(c,'practice-topics');await click(c,'practice-topic-'+l.id);await click(c,'practice-source-confirmation');
 await click(c,'practice-filter-uncertain');a.match(strings(view(c)),/이번에는 1문항/);
 await click(c,'practice-filter-wrong');await click(c,'practice-setup-start');a.deepEqual(c.state.practice.questionIds,[first]);a.deepEqual(c.state.readLessons,[]);
 c.openPracticeSetup();await click(c,'practice-filter-unanswered');await click(c,'practice-setup-start');a.ok(c.dialog);await c.acceptDialog();a.deepEqual(c.state.practice.questionIds,[second]);
 a.equal(JSON.stringify(content),contentBefore);
});

test('practice completion saves the result and offers unique related review, next concept and home',async()=>{
 const {c}=setup(),l=content.lessons[0];await c.beginPractice(l.questionIds);
 for(let i=0;i<2;i++){const q=c.getQuestion(c.state.practice.questionIds[i]);await c.selectPractice(i?q.options.find(o=>o.id!==q.answer).id:q.answer);if(!i)await c.uncertain();await c.answerPractice();await c.nextPractice();}
 a.equal(c.route.name,'practiceResult');a.equal(c.state.practice,null);const completed=c.practiceResult(),saved=JSON.stringify(c.state);
 a.match(strings(view(c)),/1 \/ 2문항 정답/);a.match(strings(view(c)),/확신 부족 1문항/);a.ok(get(c,'practice-result-next'));a.ok(get(c,'practice-result-home'));
 view(c);view(c);a.equal(JSON.stringify(c.state),saved);await click(c,'practice-result-review');a.deepEqual(c.state.practice.questionIds,[l.questionIds[1],l.questionIds[0]]);a.equal(new Set(c.state.practice.questionIds).size,2);
 a.equal(c.state.practiceResults.filter(r=>r.id===completed.id).length,1);
 const y=setup(),other=y.c;await other.beginPractice(l.questionIds);
 for(let i=0;i<2;i++){const q=other.getQuestion(other.state.practice.questionIds[i]);await other.selectPractice(q.answer);await other.answerPractice();await other.nextPractice();}
 const beforeResponses=JSON.stringify(other.state.responses);await click(other,'practice-result-next');a.equal(other.route.id,content.lessons[1].id);a.equal(JSON.stringify(other.state.responses),beforeResponses);
 other.navigate({name:'practiceResult',id:other.state.practiceResults[0].id});await click(other,'practice-result-home');a.equal(other.route.name,'home');a.equal(other.state.practiceResults.length,1);
});

test('practice result shows the earliest actual session review date and count without unrelated schedules',async()=>{
 const {c,clock}=setup(),l=content.lessons[0],other=content.lessons[1].questionIds[0];clock.wall=Date.UTC(2026,9,4,3);
 c.state.reviews[other]={questionId:other,dueDay:d.dayKey(clock.wall-86400000),step:0,lastAnsweredDay:'',lastCorrect:false};
 await c.beginPractice(l.questionIds);
 for(const id of l.questionIds){const q=c.getQuestion(id);await c.selectPractice(q.options.find(o=>o.id!==q.answer).id);await c.answerPractice();await c.nextPractice();}
 const day=c.state.reviews[l.questionIds[0]].dueDay;a.equal(day,c.state.reviews[l.questionIds[1]].dueDay);
 a.equal(get(c,'practice-result-schedule').text,`다음 복습 · ${day} · 2문항`);const saved=JSON.stringify(c.state);view(c);a.equal(JSON.stringify(c.state),saved);
 clock.wall+=86400000;a.equal(get(c,'practice-result-schedule').text,`오늘 복습 가능 · ${day} 예정 · 2문항`);
 clock.wall+=86400000;a.equal(get(c,'practice-result-schedule').text,`오늘 복습 가능 · ${day} 예정 · 2문항`);
 const y=setup(),clean=y.c;clean.state.reviews[other]={questionId:other,dueDay:d.dayKey(y.clock.wall),step:0,lastAnsweredDay:'',lastCorrect:false};
 await clean.beginPractice(l.questionIds);for(const id of l.questionIds){const q=clean.getQuestion(id);await clean.selectPractice(q.answer);await clean.answerPractice();await clean.nextPractice();}
 a.equal(flat(view(clean)).some(n=>n.testId==='practice-result-schedule'),false);a.ok(clean.state.reviews[other]);
 const z=setup(),mixed=z.c,old=l.questionIds[0];mixed.state.reviews[old]={questionId:old,dueDay:d.dayKey(z.clock.wall),step:0,lastAnsweredDay:d.dayKey(z.clock.wall-86400000),lastCorrect:false};
 await mixed.beginPractice(l.questionIds);for(const id of l.questionIds){const q=mixed.getQuestion(id);await mixed.selectPractice(id===old?q.answer:q.options.find(o=>o.id!==q.answer).id);await mixed.answerPractice();await mixed.nextPractice();}
 const earliest=mixed.state.reviews[l.questionIds[1]].dueDay;a.ok(earliest<mixed.state.reviews[old].dueDay);a.equal(get(mixed,'practice-result-schedule').text,`다음 복습 · ${earliest} · 1문항`);
});

test('failed result storage keeps the last submitted answer and recovery renders one persisted result',async()=>{
 const x=setup(),c=x.c;await c.beginPractice([content.lessons[0].questionIds[0]]);const q=c.getQuestion(c.state.practice.questionIds[0]);
 await c.selectPractice(q.answer);await c.answerPractice();x.fail(true);await click(c,'next-practice');
 a.equal(c.route.name,'practice');a.equal(c.state.practice.submitted,true);a.ok(strings(view(c)).includes(q.explanation));a.equal(c.state.practiceResults?.length??0,0);
 x.fail(false);await click(c,'next-practice');a.equal(c.route.name,'practiceResult');
 const recovered=new MonetizedController(content,x.services);await recovered.initialize();a.equal(recovered.route.name,'practiceResult');
 a.match(strings(view(recovered)),/1 \/ 1문항 정답/);a.equal(recovered.state.practiceResults.length,1);a.equal(recovered.state.responses.length,1);
});

test('completed concepts result leaves for exams only after storage and cannot return on restart',async()=>{
 const x=setup(),c=x.c,ids=content.lessons.flatMap(l=>l.questionIds),last=ids.at(-1);
 c.state.responses=ids.filter(id=>id!==last).map((id,i)=>{const q=content.questions[id];return {id:'prior-'+i,questionId:id,version:q.version,selected:q.answer,correct:true,uncertain:false,answeredAt:x.clock.wall,mode:'review'};});
 await c.beginPractice([last]);const q=c.getQuestion(last);await c.selectPractice(q.answer);await c.answerPractice();await c.nextPractice();
 a.equal(c.nextConcept(),undefined);a.equal(get(c,'practice-result-next').text,'모의고사 선택');
 const resultId=c.state.lastPracticeResultId,responses=JSON.stringify(c.state.responses),results=JSON.stringify(c.state.practiceResults);
 x.fail(true);await click(c,'practice-result-next');a.equal(c.route.name,'practiceResult');a.equal(c.state.lastPracticeResultId,resultId);a.equal(c.practiceResult().id,resultId);
 x.fail(false);await click(c,'practice-result-next');a.equal(c.route.name,'exams');a.equal(c.state.lastPracticeResultId,null);
 a.equal(JSON.stringify(c.state.responses),responses);a.equal(JSON.stringify(c.state.practiceResults),results);
 const recovered=new MonetizedController(content,x.services);await recovered.initialize();a.equal(recovered.route.name,'home');a.equal(recovered.state.lastPracticeResultId,null);
 a.equal(JSON.stringify(recovered.state.practiceResults),results);a.equal(JSON.stringify(recovered.state.responses),responses);
});

test('exam progress filters retain all access and reject positions from a different result list',async()=>{
 const {c}=setup(),first=result(c);c.tab('exams');a.equal(flat(view(c)).filter(n=>n.testId?.startsWith('exam-card-')).length,20);
 await click(c,'exams-next');a.equal(c.route.id,'SQLD-M02');c.back();const all=get(c,'learning-content').catalog;all.onRemember({offset:800,contentHeight:6000});
 await click(c,'exams-filter-completed');a.equal(c.examCatalogPosition(),undefined);all.onRemember({offset:1000,contentHeight:6000});a.equal(c.examCatalogPosition(),undefined);
 a.equal(flat(view(c)).filter(n=>n.testId?.startsWith('exam-card-')).length,1);a.ok(get(c,'result-SQLD-M01'));
 await click(c,'exams-filter-unattempted');a.equal(flat(view(c)).filter(n=>n.testId?.startsWith('exam-card-')).length,19);a.equal(flat(view(c)).some(n=>n.testId==='exam-SQLD-M01'),false);
 await click(c,'exams-filter-all');a.equal(c.hasAccess('SQLD-M20'),true);a.equal(c.state.exams[0].id,first.id);
});

test('completed exam cards prioritize saved results and actual wrong review while keeping retake and active guards',async()=>{
 const {c,clock}=setup(),qs=content.exams[0].questionIds.map(id=>content.questions[id]),answers={[qs[0].id]:qs[0].answer,[qs[1].id]:qs[1].options.find(o=>o.id!==qs[1].answer).id},done=result(c,answers);
 c.tab('exams');const card=flat(get(c,'exam-card-SQLD-M01')),buttons=card.filter(n=>n.kind==='button');
 a.equal(buttons[0].testId,'result-SQLD-M01');a.equal(buttons[0].style.backgroundColor,light.blue);a.equal(card.filter(n=>n.testId==='result-SQLD-M01').length,1);a.equal(get(c,'exam-SQLD-M01').text,'다시 응시');
 await click(c,'result-SQLD-M01');a.equal(c.route.name,'result');a.equal(c.route.id,done.id);c.tab('exams');
 await click(c,'exam-wrong-SQLD-M01');a.equal(c.route.name,'examReview');a.equal(c.route.id,done.id);a.equal(c.route.index,1);a.equal(get(c,'review-exam-wrong').selected,true);c.tab('exams');
 await click(c,'exam-SQLD-M01');a.equal(c.route.name,'examIntro');a.equal(c.route.id,'SQLD-M01');c.tab('exams');
 const live=d.startExam(c.state,content.exams[1],content,{...c.services.clock(),wall:clock.wall+1},'still-running');c.state.exams.push(live);
 for(const id of ['result-SQLD-M01','exam-wrong-SQLD-M01','exam-SQLD-M01'])a.equal(get(c,id).disabled,true);a.equal(get(c,'exam-SQLD-M02').disabled,false);a.equal(get(c,'exam-SQLD-M02').text,'이어하기');
 const y=setup(),clean=y.c,perfect=result(clean,Object.fromEntries(qs.map(q=>[q.id,q.answer])));clean.tab('exams');
 a.equal(flat(get(clean,'exam-card-SQLD-M01')).some(n=>n.testId==='exam-wrong-SQLD-M01'),false);a.equal(get(clean,'result-SQLD-M01').disabled,false);await click(clean,'result-SQLD-M01');a.equal(clean.route.id,perfect.id);
});

test('records separate first and last saved confirmation outcomes and open a sparse topic without claiming certainty',async()=>{
 const {c,clock}=setup(),q=content.questions[content.lessons[0].questionIds[0]];
 c.state.responses=[{id:'old',questionId:q.id,version:q.version,selected:q.answer,correct:false,uncertain:false,answeredAt:clock.wall-8*86400000,mode:'lesson'},{id:'new',questionId:q.id,version:q.version,selected:q.answer,correct:true,uncertain:true,answeredAt:clock.wall,mode:'review'}];
 c.tab('records');a.match(strings(get(c,'confirmation-stats')),/첫 풀이 정답률 0%/);a.match(strings(get(c,'confirmation-stats')),/최근 풀이 정답률 100%/);a.match(strings(view(c)),/표본이 적어 참고용/);
 a.equal(flat(view(c)).filter(n=>n.key?.startsWith('activity-')).length,7);await click(c,'weak-topic-'+content.lessons[0].id);a.equal(c.route.name,'practiceSetup');a.match(strings(view(c)),/1개 주제 선택/);a.equal(get(c,'practice-setup-start').disabled,false);
});

test('records show at most three unique saved review sessions with immutable outcomes and replay their actual questions',async()=>{
 const {c,clock}=setup(),ids=content.lessons[1].questionIds;await c.beginPractice([content.lessons[0].questionIds[0]]);let q=c.getQuestion(c.state.practice.questionIds[0]);await c.selectPractice(q.answer);await c.answerPractice();await c.nextPractice();c.tab('records');
 a.equal(get(c,'recent-review-empty').text,'완료한 복습 기록이 없어요.');const completed=[];
 for(let i=0;i<4;i++){clock.wall+=86400000;await c.beginPractice(ids,'review');for(const id of ids){q=c.getQuestion(id);await c.selectPractice(i===3&&id===ids[1]?q.options.find(o=>o.id!==q.answer).id:q.answer);if(i===3&&id===ids[0])await c.uncertain();await c.answerPractice();await c.nextPractice();}completed.push(structuredClone(c.practiceResult()));}
 c.tab('records');const expected=completed.slice(1).reverse(),before=JSON.stringify(c.state);
 a.deepEqual(flat(view(c)).filter(n=>n.testId?.startsWith('recent-review-result-')).map(n=>n.testId),expected.map(result=>'recent-review-result-'+result.id));view(c);a.equal(JSON.stringify(c.state),before);
 const recent=expected[0],record=strings(get(c,'recent-review-result-'+recent.id));a.ok(record.includes(d.dayKey(recent.completedAt)));a.match(record,/정답 1\/2문항/);a.match(record,/확신 부족 1문항/);
 const responses=JSON.stringify(c.state.responses),history=JSON.stringify(c.state.practiceResults);await click(c,'recent-review-replay-'+recent.id);a.equal(c.route.name,'practice');a.equal(c.state.practice.mode,'review');a.deepEqual(c.state.practice.questionIds,recent.questionIds);a.equal(JSON.stringify(c.state.responses),responses);a.equal(JSON.stringify(c.state.practiceResults),history);
 c.tab('records');c.state.practiceResults.push(structuredClone(recent));a.equal(flat(view(c)).filter(n=>n.testId==='recent-review-result-'+recent.id).length,1);a.equal(JSON.stringify(content),contentBefore);
});

test('recent review replay rejects inaccessible unsubmitted mock questions without exposing answers or creating a result',async()=>{
 const {c,clock}=setup(),id=content.exams[19].questionIds[0];c.state.practiceResults=[{id:'legacy-review',mode:'review',questionIds:[id],lessonIds:content.questions[id].lessonIds,total:1,correct:0,uncertain:0,wrongQuestionIds:[id],uncertainQuestionIds:[],completedAt:clock.wall}];
 c.tab('records');const history=JSON.stringify(c.state.practiceResults);await click(c,'recent-review-replay-legacy-review');a.equal(c.route.name,'stats');a.equal(c.state.practice,null);a.equal(JSON.stringify(c.state.practiceResults),history);a.equal(c.state.lastPracticeResultId,null);
 a.equal(strings(view(c)).includes(content.questions[id].stem),false);a.equal(strings(view(c)).includes(content.questions[id].explanation),false);
});

test('new learning routes are read-only when rendered and settings expose the named reminder entry',async()=>{
 const {c,services}=setup();for(const name of ['home','catalog','practiceSetup','practiceResult','exams','stats']){c.route={name};const state=JSON.stringify(c.state),snapshot=c.getSnapshot();view(c);view(c);a.equal(JSON.stringify(c.state),state,name);a.equal(c.getSnapshot(),snapshot,name);}
 a.equal(await services.repository.load(),null);c.navigate({name:'settings'});a.equal(get(c,'learning-reminder').icon,'bell');await click(c,'learning-reminder');a.equal(c.route.name,'reminderSettings');a.equal(JSON.stringify(content),contentBefore);
});

test('learning resets clear the old practice setup choices without affecting free exam access',async()=>{
 for(const full of [false,true]){
  const {c}=setup();c.openPracticeSetup();await click(c,'practice-source-submitted-exams');await click(c,'practice-filter-wrong');await click(c,'practice-count-20');
  if(full)c.requestReset();else c.requestLearningReset();await c.acceptDialog();c.state.onboarded=true;c.openPracticeSetup();
  a.equal(get(c,'practice-source-all').selected,true);a.equal(get(c,'practice-filter-all').selected,true);a.equal(get(c,'practice-count-10').selected,true);
  a.equal(get(c,'practice-setup-start').disabled,false);a.equal(c.hasAccess('SQLD-M20'),true);
 }
});
