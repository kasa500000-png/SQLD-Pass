import React,{useEffect,useState,useSyncExternalStore} from 'react';
import {AppState,Text,View,useWindowDimensions,type ViewStyle} from 'react-native';
import {NativeView,type NativeViewProps} from './NativeView';
import {nativeAds} from './ads';

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
export function MonetizedRoot({node,scale,dark}:NativeViewProps){
  return <View style={node.style as ViewStyle}>{node.children?.map((n,i)=>
    n.key==='monetization-banner'?<SmallBanner key="small-banner"/>:
      <NativeView key={n.key??`root-${i}`} node={n} scale={scale} dark={dark}/>
  )}</View>;
}
