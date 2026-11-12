const test=require('node:test'),a=require('node:assert/strict');
const old=require('./fixtures/mock60.cjs')(),c=require('./fixtures/mock40.cjs')();
const d=require('../.build/core/domain'),p=require('../.build/monetization/policy');
const {MonetizedController}=require('../.build/monetization/controller');
const clock={wall:10000,mono:10000,runtimeId:'mock40'};
function baseline(){
 const s=d.initialState(old);s.onboarded=true;
 const retired=d.submitExam(d.startExam(s,old.exams[4],old,clock,'retired'),clock,'manual');
 const kept=d.pauseExam(d.startExam(s,old.exams[30],old,clock,'retained'),{...clock,wall:12000,mono:12000});
 kept.answers[kept.snapshots[3].id]='2';kept.index=3;kept.flagged=[kept.snapshots[3].id];s.exams=[retired,kept];
 const r=retired.snapshots[0].id,k=kept.snapshots[0].id;
 s.mockStudy={bookmarks:[r,k],notes:{[r]:'remove',[k]:'retain'},mastered:{[r]:true,[k]:false}};
 s.collections=[{id:'collection',name:'시험',updatedAt:10,items:[{kind:'examReview',attemptId:retired.id,questionId:r},{kind:'examReview',attemptId:kept.id,questionId:k},{kind:'lesson',id:c.lessons[0].id}]}];
 s.readLessons=[c.lessons[0].id];s.reading={lastLessonId:c.lessons[0].id,positions:{[c.lessons[0].id]:{lessonVersion:c.lessons[0].version,offset:77,contentHeight:1000}}};
 s.monetization={version:1,grants:Object.fromEntries(['SQLD-M05','SQLD-M21','SQLD-M31'].map((id,i)=>[id,{examId:id,requestId:'r'+i,source:'reward',mode:'live',grantedAt:1}])),pending:{examId:'SQLD-M06',requestId:'pending-old',mode:'live',createdAt:10}};
 return s;
}
test('40-exam migration removes original volume only, preserves retained snapshots and is idempotent',()=>{
 const raw=baseline(),before=structuredClone(raw),s=d.parseState(raw,c);
 a.deepEqual(raw,before);a.equal(s.exams.length,1);a.deepEqual(s.exams[0],raw.exams[1]);
 a.deepEqual(s.mockStudy,{bookmarks:[raw.exams[1].snapshots[0].id],notes:{[raw.exams[1].snapshots[0].id]:'retain'},mastered:{[raw.exams[1].snapshots[0].id]:false}});
 a.deepEqual(s.collections[0].items,raw.collections[0].items.slice(1));a.deepEqual(s.reading,raw.reading);a.deepEqual(s.settings,raw.settings);a.deepEqual(s.readLessons,raw.readLessons);
 a.equal(s.monetization.grants['SQLD-M05'],undefined);a.deepEqual(s.monetization.grants['SQLD-M31'],raw.monetization.grants['SQLD-M31']);a.equal(s.monetization.pending,null);
 a.equal(s.mockCatalogMigration.noticePending,true);a.deepEqual(d.parseState(s,c),s);
});
test('retired active mocks and mixed review sessions are removed without rewriting retained responses',()=>{
 const raw=baseline();raw.exams=[d.startExam({...raw,exams:[]},old.exams[0],old,clock,'active-old')];const r=raw.exams[0].snapshots[0].id,k=old.exams[30].questionIds[0];
 raw.practice={id:'mixed',questionIds:[r,k],index:0,selected:'2',submitted:false,uncertain:false,mode:'review',sessionAnswered:0,sessionCorrect:0};
 raw.responses=[{id:'old',questionId:r,selected:'2'},{id:'keep',questionId:k,selected:'1'}];raw.reviews={[r]:{questionId:r},[k]:{questionId:k}};
 raw.practiceResults=[{id:'old-result',questionIds:[r,k]}];raw.lastPracticeResultId='old-result';
 const next=d.parseState(raw,c);a.equal(next.exams.length,0);a.equal(next.practice,null);a.deepEqual(next.practiceResults,[]);a.equal(next.lastPracticeResultId,null);a.deepEqual(next.responses,[raw.responses[1]]);a.deepEqual(next.reviews,{[k]:raw.reviews[k]});
});
test('both older textbook versions upgrade directly and preserve general practice',()=>{
 for(const version of ['textbook.20261109.1','textbook.20261109.2']){const raw=baseline();raw.contentVersion=version;raw.exams=[raw.exams[0]];raw.mockStudy=undefined;const id=Object.values(c.questions).find(q=>!q.examId).id;raw.practice={id:'general',questionIds:[id],index:0,selected:'2',submitted:false,uncertain:false,mode:'lesson',sessionAnswered:0,sessionCorrect:0};const next=d.parseState(raw,c);a.deepEqual(next.practice,raw.practice);a.equal(next.contentVersion,c.manifest.version);}
});
test('exact ten free exams need no ads; paid grants stay bound to retained identities',()=>{
 const s=d.parseState(baseline(),c);
 a.deepEqual(c.exams.filter(e=>p.isFreeExam(e.id,c)).map(e=>e.id),c.mockPack.freeExamIds);
 for(const id of c.mockPack.freeExamIds){a.equal(p.canAccessExam(s,id,'off',c),true);a.throws(()=>p.prepareReward(s,{examId:id,requestId:'x',mode:'test',createdAt:1},c),/대상/);}
 for(const id of ['SQLD-M01','SQLD-M05','SQLD-M20'])a.equal(p.canAccessExam(s,id,'live',c),false);
 a.equal(p.canAccessExam(s,'SQLD-M31','live',c),true);a.equal(p.canAccessExam(s,'SQLD-M26','live',c),false);
});
test('earned boundary exams26/40/46/60 remain idempotent, mode-bound and durable',()=>{
 for(const examId of ['SQLD-M26','SQLD-M40','SQLD-M46','SQLD-M60']){
 const request={examId,requestId:'r-'+examId,mode:'test',createdAt:1},s=p.prepareReward(d.initialState(c),request,c),earned=p.earnReward(s,request,2,c);
 a.equal(p.canAccessExam(s,examId,'test',c),false);a.equal(p.canAccessExam(earned,examId,'test',c),true);a.equal(p.canAccessExam(earned,examId,'live',c),false);a.deepEqual(p.earnReward(earned,request,3,c),earned);a.deepEqual(d.parseState(earned,c).monetization,earned.monetization);
 }
});
test('failed migration save keeps old state and startup blocked until retry',async()=>{
 let saved=baseline(),fail=true;const before=structuredClone(saved),services={repository:{load:async()=>structuredClone(saved),save:async s=>{if(fail)throw Error('disk');saved=structuredClone(s);}},clock:()=>clock,uuid:()=> 'id',platform:'native'};
 const ctrl=new MonetizedController(c,services,p.disabledAds,'rewarded');await ctrl.initialize();a.equal(ctrl.ready,false);a.deepEqual(saved,before);fail=false;await ctrl.initialize();a.equal(ctrl.ready,true,ctrl.startupError);a.equal(saved.contentVersion,c.manifest.version);a.equal(saved.exams.length,1);
});
