import React,{useState} from 'react';
import {View,Pressable} from 'react-native';
import {AppText as Text} from './Typography';
import {StudyCode,StudyTable} from './StudyReadables';
import {light,dark as darkPalette} from '../ui/nodes';
import type {WidgetNode,WidgetSpec} from '../textbook/types';
/** Finite authored examples compiled at build time. No HTML, eval or SQL engine runs here. */
export function TextbookWidget({spec,scale,dark,testId}:{spec:WidgetSpec;scale:number;dark:boolean;testId?:string}){
 const [index,setIndex]=useState(0),p=dark?darkPalette:light;
 const render=(n:WidgetNode,key:string):React.ReactNode=>{
  if(n.kind==='text')return <Text key={key} style={{fontSize:(n.emphasis?16:15)*scale,lineHeight:25*scale,color:p.ink,fontWeight:n.emphasis?'700':'400',backgroundColor:n.highlighted?p.greenSoft:undefined,padding:n.highlighted?8:0}}>{n.text}</Text>;
  if(n.kind==='code')return <StudyCode key={key} node={{kind:'code',text:n.text}} scale={scale} dark={dark}/>;
  if(n.kind==='table')return <StudyTable key={key} node={{kind:'table',columns:n.columns,rows:n.rows,highlight:n.highlight,label:spec.title}} scale={scale} dark={dark}/>;
  if(n.kind==='button')return <Pressable key={key} accessibilityRole="button" accessibilityLabel={n.text} accessibilityState={{disabled:n.disabled,selected:n.selected}} disabled={n.disabled}
    onPress={()=>{if(n.target!==null&&n.target!==undefined&&spec.states[n.target])setIndex(n.target);}}
    style={{minHeight:48,padding:12,borderRadius:10,borderWidth:1,borderColor:n.selected?p.blue:p.line,justifyContent:'center',backgroundColor:n.selected?p.blueSoft:p.surface,opacity:n.disabled?0.45:1,maxWidth:'100%'}}>
    <Text style={{fontSize:15*scale,lineHeight:24*scale,color:n.selected?p.blue:p.ink,fontWeight:n.selected?'600':'400'}}>{n.text}</Text>
   </Pressable>;
  return <View key={key} style={{gap:10,...(n.framed?{padding:12,borderWidth:1,borderColor:p.line,borderRadius:12}:{}),...(n.controls?{flexDirection:'row' as const,flexWrap:'wrap' as const}:{} )}}>{n.children?.map((child,i)=>render(child,`${key}.${i}`))}</View>;
 };
 return <View testID={testId} style={{gap:14,padding:16,borderRadius:20,borderWidth:1,borderColor:p.line,backgroundColor:p.surface}}>
  <Text accessibilityRole="header" style={{fontSize:19*scale,lineHeight:29*scale,color:p.ink,fontWeight:'600'}}>{spec.title}</Text>
  {spec.states[index].nodes.map((n,i)=>render(n,String(i)))}
  <Pressable accessibilityRole="button" accessibilityLabel={`${spec.title} 초기화`} onPress={()=>setIndex(0)} style={{minHeight:48,padding:12,justifyContent:'center'}}><Text style={{color:p.blue,fontSize:14*scale}}>처음 상태로</Text></Pressable>
 </View>;
}
