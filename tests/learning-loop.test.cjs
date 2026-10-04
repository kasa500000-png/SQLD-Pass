'use strict';
const {test}=require('node:test'),a=require('node:assert/strict');
const {Controller}=require('../.build/core/controller');
const {MonetizedController}=require('../.build/monetization/controller');
const {initialState,parseState,applyPractice,startExam,submitExam,dayKey,addDays,lessonProgress,learningDayEligible,planCompletedDays,homeRecommendation,shortSession,practiceQuestionIds,topicPracticeOptions,learningStats,reviewAfter}=require('../.build/core/domain');
const content=require('../generated/content.json'),lesson=content.lessons[0];
const now=new Date(2026,9,4,12).getTime();
function harness(ControllerType=Controller){
  let value=null,failSave=false,failClear=false,n=0,clears=0,saves=0;
  const clock={wall:now,mono:100,runtimeId:'learning-test'};
  const services={repository:{load:async()=>structuredClone(value),save:async s=>{saves++;if(failSave)throw Error('disk');value=structuredClone(s);},clear:async()=>{clears++;if(failClear)throw Error('clear');value=null;}},clock:()=>({...clock}),uuid:()=>`learn-${++n}`,platform:'web',share:async()=>'cancelled',openURL:async()=>{}};
  const c=new ControllerType(content,services);c.ready=true;c.state.onboarded=true;c.route={name:'home'};
  return {c,services,clock,failSave(v){failSave=v;},failClear(v){failClear=v;},get value(){return value;},get clears(){return clears;},get saves(){return saves;}};
}
function answer(s,id,key='A',options={}){const q=content.questions[id];return applyPractice(s,q,key==='correct'?q.answer:key,!!options.uncertain,options.time??now,options.id??`saved-${s.responses.length}`,options.mode??'lesson',options.planDay);}
function allConfirmations(s){for(const l of content.lessons)for(const id of l.questionIds)s=answer(s,id,'correct');return s;}
function submitted(s,index=0,time=now){let e=startExam(s,content.exams[index],content,{wall:time,mono:100,runtimeId:'learning-test'},`exam-${index}-${s.exams.length}`);e.answers=Object.fromEntries(e.snapshots.map(q=>[q.id,q.answer]));return submitExam(e,{wall:time+1000,mono:1100,runtimeId:'learning-test'},'manual');}
async function solve(c,wrong=new Set(),uncertain=new Set()){while(c.state.practice){const p=c.state.practice,q=c.getQuestion(p.questionIds[p.index]);if(!p.submitted){await c.selectPractice(wrong.has(q.id)?q.options.find(o=>o.id!==q.answer).id:q.answer);if(uncertain.has(q.id))await c.uncertain();await c.answerPractice();}await c.nextPractice();}}

test('legacy migration preserves recorded days, answers, snapshots and wallet while repeated review needs fresh evidence',()=>{
  let s=allConfirmations(initialState(content,now));s.onboarded=true;s.completedDays=Array.from({length:30},(_,i)=>i+1);s.exams=[submitted(s)];s.monetization={marker:'preserve'};
  delete s.planProgress;delete s.practiceResults;delete s.lastPracticeResultId;
  const restored=parseState(structuredClone(s),content),reviewDays=[23,24,26,28,30];
  a.deepEqual(restored.completedDays,s.completedDays);a.deepEqual(restored.planProgress.legacyCompletedDays,s.completedDays);a.deepEqual(restored.responses,s.responses);a.deepEqual(restored.exams,s.exams);a.deepEqual(restored.monetization,s.monetization);a.deepEqual(restored.readLessons,[]);
  a.ok(reviewDays.every(day=>!planCompletedDays(restored,content).includes(day)));a.ok(planCompletedDays(restored,content).includes(1));a.ok(planCompletedDays(restored,content).includes(22));
});

test('read alone does not finish confirmation; all day answers advance without fabricating a read',async()=>{
  const {c}=harness();await c.markLesson(lesson.id);a.equal(lessonProgress(c.state,content,lesson.id).confirmationComplete,false);a.equal(learningDayEligible(c.state,content,1),false);
  c.state.readLessons=[];const day=content.days[0];for(const id of day.lessonIds){await c.beginLessonPractice(id);await solve(c);}
  a.equal(c.currentDay().day,2);a.ok(c.state.planProgress.completedDays.includes(1));a.deepEqual(c.state.readLessons,[]);a.equal(lessonProgress(c.state,content,lesson.id).confirmationComplete,true);
});

