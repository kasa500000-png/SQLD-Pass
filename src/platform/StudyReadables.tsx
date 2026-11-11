import {LearningModal} from './LearningModal';
import {SafeAreaView} from 'react-native-safe-area-context';
import React,{useState} from 'react';
import {Platform,Pressable,ScrollView,View,useWindowDimensions} from 'react-native';
import {AppText as Text} from './Typography';
import {dark as darkPalette,light as lightPalette,type Node} from '../ui/nodes';
import {displayCell} from '../ui/learning-format';
const mono=Platform.select({ios:'Menlo',default:'monospace'});
export function StudyCode({node,scale,dark}:{node:Node;scale:number;dark:boolean}){
  const [wrap,setWrap]=useState(false);const palette=dark?darkPalette:lightPalette;
  const sql=<Text selectable allowFontScaling style={{fontFamily:mono,fontSize:14*scale,lineHeight:23*scale,color:palette.codeInk}}>{node.text??''}</Text>;
  return <View style={{borderRadius:12,backgroundColor:(dark?darkPalette:lightPalette).code,overflow:'hidden'}}>
    <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingLeft:14,flexWrap:'wrap'}}>
      <Text allowFontScaling style={{fontSize:12*scale,color:palette.codeInk}}>SQL · {wrap?'줄바꿈':'좌우 스크롤'}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="SQL 자동 줄바꿈" accessibilityState={{expanded:wrap}}
        onPress={e=>{e.stopPropagation();setWrap(v=>!v);}} style={{minHeight:48,minWidth:64,padding:12,justifyContent:'center'}}>
        <Text allowFontScaling style={{fontSize:13*scale,color:palette.blue}}>{wrap?'원문 줄 유지':'줄바꿈'}</Text>
      </Pressable>
    </View>
    {wrap?<View style={{padding:14,paddingTop:0}}>{sql}</View>:<ScrollView horizontal showsHorizontalScrollIndicator accessibilityLabel={node.label??'SQL 코드'} style={{flexGrow:0}} contentContainerStyle={{padding:14,paddingTop:0}}>{sql}</ScrollView>}
  </View>;
}
export function StudyTable({node,scale,dark,expanded=false}:{node:Node;scale:number;dark:boolean;expanded?:boolean}){
  const [large,setLarge]=useState(false);
  const caption=node.label?.trim()||'데이터 표';
  const dimensions=/\d+\s*행/.test(caption)?'':` · ${(node.rows??[]).length}행 × ${(node.columns??[]).length}열`;
  const [availableWidth,setAvailableWidth]=useState(0);
  const {fontScale}=useWindowDimensions();
  const cols=node.columns??[],rows=node.rows??[],ink=(dark?darkPalette:lightPalette).ink,line=(dark?darkPalette:lightPalette).line;
  // Leave room for bold headers and wide Korean glyphs at both app and system text scales.
  const textWidth=(value:string)=>Array.from(value).reduce((sum,char)=>sum+(/[\u1100-\u11ff\u2e80-\ua4cf\uac00-\ud7af]/u.test(char)?14:9.5),0)*scale*fontScale;
  const natural=cols.map((col,i)=>Math.min(280*scale*fontScale,Math.max(88,textWidth(col)+24,...rows.map(r=>textWidth(displayCell(r[i]))+24))));
  const total=natural.reduce((sum,width)=>sum+width,0);
  const extra=cols.length?Math.max(0,availableWidth-total)/cols.length:0;
  const widths=natural.map(width=>width+extra);
  const overflow=availableWidth>0&&total>availableWidth+1;
  const cell=(v:string|number|null|undefined,i:number,header:boolean,key:string)=><View key={key} style={{width:widths[i],padding:8,minHeight:40,borderRightWidth:1,borderColor:line,justifyContent:'center',backgroundColor:node.highlight?.some(([r,c])=>`${r}:${c}`===key)?(dark?darkPalette:lightPalette).greenSoft:undefined}}>
    <Text selectable allowFontScaling accessibilityLabel={`${node.highlight?.some(([r,c])=>`${r}:${c}`===key)?'강조된 셀. ':''}${header?'':cols[i]+': '}${displayCell(v)}`} style={{fontSize:14*scale,lineHeight:23*scale,color:ink,fontWeight:header?'600':'400',textAlign:!header&&/^-?[\d,.]+$/.test(displayCell(v))?'right':'left'}}>{displayCell(v)}</Text>
  </View>;
  return <View style={{gap:6}} onLayout={e=>setAvailableWidth(Math.max(0,e.nativeEvent.layout.width-2))}>
    <Text allowFontScaling style={{fontSize:12*scale,color:(dark?darkPalette:lightPalette).muted}}>{caption}{dimensions}{overflow?' · 좌우로 이동':''}</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator accessibilityLabel={node.label} style={{borderWidth:1,borderColor:line,borderRadius:12,flexGrow:0}}>
      <View><View style={{flexDirection:'row',backgroundColor:(dark?darkPalette:lightPalette).code}}>{cols.map((v,i)=>cell(v,i,true,`-1:${i}`))}</View>
      {rows.map((r,i)=><View key={i} style={{flexDirection:'row',borderTopWidth:1,borderColor:line}}>{cols.map((_,j)=>cell(r[j],j,false,`${i}:${j}`))}</View>)}</View>
    </ScrollView>
    {!expanded&&overflow?<Pressable accessibilityRole="button" onPress={()=>setLarge(true)} style={{minHeight:48,justifyContent:'center'}}><Text style={{color:(dark?darkPalette:lightPalette).blue}}>표 확대 보기</Text></Pressable>:null}
    <LearningModal visible={large} onRequestClose={()=>setLarge(false)} animationType="none"><SafeAreaView accessibilityViewIsModal onAccessibilityEscape={()=>setLarge(false)} style={{flex:1,backgroundColor:(dark?darkPalette:lightPalette).bg,padding:16}}>
      <Pressable accessibilityRole="button" accessibilityLabel="표 닫기" onPress={()=>setLarge(false)} style={{minHeight:48,justifyContent:'center'}}><Text style={{color:(dark?darkPalette:lightPalette).blue}}>닫기</Text></Pressable>
      {large?<ScrollView><StudyTable node={node} scale={scale*1.2} dark={dark} expanded/></ScrollView>:null}
    </SafeAreaView></LearningModal>
    {!rows.length?<Text allowFontScaling style={{fontSize:14*scale,lineHeight:23*scale,color:ink}}>결과 0행 · 표시할 행이 없습니다.</Text>:null}
  </View>;
}
