import React,{useState} from 'react';
import {Platform,Pressable,ScrollView,View,useWindowDimensions} from 'react-native';
import {AppText as Text} from './Typography';
import type {Node} from '../ui/nodes';
import {displayCell} from '../ui/learning-format';
const mono=Platform.select({ios:'Menlo',default:'monospace'});
export function StudyCode({node,scale}:{node:Node;scale:number}){
  const [wrap,setWrap]=useState(false);
  const sql=<Text selectable allowFontScaling style={{fontFamily:mono,fontSize:14*scale,lineHeight:23*scale,color:'#EBF2FF'}}>{node.text??''}</Text>;
  return <View style={{borderRadius:12,backgroundColor:'#13233D',overflow:'hidden'}}>
    <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingLeft:14,flexWrap:'wrap'}}>
      <Text allowFontScaling style={{fontSize:12*scale,color:'#EBF2FF'}}>SQL · {wrap?'줄바꿈':'좌우 스크롤'}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="SQL 자동 줄바꿈" accessibilityState={{expanded:wrap}}
        onPress={e=>{e.stopPropagation();setWrap(v=>!v);}} style={{minHeight:48,minWidth:64,padding:12,justifyContent:'center'}}>
        <Text allowFontScaling style={{fontSize:13*scale,color:'#AAC9FF'}}>{wrap?'원문 줄 유지':'줄바꿈'}</Text>
      </Pressable>
    </View>
    {wrap?<View style={{padding:14,paddingTop:0}}>{sql}</View>:<ScrollView horizontal showsHorizontalScrollIndicator accessibilityLabel={node.label??'SQL 코드'} style={{flexGrow:0}} contentContainerStyle={{padding:14,paddingTop:0}}>{sql}</ScrollView>}
  </View>;
}
export function StudyTable({node,scale,dark}:{node:Node;scale:number;dark:boolean}){
  const [availableWidth,setAvailableWidth]=useState(0);
  const {fontScale}=useWindowDimensions();
  const cols=node.columns??[],rows=node.rows??[],ink=dark?'#F0F5FF':'#172033',line=dark?'#2C3C55':'#DFE7F1';
  // Leave room for bold headers and wide Korean glyphs at both app and system text scales.
  const textWidth=(value:string)=>Array.from(value).reduce((sum,char)=>sum+(/[\u1100-\u11ff\u2e80-\ua4cf\uac00-\ud7af]/u.test(char)?14:9.5),0)*scale*fontScale;
  const natural=cols.map((col,i)=>Math.min(280*scale*fontScale,Math.max(112,textWidth(col)+32,...rows.map(r=>textWidth(displayCell(r[i]))+32))));
  const total=natural.reduce((sum,width)=>sum+width,0);
  const extra=cols.length?Math.max(0,availableWidth-total)/cols.length:0;
  const widths=natural.map(width=>width+extra);
  const overflow=availableWidth>0&&total>availableWidth+1;
  const cell=(v:string|number|null|undefined,i:number,header:boolean,key:string)=><View key={key} style={{width:widths[i],padding:12,minHeight:48,borderRightWidth:1,borderColor:line,justifyContent:'center'}}>
    <Text selectable allowFontScaling accessibilityLabel={`${header?'':cols[i]+': '}${displayCell(v)}`} style={{fontSize:14*scale,lineHeight:23*scale,color:ink,fontWeight:header?'700':'400'}}>{displayCell(v)}</Text>
  </View>;
  return <View style={{gap:6}} onLayout={e=>setAvailableWidth(Math.max(0,e.nativeEvent.layout.width-2))}>
    <Text allowFontScaling style={{fontSize:12*scale,color:dark?'#B0BFD6':'#53647F'}}>{node.label??'데이터 표'} · {rows.length}행{overflow?' · 좌우로 이동':''}</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator accessibilityLabel={node.label} style={{borderWidth:1,borderColor:line,borderRadius:12,flexGrow:0}}>
      <View><View style={{flexDirection:'row',backgroundColor:dark?'#20365D':'#EAF0FF'}}>{cols.map((v,i)=>cell(v,i,true,`h${i}`))}</View>
      {rows.map((r,i)=><View key={i} style={{flexDirection:'row',borderTopWidth:1,borderColor:line}}>{cols.map((_,j)=>cell(r[j],j,false,`${i}:${j}`))}</View>)}</View>
    </ScrollView>
    {!rows.length?<Text allowFontScaling style={{fontSize:14*scale,lineHeight:23*scale,color:ink}}>결과 0행 · 표시할 행이 없습니다.</Text>:null}
  </View>;
}
