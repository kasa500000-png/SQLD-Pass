import React, {Component, useEffect, useMemo, useSyncExternalStore} from 'react';
import {AppState as NativeAppState, BackHandler, KeyboardAvoidingView, Platform, View, useColorScheme} from 'react-native';
import {AppText as Text} from './src/platform/Typography';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import {StatusBar} from 'expo-status-bar';
import {MonetizedController as Controller} from './src/monetization/controller';
import {nativeAds} from './src/platform/ads';
import {canRelease} from './src/core/domain';
import type {Content} from './src/core/types';
import {renderMonetized as render} from './src/monetization/views';
import {MonetizedRoot as NativeView} from './src/platform/MonetizedRoot';
import {createNativeServices} from './src/platform/native';
import contentData from './generated/content.json';

const content = contentData as unknown as Content;
const migrationIncomplete=Boolean((contentData as unknown as {migrationIncomplete?:boolean}).migrationIncomplete);
class RenderBoundary extends Component<React.PropsWithChildren, {failed: boolean}> {
  state = {failed: false};
  static getDerivedStateFromError(){return {failed: true};}
  render(){return this.state.failed ? <View style={{flex:1,padding:28,justifyContent:'center',backgroundColor:'#F6F8FC'}}>
    <Text style={{fontSize:22,fontWeight:'700',color:'#172033'}}>화면을 표시하지 못했습니다.</Text>
    <Text style={{fontSize:16,lineHeight:26,color:'#53647F',marginTop:12}}>기록을 삭제하지 않았습니다. 앱을 완전히 닫은 뒤 다시 열어 주세요. 문제가 계속되면 오류 상황을 기록해 개발 담당자에게 알려 주세요.</Text>
  </View> : this.props.children;}
}
function LearnerApp(){
  const c = useMemo(()=>new Controller(content,createNativeServices(),nativeAds),[]);
  const systemAppearance=useColorScheme();
  useEffect(()=>c.setSystemAppearance(systemAppearance==='dark'?'dark':'light'),[c,systemAppearance]);
  useSyncExternalStore(c.subscribe,c.getSnapshot,c.getSnapshot);
  useEffect(()=>{
    void c.initialize();
    const timer=setInterval(()=>{void c.pulse();},1000);
    const appSub=NativeAppState.addEventListener('change',()=>{void c.checkpoint();void c.pulse();});
    const backSub=BackHandler.addEventListener('hardwareBackPress',()=>{
      if(c.rewardBusy||c.dialog||!['home','welcome'].includes(c.route.name)){c.back();return true;}
      void c.checkpoint();return false;
    });
    return ()=>{clearInterval(timer);appSub.remove();backSub.remove();};
  },[c]);
  const isDark=c.isDark;
  return <SafeAreaView style={{flex:1,backgroundColor:isDark?'#0B1220':'#F6F8FC'}} edges={['top','bottom','left','right']}>
    <StatusBar style={isDark?'light':'dark'} />
    <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
      <View style={{flex:1,width:'100%',maxWidth:920,alignSelf:'center'}}>
        <NativeView node={render(c)} scale={c.state.settings.fontScale} dark={isDark} />
      </View>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
function MigrationNotice(){return <View style={{flex:1,padding:28,justifyContent:'center'}}>
  <Text style={{fontSize:24,fontWeight:'700'}}>SQLD Pass 콘텐츠 이관 필요</Text>
  <Text style={{fontSize:16,lineHeight:26,marginTop:16}}>전체 콘텐츠 팩을 materialize해야 학습과 광고 기능을 검증할 수 있습니다. QueryPass와는 별도 프로젝트입니다. 광고 수익이나 운영 배포가 활성화된 상태가 아닙니다.</Text>
</View>;}
export default function App(){
  const blocked=process.env.EXPO_PUBLIC_APP_ENV==='production'&&!canRelease(content);
  return <SafeAreaProvider><RenderBoundary>{migrationIncomplete?<MigrationNotice/>:blocked?
    <View style={{flex:1,padding:28,justifyContent:'center'}}><Text>콘텐츠 운영 승인이 완료되지 않았습니다. 공개 배포를 중단합니다.</Text></View>:
    <LearnerApp />}</RenderBoundary></SafeAreaProvider>;
}
