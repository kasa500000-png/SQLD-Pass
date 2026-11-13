const test=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const old=require('./fixtures/textbook20.cjs'),content=require('./fixtures/mock60.cjs')();
const d=require('../.build/core/domain'),p=require('../.build/monetization/policy'),{MonetizedController}=require('../.build/monetization/controller');
function harness(c=content,raw=null,{mode='test',policy='rewarded',earned=true}={}){
 let saved=structuredClone(raw),fail=false,seq=0,shows=0,time=100000;const services={repository:{load:async()=>structuredClone(saved),save:async s=>{if(fail)throw Error('disk');saved=structuredClone(s);},clear:async()=>{saved=null;}},clock:()=>({wall:time,mono:time,runtimeId:'volumes'}),uuid:()=>`v-${++seq}`,platform:'native'};
 const ads={mode,adultConfirmed:false,confirmAdult(){this.adultConfirmed=true;},privacyOptions:async()=>{},showReward:async cb=>{shows++;if(earned){await cb();await cb();}return 'closed';}};
 return {ctrl:new MonetizedController(c,services,ads,policy),saved:()=>saved,fail:v=>fail=v,advance:n=>time+=n,shows:()=>shows};
}
async function baseline(mode='timed'){
 const h=harness(old,null,{mode:'off',policy:'launch-free'}),c=h.ctrl;await c.initialize();await c.saveSettings(true);
 await c.markLesson(old.lessons[0].id);await c.toggleKnownCard(old.textbook.flashcards[0].id);
 await c.beginExam('SQLD-M05','study');await c.updateExamAnswer('2');await c.finishExam('manual');const q=c.state.exams[0].snapshots[0];await c.bookmarkMock(q.id);await c.saveMockNote(q.id,'Keep my note');
 await c.beginExam('SQLD-M06',mode);await c.updateExamAnswer('3');await c.flagExam();await c.moveExam(17);h.advance(1250);await c.pauseExam();return h.saved();
}
test('explicit .1/.2 compatibility preserves all textbook data and immutable attempt versions',async()=>{
 const raw=await baseline();raw.reading={lastLessonId:old.lessons[0].id,positions:{[old.lessons[0].id]:{offset:100,contentHeight:1000,lessonVersion:old.lessons[0].version}}};raw.textbookMigration={version:1,fromVersion:'phase1.20260908.1',noticePending:false};
 for(const version of ['textbook.20261109.1','textbook.20261109.2']){const prior={...structuredClone(raw),contentVersion:version},before=structuredClone(prior),next=d.parseState(prior,content);a.equal(next.contentVersion,'textbook.20261112.1');for(const k of ['exams','mockStudy','reading','knownCards','readLessons','settings','monetization','textbookMigration','responses','bookmarks'])a.deepEqual(next[k],prior[k],k);a.deepEqual(prior,before);a.deepEqual(d.parseState(next,content),next);}
 const future={...content,manifest:{...content.manifest,version:'textbook.future'}};a.throws(()=>d.parseState(raw,future),/지원하지 않는/);a.throws(()=>d.parseState({...raw,contentVersion:'unknown'},content),/지원하지 않는/);
});
test('upgrade preserves selected and submitted general-practice state',()=>{
 for(const submitted of [false,true]){const raw=d.initialState(old),qid=old.lessons.find(l=>l.questionIds.length).questionIds[0];raw.practice={id:'practice',questionIds:[qid],index:0,selected:'2',uncertain:true,submitted,mode:'lesson',sessionCorrect:0,sessionAnswered:submitted?1:0};const next=d.parseState(raw,content);a.deepEqual(next.practice,raw.practice);}
});
test('paused timed/study upgrades retain answers, flags, position, timer and old scores',async()=>{
 for(const mode of ['timed','study']){const raw=await baseline(mode),h=harness(content,raw);await h.ctrl.initialize();a.equal(h.ctrl.ready,true,h.ctrl.startupError);a.deepEqual(h.ctrl.state.exams,raw.exams);a.deepEqual(h.ctrl.state.mockStudy,raw.mockStudy);a.equal(h.ctrl.hasAccess('SQLD-M20'),true);a.equal(h.ctrl.hasAccess('SQLD-M21'),false);await h.ctrl.beginExam('SQLD-M01','study');a.equal(h.ctrl.state.exams.length,2);a.equal(h.ctrl.showBanner,false);const again=harness(content,h.saved());await again.ctrl.initialize();a.deepEqual(again.ctrl.state.exams,raw.exams);}
});
test('failed compatibility save retains old version and records until an explicit retry',async()=>{
 const raw=await baseline(),h=harness(content,raw);h.fail(true);await h.ctrl.initialize();a.equal(h.ctrl.ready,false);a.deepEqual(h.saved(),raw);h.fail(false);await h.ctrl.initialize();a.equal(h.ctrl.ready,true,h.ctrl.startupError);a.equal(h.saved().contentVersion,content.manifest.version);a.deepEqual(h.saved().exams,raw.exams);
});
test('historical free rights never expand to new exams even under launch-free defaults',async()=>{
 const h=harness(content,null,{mode:'off',policy:'launch-free'});await h.ctrl.initialize();a.equal(h.ctrl.hasAccess('SQLD-M20'),true);for(const id of ['SQLD-M21','SQLD-M40','SQLD-M41','SQLD-M60']){a.equal(h.ctrl.hasAccess(id),false);a.equal(p.walletOf(h.ctrl.state).grants[id],undefined);}
 const s={...d.initialState(content),exams:[{id:'legacy',examId:'SQLD-M20',startedAt:1},{id:'unexpected',examId:'SQLD-M21',startedAt:1}]};const migrated=p.migrateWallet(s);a.ok(p.walletOf(migrated).grants['SQLD-M20']);a.equal(p.walletOf(migrated).grants['SQLD-M21'],undefined);
 a.equal(p.canAccessExam(h.ctrl.state,'SQLD-M61','test',content),false);
 for(const id of ['SQLD-M00','SQLD-M81','SQLD-M1','SQLD-M060','other'])a.equal(p.validExamId(id),false);
});
test('earned21/40/41/60 events open only that exam, once, and survive restart and both modes',async()=>{
 for(const id of ['SQLD-M21','SQLD-M40','SQLD-M41','SQLD-M60']){const h=harness(),c=h.ctrl;await c.initialize();await c.saveSettings(true);await c.watchAdToUnlock(id);a.equal(c.hasAccess(id),true);a.equal(Object.keys(p.walletOf(c.state).grants).length,1);a.equal(c.activeExam(),undefined);await c.watchAdToUnlock(id);a.equal(h.shows(),1);for(const mode of ['timed','study']){await c.beginExam(id,mode);a.equal(c.activeExam().examId,id);await c.pauseExam();c.tab('today');a.equal(c.showBanner,false);await c.finishExam('manual');}const r=harness(content,h.saved());await r.ctrl.initialize();a.equal(r.ctrl.hasAccess(id),true);a.deepEqual(p.walletOf(r.ctrl.state).grants,p.walletOf(c.state).grants);a.equal(h.shows(),1);}
});
test('closed without earned never grants new-volume access; unsaved earned reward retries without rewatch',async()=>{
 const h=harness(content,null,{earned:false});await h.ctrl.initialize();await h.ctrl.watchAdToUnlock('SQLD-M21');a.equal(h.ctrl.hasAccess('SQLD-M21'),false);a.equal(p.walletOf(h.ctrl.state).pending,null);
 const r=harness();await r.ctrl.initialize();let shows=0;r.ctrl.ads.showReward=async cb=>{shows++;r.fail(true);await cb();return 'closed';};await r.ctrl.watchAdToUnlock('SQLD-M60');a.equal(r.ctrl.hasAccess('SQLD-M60'),false);a.equal(r.ctrl.needsRewardSave,true);r.fail(false);await r.ctrl.retryRewardSave();a.equal(r.ctrl.hasAccess('SQLD-M60'),true);a.equal(shows,1);
});
test('expanded production catalog rejects launch-free even with ads off',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'sqld-expanded-gate-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));fs.mkdirSync(path.join(root,'content-pack'));fs.writeFileSync(path.join(root,'content-pack/content.lock.json'),JSON.stringify({counts:{exams:60}}));const {checkAdsRelease}=require('../config/ads-config.cjs');a.throws(()=>checkAdsRelease(root,{EXPO_PUBLIC_APP_ENV:'production',EXPO_PUBLIC_ADS_MODE:'off',EXPO_PUBLIC_EXAM_ACCESS_POLICY:'launch-free'}),/requires rewarded/);a.equal(checkAdsRelease(root,{EXPO_PUBLIC_APP_ENV:'production',EXPO_PUBLIC_ADS_MODE:'off',EXPO_PUBLIC_EXAM_ACCESS_POLICY:'rewarded'}).mode,'off');
});
