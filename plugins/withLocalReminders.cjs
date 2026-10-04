'use strict';
const {withAndroidManifest,withDangerousMod,withEntitlementsPlist,withInfoPlist,AndroidConfig}=require('expo/config-plugins');
const fs=require('node:fs');
const path=require('node:path');

// Local reminders need no APNs entitlement, push token registration or exact alarm.
module.exports=config=>{
  config=withEntitlementsPlist(config,mod=>{
    delete mod.modResults['aps-environment'];
    return mod;
  });
  config=withInfoPlist(config,mod=>{
    if(Array.isArray(mod.modResults.UIBackgroundModes)){
      mod.modResults.UIBackgroundModes=mod.modResults.UIBackgroundModes.filter(mode=>mode!=='remote-notification');
      if(!mod.modResults.UIBackgroundModes.length)delete mod.modResults.UIBackgroundModes;
    }
    return mod;
  });
  config=withAndroidManifest(config,mod=>{
    const app=AndroidConfig.Manifest.getMainApplicationOrThrow(mod.modResults);
    for(const name of ['firebase_messaging_auto_init_enabled','firebase_analytics_collection_enabled','firebase_data_collection_default_enabled']){
      AndroidConfig.Manifest.addMetaDataItemToMainApplication(app,name,'false');
    }
    AndroidConfig.Manifest.addMetaDataItemToMainApplication(app,'expo.modules.notifications.default_notification_icon','@drawable/learning_reminder','resource');
    return mod;
  });
  return withDangerousMod(config,['android',async mod=>{
    const destination=path.join(mod.modRequest.platformProjectRoot,'app','src','main','res','drawable');
    fs.mkdirSync(destination,{recursive:true});
    fs.writeFileSync(path.join(destination,'learning_reminder.xml'),'<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="24dp" android:height="24dp" android:viewportWidth="24" android:viewportHeight="24"><path android:fillColor="#FFFFFFFF" android:pathData="M3,3 L11,3 L12,4 L13,3 L21,3 L21,20 L13,20 L12,21 L11,20 L3,20 Z M5,5 L5,18 L10,18 L11,19 L11,6 L10,5 Z M13,6 L13,19 L14,18 L19,18 L19,5 L14,5 Z" android:fillType="evenOdd"/></vector>','utf8');
    return mod;
  }]);
};
