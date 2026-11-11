import React,{createContext,useCallback,useContext,useId,useLayoutEffect,useMemo,useState} from 'react';
import {BackHandler,Modal,Platform,StyleSheet,View,type ModalProps} from 'react-native';

type Entry={children:React.ReactNode;close?:()=>void};
type Host={show:(id:string,entry:Entry)=>void;hide:(id:string)=>void};
const Context=createContext<Host|null>(null);

/** Android native Dialog windows blur the Activity. Keep app-owned overlays in
 * its window so notification-shade/background interruptions still pause exams. */
export function LearningModalHost({children}:React.PropsWithChildren){
 const [entries,setEntries]=useState<Map<string,Entry>>(()=>new Map());
 const show=useCallback((id:string,entry:Entry)=>setEntries(old=>new Map(old).set(id,entry)),[]);
 const hide=useCallback((id:string)=>setEntries(old=>{if(!old.has(id))return old;const next=new Map(old);next.delete(id);return next;}),[]);
 const value=useMemo(()=>({show,hide}),[show,hide]);
 const current=[...entries].at(-1);
 useLayoutEffect(()=>{
  if(!current)return;
  const subscription=BackHandler.addEventListener('hardwareBackPress',()=>{current[1].close?.();return true;});
  return ()=>subscription.remove();
 },[current?.[0],current?.[1].close]);
 return <Context.Provider value={value}>
  <View style={{flex:1}}>
   <View style={{flex:1}} pointerEvents={current?'none':'auto'} accessibilityElementsHidden={!!current} importantForAccessibility={current?'no-hide-descendants':'auto'}>{children}</View>
   {current?<View key={current[0]} accessibilityViewIsModal onAccessibilityEscape={current[1].close} style={[StyleSheet.absoluteFill,{zIndex:1000,elevation:24}]}>{current[1].children}</View>:null}
  </View>
 </Context.Provider>;
}

export function LearningModal(props:Omit<ModalProps,'onRequestClose'>&{onRequestClose?:()=>void}){
 const host=useContext(Context),id=useId();
 const visible=props.visible!==false;
 useLayoutEffect(()=>{
  if(Platform.OS!=='android'||!host)return;
  if(visible)host.show(id,{children:props.children,close:props.onRequestClose});else host.hide(id);
 },[host,id,visible,props.children,props.onRequestClose]);
 useLayoutEffect(()=>()=>{if(Platform.OS==='android')host?.hide(id);},[host,id]);
 if(Platform.OS==='android')return null;
 return <Modal {...props}/>;
}