test('ordinary review cannot complete a repeated plan day; a bound session does and does not complete another day',async()=>{
  const {c}=harness();c.state=allConfirmations(c.state);const day=content.days.find(d=>d.day===23),ids=day.lessonIds.flatMap(id=>content.lessons.find(l=>l.id===id).questionIds);
  await c.beginPractice(ids,'review');await solve(c);a.equal(learningDayEligible(c.state,content,23),false);
  await c.beginPlanPractice(23);a.equal(c.state.practice.planDay,23);await solve(c);
  a.equal(learningDayEligible(c.state,content,23),true);a.ok(c.state.planProgress.completedDays.includes(23));a.equal(learningDayEligible(c.state,content,24),false);
  const foreign=content.lessons.find(l=>!day.lessonIds.includes(l.id)).questionIds[0];await c.beginPractice([foreign],'review',{planDay:23});a.equal(c.state.practice,null);a.match(c.notice,/복습일/);
});

test('final summary save failure retains the last submitted question and retry/restart preserves one result',async()=>{
  const h=harness(),ids=lesson.questionIds;await h.c.beginPractice(ids);const session=h.c.state.practice.id;
  const q0=content.questions[ids[0]];await h.c.selectPractice(q0.options.find(o=>o.id!==q0.answer).id);await h.c.uncertain();await h.c.answerPractice();await h.c.nextPractice();
  const q1=content.questions[ids[1]];await h.c.selectPractice(q1.answer);await h.c.uncertain();await Promise.all([h.c.answerPractice(),h.c.answerPractice()]);a.equal(h.c.state.responses.length,2);a.equal(h.c.state.practice.sessionAnswered,2);
  h.failSave(true);await h.c.nextPractice();a.equal(h.c.state.practice.id,session);a.equal(h.c.state.practice.submitted,true);a.equal(h.c.state.lastPracticeResultId,null);a.equal(h.c.route.name,'practice');
  h.failSave(false);await Promise.all([h.c.nextPractice(),h.c.nextPractice()]);a.equal(h.c.state.practice,null);a.equal(h.c.state.practiceResults.length,1);a.equal(h.c.state.responses.length,2);
  const result=h.c.practiceResult();a.equal(result.total,2);a.equal(result.correct,1);a.equal(result.uncertain,2);a.deepEqual(result.wrongQuestionIds,[ids[0]]);a.deepEqual(result.uncertainQuestionIds,ids);a.equal(h.c.route.name,'practiceResult');
  const restarted=new Controller(content,h.services);await restarted.initialize();a.equal(restarted.route.name,'practiceResult');a.deepEqual(restarted.practiceResult(),result);
  h.failSave(true);await h.c.returnPracticeHome();a.equal(h.c.route.name,'practiceResult');a.equal(h.c.state.lastPracticeResultId,session);h.failSave(false);await h.c.returnPracticeHome();a.equal(h.c.route.name,'home');a.equal(h.c.state.lastPracticeResultId,null);a.equal(h.c.state.practiceResults.length,1);
});

test('rapid next and late selection cannot skip a question or change a different index',async()=>{
  const {c}=harness(),ids=content.lessons.slice(0,2).flatMap(l=>l.questionIds);await c.beginPractice(ids);await c.selectPractice(content.questions[ids[0]].answer);await c.answerPractice();
  await Promise.all([c.nextPractice(),c.nextPractice(),c.selectPractice('B'),c.answerPractice()]);a.equal(c.state.practice.index,1);a.equal(c.state.practice.selected,null);a.equal(c.state.practice.submitted,false);a.equal(c.state.responses.length,1);
});

test('explicit lesson finish does not open questions after failed read save and keeps standalone question start unread',async()=>{
  const h=harness();h.c.route={name:'lesson',id:lesson.id};h.failSave(true);await h.c.finishLesson(lesson.id);a.equal(h.c.route.name,'lesson');a.equal(h.c.state.practice,null);a.deepEqual(h.c.state.readLessons,[]);
  h.failSave(false);await h.c.finishLesson(lesson.id);a.equal(h.c.route.name,'practice');a.deepEqual(h.c.state.readLessons,[lesson.id]);
  const h2=harness();await h2.c.beginLessonPractice(lesson.id);a.deepEqual(h2.c.state.readLessons,[]);
});

test('related review includes each wrong/uncertain question once; next concept is a saved result action',async()=>{
  const h=harness(),ids=lesson.questionIds;await h.c.beginLessonPractice(lesson.id);await solve(h.c,new Set([ids[0]]),new Set(ids));await h.c.beginRelatedReview();a.deepEqual(h.c.state.practice.questionIds,ids);a.equal(h.c.state.practice.mode,'review');
  await solve(h.c);h.failSave(true);await h.c.openNextConcept(lesson.id);a.equal(h.c.route.name,'practiceResult');h.failSave(false);await h.c.openNextConcept(lesson.id);a.equal(h.c.route.name,'lesson');a.equal(h.c.route.id,content.lessons[1].id);a.equal(h.c.state.lastPracticeResultId,null);
});

