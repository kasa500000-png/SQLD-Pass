import type {ConfigContext, ExpoConfig} from 'expo/config';
import manifest from './generated/manifest.json';
const {checkAdsRelease}=require('./config/ads-config.cjs');

export default ({config}:ConfigContext):ExpoConfig=>{
  const env=process.env.EXPO_PUBLIC_APP_ENV??'development';
  if(!['development','internal','production'].includes(env))throw new Error('Unsupported APP_ENV');
  const production=env==='production';
  if(production&&!manifest.releaseReady)throw new Error('Draft content must not enter a production app.');
  if(production&&(!process.env.ANDROID_PACKAGE||!process.env.IOS_BUNDLE_IDENTIFIER))throw new Error('Production app identifiers must be explicitly supplied by the owner.');
  const ads=checkAdsRelease(__dirname),projectId=process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  return {
    ...config,name:production?'SQLD Pass':'SQLD Pass 내부검증',slug:'sqld-pass',version:'0.1.0',
    ...(process.env.EXPO_OWNER?{owner:process.env.EXPO_OWNER}:{}),
    platforms:['android','ios'],orientation:'default',userInterfaceStyle:'light',
    scheme:production?'sqld-pass':'sqld-pass-internal',updates:{enabled:false},
    ios:{bundleIdentifier:process.env.IOS_BUNDLE_IDENTIFIER??'com.sqldpass.app.internal',buildNumber:'1',supportsTablet:false,
      infoPlist:{ITSAppUsesNonExemptEncryption:false}},
    android:{package:process.env.ANDROID_PACKAGE??'com.sqldpass.app.internal',versionCode:1,allowBackup:false,
      permissions:[],softwareKeyboardLayoutMode:'resize',blockedPermissions:[
        'android.permission.CAMERA','android.permission.RECORD_AUDIO','android.permission.READ_CONTACTS','android.permission.WRITE_CONTACTS',
        'android.permission.ACCESS_FINE_LOCATION','android.permission.ACCESS_COARSE_LOCATION','android.permission.ACCESS_BACKGROUND_LOCATION',
        'android.permission.READ_EXTERNAL_STORAGE','android.permission.WRITE_EXTERNAL_STORAGE','android.permission.READ_MEDIA_IMAGES',
        'android.permission.READ_MEDIA_VIDEO','android.permission.READ_MEDIA_AUDIO','android.permission.POST_NOTIFICATIONS',
        ...(ads.mode==='off'?['com.google.android.gms.permission.AD_ID']:[]),'com.android.vending.BILLING'
      ]},
    plugins:['expo-sqlite',
      ['react-native-google-mobile-ads',{androidAppId:ads.androidAppId,iosAppId:ads.iosAppId,delayAppMeasurementInit:true,
        userTrackingUsageDescription:'광고 제공을 위한 기기 식별자 사용 여부를 선택할 수 있습니다. 허용하지 않아도 무료 학습과 열린 회차는 이용할 수 있습니다.'}],
      ['expo-build-properties',{android:{compileSdkVersion:36,targetSdkVersion:36,minSdkVersion:24,useLegacyPackaging:false,
        usesCleartextTraffic:env==='development',extraProguardRules:'-keep class com.google.android.gms.internal.consent_sdk.** { *; }'}}]
    ],
    extra:{appEnvironment:env,contentReleaseReady:manifest.releaseReady,adsRuntimeEnabled:ads.mode!=='off',adsMode:ads.mode,
      remoteAnalyticsEnabled:false,...(projectId?{eas:{projectId}}:{})}
  };
};
