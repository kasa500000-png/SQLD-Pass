const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const {adsBuildConfig}=require('../config/ads-config.cjs');
const js=ts.transpileModule(fs.readFileSync(require.resolve('../src/platform/ads.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
function runtime({mode='test',consent=true,load=true,gatherError=false}={}){
  let clock=0,init=0,sdkLoads=0,shown=0,infoConsent=consent;
  const events=new Map(),timers=new Map();let timerId=0;
  const ad={addAdEventListener:(type,fn)=>{events.set(type,fn);return ()=>events.delete(type);},load:()=>{if(load)events.get('loaded')?.();},show:async()=>{shown++;}};
  const sdk={default:()=>({setRequestConfiguration:async()=>{},initialize:async()=>{init++;}}),
    AdsConsent:{gatherConsent:async()=>{if(gatherError)throw Error('offline');},getConsentInfo:async()=>({canRequestAds:infoConsent}),
      requestInfoUpdate:async()=>({privacyOptionsRequirementStatus:'required'}),showPrivacyOptionsForm:async()=>{infoConsent=false;},loadAndShowConsentFormIfRequired:async()=>{}},
    AdsConsentPrivacyOptionsRequirementStatus:{REQUIRED:'required'},MaxAdContentRating:{G:'G'},
    TestIds:{BANNER:'test-banner',REWARDED:'test-reward'},
    RewardedAd:{createForAdRequest:()=>ad},RewardedAdEventType:{EARNED_REWARD:'earned',LOADED:'loaded'},AdEventType:{CLOSED:'closed',ERROR:'error'}};
  const rn={AppState:{currentState:'active'},Platform:{OS:'android'}};
  const module={exports:{}};
  const context={module,exports:module.exports,process:{env:{EXPO_PUBLIC_ADS_MODE:mode,EXPO_PUBLIC_APP_ENV:'internal'}},
    require:name=>{if(name==='react-native')return rn;if(name==='react-native-google-mobile-ads'){sdkLoads++;return sdk;}throw Error(name);},
    performance:{now:()=>clock},setTimeout:(fn,delay)=>{const id=++timerId;timers.set(id,{fn,delay});return id;},clearTimeout:id=>timers.delete(id)};
  vm.runInNewContext(js.outputText,context);
  return {ads:module.exports.nativeAds,rn,emit:(name)=>events.get(name)?.(),tick:ms=>{clock+=ms;},runTimer:delay=>{for(const [id,t] of timers)if(t.delay===delay){timers.delete(id);t.fn();}},
    get init(){return init;},get sdkLoads(){return sdkLoads;},get shown(){return shown;}};
}
const flush=()=>new Promise(r=>setImmediate(r));
test('native adapter source transpiles without syntax diagnostics',()=>assert.equal(js.diagnostics.length,0));
test('off mode does not load SDK or invent a reward',async()=>{const r=runtime({mode:'off'});assert.equal(await r.ads.prepare(),false);assert.equal(await r.ads.showReward(async()=>assert.fail('unexpected reward')),'unavailable');assert.equal(r.sdkLoads,0);});
test('consent denial prevents SDK initialization and ad display',async()=>{const r=runtime({consent:false});assert.equal(await r.ads.prepare(),false);assert.equal(r.init,0);assert.equal(await r.ads.showReward(async()=>assert.fail('unexpected reward')),'unavailable');assert.equal(r.shown,0);});
test('consent errors fail closed',async()=>{const r=runtime({gatherError:true});assert.equal(await r.ads.prepare(),false);assert.equal(r.init,0);});
test('closed event alone is not an earned reward',async()=>{const r=runtime();let n=0;const result=r.ads.showReward(async()=>n++);await flush();r.emit('closed');assert.equal(await result,'closed');assert.equal(n,0);});
test('earned reward is persisted before closed promise resolves',async()=>{const r=runtime();let writes=0,release;const result=r.ads.showReward(async()=>{writes++;await new Promise(res=>release=res);});await flush();r.emit('earned');r.emit('earned');await flush();r.emit('closed');let resolved=false;result.then(()=>resolved=true);await flush();assert.equal(writes,1);assert.equal(resolved,false);release();assert.equal(await result,'closed');});
test('load timeout does not reward',async()=>{const r=runtime({load:false});let n=0;const result=r.ads.showReward(async()=>n++);await flush();r.runTimer(15000);assert.equal(await result,'unavailable');assert.equal(n,0);});
test('error event does not reward',async()=>{const r=runtime();let n=0;const result=r.ads.showReward(async()=>n++);await flush();r.emit('error');assert.equal(await result,'unavailable');assert.equal(n,0);});
test('late earned event after close is ignored',async()=>{const r=runtime();let n=0;const result=r.ads.showReward(async()=>n++);await flush();r.emit('closed');await result;r.emit('earned');await flush();assert.equal(n,0);});
test('concurrent native ad requests are rejected',async()=>{const r=runtime();const first=r.ads.showReward(async()=>{});await flush();assert.equal(await r.ads.showReward(async()=>{}),'unavailable');assert.equal(r.shown,1);r.emit('closed');await first;});
test('privacy change disables future banners',async()=>{const r=runtime();await r.ads.prepare();assert.equal(r.ads.bannersReady,true);await r.ads.privacyOptions();assert.equal(r.ads.bannersReady,false);assert.equal(await r.ads.prepare(),false);});
test('banner requests have startup delay, spacing and session cap',async()=>{const r=runtime();await r.ads.prepare();assert.equal(r.ads.reserveBanner(),false);r.tick(45000);for(let i=0;i<6;i++){assert.equal(r.ads.reserveBanner(),true);assert.equal(r.ads.reserveBanner(),false);r.tick(90000);}assert.equal(r.ads.reserveBanner(),false);assert.equal(r.ads.bannerDelay(),Infinity);});
test('background blocks new ad requests',async()=>{const r=runtime();r.rn.AppState.currentState='background';assert.equal(await r.ads.prepare(),false);assert.equal(r.init,0);});
test('default configuration is off',()=>assert.equal(adsBuildConfig({}).mode,'off'));
test('test configuration uses official sample app IDs',()=>assert.match(adsBuildConfig({EXPO_PUBLIC_ADS_MODE:'test'}).androidAppId,/3940256099942544/));
test('production cannot use test advertising',()=>assert.throws(()=>adsBuildConfig({EXPO_PUBLIC_APP_ENV:'production',EXPO_PUBLIC_ADS_MODE:'test'})));
test('live configuration requires explicit owner activation',()=>assert.throws(()=>adsBuildConfig({EXPO_PUBLIC_APP_ENV:'production',EXPO_PUBLIC_ADS_MODE:'live'})));
test('live configuration rejects missing or test unit IDs',()=>assert.throws(()=>adsBuildConfig({EXPO_PUBLIC_APP_ENV:'production',EXPO_PUBLIC_ADS_MODE:'live',ADS_LIVE_APPROVED:'true'})));
test('invalid ad mode is rejected by the build',()=>assert.throws(()=>adsBuildConfig({EXPO_PUBLIC_ADS_MODE:'oops'})));