test('damaged persisted summaries fail closed without erasing repository values',async()=>{
  const h=harness();await h.c.beginLessonPractice(lesson.id);await solve(h.c);const valid=structuredClone(h.value);
  for(const mutation of [s=>s.practiceResults[0].correct=99,s=>s.practiceResults[0].questionIds.push(s.practiceResults[0].questionIds[0]),s=>s.lastPracticeResultId='missing',s=>s.planProgress.completedDays=[1,1]]){const bad=structuredClone(valid);mutation(bad);a.throws(()=>parseState(bad,content));}
  a.deepEqual(h.value,valid);
});

test('full reset notification hook failure preserves learning; learning-only reset preserves reminder configuration',async()=>{
  const h=harness(MonetizedController);await h.c.markLesson(lesson.id);let hook=0;h.services.beforeFullReset=async()=>{hook++;return false;};h.c.requestReset();await h.c.acceptDialog();a.equal(h.clears,0);a.deepEqual(h.c.state.readLessons,[lesson.id]);a.match(h.c.notice,/알림/);
  h.c.requestLearningReset();await h.c.acceptDialog();a.equal(hook,1);a.deepEqual(h.c.state.readLessons,[]);
  const h2=harness();await h2.c.markLesson(lesson.id);h2.services.beforeFullReset=async()=>true;h2.failClear(true);h2.c.requestReset();await h2.c.acceptDialog();a.deepEqual(h2.c.state.readLessons,[lesson.id]);a.match(h2.c.notice,/알림은 해제.*기록은 유지/);
});

test('home priority protects active exam and saved practice before due review and valid reading restoration',()=>{
  let s=initialState(content,now);const l=content.lessons[4];s.reading={lastLessonId:l.id,positions:{[l.id]:{offset:100,contentHeight:1000,lessonVersion:l.version}}};a.equal(homeRecommendation(s,content,now).lessonId,l.id);
  s.reading.positions[l.id].lessonVersion='obsolete';a.equal(homeRecommendation(s,content,now).lessonId,lesson.id);
  const id=lesson.questionIds[0];s.reviews[id]={questionId:id,dueDay:dayKey(now),step:0,lastAnsweredDay:'',lastCorrect:false};a.equal(homeRecommendation(s,content,now).kind,'review');
  s.practice={id:'saved',questionIds:[id],index:0,selected:null,uncertain:false,submitted:false,mode:'lesson',sessionAnswered:0,sessionCorrect:0};a.equal(homeRecommendation(s,content,now).kind,'practice');
  s.exams=[startExam(s,content.exams[0],content,{wall:now,mono:100,runtimeId:'learning-test'},'active')];a.equal(homeRecommendation(s,content,now).kind,'exam');
});

test('home resumes valid unfinished reading ahead of due work while short sessions retain their actual goal budget',()=>{
  let s=initialState(content,now),long=content.lessons[58],qid=lesson.questionIds[0];s.settings.minutes=15;
  s.reading={lastLessonId:long.id,positions:{[long.id]:{offset:800,contentHeight:2000,lessonVersion:long.version}}};s.reviews[qid]={questionId:qid,dueDay:dayKey(now),step:0,lastAnsweredDay:'',lastCorrect:false};
  let choice=homeRecommendation(s,content,now);a.equal(choice.kind,'concept');a.equal(choice.lessonId,long.id);a.equal(choice.resumeReading,true);
  const short=shortSession(s,content,now);a.equal(short.kind,'review');a.ok(short.estimatedMinutes<=15);a.deepEqual(short.questionIds,[qid]);
  const practice={id:'stopped',questionIds:[qid],index:0,selected:null,uncertain:false,submitted:false,mode:'lesson',sessionAnswered:0,sessionCorrect:0};s.practice=practice;a.equal(homeRecommendation(s,content,now).kind,'practice');
  s.exams=[startExam(s,content.exams[0],content,{wall:now,mono:100,runtimeId:'learning-test'},'active-reading')];a.equal(homeRecommendation(s,content,now).kind,'exam');
  s.practice=null;s.exams=[];
  for(const position of [{offset:800,contentHeight:2000,lessonVersion:'old'},{offset:-1,contentHeight:2000,lessonVersion:long.version},{offset:800,contentHeight:0,lessonVersion:long.version}]){s.reading.positions[long.id]=position;choice=homeRecommendation(s,content,now);a.equal(choice.kind,'review');a.equal(choice.resumeReading,undefined);}
  s.reading.positions[long.id]={offset:800,contentHeight:2000,lessonVersion:long.version};s.readLessons=[long.id];a.equal(homeRecommendation(s,content,now).kind,'review');
  s.readLessons=[];for(const id of long.questionIds)s=answer(s,id,'correct');choice=homeRecommendation(s,content,now);a.equal(choice.kind,'review');a.equal(choice.resumeReading,undefined);
});

