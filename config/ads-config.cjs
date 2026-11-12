'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const POLICY='2026-11-12.2';
const CODE_FILES=['config/ads-config.cjs','src/monetization/policy.ts','src/monetization/controller.ts','src/monetization/views.ts','src/platform/ads.ts','src/platform/MonetizedRoot.tsx','src/platform/NativeView.tsx','src/platform/LearningModal.tsx','app.config.ts','react-native.config.js','package.json','package-lock.json','eas.json','scripts/patch-admob-config-plugin.cjs','plugins/withKotlinVersion.cjs','plugins/withAdPrivacy.cjs','plugins/withInterfaceTheme.cjs','src/mocks/views.ts','src/textbook/views.ts','config/public-support.json','App.tsx','src/core/types.ts','src/core/controller.ts','src/core/domain/library.ts','src/core/domain/exam.ts','src/core/domain/state.ts','src/core/domain/mock-retirement.ts','src/platform/native.ts','src/mocks/domain.ts','src/ui/learning-content.ts','src/ui/responsive-layout.ts','src/platform/StudyReadables.tsx','src/platform/TextbookWidget.tsx','src/platform/ReadingScrollView.tsx','src/platform/CatalogScrollView.tsx','src/ui/views.ts','src/ui/nodes.ts','src/ui/learning-polish.ts','src/ui/question-context.ts'];
function codeHash(root){const h=crypto.createHash('sha256');for(const p of CODE_FILES)h.update(p+'\0').update(fs.readFileSync(path.join(root,p)));return h.digest('hex');}
function adsBuildConfig(env=process.env){
  const mode=env.EXPO_PUBLIC_ADS_MODE??'off',prod=env.EXPO_PUBLIC_APP_ENV==='production';
  const examAccessPolicy=env.EXPO_PUBLIC_EXAM_ACCESS_POLICY??'launch-free';
  const target=env.EXPO_PUBLIC_ADS_TARGET??'both';
  if(!['off','test','live'].includes(mode))throw new Error('EXPO_PUBLIC_ADS_MODE must be off, test or live.');
  if(!['both','android','ios'].includes(target))throw new Error('EXPO_PUBLIC_ADS_TARGET must be both, android or ios.');
  if(!['launch-free','rewarded'].includes(examAccessPolicy))throw new Error('EXPO_PUBLIC_EXAM_ACCESS_POLICY must be launch-free or rewarded.');
  if(examAccessPolicy==='launch-free'&&mode!=='off')throw new Error('Launch-free builds must disable advertising.');
  if(prod&&mode==='test')throw new Error('Test advertising may not be published as production.');
  if(prod&&(env.ADS_TEST_PUBLISHED_CONSENT==='true'||env.EXPO_PUBLIC_CONSENT_TEST_REGION))throw new Error('Consent diagnostics may not be published as production.');
  if(mode==='live'&&(!prod||env.ADS_LIVE_APPROVED!=='true'))throw new Error('Live ads require production and explicit owner activation.');
  const test={androidAppId:'ca-app-pub-3940256099942544~3347511713',iosAppId:'ca-app-pub-3940256099942544~1458002511'};
  if(mode==='test'&&env.ADS_TEST_PUBLISHED_CONSENT==='true'){
    for(const [key,name] of Object.entries({androidAppId:'ADMOB_ANDROID_APP_ID',iosAppId:'ADMOB_IOS_APP_ID'})){
      if(!/^ca-app-pub-\d{16}~\d{10}$/.test(env[name]??''))throw new Error(`${name}: published consent app ID required.`);
      test[key]=env[name];
    }
  }
  if(mode!=='live')return {mode,examAccessPolicy,target,...test};
  const fields={androidAppId:'ADMOB_ANDROID_APP_ID',iosAppId:'ADMOB_IOS_APP_ID'};
  const result={mode,examAccessPolicy,target};
  for(const [key,name] of Object.entries(fields)){
    const value=env[name];if(!value||!/^ca-app-pub-\d{16}~\d{10}$/.test(value)||value.includes('3940256099942544'))throw new Error(`${name}: real app ID required.`);
    result[key]=value;
  }
  for(const name of ['EXPO_PUBLIC_ADMOB_ANDROID_BANNER','EXPO_PUBLIC_ADMOB_IOS_BANNER','EXPO_PUBLIC_ADMOB_ANDROID_REWARDED','EXPO_PUBLIC_ADMOB_IOS_REWARDED']){
    const value=env[name];if(!value||!/^ca-app-pub-\d{16}\/\d{10}$/.test(value)||value.includes('3940256099942544'))throw new Error(`${name}: real ad unit ID required.`);
  }
  return result;
}
function checkAdsRelease(root,env=process.env){
  const config=adsBuildConfig(env),lock=path.join(root,'content-pack/content.lock.json');
  if(env.EXPO_PUBLIC_APP_ENV==='production'&&fs.existsSync(lock)&&JSON.parse(fs.readFileSync(lock)).counts.exams>20&&config.examAccessPolicy!=='rewarded')throw new Error('Expanded mock catalog requires rewarded access; historical launch-free rights stop at20.');
  if(config.mode!=='live')return config;
  const a=JSON.parse(fs.readFileSync(path.join(root,'ads-release-approval.json'),'utf8'));
  if(a.policyVersion!==POLICY||a.codeSha256!==codeHash(root))throw new Error('Ad approval must bind the reviewed policy and code hash.');
  if(config.target==='android'&&a.platform!=='android')throw new Error('Android-only release requires an Android-scoped approval.');
  if(config.target==='ios'&&a.platform!=='ios')throw new Error('iOS-only release requires an iOS-scoped approval.');
  if(config.target==='both'&&a.platform&&a.platform!=='both')throw new Error('Platform-scoped approval cannot authorize both platforms.');
  const platformEvidence=config.target==='android'?['androidDeviceEvidence','androidConsentEvidence']:config.target==='ios'?['iosDeviceEvidence','consentAndATTEvidence']:['androidDeviceEvidence','iosDeviceEvidence','consentAndATTEvidence'];
  for(const field of [...platformEvidence,'adPlacementEvidence','sdkCompatibilityEvidence','appAdsTxtEvidence','privacyDisclosureEvidence','approvedBy','approvedAt']){
    if(typeof a[field]!=='string'||a[field].trim().length<8)throw new Error(`Ad approval evidence missing: ${field}`);
  }
  if(!Number.isFinite(Date.parse(a.approvedAt)))throw new Error('Invalid ad approval timestamp.');
  for(const field of ['privacyUrl','supportUrl'])if(typeof a[field]!=='string'||!/^https:\/\//.test(a[field])||/example|localhost/.test(a[field]))throw new Error(`Owned public ${field} required.`);
  return config;
}
module.exports={adsBuildConfig,checkAdsRelease,codeHash,POLICY};
