'use strict';
const {withAppDelegate,withInfoPlist}=require('expo/config-plugins');

// This app does not request ATT or use IDFA. Remove stale prebuild declarations too.
function configureInfoPlist(plist){
  delete plist.NSUserTrackingUsageDescription;
  return plist;
}

// Configure locally before any JS-driven UMP/ads initialization. This does not start ads.
function configureDelegate(source){
  const marker='// SQLD Pass: disable publisher first-party ID';
  if(source.includes(marker))return source;
  const anchor='    let delegate = ReactNativeDelegate()';
  if(!source.includes(anchor))throw new Error('Review SQLD Pass ad privacy hook for the changed AppDelegate.');
  return 'import GoogleMobileAds\n'+source.replace(anchor,
    `    ${marker}\n    MobileAds.shared.requestConfiguration.setPublisherFirstPartyIDEnabled(false)\n${anchor}`);
}
module.exports=config=>withAppDelegate(withInfoPlist(config,mod=>{
  mod.modResults=configureInfoPlist(mod.modResults);
  return mod;
}),mod=>{
  if(mod.modResults.language!=='swift')throw new Error('SQLD Pass ad privacy hook requires Swift AppDelegate.');
  mod.modResults.contents=configureDelegate(mod.modResults.contents);
  return mod;
});
module.exports.configureDelegate=configureDelegate;
module.exports.configureInfoPlist=configureInfoPlist;