test('saved review intervals progress through 1/3/7/14 days and uncertainty resets the next date',()=>{
  const qid=lesson.questionIds[0];let time=now,item=reviewAfter(undefined,qid,false,false,time);a.equal(item.dueDay,addDays(dayKey(time),1));a.equal(item.step,0);
  for(const [step,interval] of [[1,3],[2,7],[3,14]]){time=new Date(`${item.dueDay}T12:00:00`).getTime();item=reviewAfter(item,qid,true,false,time);a.equal(item.step,step);a.equal(item.dueDay,addDays(dayKey(time),interval));}
  const repeated=reviewAfter(item,qid,true,false,time);a.equal(repeated.step,3);a.equal(repeated.dueDay,item.dueDay);
  const uncertain=reviewAfter(item,qid,true,true,time);a.equal(uncertain.step,0);a.equal(uncertain.dueDay,addDays(dayKey(time),1));
  const wrong=reviewAfter(item,qid,false,false,time);a.equal(wrong.step,0);a.equal(wrong.dueDay,addDays(dayKey(time),1));
});

test('short sessions use actual concept minutes and bounded due review for each existing goal',()=>{
  for(const minutes of [15,30,45,60,90]){let s=initialState(content,now);s.settings.minutes=minutes;let choice=shortSession(s,content,now);a.equal(choice.kind,'concept');const l=content.lessons.find(l=>l.id===choice.lessonId);a.equal(choice.estimatedMinutes,l.minutes+l.questionIds.length*2);a.ok(choice.estimatedMinutes<=minutes);
    for(const id of content.lessons.slice(0,10).flatMap(l=>l.questionIds))s.reviews[id]={questionId:id,dueDay:dayKey(now),step:0,lastAnsweredDay:'',lastCorrect:false};choice=shortSession(s,content,now);a.equal(choice.kind,'review');a.ok(choice.questionIds.length<=10);a.ok(choice.estimatedMinutes<=minutes);
  }
});

test('short sessions choose a lesson that fits and skip already recorded reading',async()=>{
  const h=harness(),long=content.lessons[58];h.c.state.reading={lastLessonId:long.id,positions:{[long.id]:{offset:100,contentHeight:1000,lessonVersion:long.version}}};h.c.state.settings.minutes=15;
  a.equal(shortSession(h.c.state,content,now).lessonId,lesson.id);h.c.state.settings.minutes=30;a.equal(shortSession(h.c.state,content,now).lessonId,long.id);
  h.c.state.readLessons=[lesson.id];h.c.state.settings.minutes=15;const choice=shortSession(h.c.state,content,now);a.equal(choice.lessonId,lesson.id);a.equal(choice.estimatedMinutes,lesson.questionIds.length*2);await h.c.beginShortSession();a.equal(h.c.route.name,'practice');a.deepEqual(h.c.state.practice.questionIds,lesson.questionIds);
});

test('late finish and question start queued behind a delayed full reset cannot recreate learning records',async()=>{
  const h=harness();let release,entered;const enteredClear=new Promise(resolve=>entered=resolve),continueClear=new Promise(resolve=>release=resolve);
  h.services.repository.clear=async()=>{entered();await continueClear;};h.c.requestReset();const reset=h.c.acceptDialog();await enteredClear;
  const finish=h.c.finishLesson(lesson.id),start=h.c.beginLessonPractice(lesson.id);release();await Promise.all([reset,finish,start]);a.equal(h.c.state.onboarded,false);a.deepEqual(h.c.state.readLessons,[]);a.equal(h.c.state.practice,null);a.equal(h.c.route.name,'welcome');
});

test('result navigation queued behind full reset cannot leave onboarding or revive a stale lesson route',async()=>{
  for(const action of ['openNextConcept','returnPracticeHome','returnPracticeExams']){
    const h=harness();await h.c.beginLessonPractice(lesson.id);await solve(h.c);let release,entered;const clearStarted=new Promise(r=>entered=r),continueClear=new Promise(r=>release=r);
    h.services.repository.clear=async()=>{entered();await continueClear;};h.c.requestReset();const reset=h.c.acceptDialog();await clearStarted;
    const navigation=h.c[action](lesson.id);release();await Promise.all([reset,navigation]);a.equal(h.c.state.onboarded,false,action);a.equal(h.c.route.name,'welcome',action);a.equal(h.c.state.practice,null);a.equal(h.c.state.lastPracticeResultId,null);
  }
});

