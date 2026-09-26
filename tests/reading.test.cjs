'use strict';
const {test}=require('node:test'),a=require('node:assert/strict');
const {Controller}=require('../.build/core/controller');
const {MonetizedController}=require('../.build/monetization/controller');
const {initialState,parseState,startExam}=require('../.build/core/domain');
const {restoredReadingOffset}=require('../.build/core/domain/reading');
const {migrateWallet}=require('../.build/monetization/policy');
const content=require('../generated/content.json'),lesson=content.lessons[0];

function harness(){
  let value=null,fail=false,n=0;
  const clock={wall:Date.now(),mono:100,runtimeId:'reading-test'};
  const services={repository:{load:async()=>structuredClone(value),save:async state=>{if(fail)throw Error('disk');value=structuredClone(state);},clear:async()=>{value=null;}},clock:()=>({...clock}),uuid:()=>`reading-${++n}`,platform:'web',share:async()=>'cancelled',openURL:async()=>{}};
  const c=new MonetizedController(content,services);c.ready=true;c.state.onboarded=true;
  return {c,services,clock,fail(v){fail=v;}};
}

test('old saved state gains optional reading history without losing exam snapshots or grants',()=>{
  let state=initialState(content);state.onboarded=true;
  state.exams=[startExam(state,content.exams[4],content,{wall:1,mono:1,runtimeId:'old'},'old-exam')];
  state=migrateWallet(state);
  const restored=parseState(JSON.parse(JSON.stringify(state)),content);
  a.deepEqual(restored.reading,{lastLessonId:null,positions:{}});
  a.deepEqual(restored.exams,state.exams);a.deepEqual(restored.monetization,state.monetization);
});

test('damaged or outdated optional positions never block recovery of learning records',()=>{
  const state=initialState(content);state.readLessons=[lesson.id];
  for(const position of [null,{},'bad',{offset:-1,contentHeight:100},{offset:200,contentHeight:100},{offset:NaN,contentHeight:100},{offset:30,contentHeight:0},{offset:30,contentHeight:100,lessonVersion:'old'}]){
    const restored=parseState({...state,reading:{lastLessonId:lesson.id,positions:{[lesson.id]:position}}},content);
    a.deepEqual(restored.reading,{lastLessonId:null,positions:{}});a.deepEqual(restored.readLessons,[lesson.id]);
  }
  const valid={offset:30,contentHeight:100,lessonVersion:lesson.version};
  const restored=parseState({...state,contentVersion:'old-pack',reading:{lastLessonId:lesson.id,positions:{[lesson.id]:valid}}},content);
  a.deepEqual(restored.reading.positions,{});
});

test('saved reading survives restart without marking theory or the day complete',async()=>{
  const {c,services}=harness();
  a.equal(await c.rememberReading(lesson.id,{offset:900,contentHeight:3000}),true);
  const restarted=new Controller(content,services);await restarted.initialize();
  a.equal(restarted.ready,true);a.equal(restarted.lastReadingLesson().id,lesson.id);
  a.deepEqual(restarted.readingPosition(lesson.id),{offset:900,contentHeight:3000,lessonVersion:lesson.version});
  a.deepEqual(restarted.state.readLessons,[]);a.deepEqual(restarted.state.studyDays,[]);a.deepEqual(restarted.state.completedDays,[]);
});

test('position saves stay ordered with learning writes and duplicate positions do not write again',async()=>{
  const {c}=harness();const second=content.lessons[1];
  await Promise.all([c.rememberReading(lesson.id,{offset:200,contentHeight:3000}),c.markLesson(second.id),c.rememberReading(lesson.id,{offset:850,contentHeight:3000})]);
  a.equal(c.state.revision,3);a.deepEqual(c.state.readLessons,[second.id]);a.equal(c.readingPosition(lesson.id).offset,850);
  await c.rememberReading(lesson.id,{offset:850,contentHeight:3000});a.equal(c.state.revision,3);
  a.equal(await c.rememberReading('unknown',{offset:0,contentHeight:3000}),false);
});

test('failed position save retains the previous bookmark and can be retried',async()=>{
  const h=harness();await h.c.rememberReading(lesson.id,{offset:200,contentHeight:3000});h.fail(true);
  a.equal(await h.c.rememberReading(lesson.id,{offset:800,contentHeight:3000}),false);
  a.equal(h.c.readingPosition(lesson.id).offset,200);a.match(h.c.notice,/저장\/처리 실패/);
  h.fail(false);a.equal(await h.c.rememberReading(lesson.id,{offset:800,contentHeight:3000}),true);
  a.equal(h.c.readingPosition(lesson.id).offset,800);
});

test('learning reset removes reading positions and a late scroll save cannot recreate them',async()=>{
  const {c,clock}=harness();
  c.state.exams=[startExam(c.state,content.exams[4],content,clock,'legacy-exam')];c.state=migrateWallet(c.state);
  await c.rememberReading(lesson.id,{offset:700,contentHeight:3000});
  c.requestLearningReset();await c.acceptDialog();await c.rememberReading(lesson.id,{offset:900,contentHeight:3000});
  a.equal(c.state.reading,undefined);a.equal(c.state.onboarded,false);a.equal(c.hasAccess('SQLD-M05'),true);
});

test('completing the most recent theory stops home from prioritizing it as unfinished',async()=>{
  const {c}=harness();await c.rememberReading(lesson.id,{offset:700,contentHeight:3000});
  a.equal(c.lastReadingLesson().id,lesson.id);await c.markLesson(lesson.id);
  a.equal(c.lastReadingLesson(),undefined);a.equal(c.readingPosition(lesson.id).offset,700);
});

test('restoration preserves a stable offset, scales reflowed text and clamps short screens',()=>{
  const saved={offset:900,contentHeight:3000};
  a.equal(restoredReadingOffset(saved,3000,600),900);
  a.equal(restoredReadingOffset(saved,4500,600),1350);
  a.equal(restoredReadingOffset({offset:2800,contentHeight:3000},3000,600),2400);
  a.equal(restoredReadingOffset(saved,400,600),0);
  a.equal(restoredReadingOffset(undefined,3000,600),0);
});
