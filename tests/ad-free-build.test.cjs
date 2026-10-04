const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createRequire}=require('node:module');
const {execFileSync}=require('node:child_process');
const ts=require('typescript');
const {adsBuildConfig}=require('../config/ads-config.cjs');
const root=path.resolve(__dirname,'..');
const appConfigJs=ts.transpileModule(fs.readFileSync(path.join(root,'app.config.ts'),'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}
}).outputText;
function appConfig(env={},reviewGate){
  // Pass this test's environment into the build guard without changing global process state.
  const requireForConfig=name=>name==='./config/ads-config.cjs'?{checkAdsRelease:()=>adsBuildConfig(env)}:
    name==='./config/release-config.cjs'&&reviewGate?{checkContentRelease:reviewGate}:
    createRequire(path.join(root,'app.config.ts'))(name);
  const evaluated={exports:{}};
  vm.runInNewContext(appConfigJs,{module:evaluated,exports:evaluated.exports,__dirname:root,process:{env},require:requireForConfig});
  return evaluated.exports.default({config:{}});
}
function profileEnvironment(name){
  const profiles=require('../eas.json').build,profile=profiles[name];
  return {...(profile.extends?profileEnvironment(profile.extends):{}),...profile.env};
}
test('ad-free native config contains no AdMob plugin, ATT text, or consent ProGuard entry',()=>{
  const c=appConfig({EXPO_PUBLIC_APP_ENV:'internal'});
  assert.equal(c.extra.adsMode,'off');assert.equal(c.extra.examAccessPolicy,'launch-free');
  assert.equal(c.extra.adsRuntimeEnabled,false);
  assert.ok(!c.plugins.some(plugin=>(Array.isArray(plugin)?plugin[0]:plugin)==='react-native-google-mobile-ads'));
  assert.equal(c.ios.infoPlist.NSUserTrackingUsageDescription,undefined);
  const properties=c.plugins.find(plugin=>Array.isArray(plugin)&&plugin[0]==='expo-build-properties')[1];
  assert.equal(properties.android.extraProguardRules,undefined);
  assert.ok(c.android.blockedPermissions.includes('com.google.android.gms.permission.AD_ID'));
});
test('future rewarded test config retains official SDK configuration',()=>{
  const c=appConfig(profileEnvironment('ads-test'));
  assert.equal(c.extra.adsMode,'test');assert.equal(c.extra.examAccessPolicy,'rewarded');
  const plugin=c.plugins.find(plugin=>Array.isArray(plugin)&&plugin[0]==='react-native-google-mobile-ads');
  assert.match(plugin[1].androidAppId,/3940256099942544/);assert.equal(plugin[1].delayAppMeasurementInit,true);
});
test('free build profiles explicitly disable ads and select launch-free access',()=>{
  for(const name of ['development','internal','simulator','production','play-free','ios-free','ios-production']){
    const c=adsBuildConfig(profileEnvironment(name));assert.equal(c.mode,'off',name);assert.equal(c.examAccessPolicy,'launch-free',name);
  }
  for(const name of ['ads-test','ads-test-simulator','play-test']){
    const c=adsBuildConfig(profileEnvironment(name));assert.equal(c.mode,'test',name);assert.equal(c.examAccessPolicy,'rewarded',name);
  }
});
test('iOS TestFlight QA uses the confirmed bundle while internal and simulator identifiers remain distinct',()=>{
  const profile=require('../eas.json').build['ios-free'],env=profileEnvironment('ios-free');
  const c=appConfig(env);
  assert.equal(profile.distribution,'store');assert.notEqual(profile.ios?.simulator,true);
  assert.equal(c.ios.bundleIdentifier,'com.kasa500000.sqldpass');assert.equal(c.ios.supportsTablet,true);
  assert.equal(require('../eas.json').submit['ios-free'].ios.ascAppId,'6818046749');
  assert.equal(c.extra.appEnvironment,'internal');assert.equal(c.extra.adsRuntimeEnabled,false);
  assert.equal(c.extra.examAccessPolicy,'launch-free');
  for(const name of ['internal','simulator'])assert.equal(appConfig(profileEnvironment(name)).ios.bundleIdentifier,'com.sqldpass.app.internal',name);
  for(const mode of ['test','live'])assert.throws(()=>adsBuildConfig({...env,EXPO_PUBLIC_ADS_MODE:mode}),/Launch-free/);
});
test('production profile supplies both confirmed app identifiers and retains production checks',()=>{
  const env=profileEnvironment('production');
  assert.equal(env.ANDROID_PACKAGE,'com.kasa500000.sqldpass');
  assert.equal(env.IOS_BUNDLE_IDENTIFIER,'com.kasa500000.sqldpass');
  assert.equal(env.EXPO_PUBLIC_APP_ENV,'production');
});
test('iOS production includes only the accepted receipt and keeps ads off and all exams free',()=>{
  const lock=require('../content-pack/content.lock.json');
  const receipt={schemaVersion:1,approved:true,contentSha256:lock.sha256,contentVersion:lock.contentVersion};
  const env=profileEnvironment('ios-production'),c=appConfig(env,()=>receipt);
  assert.equal(env.EXPO_PUBLIC_APP_ENV,'production');
  assert.equal(c.ios.bundleIdentifier,'com.kasa500000.sqldpass');
  assert.equal(c.ios.supportsTablet,true);assert.equal(c.extra.contentReleaseReady,true);
  assert.deepEqual(c.extra.productionContentApproval,receipt);
  assert.equal(c.extra.adsMode,'off');assert.equal(c.extra.examAccessPolicy,'launch-free');
  assert.equal(c.extra.adsRuntimeEnabled,false);assert.equal(c.updates.enabled,false);
  assert.ok(!c.plugins.some(p=>(Array.isArray(p)?p[0]:p)==='react-native-google-mobile-ads'));
  assert.equal(c.ios.infoPlist.NSUserTrackingUsageDescription,undefined);
  assert.equal(c.extra.productionContentApproval.reviewer,undefined);
  assert.equal(require('../eas.json').submit['ios-production'].ios.ascAppId,'6818046749');
});
test('internal builds have no production receipt, and production configuration still rejects missing review',()=>{
  const lock=require('../content-pack/content.lock.json');
  const accepted={schemaVersion:1,approved:true,contentSha256:lock.sha256,contentVersion:lock.contentVersion};
  const internal=appConfig(profileEnvironment('ios-free'),()=>accepted);
  assert.equal(internal.extra.productionContentApproval,undefined);
  assert.equal(internal.extra.contentReleaseReady,false);
  const denied=()=>{throw new Error('Content review metadata is required for production release.');};
  assert.throws(()=>appConfig(profileEnvironment('ios-production'),denied),/Content review/);
});
test('actual Expo autolinking excludes ads in free builds and restores them only in rewarded test builds',()=>{
  const cli=require.resolve('expo-modules-autolinking/bin/expo-modules-autolinking');
  for(const platform of ['android','ios'])for(const mode of ['off','test']){
    const output=execFileSync(process.execPath,[cli,'react-native-config','--platform',platform,'--json'],{
      cwd:root,env:{...process.env,EXPO_PUBLIC_APP_ENV:'internal',EXPO_PUBLIC_ADS_MODE:mode,EXPO_PUBLIC_EXAM_ACCESS_POLICY:mode==='off'?'launch-free':'rewarded'},encoding:'utf8'
    });
    const config=JSON.parse(output);
    if(mode==='off')assert.equal(config.dependencies['react-native-google-mobile-ads'],undefined,platform);
    else assert.ok(config.dependencies['react-native-google-mobile-ads'],platform);
    assert.ok(config.dependencies['react-native-safe-area-context'],platform);
  }
});
