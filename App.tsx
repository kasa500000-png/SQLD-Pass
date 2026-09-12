import React, {Component, useEffect, useMemo, useSyncExternalStore} from 'react';
import {AppState as NativeAppState, BackHandler, KeyboardAvoidingView, Platform, Text, View} from 'react-native';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import {StatusBar} from 'expo-status-bar';
import {Controller} from './src/core/controller';
import {canRelease} from './src/core/domain';
import type {Content} from './src/core/types';
import {render} from './src/ui/views';
import {NativeView} from './src/platform/NativeView';
import {createNativeServices} from './src/platform/native';
import contentData from './generated/content.json';

const content = contentData as unknown as Content;
const migrationIncomplete = Boolean((contentData as unknown as {migrationIncomplete?: boolean}).migrationIncomplete);
class RenderBoundary extends Component<React.PropsWithChildren, {failed: boolean}> {
  state = {failed: false};
  static getDerivedStateFromError(){return {failed: true};}
  render(){return this.state.failed ? <View style={{flex:1,padding:28,justifyContent:'center',backgroundColor:'#F6F8FC'}}>
    <Text style={{fontSize:22,fontWeight:'700',color:'#172033'}}>화면을 표시하지 못했습니다.</Text>
    <Text style={{fontSize:16,lineHeight:26,color:'#53647F',marginTop:12}}>기록을 삭제하지 않았습니다. 앱을 완전히 닫은 뒤 다시 열어 주세요.</Text>
  </View> : this.props.children;}
}
function LearnerApp(){
  const c = useMemo(()=>new Controller(content,createNativeServices()),[]);
  useSyncExternalStore(c.subscribe,c.getSnapshot,c.getSnapshot);
  useEffect(()=>{
    void c.initialize();
    const timer=setInterval(()=>{void c.pulse();},1000);
    const appSub=NativeAppState.addEventListener('change',()=>{void c.checkpoint();void c.pulse();});
    const backSub=BackHandler.addEventListener('hardwareBackPress',()=>{
      if(c.dialog||!['home','welcome'].includes(c.route.name)){c.back();return true;}
      void c.checkpoint();return false;
    });
    return ()=>{clearInterval(timer);appSub.remove();backSub.remove();};
  },[c]);
  const isDark=c.state.settings.theme==='dark';
  return <SafeAreaView style={{flex:1,backgroundColor:isDark?'#0B1220':'#F6F8FC'}} edges={['top','bottom','left','right']}>
    <StatusBar style={isDark?'light':'dark'} />
    <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
      <NativeView node={render(c)} scale={c.state.settings.fontScale} dark={isDark} />
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
function MigrationNotice(){
  return <View style={{flex:1,padding:28,justifyContent:'center',backgroundColor:'#F6F8FC'}}>
    <Text style={{fontSize:28,fontWeight:'800',color:'#172033'}}>SQLD Pass 저장소 분리 완료</Text>
    <Text style={{fontSize:16,lineHeight:26,color:'#53647F',marginTop:14}}>앱 소스는 SQLD-Pass 전용 저장소로 이동했습니다. 현재 Git에는 안전한 placeholder 콘텐츠만 있으며, 기존 Phase 1 콘텐츠 팩을 materialize한 뒤 학습 앱이 실행됩니다.</Text>
    <Text style={{fontSize:14,lineHeight:22,color:'#8A4B08',marginTop:14}}>QueryPass와는 별도 프로젝트이며 데이터베이스와 앱 식별자도 분리되어 있습니다.</Text>
  </View>;
}
export default function App(){
  const blocked=process.env.EXPO_PUBLIC_APP_ENV==='production'&&!canRelease(content);
  return <SafeAreaProvider><RenderBoundary>{migrationIncomplete?<MigrationNotice/>:blocked?
    <View style={{flex:1,padding:28,justifyContent:'center'}}><Text>콘텐츠 운영 승인이 완료되지 않았습니다. 공개 배포를 중단합니다.</Text></View>:
    <LearnerApp />}</RenderBoundary></SafeAreaProvider>;
}
