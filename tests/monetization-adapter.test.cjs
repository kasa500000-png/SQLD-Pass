const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const {adsBuildConfig}=require('../config/ads-config.cjs');
const js=ts.transpileModule(fs.readFileSync(require.resolve('../src/platform/ads.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
function runtime({mode='test',accessPolicy='rewarded',appEnv='internal',consent=true,load=true,gatherError=false,configurationError=false,refreshError=false}={}){
  let clock=0,init=0,sdkLoads=0,shown=0,infoConsent=consent;
  const calls=[];
  const events=new Map(),timers=new Map();let timerId=0;
  const ad={addAdEventListener:(type,fn)=>{events.set(type,fn);return ()=>events.delete(type);},load:()=>{if(load)events.get('loaded')?.();},show:async()=>{shown++;}};
  const sdk={default:()=>({setRequestConfiguration:async options=>{calls.push(['configure',JSON.parse(JSON.stringify(options))]);if(configurationError)throw Error('configuration failed');},initialize:async()=>{calls.push(['initialize']);init++;}}),
    AdsConsent:{gatherConsent:async options=>{calls.push(['gather',JSON.parse(JSON.stringify(options))]);if(gatherError)throw Error('offline');},getConsentInfo:async()=>({canRequestAds:infoConsent}),
      requestInfoUpdate:async options=>{calls.push(['refresh',JSON.parse(JSON.stringify(options))]);if(refreshError)throw Error('refresh failed');return {privacyOptionsRequirementStatus:'required'};},showPrivacyOptionsForm:async()=>{infoConsent=false;},loadAndShowConsentFormIfRequired:async()=>{}},
    AdsConsentPrivacyOptionsRequirementStatus:{REQUIRED:'required'},MaxAdContentRating:{G:'G'},
    TestIds:{BANNER:'test-banner',REWARDED:'test-reward'},
    RewardedAd:{createForAdRequest:()=>ad},RewardedAdEventType:{EARNED_REWARD:'earned',LOADED:'loaded'},AdEventType:{CLOSED:'closed',ERROR:'error'}};
  const rn={AppState:{currentState:'active'},Platform:{OS:'android'}};
  const module={exports:{}};
  const context={module,exports:module.exports,process:{env:{EXPO_PUBLIC_ADS_MODE:mode,EXPO_PUBLIC_APP_ENV:appEnv,...(accessPolicy?{EXPO_PUBLIC_EXAM_ACCESS_POLICY:accessPolicy}:{})}},
    require:name=>{if(name==='react-native')return rn;if(name==='react-native-google-mobile-ads'){sdkLoads++;return sdk;}throw Error(name);},
    performance:{now:()=>clock},setTimeout:(fn,delay)=>{const id=++timerId;timers.set(id,{fn,delay});return id;},clearTimeout:id=>timers.delete(id)};
  vm.runInNewContext(js.outputText,context);
  return {ads:module.exports.nativeAds,rn,calls,emit:(name)=>events.get(name)?.(),tick:ms=>{clock+=ms;},runTimer:delay=>{for(const [id,t] of timers)if(t.delay===delay){timers.delete(id);t.fn();}},
    get init(){return init;},get sdkLoads(){return sdkLoads;},get shown(){return shown;}};
}
const flush=()=>new Promise(r=>setImmediate(r));
test('native adapter source transpiles without syntax diagnostics',()=>assert.equal(js.diagnostics.length,0));
test('off mode does not load SDK or invent a reward through any adapter entry point',async()=>{
  const r=runtime({mode:'off'});assert.equal(await r.ads.prepare(),false);
  assert.equal(await r.ads.showReward(async()=>assert.fail('unexpected reward')),'unavailable');
  await assert.rejects(r.ads.privacyOptions());assert.throws(()=>r.ads.sdk());assert.throws(()=>r.ads.unit('banner'));
  assert.equal(r.ads.bannerDelay(),Infinity);assert.equal(r.ads.reserveBanner(),false);assert.equal(r.ads.bannersReady,false);assert.equal(r.sdkLoads,0);
});
test('launch-free and missing access policy fail closed even when advertising is requested',async()=>{
  for(const accessPolicy of ['launch-free',null])for(const mode of ['test','live']){
    const r=runtime({accessPolicy,mode,appEnv:mode==='live'?'production':'internal'});
    assert.equal(r.ads.mode,'off');assert.equal(await r.ads.prepare(),false);
    assert.equal(await r.ads.showReward(async()=>assert.fail('unexpected reward')),'unavailable');assert.equal(r.sdkLoads,0);
  }
});
test('consent denial prevents SDK initialization and ad display',async()=>{const r=runtime({consent:false});assert.equal(await r.ads.prepare(),false);assert.equal(r.init,0);assert.equal(await r.ads.showReward(async()=>assert.fail('unexpected reward')),'unavailable');assert.equal(r.shown,0);});
test('consent errors fail closed',async()=>{const r=runtime({gatherError:true});assert.equal(await r.ads.prepare(),false);assert.equal(r.init,0);});
test('child treatment is applied before consent and SDK initialization',async()=>{
  const r=runtime();assert.equal(await r.ads.prepare(),true);
  assert.deepEqual(r.calls,[['configure',{maxAdContentRating:'G',tagForChildDirectedTreatment:true}],['gather',{tagForUnderAgeOfConsent:true}],['initialize']]);
});
test('failed privacy configuration blocks consent requests, initialization and rewards',async()=>{
  const r=runtime({configurationError:true});assert.equal(await r.ads.prepare(),false);
  assert.equal(await r.ads.showReward(async()=>assert.fail('unexpected reward')),'unavailable');
  assert.equal(r.init,0);assert.equal(r.shown,0);assert.ok(r.calls.every(([name])=>name==='configure'));
});
test('privacy options retain child treatment and under-age consent handling',async()=>{
  const r=runtime();await r.ads.prepare();r.calls.length=0;await r.ads.privacyOptions();
  assert.deepEqual(r.calls,[['configure',{maxAdContentRating:'G',tagForChildDirectedTreatment:true}],['refresh',{tagForUnderAgeOfConsent:true}]]);
  assert.equal(r.ads.bannersReady,false);
});
test('failed privacy refresh does not reuse a previous consent state',async()=>{
  const r=runtime({refreshError:true,gatherError:true});await assert.rejects(r.ads.privacyOptions());
  assert.equal(await r.ads.prepare(),false);assert.equal(r.init,0);
  assert.ok(r.calls.some(([name])=>name==='gather'));
});
test('closed event alone is not an earned reward',async()=>{const r=runtime();let n=0;const result=r.ads.showReward(async()=>n++);await flush();r.emit('closed');assert.equal(await result,'closed');assert.equal(n,0);});
test('earned reward is persisted before closed promise resolves',async()=>{const r=runtime();let writes=0,release;const result=r.ads.showReward(async()=>{writes++;await new Promise(res=>release=res);});await flush();r.emit('earned');r.emit('earned');await flush();r.emit('closed');let resolved=false;result.then(()=>resolved=true);await flush();assert.equal(writes,1);assert.equal(resolved,false);release();assert.equal(await result,'closed');});
test('load timeout does not reward',async()=>{const r=runtime({load:false});let n=0;const result=r.ads.showReward(async()=>n++);await flush();r.runTimer(15000);assert.equal(await result,'unavailable');assert.equal(n,0);});
test('error event does not reward',async()=>{const r=runtime();let n=0;const result=r.ads.showReward(async()=>n++);await flush();r.emit('error');assert.equal(await result,'unavailable');assert.equal(n,0);});
test('late earned event after close is ignored',async()=>{const r=runtime();let n=0;const result=r.ads.showReward(async()=>n++);await flush();r.emit('closed');await result;r.emit('earned');await flush();assert.equal(n,0);});
test('concurrent native ad requests are rejected',async()=>{const r=runtime();const first=r.ads.showReward(async()=>{});await flush();assert.equal(await r.ads.showReward(async()=>{}),'unavailable');assert.equal(r.shown,1);r.emit('closed');await first;});
test('privacy change disables future banners',async()=>{const r=runtime();await r.ads.prepare();assert.equal(r.ads.bannersReady,true);await r.ads.privacyOptions();assert.equal(r.ads.bannersReady,false);assert.equal(await r.ads.prepare(),false);});
test('banner requests have startup delay, spacing and session cap',async()=>{const r=runtime();await r.ads.prepare();assert.equal(r.ads.reserveBanner(),false);r.tick(45000);for(let i=0;i<6;i++){assert.equal(r.ads.reserveBanner(),true);assert.equal(r.ads.reserveBanner(),false);r.tick(90000);}assert.equal(r.ads.reserveBanner(),false);assert.equal(r.ads.bannerDelay(),Infinity);});
test('background blocks new ad requests',async()=>{const r=runtime();r.rn.AppState.currentState='background';assert.equal(await r.ads.prepare(),false);assert.equal(r.init,0);});
test('default configuration is ad-free with full launch access',()=>{const c=adsBuildConfig({});assert.equal(c.mode,'off');assert.equal(c.examAccessPolicy,'launch-free');});
test('launch-free cannot activate advertising',()=>{for(const mode of ['test','live'])assert.throws(()=>adsBuildConfig({EXPO_PUBLIC_ADS_MODE:mode}),/Launch-free/);});
test('invalid access policy is rejected',()=>assert.throws(()=>adsBuildConfig({EXPO_PUBLIC_EXAM_ACCESS_POLICY:'oops'}),/EXAM_ACCESS_POLICY/));
test('rewarded access can remain off while staged',()=>assert.equal(adsBuildConfig({EXPO_PUBLIC_EXAM_ACCESS_POLICY:'rewarded'}).mode,'off'));
test('test configuration uses official sample app IDs',()=>assert.match(adsBuildConfig({EXPO_PUBLIC_ADS_MODE:'test',EXPO_PUBLIC_EXAM_ACCESS_POLICY:'rewarded'}).androidAppId,/3940256099942544/));
test('production cannot use test advertising',()=>assert.throws(()=>adsBuildConfig({EXPO_PUBLIC_APP_ENV:'production',EXPO_PUBLIC_ADS_MODE:'test',EXPO_PUBLIC_EXAM_ACCESS_POLICY:'rewarded'}),/Test advertising/));
test('live configuration requires explicit owner activation',()=>assert.throws(()=>adsBuildConfig({EXPO_PUBLIC_APP_ENV:'production',EXPO_PUBLIC_ADS_MODE:'live',EXPO_PUBLIC_EXAM_ACCESS_POLICY:'rewarded'}),/owner activation/));
test('live configuration rejects missing or test unit IDs',()=>assert.throws(()=>adsBuildConfig({EXPO_PUBLIC_APP_ENV:'production',EXPO_PUBLIC_ADS_MODE:'live',EXPO_PUBLIC_EXAM_ACCESS_POLICY:'rewarded',ADS_LIVE_APPROVED:'true'}),/real app ID/));
test('invalid ad mode is rejected by the build',()=>assert.throws(()=>adsBuildConfig({EXPO_PUBLIC_ADS_MODE:'oops'})));
