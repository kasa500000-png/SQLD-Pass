'use strict';
const {adsBuildConfig}=require('./config/ads-config.cjs');
const {mode}=adsBuildConfig();

// Expo and React Native both honor a null platform to exclude this native module.
// The JavaScript adapter remains available for later, explicitly rewarded builds.
module.exports={dependencies:mode==='off'?{
  'react-native-google-mobile-ads':{platforms:{android:null,ios:null}}
}:{}};
