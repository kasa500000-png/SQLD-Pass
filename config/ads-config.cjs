'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const POLICY='2026-09-12.1';
const CODE_FILES=['config/ads-config.cjs','src/monetization/policy.ts','src/monetization/controller.ts','src/monetization/views.ts','src/platform/ads.ts','src/platform/MonetizedRoot.tsx','app.config.ts','package.json','App.tsx','src/core/types.ts'];
function codeHash(root){const h=crypto.createHash('sha256');for(const p of CODE_FILES)h.update(p+'\0').update(fs.readFileSync(path.join(root,p)));return h.digest('hex');}
function adsBuildConfig(env=process.env){
  const mode=env.EXPO_PUBLIC_ADS_MODE??'off',prod=env.EXPO_PUBLIC_APP_ENV==='production';
  if(!['off','test','live'].includes(mode))throw new Error('EXPO_PUBLIC_ADS_MODE must be off, test or live.');
  if(prod&&mode==='test')throw new Error('Test advertising may not be published as production.');
  if(mode==='live'&&(!prod||env.ADS_LIVE_APPROVED!=='true'))throw new Error('Live ads require production and explicit owner activation.');
  const test={androidAppId:'ca-app-pub-3940256099942544~3347511713',iosAppId:'ca-app-pub-3940256099942544~1458002511'};
  if(mode!=='live')return {mode,...test};
  const fields={androidAppId:'ADMOB_ANDROID_APP_ID',iosAppId:'ADMOB_IOS_APP_ID'};
  const result={mode};
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
  const config=adsBuildConfig(env);if(config.mode!=='live')return config;
  const a=JSON.parse(fs.readFileSync(path.join(root,'ads-release-approval.json'),'utf8'));
  if(a.policyVersion!==POLICY||a.codeSha256!==codeHash(root))throw new Error('Ad approval must bind the reviewed policy and code hash.');
  for(const field of ['androidDeviceEvidence','iosDeviceEvidence','consentAndATTEvidence','adPlacementEvidence','sdkCompatibilityEvidence','appAdsTxtEvidence','privacyDisclosureEvidence','approvedBy','approvedAt']){
    if(typeof a[field]!=='string'||a[field].trim().length<8)throw new Error(`Ad approval evidence missing: ${field}`);
  }
  if(!Number.isFinite(Date.parse(a.approvedAt)))throw new Error('Invalid ad approval timestamp.');
  for(const field of ['privacyUrl','supportUrl'])if(typeof a[field]!=='string'||!/^https:\/\//.test(a[field])||/example|localhost/.test(a[field]))throw new Error(`Owned public ${field} required.`);
  return config;
}
module.exports={adsBuildConfig,checkAdsRelease,codeHash,POLICY};
