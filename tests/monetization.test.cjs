const {test}=require('node:test');const assert=require('node:assert/strict');
const p=require('../.build/monetization/policy.js');
const {MonetizedController}=require('../.build/monetization/controller.js');
const {renderMonetized}=require('../.build/monetization/views.js');
const d=require('../.build/core/domain.js');
function content(){
  const lessons=Array.from({length:60},(_,i)=>({id:`L${i}`,title:`lesson${i}`,subject:'S2',day:1,order:i+1,minutes:5,objectives:[],prerequisites:[],body:'fixture only',summary:[],questionIds:[],sourceIds:[],dialect:'fixture',example:null,releaseReady:false,humanReviewed:false,version:'fixture'}));
  const questions={};
  const q=(id,subject,examId)=>({id,subject,examId,lessonIds:['L0'],stem:'test fixture',tables:[],sql:'',options:['1','2','3','4'].map(id=>({id,text:id,format:'text'})),answer:'1',explanation:'fixture',optionExplanations:{'1':'yes','2':'no','3':'no','4':'no'},family:id,dialect:'fixture',topic:'fixture',version:'fixture',releaseReady:false,humanReviewed:false,sourceIds:[]});
  const exams=Array.from({length:20},(_,i)=>{const id=`SQLD-M${String(i+1).padStart(2,'0')}`;const questionIds=Array.from({length:50},(_,j)=>{const qid=`${id}-Q${j}`;questions[qid]=q(qid,j<10?'S1':'S2',id);return qid;});return {id,title:`제${i+1}회`,order:i+1,durationSeconds:5400,questionIds,version:'fixture',releaseReady:false,statisticallyEquated:false};});
  for(let i=0;i<120;i++){const id=`P${i}`;questions[id]=q(id,'S2',null);lessons[Math.floor(i/2)].questionIds.push(id);}
  return {manifest:{schema:1,version:'fixture',theoryVersion:'fixture',examVersion:'fixture',releaseReady:false,humanReviewed:false,officialSyllabusVerified:false,counts:{lessons:60,practice:120,exams:20,examQuestions:1000},note:'synthetic tests only'},lessons,questions,exams,days:Array.from({length:30},(_,i)=>({day:i+1,lessonIds:[`L${i*2}`,`L${i*2+1}`],task:'fixture',mode:'learn',minutes:10,examId:null})),sources:{}};
}
const c=content(),state=()=>d.initialState(c,1);
const req=(id='r1',examId='SQLD-M05',mode='live')=>({requestId:id,examId,mode,createdAt:1});
function harness({mode='test',result='closed',earn=true,failEarn=false,duplicate=false,held=false}={}){
  let stored=null,count=0,shows=0,release;
  const services={repository:{load:async()=>stored,save:async s=>{count++;if(failEarn&&p.walletOf(s).grants['SQLD-M05'])throw Error('disk');stored=structuredClone(s);},clear:async()=>{stored=null;}},clock:()=>({wall:1000,mono:1000,runtimeId:'test'}),uuid:()=>`uuid${++count}`,platform:'web',openURL:async()=>{},share:async()=>'cancelled'};
  const ads={mode,privacyOptions:async()=>{},showReward:async callback=>{shows++;if(held)await new Promise(r=>release=r);if(earn)await callback();if(duplicate)await callback();return result;}};
  const controller=new MonetizedController(c,services,ads);controller.ready=true;controller.state=d.initialState(c,1);controller.state.onboarded=true;controller.route={name:'exams'};
  return {controller,services,ads,get stored(){return stored;},get shows(){return shows;},release:()=>release?.(),allowSave:()=>{failEarn=false;}};
}
function strings(n){return [n.text??'',...(n.children??[]).flatMap(strings)];}
function keys(n){return [n.key??'',...(n.children??[]).flatMap(keys)];}
for(let i=1;i<=4;i++)test(`free exam ${i} is accessible offline`,()=>assert.equal(p.canAccessExam(state(),`SQLD-M0${i}`,'off'),true));
test('all additional exams are locked by default',()=>{for(let i=5;i<=20;i++)assert.equal(p.canAccessExam(state(),`SQLD-M${String(i).padStart(2,'0')}`,'live'),false);});
test('unknown IDs are never granted',()=>{assert.equal(p.canAccessExam(state(),'SQLD-M21','test'),false);assert.throws(()=>p.prepareReward(state(),req('x','SQLD-M21'),c));});
test('reward preparation never unlocks',()=>assert.equal(p.canAccessExam(p.prepareReward(state(),req(),c),'SQLD-M05','live'),false));
test('earned event grants only the selected exam',()=>{const s=p.earnReward(p.prepareReward(state(),req(),c),req(),100);assert.equal(p.canAccessExam(s,'SQLD-M05','live'),true);assert.equal(p.canAccessExam(s,'SQLD-M06','live'),false);});
test('live grants persist with ads off and no expiry',()=>{const s=p.earnReward(p.prepareReward(state(),req(),c),req(),1);assert.equal(p.canAccessExam(JSON.parse(JSON.stringify(s)),'SQLD-M05','off'),true);});
test('test grants do not open production exams',()=>{const r=req('r','SQLD-M05','test');const s=p.earnReward(p.prepareReward(state(),r,c),r,1);assert.equal(p.canAccessExam(s,'SQLD-M05','test'),true);assert.equal(p.canAccessExam(s,'SQLD-M05','live'),false);assert.equal(p.canAccessExam(s,'SQLD-M05','off'),false);});
test('wrong request ID cannot earn a reward',()=>assert.throws(()=>p.earnReward(p.prepareReward(state(),req(),c),req('wrong'),1)));
test('wrong exam ID cannot earn a reward',()=>assert.throws(()=>p.earnReward(p.prepareReward(state(),req(),c),req('r1','SQLD-M06'),1)));
test('wrong mode cannot earn a reward',()=>assert.throws(()=>p.earnReward(p.prepareReward(state(),req(),c),req('r1','SQLD-M05','test'),1)));
test('duplicate reward is idempotent',()=>{const s=p.earnReward(p.prepareReward(state(),req(),c),req(),1);assert.strictEqual(p.earnReward(s,req(),2),s);});
test('cancelled pending requests do not grant',()=>{const s=p.clearPending(p.prepareReward(state(),req(),c));assert.equal(p.canAccessExam(s,'SQLD-M05','live'),false);});
test('legacy attempts retain access once',()=>{const s=state();s.exams=[d.startExam(s,c.exams[4],c,{wall:1,mono:1,runtimeId:'test'},'old')];const migrated=p.migrateWallet(s);assert.equal(p.canAccessExam(migrated,'SQLD-M05','off'),true);assert.strictEqual(p.migrateWallet(migrated),migrated);});
test('malformed wallet is not silently replaced',()=>assert.throws(()=>p.migrateWallet({...state(),monetization:{version:4}})));
test('new wallet state survives core parsing',()=>{const s=p.earnReward(p.prepareReward(state(),req(),c),req(),1);assert.deepEqual(d.parseState(JSON.parse(JSON.stringify(s)),c).monetization,s.monetization);});
for(const route of ['lesson','practice','review','exams','exam','sheet','result','examReview','setup','welcome','help','privacy'])test(`no banner on ${route}`,()=>assert.equal(p.bannerAllowed(route,false,false,false),false));
test('only home and stats can display banners',()=>{assert.ok(p.bannerAllowed('home',false,false,false));assert.ok(p.bannerAllowed('stats',false,false,false));});
test('active exam, modal and reward suppress banners globally',()=>{assert.equal(p.bannerAllowed('home',true,false,false),false);assert.equal(p.bannerAllowed('stats',false,true,false),false);assert.equal(p.bannerAllowed('home',false,false,true),false);});
test('direct beginExam is gated, not just the button',async()=>{const h=harness();await h.controller.beginExam('SQLD-M05');assert.equal(h.controller.state.exams.length,0);assert.ok(h.controller.dialog);assert.equal(h.shows,0);});
test('cancel opt-in does not load an ad',()=>{const h=harness();h.controller.offerUnlock('SQLD-M05');h.controller.cancelDialog();assert.equal(h.shows,0);});
test('ad unavailable leaves access unchanged',async()=>{const h=harness({result:'unavailable',earn:false});h.controller.offerUnlock('SQLD-M05');await h.controller.acceptDialog();assert.equal(h.controller.hasAccess('SQLD-M05'),false);assert.equal(p.walletOf(h.controller.state).pending,null);});
test('close without earned callback never grants',async()=>{const h=harness({earn:false});h.controller.offerUnlock('SQLD-M05');await h.controller.acceptDialog();assert.equal(h.controller.hasAccess('SQLD-M05'),false);});
test('reward is saved once and repeat attempt needs no additional ad',async()=>{const h=harness({duplicate:true});h.controller.offerUnlock('SQLD-M05');await h.controller.acceptDialog();assert.equal(h.controller.hasAccess('SQLD-M05'),true);assert.equal(Object.keys(p.walletOf(h.controller.state).grants).length,1);await h.controller.beginExam('SQLD-M05');assert.equal(h.controller.state.exams.length,1);assert.equal(h.shows,1);});
test('ad-off configuration never pretends to watch',async()=>{const h=harness({mode:'off'});h.controller.offerUnlock('SQLD-M05');await h.controller.acceptDialog();assert.equal(h.shows,0);assert.equal(h.controller.hasAccess('SQLD-M05'),false);});
test('save failure permits retry without watching again',async()=>{const h=harness({failEarn:true});h.controller.offerUnlock('SQLD-M05');await h.controller.acceptDialog();assert.equal(h.controller.needsRewardSave,true);assert.equal(h.controller.hasAccess('SQLD-M05'),false);h.allowSave();await h.controller.retryRewardSave();assert.equal(h.controller.hasAccess('SQLD-M05'),true);assert.equal(h.shows,1);});
test('learning-only reset preserves the unlock',async()=>{const h=harness();h.controller.offerUnlock('SQLD-M05');await h.controller.acceptDialog();h.controller.requestLearningReset();await h.controller.acceptDialog();assert.equal(h.controller.hasAccess('SQLD-M05'),true);assert.equal(h.controller.state.onboarded,false);});
test('full reset warns and removes grants',async()=>{const h=harness();h.controller.offerUnlock('SQLD-M05');await h.controller.acceptDialog();h.controller.requestReset();assert.match(h.controller.dialog.body,/광고 시청/);await h.controller.acceptDialog();assert.equal(h.controller.hasAccess('SQLD-M05'),false);});
test('no reward while a timed exam is active',async()=>{const h=harness();await h.controller.beginExam('SQLD-M01');h.controller.offerUnlock('SQLD-M05');assert.equal(h.shows,0);assert.equal(h.controller.dialog,null);});
test('concurrent requests do not show two ads',async()=>{const h=harness({held:true});h.controller.offerUnlock('SQLD-M05');const run=h.controller.acceptDialog();await new Promise(r=>setImmediate(r));h.controller.offerUnlock('SQLD-M06');assert.equal(h.controller.dialog,null);assert.equal(h.shows,1);h.release();await run;assert.equal(h.controller.hasAccess('SQLD-M06'),false);});
test('wallet startup migration preserves earlier records',async()=>{const h=harness();await h.controller.initialize();assert.equal(h.controller.ready,true);assert.equal(p.walletOf(h.controller.state).version,1);});
test('UI discloses free and rewarded ranges',()=>{const h=harness();const all=strings(renderMonetized(h.controller)).join(' ');assert.match(all,/1~4회/);assert.match(all,/5~20회/);assert.match(all,/기기/);});
test('settings removes obsolete no-ad claim',()=>{const h=harness();h.controller.route={name:'settings'};const all=strings(renderMonetized(h.controller)).join(' ');assert.doesNotMatch(all,/현재 로그인·광고·원격 분석·결제가 없습니다/);assert.match(all,/광고 개인정보/);});
test('exam screen contains no banner slot',async()=>{const h=harness();await h.controller.beginExam('SQLD-M01');assert.equal(keys(renderMonetized(h.controller)).includes('monetization-banner'),false);});
