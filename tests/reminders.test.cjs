const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ts=require('typescript');
const {
  RemindersController,STUDY_REMINDER_ID:ID,STUDY_REMINDER_KIND:KIND,
  defaultReminderPreferences,normalizeReminderPreferences,validReminderTime,isStudyReminder
}=require('../.build/core/reminders');
const own=(id=ID,hour=20,minute=0,timezone='Asia/Seoul')=>({identifier:id,kind:KIND,hour,minute,timezone});
const prefs=(patch={})=>({...defaultReminderPreferences('Asia/Seoul'),...patch});
function deferred(){let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};}
function fixture(options={}){
  const f={stored:options.preferences??null,requests:[...(options.requests??[])],writes:[],cancels:[],schedules:[],
    prompts:0,permissionReads:0,initializeCalls:0,disposeCalls:0,active:false,timezone:'Asia/Seoul',reviewCalls:0,
    permissionState:{granted:true,canAskAgain:true},...options};
  const repo={load:async()=>{if(f.loadError)throw Error('SQLite');return f.stored;},
    save:async p=>{if(f.saveError)throw Error('SQLite');if(f.saveGate)await f.saveGate.promise;
      f.stored={...p};f.writes.push({...p});}};
  const notifications={
    initialize:async(tap,isActive)=>{f.initializeCalls++;f.tap=tap;f.foregroundExamCheck=isActive;
      if(f.initError)throw Error('SDK');if(f.initGate)await f.initGate.promise;return()=>{f.disposeCalls++;};},
    permission:async()=>{f.permissionReads++;if(f.permissionGate)await f.permissionGate.promise;return f.permissionState;},
    requestPermission:async()=>{f.prompts++;f.permissionState=f.promptResult??{granted:true,canAskAgain:true};return f.permissionState;},
    scheduled:async()=>f.requests.map(r=>({...r})),
    cancel:async id=>{if(f.cancelError)throw Error('OS');f.cancels.push(id);f.requests=f.requests.filter(r=>r.identifier!==id);},
    schedule:async p=>{f.schedules.push({...p});if(f.scheduleError)throw Error('OS');
      if(f.scheduleGate)await f.scheduleGate.promise;f.requests.push(own(ID,p.hour,p.minute,p.timezone));}
  };
  f.c=new RemindersController(repo,notifications,{isExamActive:()=>f.active,onReview:()=>{
    f.reviewCalls++;return f.onReview?f.onReview():true;
  }},()=>f.timezone);
  return f;
}
test('invalid persisted times and missing settings remain off by default',()=>{
  assert.deepEqual(normalizeReminderPreferences(null,'Asia/Seoul'),prefs());
  for(const value of [{enabled:true,hour:24,minute:0},{enabled:true,hour:20,minute:-1},{enabled:true,hour:1.5,minute:0}]){
    assert.equal(normalizeReminderPreferences(value,'Asia/Seoul').enabled,false);
  }
  assert.equal(normalizeReminderPreferences({enabled:'true',hour:20,minute:0},'Asia/Seoul').enabled,false);
  assert.equal(validReminderTime(23,59),true);assert.equal(validReminderTime(0,0),true);
  assert.equal(validReminderTime(20,60),false);assert.equal(validReminderTime(NaN,0),false);
  assert.equal(isStudyReminder({identifier:'other-app',kind:KIND}),false);
});
test('startup and refresh do not prompt or schedule before explicit opt-in',async()=>{
  const unrelated={identifier:'sqld-pass.study-reminder.foreign',kind:'other'},f=fixture({requests:[own(),unrelated]});
  assert.equal(await f.c.initialize(),true);await f.c.refresh();
  assert.equal(f.prompts,0);assert.equal(f.permissionReads,0);assert.equal(f.schedules.length,0);
  assert.deepEqual(f.requests,[unrelated]);assert.deepEqual(f.cancels,[ID]);
  assert.equal(f.c.getSnapshot().status,'off');assert.equal(f.c.getSnapshot().ready,true);
});
test('explicit opt-in prompts once and repeated refresh preserves one schedule',async()=>{
  const f=fixture({permissionState:{granted:false,canAskAgain:true}});await f.c.initialize();
  assert.equal(await f.c.setEnabled(true),true);await f.c.refresh();await f.c.refresh();
  assert.equal(f.prompts,1);assert.equal(f.requests.length,1);assert.equal(f.schedules.length,1);
  assert.equal(f.c.getSnapshot().status,'scheduled');assert.equal(f.stored.enabled,true);
});
test('denied opt-in stays off; permanently denied permission is not prompted again',async()=>{
  const f=fixture({permissionState:{granted:false,canAskAgain:true},promptResult:{granted:false,canAskAgain:false}});
  await f.c.initialize();assert.equal(await f.c.setEnabled(true),false);assert.equal(await f.c.setEnabled(true),false);
  assert.equal(f.prompts,1);assert.equal(f.stored.enabled,false);assert.equal(f.requests.length,0);
  assert.equal(f.c.getSnapshot().status,'denied');
});
test('foreground refresh preserves denied help; a system grant clears help without enabling reminders',async()=>{
  const f=fixture({permissionState:{granted:false,canAskAgain:true},promptResult:{granted:false,canAskAgain:false}});
  await f.c.initialize();assert.equal(await f.c.setEnabled(true),false);
  await f.c.refresh();await f.c.refresh();assert.equal(f.c.getSnapshot().status,'denied');
  assert.equal(f.c.getSnapshot().preferences.enabled,false);assert.equal(f.prompts,1);assert.equal(f.schedules.length,0);
  f.permissionState={granted:true,canAskAgain:true};await f.c.refresh();
  assert.equal(f.c.getSnapshot().status,'off');assert.equal(f.c.getSnapshot().preferences.enabled,false);
  assert.equal(f.schedules.length,0);assert.equal(f.prompts,1);
  assert.equal(await f.c.setEnabled(true),true);assert.equal(f.c.getSnapshot().status,'scheduled');assert.equal(f.prompts,1);
});
test('explicit opt-out clears denied feedback without additional permission reads or prompts',async()=>{
  const f=fixture({permissionState:{granted:false,canAskAgain:true},promptResult:{granted:false,canAskAgain:false}});
  await f.c.initialize();await f.c.setEnabled(true);const reads=f.permissionReads;
  assert.equal(await f.c.setEnabled(false),true);await f.c.refresh();
  assert.equal(f.c.getSnapshot().status,'off');assert.equal(f.permissionReads,reads);assert.equal(f.prompts,1);
});
test('ordered time changes leave exactly one schedule at the latest selected time',async()=>{
  const f=fixture({preferences:prefs({enabled:true})});await f.c.initialize();
  const changes=[f.c.setTime(8,15),f.c.setTime(9,30),f.c.setTime(21,45)];
  assert.deepEqual(await Promise.all(changes),[true,true,true]);
  assert.deepEqual(f.requests,[own(ID,21,45)]);assert.equal(f.stored.hour,21);assert.equal(f.stored.minute,45);
  assert.equal(f.prompts,0);
});
test('time selection while off saves preference without requesting or scheduling',async()=>{
  const f=fixture();await f.c.initialize();assert.equal(await f.c.setTime(7,10),true);
  assert.equal(await f.c.setTime(7,60),false);assert.equal(f.stored.hour,7);assert.equal(f.stored.minute,10);
  assert.equal(f.permissionReads,0);assert.equal(f.prompts,0);assert.equal(f.requests.length,0);
});
test('replacement removes only application-owned duplicates',async()=>{
  const unrelated=[{identifier:'unrelated',kind:KIND},{identifier:ID+'.foreign',kind:'other'}];
  const f=fixture({preferences:prefs({enabled:true}),requests:[own(ID+'.old'),own(ID,8,0),...unrelated]});
  await f.c.initialize();assert.deepEqual(f.cancels,[ID+'.old',ID]);
  assert.deepEqual(f.requests,[...unrelated,own()]);
});
test('exam state suppresses immediately, pauses schedule, and restores it once after completion',async()=>{
  const f=fixture({preferences:prefs({enabled:true})});await f.c.initialize();
  const pause=f.c.syncExamState(true);assert.equal(f.foregroundExamCheck(),true);await pause;
  assert.equal(f.c.getSnapshot().status,'paused');assert.equal(f.requests.length,0);
  await f.c.syncExamState(false);await f.c.syncExamState(false);
  assert.equal(f.c.getSnapshot().status,'scheduled');assert.deepEqual(f.requests,[own()]);assert.equal(f.schedules.length,2);
});
test('exam beginning during an asynchronous schedule cancels that new schedule',async()=>{
  const started=deferred(),gate=deferred(),f=fixture({preferences:prefs({enabled:true}),scheduleGate:gate});
  // schedule has recorded its call before waiting on the gate.
  const init=f.c.initialize();const check=()=>f.schedules.length?started.resolve():setImmediate(check);check();await started.promise;
  const pause=f.c.syncExamState(true);gate.resolve();await init;await pause;
  assert.equal(f.requests.length,0);assert.equal(f.c.getSnapshot().status,'paused');assert.deepEqual(f.cancels,[ID]);
});
test('OS permission revocation cancels existing reminder without another prompt',async()=>{
  const f=fixture({preferences:prefs({enabled:true})});await f.c.initialize();
  f.permissionState={granted:false,canAskAgain:false};assert.equal(await f.c.refresh(),false);
  assert.equal(f.requests.length,0);assert.equal(f.prompts,0);assert.equal(f.c.getSnapshot().status,'denied');
  assert.equal(f.c.getSnapshot().preferences.enabled,true);
});
test('timezone refresh replaces the schedule and persists the new timezone without prompting',async()=>{
  const f=fixture({preferences:prefs({enabled:true}),requests:[own()]});await f.c.initialize();
  f.timezone='Europe/London';await f.c.refresh();await f.c.refresh();
  assert.deepEqual(f.requests,[own(ID,20,0,'Europe/London')]);assert.equal(f.stored.timezone,'Europe/London');
  assert.equal(f.schedules.length,1);assert.equal(f.prompts,0);
});
test('SDK failure is recoverable and never prompts or rejects initialization',async()=>{
  const f=fixture({initError:true});assert.equal(await f.c.initialize(),false);
  assert.equal(f.c.getSnapshot().ready,true);assert.equal(f.c.getSnapshot().status,'unavailable');assert.ok(f.c.getSnapshot().error);
  f.initError=false;assert.equal(await f.c.refresh(),true);assert.equal(f.c.getSnapshot().status,'off');assert.equal(f.prompts,0);
});
test('storage failure leaves preference unchanged and a subsequent retry succeeds',async()=>{
  const f=fixture();await f.c.initialize();f.saveError=true;
  assert.equal(await f.c.setTime(6,0),false);assert.equal(f.c.getSnapshot().preferences.hour,20);
  assert.equal(f.c.getSnapshot().status,'unavailable');f.saveError=false;
  assert.equal(await f.c.setTime(6,0),true);assert.equal(f.c.getSnapshot().preferences.hour,6);
});
test('schedule failure reports unavailable and retries saved desired state without re-prompt',async()=>{
  const f=fixture();await f.c.initialize();f.scheduleError=true;
  assert.equal(await f.c.setEnabled(true),false);assert.equal(f.stored.enabled,true);assert.equal(f.requests.length,0);
  assert.equal(f.c.getSnapshot().status,'unavailable');f.scheduleError=false;
  assert.equal(await f.c.refresh(),true);assert.deepEqual(f.requests,[own()]);assert.equal(f.prompts,0);
});
test('full reset cancels only owned reminders and returns to an off preference',async()=>{
  const unrelated={identifier:'other',kind:KIND},f=fixture({preferences:prefs({enabled:true,hour:8}),requests:[unrelated]});
  await f.c.initialize();assert.equal(await f.c.reset(),true);
  assert.deepEqual(f.requests,[unrelated]);assert.deepEqual(f.stored,prefs());assert.equal(f.c.getSnapshot().status,'off');
});
test('cancellation failure makes full-reset guard fail and retains the existing preference',async()=>{
  const f=fixture({preferences:prefs({enabled:true})});await f.c.initialize();f.cancelError=true;
  assert.equal(await f.c.reset(),false);assert.equal(f.c.getSnapshot().preferences.enabled,true);
  assert.equal(f.requests.length,1);assert.equal(f.c.getSnapshot().status,'unavailable');
  assert.equal(await f.c.setEnabled(false),false);assert.equal(f.c.getSnapshot().preferences.enabled,true);
});
test('notification tap waits for safe navigation without interrupting an active exam',async()=>{
  let safe=false;const f=fixture({onReview:()=>safe});await f.c.initialize();
  await f.c.syncExamState(true);f.tap();assert.equal(f.reviewCalls,0);
  await f.c.syncExamState(false);assert.equal(f.reviewCalls,2); // retry after asynchronous reconciliation
  safe=true;await f.c.syncExamState(false);assert.equal(f.reviewCalls,3);
  await f.c.syncExamState(false);assert.equal(f.reviewCalls,3);
});
test('reentrant controller notifications consume a pending tap only once',async()=>{
  const f=fixture({onReview:()=>{void f.c.syncExamState(false);return true;}});await f.c.initialize();
  f.tap();assert.equal(f.reviewCalls,1);await f.c.syncExamState(false);assert.equal(f.reviewCalls,1);
});
test('App notification guard retains the tap until submitted result is safely exited from an exam list',async()=>{
  const {Controller}=require('../.build/core/controller'),{startExam}=require('../.build/core/domain');
  const content=require('../generated/content.json'),now={wall:Date.now(),mono:100,runtimeId:'reminder-regression'};
  const c=new Controller(content,{repository:{load:async()=>null,save:async()=>{},clear:async()=>{}},platform:'native',
    clock:()=>now,uuid:()=> 'reminder-regression',openURL:async()=>{},share:async()=> 'cancelled'});
  c.state.onboarded=true;c.ready=true;c.route={name:'exams'};
  c.state.exams=[startExam(c.state,content.exams[0],content,now,'reminder-exam')];
  // Execute the real App binding rather than duplicating its safety conditions in the test.
  const file=ts.createSourceFile('App.tsx',fs.readFileSync(path.resolve(__dirname,'../App.tsx'),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const callbacks=[];const visit=node=>{if(ts.isPropertyAssignment(node)&&node.name.getText(file)==='onReview')callbacks.push(node.initializer);ts.forEachChild(node,visit);};
  visit(file);assert.equal(callbacks.length,1);const onReview=vm.runInNewContext(`(${callbacks[0].getText(file)})`,{c});
  let navigations=0;const tab=c.tab.bind(c);c.tab=value=>{if(value==='review')navigations++;tab(value);};
  const f=fixture({preferences:prefs({enabled:true}),active:true,onReview});
  const stop=c.subscribe(()=>{f.active=!!c.activeExam();void f.c.syncExamState(f.active);});
  await f.c.syncExamState(true);await f.c.initialize();f.tap();
  await c.finishExam('manual');await f.c.refresh();
  assert.equal(c.state.exams[0].status,'submitted');assert.equal(c.route.name,'result');assert.equal(navigations,0);
  assert.equal(c.isExamSubmitting,false);assert.deepEqual(f.requests,[own()]);
  c.back();await f.c.refresh();assert.equal(c.route.name,'review');assert.equal(navigations,1);
  await f.c.syncExamState(false);assert.equal(navigations,1);stop();f.c.dispose();
});
test('a thrown navigation callback retains the tap for a safe retry',async()=>{
  const f=fixture({onReview:()=>{throw Error('not ready');}});await f.c.initialize();f.tap();assert.equal(f.reviewCalls,1);
  f.onReview=()=>true;await f.c.syncExamState(false);assert.equal(f.reviewCalls,2);
  await f.c.syncExamState(false);assert.equal(f.reviewCalls,2);
});
test('dispose during SDK initialization cleans the late listener and prevents reuse',async()=>{
  const gate=deferred(),f=fixture({initGate:gate});const started=f.c.initialize();
  await new Promise(r=>setImmediate(r));f.c.dispose();gate.resolve();assert.equal(await started,false);
  assert.equal(f.disposeCalls,1);assert.equal(f.schedules.length,0);assert.equal(await f.c.refresh(),false);
});
test('dispose while permission lookup is pending does not prompt, save, or begin an OS schedule',async()=>{
  const f=fixture({permissionState:{granted:false,canAskAgain:true}});await f.c.initialize();
  const gate=deferred();f.permissionGate=gate;const enable=f.c.setEnabled(true);
  await new Promise(r=>setImmediate(r));assert.equal(f.permissionReads,1);f.c.dispose();gate.resolve();
  assert.equal(await enable,false);assert.equal(f.prompts,0);assert.equal(f.writes.length,0);assert.equal(f.schedules.length,0);
});
test('dispose during a desired-state save prevents subsequent OS scheduling',async()=>{
  const f=fixture();await f.c.initialize();const gate=deferred();f.saveGate=gate;
  const enable=f.c.setEnabled(true);await new Promise(r=>setImmediate(r));f.c.dispose();gate.resolve();
  assert.equal(await enable,false);assert.equal(f.stored.enabled,true);assert.equal(f.schedules.length,0);
});

function nativeFixture({platform='android',registrationFailure=false}={}){
  const calls=[],scheduled=[];let row=null,handler=null,responseHandler=null;
  const permission={granted:false,canAskAgain:true,ios:{status:0}};
  const local={
    IosAuthorizationStatus:{AUTHORIZED:2,PROVISIONAL:3,EPHEMERAL:4},AndroidImportance:{LOW:2},
    SchedulableTriggerInputTypes:{DAILY:'daily'},DEFAULT_ACTION_IDENTIFIER:'default',
    setNotificationChannelAsync:async(id,config)=>{calls.push(['channel',id,config]);},
    setNotificationHandler:value=>{handler=value;calls.push(['handler',!!value]);},
    clearLastNotificationResponseAsync:async()=>{calls.push(['clearResponse']);},
    addNotificationResponseReceivedListener:value=>{responseHandler=value;return {remove:()=>calls.push(['remove'])};},
    getLastNotificationResponseAsync:async()=>null,
    getPermissionsAsync:async()=>{calls.push(['permission']);return permission;},
    requestPermissionsAsync:async options=>{calls.push(['request',options]);permission.granted=true;permission.ios.status=2;return permission;},
    getAllScheduledNotificationsAsync:async()=>scheduled.slice(),
    cancelScheduledNotificationAsync:async id=>{calls.push(['cancel',id]);const i=scheduled.findIndex(r=>r.identifier===id);if(i>=0)scheduled.splice(i,1);},
    scheduleNotificationAsync:async request=>{calls.push(['schedule',request]);scheduled.push(request);return request.identifier;}
  };
  const nativeSource=ts.transpileModule(fs.readFileSync(path.resolve(__dirname,'../src/platform/reminders.ts'),'utf8'),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}
  }).outputText;
  const module={exports:{}};let registrationCleared=false;
  const fakeRequire=name=>{
    calls.push(['import',name]);
    if(name==='expo-sqlite')return {openDatabaseAsync:async()=>({
      execAsync:async()=>{},getFirstAsync:async()=>row?{payload:row}:null,runAsync:async(_sql,_slot,value)=>{row=value;}
    })};
    if(name==='react-native')return {Platform:{OS:platform},Linking:{openSettings:async()=>{}}};
    if(name==='../core/reminders')return require('../.build/core/reminders');
    if(name==='expo-notifications/build/ServerRegistrationModule')return {default:{setRegistrationInfoAsync:async value=>{
      calls.push(['registration',value]);assert.deepEqual(JSON.parse(value),{isEnabled:false});
      if(registrationFailure)throw Error('SDK');registrationCleared=true;
    }}};
    if(name.startsWith('expo-notifications/build/')){
      assert.equal(registrationCleared,true,'clear persisted backend registration before loading local SDK modules');return local;
    }
    throw Error(`Unexpected module: ${name}`);
  };
  vm.runInNewContext(nativeSource,{module,exports:module.exports,require:fakeRequire,Intl});
  const bindings={isExamActive:()=>false,onReview:()=>true},c=module.exports.createNativeReminders(bindings);
  return {c,calls,scheduled,permission,bindings,get handler(){return handler;},get responseHandler(){return responseHandler;}};
}
test('native adapter never imports push barrel and initializes Android channel before permission request',async()=>{
  const f=nativeFixture();assert.equal(await f.c.initialize(),true);assert.equal(await f.c.setEnabled(true),true);
  const imports=f.calls.filter(c=>c[0]==='import').map(c=>c[1]);assert.ok(!imports.includes('expo-notifications'));
  assert.ok(!imports.some(n=>/PushToken|AutoRegistration/.test(n)));
  assert.equal(f.calls.filter(c=>c[0]==='registration').length,1);
  assert.ok(f.calls.findIndex(c=>c[0]==='channel')<f.calls.findIndex(c=>c[0]==='request'));
  const schedule=f.scheduled[0];assert.equal(schedule.identifier,ID);assert.equal(schedule.trigger.type,'daily');
  assert.equal(schedule.content.sound,false);assert.equal(schedule.content.interruptionLevel,'passive');
  assert.deepEqual(Object.keys(schedule.content.data).sort(),['kind','route','timezone']);
});
test('foreground handler suppresses only our reminder during an exam and response listener deduplicates taps',async()=>{
  const f=nativeFixture();await f.c.initialize();const notification={date:123,request:{identifier:ID,content:{data:{kind:KIND}}}};
  let result=await f.handler.handleNotification(notification);assert.equal(result.shouldShowBanner,true);
  f.bindings.isExamActive=()=>true;result=await f.handler.handleNotification(notification);
  assert.equal(result.shouldShowBanner,false);assert.equal(result.shouldShowList,false);assert.equal(result.shouldPlaySound,false);
  f.bindings.isExamActive=()=>false;let reviews=0;f.bindings.onReview=()=>{reviews++;return true;};
  f.responseHandler({actionIdentifier:'default',notification});f.responseHandler({actionIdentifier:'default',notification});
  assert.equal(reviews,1);
  f.responseHandler({actionIdentifier:'custom',notification:{...notification,date:124}});assert.equal(reviews,1);
  f.c.dispose();assert.ok(f.calls.some(c=>c[0]==='remove'));assert.equal(f.handler,null);
});
test('native registration clearing failure leaves reminders unavailable without loading local/push SDK APIs',async()=>{
  const f=nativeFixture({registrationFailure:true});assert.equal(await f.c.initialize(),false);
  assert.equal(f.c.getSnapshot().status,'unavailable');assert.ok(!f.calls.some(c=>c[0]==='channel'||c[0]==='request'));
  assert.equal(f.calls.filter(c=>c[0]==='import'&&c[1].startsWith('expo-notifications/')).length,1);
});
test('iOS provisional authorization schedules locally without permission prompt or Android channel',async()=>{
  const f=nativeFixture({platform:'ios'});await f.c.initialize();f.permission.ios.status=3;
  assert.equal(await f.c.setEnabled(true),true);assert.equal(f.scheduled.length,1);
  assert.ok(!f.calls.some(c=>c[0]==='channel'||c[0]==='request'));
});
