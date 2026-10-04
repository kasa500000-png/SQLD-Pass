import React,{useEffect,useState,useSyncExternalStore} from 'react';
import {AppState,View,useWindowDimensions,type ViewStyle} from 'react-native';
import {AppText as Text} from './Typography';
import {NativeView,type NativeViewProps} from './NativeView';
import {nativeAds} from './ads';
import {ResponsiveFrame,useResponsiveLayout,type ResponsiveFrameKind} from './ResponsiveLayout';

function SmallBanner(){
  useSyncExternalStore(nativeAds.subscribe,nativeAds.snapshot,nativeAds.snapshot);
  const {width}=useWindowDimensions();
  const [foreground,setForeground]=useState(AppState.currentState==='active');
  const [reserved,setReserved]=useState(false),[failed,setFailed]=useState(false);
  useEffect(()=>{const sub=AppState.addEventListener('change',v=>{setForeground(v==='active');if(v!=='active')setReserved(false);});return ()=>sub.remove();},[]);
  useEffect(()=>{
    if(!foreground||width<352||failed||reserved)return;
    let cancelled=false;
    const delay=nativeAds.bannerDelay();if(!Number.isFinite(delay))return;
    const timer=setTimeout(()=>{void nativeAds.prepare().then(ok=>{
      if(!cancelled&&ok&&nativeAds.reserveBanner())setReserved(true);
    });},delay);
    return ()=>{cancelled=true;clearTimeout(timer);};
  },[foreground,width,failed,reserved]);
  if(!foreground||width<352||failed||!reserved||!nativeAds.bannersReady)return null;
  const {BannerAd,BannerAdSize}=nativeAds.sdk();
  return <View testID="small-ad-slot" style={{paddingVertical:28,alignItems:'center',borderTopWidth:1,borderColor:'#DFE7F1'}}>
    <Text style={{fontSize:12,color:'#526174',marginBottom:8}}>{nativeAds.mode==='test'?'테스트 광고 · 수익 없음':'광고'}</Text>
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
      <NativeView node={inner} scale={scale} dark={dark}/>
    </View>
  </ResponsiveFrame></View>;
}
export function MonetizedRoot({node,scale,dark}:NativeViewProps){
  const scrollIndex=node.children?.findIndex(child=>child.scroll)??-1;
  const reading=node.children?.[scrollIndex]?.contentWidth==='reading';
  return <View style={node.style as ViewStyle}>{node.children?.map((n,i)=>
    n.key==='monetization-banner'?(nativeAds.mode==='off'?null:<SmallBanner key="small-banner"/>):
      n.scroll||n.kind==='modal'||scrollIndex<0?<NativeView key={n.key??`root-${i}`} node={n} scale={scale} dark={dark}/>:
        <RootBar key={n.key??`root-${i}`} node={n} scale={scale} dark={dark} reading={reading}
          kind={i<scrollIndex?'header':n.children?.some(child=>child.role==='tab')?'navigation':'footer'}/>
  )}</View>;
}
