import React,{useEffect,useState,useSyncExternalStore} from 'react';
import {Alert,AppState,Pressable,View,useWindowDimensions,type ViewStyle} from 'react-native';
import {AppText as Text} from './Typography';
import {NativeView,type NativeViewProps} from './NativeView';
import {nativeAds} from './ads';
import {dark as darkPalette,light as lightPalette} from '../ui/nodes';
import {ResponsiveFrame,useResponsiveLayout,type ResponsiveFrameKind} from './ResponsiveLayout';

function SmallBanner({dark}:{dark:boolean}){
  const palette=dark?darkPalette:lightPalette;
  useSyncExternalStore(nativeAds.subscribe,nativeAds.snapshot,nativeAds.snapshot);
  const adultConfirmed=nativeAds.adultConfirmed;
  const {width}=useWindowDimensions();
  const [foreground,setForeground]=useState(AppState.currentState==='active');
  const [reserved,setReserved]=useState(false),[failed,setFailed]=useState(false);
  useEffect(()=>{const sub=AppState.addEventListener('change',v=>{setForeground(v==='active');if(v!=='active')setReserved(false);});return ()=>sub.remove();},[]);
  useEffect(()=>{
    if(!foreground||width<352||failed||reserved||!adultConfirmed)return;
    let cancelled=false;
    const delay=nativeAds.bannerDelay();if(!Number.isFinite(delay))return;
    const timer=setTimeout(()=>{void nativeAds.prepare().then(ok=>{
      if(!cancelled&&ok&&nativeAds.reserveBanner())setReserved(true);
    });},delay);
    return ()=>{cancelled=true;clearTimeout(timer);};
  },[foreground,width,failed,reserved,adultConfirmed]);
  if(foreground&&width>=352&&!adultConfirmed)return <View style={{paddingVertical:16,alignItems:'center',borderTopWidth:1,borderColor:palette.line}}>
    <Pressable accessibilityRole="button" accessibilityLabel="광고 표시 설정" onPress={()=>Alert.alert('광고 이용 연령 확인',
      '광고 기능은 만 18세 이상만 이용할 수 있습니다. 생년월일은 수집하지 않으며, 확인 결과는 앱을 종료하면 초기화됩니다. 광고 없이도 무료 학습과 열린 회차를 이용할 수 있습니다.',
      [{text:'나중에',style:'cancel'},{text:'만 18세 이상',onPress:()=>nativeAds.confirmAdult()}])} style={{minHeight:48,justifyContent:'center',paddingHorizontal:18}}>
      <Text style={{fontSize:14,color:palette.muted}}>광고 표시 설정</Text>
    </Pressable>
  </View>;
  if(!foreground||width<352||failed||!reserved||!nativeAds.bannersReady)return null;
  const {BannerAd,BannerAdSize}=nativeAds.sdk();
  return <View testID="small-ad-slot" style={{paddingVertical:28,alignItems:'center',borderTopWidth:1,borderColor:palette.line}}>
    <Text style={{fontSize:12,color:palette.muted,marginBottom:8}}>{nativeAds.mode==='test'?'테스트 광고 · 수익 없음':'광고'}</Text>
    <BannerAd unitId={nativeAds.unit('banner')} size={BannerAdSize.BANNER}
      requestOptions={{requestNonPersonalizedAdsOnly:true}} onAdFailedToLoad={()=>setFailed(true)} />
  </View>;
}
/** Keep the existing native renderer; only the named root slot is replaced, never a WebView. */
function RootBar({node,scale,dark,kind,reading}:{node:NativeViewProps['node'];scale:number;dark:boolean;kind:ResponsiveFrameKind;reading:boolean}){
  const layout=useResponsiveLayout();
  const outer={backgroundColor:node.style?.backgroundColor,borderColor:node.style?.borderColor,
    borderTopWidth:node.style?.borderTopWidth,borderBottomWidth:node.style?.borderBottomWidth} as ViewStyle;
  const paddingVertical=kind==='navigation'?layout.navigationVerticalPadding:
    kind==='footer'?layout.footerVerticalPadding:Math.min(8,layout.headerVerticalPadding);
  const inner={...node,style:{...node.style,borderTopWidth:0,borderBottomWidth:0,
    paddingHorizontal:layout.horizontalPadding,paddingVertical},children:kind==='navigation'&&layout.compactHeight?
      node.children?.map(child=>({...child,style:{...child.style,minHeight:48,paddingVertical:4}})):node.children};
  return <View style={outer}><ResponsiveFrame kind={kind}>
    <View style={{width:'100%',alignSelf:'center',maxWidth:kind==='footer'&&reading?layout.readingMaxWidth:
      kind==='navigation'?Math.min(840,layout.navigationMaxWidth):layout.contentMaxWidth}}>
      {/* Fixed bars must stay usable at the largest system text sizes. Scrollable
          study content keeps the full system scale; the app scale still applies. */}
      <NativeView node={inner} scale={scale} dark={dark} maxSystemFontMultiplier={kind==='navigation'?1.5:2}/>
    </View>
  </ResponsiveFrame></View>;
}
export function MonetizedRoot({node,scale,dark}:NativeViewProps){
  const scrollIndex=node.children?.findIndex(child=>child.scroll)??-1;
  const reading=node.children?.[scrollIndex]?.contentWidth==='reading';
  return <View style={node.style as ViewStyle}>{node.children?.map((n,i)=>
    n.key==='monetization-banner'?(nativeAds.mode==='off'?null:<SmallBanner key="small-banner" dark={dark}/>):
      n.scroll||n.kind==='modal'||scrollIndex<0?<NativeView key={n.key??`root-${i}`} node={n} scale={scale} dark={dark}/>:
        <RootBar key={n.key??`root-${i}`} node={n} scale={scale} dark={dark} reading={reading}
          kind={i<scrollIndex?'header':n.children?.some(child=>child.role==='tab')?'navigation':'footer'}/>
  )}</View>;
}