test('last result can open exams only after its pointer is saved; restart and failed save preserve the right screen',async()=>{
  const h=harness();h.c.state=allConfirmations(h.c.state);await h.c.beginLessonPractice(content.lessons[59].id);await solve(h.c);const result=structuredClone(h.c.practiceResult());a.equal(h.c.nextConcept(),undefined);
  h.failSave(true);await h.c.returnPracticeExams();a.equal(h.c.route.name,'practiceResult');a.equal(h.c.state.lastPracticeResultId,result.id);a.deepEqual(h.c.practiceResult(),result);
  h.failSave(false);await h.c.returnPracticeExams();a.equal(h.c.route.name,'exams');a.equal(h.c.state.lastPracticeResultId,null);a.deepEqual(h.c.state.practiceResults.at(-1),result);
  const restarted=new Controller(content,h.services);await restarted.initialize();a.equal(restarted.route.name,'home');a.equal(restarted.state.lastPracticeResultId,null);a.deepEqual(restarted.state.practiceResults.at(-1),result);
});

test('practice sources include all confirmation and only submitted immutable mock snapshots with topic/filter/count limits',()=>{
  let s=initialState(content,now);a.equal(practiceQuestionIds(s,content).length,120);a.equal(practiceQuestionIds(s,content,{source:'submitted-exams'}).length,0);
  s.exams=[startExam(s,content.exams[0],content,{wall:now,mono:100,runtimeId:'learning-test'},'active')];a.equal(practiceQuestionIds(s,content).length,120);s.exams=[submitted(initialState(content,now))];a.equal(practiceQuestionIds(s,content).length,170);
  const topics=topicPracticeOptions(s,content);a.equal(topics.length,60);a.ok(topics.every(t=>t.confirmation===2));const own=practiceQuestionIds(s,content,{lessonIds:[lesson.id]});a.ok(own.every(id=>(s.exams[0].snapshots.find(q=>q.id===id)||content.questions[id]).lessonIds.includes(lesson.id)));
  const id=lesson.questionIds[0];s=answer(s,id,content.questions[id].options.find(o=>o.id!==content.questions[id].answer).id,{uncertain:true});a.deepEqual(practiceQuestionIds(s,content,{source:'confirmation',filter:'wrong'}),[id]);a.deepEqual(practiceQuestionIds(s,content,{filter:'uncertain'}),[id]);a.equal(practiceQuestionIds(s,content,{filter:'unanswered'}).length,119);a.equal(practiceQuestionIds(s,content,{limit:5}).length,5);
});

test('first and recent accuracy use saved correctness; seven day activity and sparse weak topics have explicit meaning',()=>{
  let s=initialState(content,now),id=lesson.questionIds[0],wrong=content.questions[id].options.find(o=>o.id!==content.questions[id].answer).id;
  s=answer(s,id,wrong,{time:now-8*86400000});s=answer(s,id,'correct',{mode:'review',time:now-86400000,uncertain:true});s=answer(s,lesson.questionIds[1],'correct',{time:now});s.studyDays.push(addDays(dayKey(now),-2));
  const changed=structuredClone(content);changed.questions[id].answer=wrong;const stats=learningStats(s,changed,now);a.equal(stats.firstAccuracy.percent,50);a.equal(stats.recentAccuracy.percent,100);a.equal(stats.recentAccuracy.confidentPercent,50);a.equal(stats.recent7.answered,2);a.equal(stats.recent7.activeDays,3);a.equal(stats.streak,3);
  const topic=stats.weakTopics.find(t=>t.lessonId===lesson.id);a.equal(topic.sampleEnough,false);a.equal(topic.first.percent,50);a.equal(topic.recent.percent,100);
});

test('exam progress filters isolate list position and preserve rewarded availability filtering',()=>{
  const {c}=harness();c.expanded.add('exams:available');c.rememberExamCatalog(c.examCatalogContext(),{offset:500,contentHeight:2000});a.equal(c.examCatalogPosition().offset,500);c.setExamProgressFilter('completed');a.equal(c.examCatalogPosition(),undefined);a.equal(c.expanded.has('exams:available'),true);c.rememberExamCatalog(c.examCatalogContext(),{offset:300,contentHeight:2000});c.setExamProgressFilter('unattempted');a.equal(c.examCatalogPosition(),undefined);
});
