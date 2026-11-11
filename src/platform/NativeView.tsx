import {TextbookWidget} from './TextbookWidget';
import React,{useState} from 'react';
import {
  Modal, Platform, Pressable, ScrollView, View,
  type TextStyle, type ViewStyle
} from 'react-native';
import {dark as darkPalette, light as lightPalette, learningType, type Node, type Style} from '../ui/nodes';
import Svg,{Circle} from 'react-native-svg';
import {StudyCode,StudyTable} from './StudyReadables';
import {AppText as Text, AppTextInput as TextInput} from './Typography';
import {ReadingScrollView} from './ReadingScrollView';
import {CatalogScrollView} from './CatalogScrollView';
import {DateField} from './DateField';
import {LearningIcon} from './LearningIcon';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useResponsiveLayout} from './ResponsiveLayout';

const textKeys = new Set(['fontSize','fontWeight','lineHeight','color','fontFamily','letterSpacing','textAlign']);
function styles(source: Style | undefined, scale: number): {view: ViewStyle; text: TextStyle} {
  const view: Record<string, unknown> = {}, text: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source ?? {})) {
    if (value === undefined) continue;
    if (textKeys.has(key)) text[key] = typeof value === 'number' && (key === 'fontSize' || key === 'lineHeight') ? value * scale : value;
    else view[key] = value;
  }
  return {view: view as ViewStyle, text: text as TextStyle};
}
const mono = Platform.select({ios: 'Menlo', default: 'monospace'});
function RichText({value}: {value: string}) {
  return <>{value.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? <Text key={i} style={{fontWeight: '700'}}>{part.slice(2,-2)}</Text> :
    part.startsWith('`') && part.endsWith('`') ? <Text key={i} style={{fontFamily: mono}}>{part.slice(1,-1)}</Text> : part
  )}</>;
}
export interface NativeViewProps {node: Node; scale: number; dark: boolean; path?: string; maxSystemFontMultiplier?:number;}
function LessonSections({node,scale,dark,path,maxSystemFontMultiplier}:NativeViewProps){
  const layout=useResponsiveLayout();
  const [measuredWidth,setMeasuredWidth]=useState(0);
  const available=Math.min(measuredWidth||layout.usableWidth,layout.usableWidth);
  const columns=layout.sectionColumns===2&&available>=1000?2:1;
  const gap=16,columnWidth=columns===2?(available-gap)/2:available;
  return <View testID={node.testId} onLayout={event=>setMeasuredWidth(event.nativeEvent.layout.width)}
    style={{width:'100%',minWidth:0,flexDirection:'row',flexWrap:'wrap',alignItems:'flex-start',gap}}>
    {(node.children??[]).map((section,index)=><View key={section.key??index}
      testID={`lesson-section-column-${index}`} style={{width:columnWidth,minWidth:0}}>
      <NativeView node={section} scale={scale} dark={dark} path={`${path}.${index}`} maxSystemFontMultiplier={maxSystemFontMultiplier}/>
    </View>)}
  </View>;
}
function ResponsiveSegments({node,scale,dark,path,maxSystemFontMultiplier}:NativeViewProps){
  const layout=useResponsiveLayout(),[measured,setMeasured]=useState(0);
  const width=Math.min(measured||layout.usableWidth,layout.usableWidth),items=node.children??[],minCell=76*layout.effectiveFontScale;
  const count=width/items.length>=minCell?items.length:width/2>=minCell?2:1;
  const cellWidth=(width-(count-1)*6)/count;
  return <View onLayout={event=>setMeasured(event.nativeEvent.layout.width)} style={{width:'100%',flexDirection:'row',flexWrap:'wrap',gap:6}}>{items.map((child,index)=><View key={child.key??index} style={{width:cellWidth}}>
    <NativeView node={{...child,style:{...child.style,flex:undefined,width:'100%',paddingHorizontal:6,fontSize:13,borderRadius:10}}} scale={scale} dark={dark} path={`${path}.${index}`} maxSystemFontMultiplier={maxSystemFontMultiplier}/>
  </View>)}</View>;
}
function ResponsiveTiles({node,scale,dark,path,maxSystemFontMultiplier}:NativeViewProps){
  const layout=useResponsiveLayout(),[measured,setMeasured]=useState(0);
  const width=Math.min(measured||layout.usableWidth,layout.usableWidth);
  const columns=node.layout==='dashboard'?(width>=760&&layout.effectiveFontScale<=1.3?2:1):Math.max(2,Math.min(10,Math.floor(width/(64*layout.effectiveFontScale))));
  return <View testID={node.testId} onLayout={event=>setMeasured(event.nativeEvent.layout.width)} style={{width:'100%',minWidth:0}}>
    <View style={{flexDirection:'row',flexWrap:'wrap',margin:-6}}>{(node.children??[]).map((child,index)=><View key={child.key??index} style={{width:`${100/columns}%`,padding:6,minWidth:0}}><NativeView node={child} scale={scale} dark={dark} path={`${path}.${index}`} maxSystemFontMultiplier={maxSystemFontMultiplier}/></View>)}</View>
  </View>;
}
/** Maps the shared UI tree to real RN controls; no WebView/HTML rendering. */
export function NativeView({node: n, scale, dark, path = '0',maxSystemFontMultiplier}: NativeViewProps): React.JSX.Element {
  const layout=useResponsiveLayout();
  const s = styles(n.style, scale), palette = dark ? darkPalette : lightPalette, ink = palette.ink, line = palette.line;
  const iconColor=typeof s.text.color==='string'?s.text.color:ink;
  const children = (n.children ?? []).map((child, i) => <NativeView
    key={child.key ?? `${path}.${i}`} node={child} scale={scale} dark={dark} path={`${path}.${i}`} maxSystemFontMultiplier={maxSystemFontMultiplier} />);
  if(n.kind==='widget'&&n.widget)return <TextbookWidget key={n.key} spec={n.widget} scale={scale} dark={dark} testId={n.testId}/>;
  if (n.kind === 'icon' && n.icon) return <View style={s.view} accessible={!!n.label} accessibilityRole={n.label?'image':undefined} accessibilityLabel={n.label} pointerEvents="none"><LearningIcon name={n.icon} size={n.iconSize??22} color={iconColor}/></View>;
  if (n.kind === 'text') return <Text accessibilityRole={n.heading ? 'header' : n.alert?'alert':undefined} accessibilityLiveRegion={n.alert?'polite':undefined}
    testID={n.testId} maxFontSizeMultiplier={maxSystemFontMultiplier} style={[s.view, {color: ink, flexShrink: 1}, s.text]}><RichText value={n.text ?? ''} /></Text>;
  if (n.kind === 'button') {
    const choice=n.buttonKind==='choice', list=n.buttonKind==='row';
    const tone=n.feedback==='correct'?palette.greenText:n.feedback==='incorrect'?palette.redText:palette.blue;
    const fill=n.feedback==='correct'?palette.greenSoft:n.feedback==='incorrect'?palette.redSoft:palette.blueSoft;
    const roleStyle:ViewStyle=n.buttonKind==='primary'?{backgroundColor:palette.blue,borderRadius:14}:n.buttonKind==='danger'?{backgroundColor:palette.redSoft}:list?{backgroundColor:palette.surface,borderBottomWidth:1,borderColor:palette.line,borderRadius:0}:choice?{backgroundColor:n.feedback||n.selected?fill:palette.surface,borderWidth:n.selected||n.feedback?2:1,borderColor:n.selected||n.feedback?tone:palette.line,borderRadius:14,paddingVertical:14}:{};
    const roleText:TextStyle=n.buttonKind==='primary'?{color:dark?'#101A2B':'#FFFFFF',fontWeight:'600'}:n.buttonKind==='danger'?{color:palette.redText}:list?{color:palette.ink,textAlign:'left',flex:1,fontWeight:'400',fontSize:16*scale,lineHeight:26*scale}:choice?{color:n.feedback?tone:palette.ink,textAlign:'left',flex:1,fontWeight:'400',fontSize:learningType.choice.fontSize*scale,lineHeight:learningType.choice.lineHeight*scale}:{};
    const option=choice?n.text?.match(/^(\d+)\.\s([\s\S]*)$/):undefined;
    return <Pressable testID={n.testId} accessibilityRole={n.role ?? 'button'}
    accessibilityLabel={n.label ?? n.text} accessibilityState={{disabled: !!n.disabled, selected: !!n.selected, checked: n.checked, expanded:n.expanded}}
    disabled={n.disabled} onPress={() => {void n.action?.();}}
    style={({pressed}) => [{minHeight: 48,minWidth:0,maxWidth:'100%', justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 10}, s.view, roleStyle, {opacity: n.disabled ? (n.role==='radio'?1:0.45) : pressed ? 0.78 : 1}]}>
    {(n.text||n.icon)?<View style={{flexDirection:n.iconPosition==='above'?'column':'row',alignItems:'center',justifyContent:list||choice?'flex-start':'center',gap:n.iconPosition==='above'?4:8}}>
      {n.icon&&n.iconPosition!=='trailing'?<LearningIcon name={n.icon} size={n.iconSize??(n.role==='tab'?23:20)} color={iconColor}/>:null}
      {option?<View accessible={false} style={{minWidth:28,minHeight:28,borderRadius:14,alignSelf:'flex-start',alignItems:'center',justifyContent:'center',backgroundColor:n.selected?palette.blue:palette.code}}><Text style={{fontSize:14*scale,fontWeight:'600',color:n.selected?(dark?palette.bg:'#FFFFFF'):palette.ink}}>{option[1]}</Text></View>:null}
      {n.text ? <Text maxFontSizeMultiplier={maxSystemFontMultiplier} style={[{color: ink, textAlign: 'center', fontSize: 15 * scale, fontWeight:'400', flexShrink: 1}, s.text,roleText]}><RichText value={option?.[2]??n.text} />{n.subtitle?<Text style={{fontSize:13*scale,lineHeight:21*scale,fontWeight:'400',color:palette.muted}}>{'\n'+n.subtitle}</Text>:null}</Text> : null}
      {n.icon&&n.iconPosition==='trailing'?<LearningIcon name={n.icon} size={n.iconSize??20} color={iconColor}/>:null}
    </View>:null}
    {list?<View style={{position:'absolute',right:10}} pointerEvents="none"><LearningIcon name="chevron-right" size={18} color={palette.muted}/></View>:null}
    {children}
  </Pressable>;
  }
  if (n.kind === 'input') return <TextInput testID={n.testId} accessibilityLabel={n.label}
    value={n.value ?? ''} onChangeText={n.onChange} placeholder={n.placeholder}
    placeholderTextColor={palette.muted} autoCorrect={false}
    autoCapitalize="none" multiline={n.multiline} keyboardAppearance={dark?'dark':'light'} keyboardType={n.inputMode === 'numeric' ? 'number-pad' : 'default'}
    style={[{color: ink}, s.view, s.text]} />;
  if (n.kind === 'date') return <DateField node={n} scale={scale} dark={dark} />;
  if (n.kind === 'code') return <StudyCode key={n.text} node={n} scale={scale} dark={dark} />;
  if (n.kind === 'table') return <StudyTable node={n} scale={scale} dark={dark} />;
  if (n.kind === 'ring') {
    const value=Math.max(0,Math.min(1,n.progress??0)), circumference=2*Math.PI*28;
    return <View accessible accessibilityRole="progressbar" accessibilityLabel={n.label??'진행률'} accessibilityValue={{min:0,max:100,now:Math.round(value*100)}}
      style={{width:68,height:68,alignItems:'center',justifyContent:'center'}}>
      <Svg width={68} height={68} style={{position:'absolute'}}>
        <Circle cx={34} cy={34} r={28} fill="none" stroke={line} strokeWidth={6}/>
        <Circle cx={34} cy={34} r={28} fill="none" stroke={palette.blue} strokeWidth={6}
          strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={circumference*(1-value)} rotation={-90} origin="34, 34"/>
      </Svg>
      <Text style={{fontSize:13*scale,fontWeight:'700',color:palette.blue}}>{Math.round(value*100)}%</Text>
    </View>;
  }
  if (n.kind === 'progress') return <View accessibilityRole="progressbar" accessibilityLabel={n.label??'진행률'}
    accessibilityValue={{min: 0, max: 100, now: Math.round((n.progress ?? 0) * 100)}} style={{height: 8, backgroundColor: line, borderRadius: 8, overflow: 'hidden'}}>
    <View style={{height:8,width:`${Math.round((n.progress??0)*100)}%`,backgroundColor:String(n.style?.backgroundColor??'#2457D6')}} />
  </View>;
  if (n.kind === 'modal') return <Modal transparent visible animationType="none" onRequestClose={n.close}>
    <SafeAreaView accessibilityViewIsModal onAccessibilityEscape={n.close} style={{flex:1,backgroundColor:'rgba(10,20,40,0.5)',justifyContent:layout.compactHeight?'center':'flex-end',paddingHorizontal:layout.horizontalPadding,paddingVertical:12}}>
      <ScrollView style={{maxHeight:Math.max(160,layout.height-32),flexGrow:0,width:'100%',maxWidth:560,alignSelf:'center'}} contentContainerStyle={{flexGrow:0,alignItems:'center'}} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </SafeAreaView>
  </Modal>;
  if(n.layout==='segments')return <ResponsiveSegments node={n} scale={scale} dark={dark} path={path} maxSystemFontMultiplier={maxSystemFontMultiplier}/>;
  if(n.layout==='dashboard'||n.layout==='question-grid')return <ResponsiveTiles node={n} scale={scale} dark={dark} path={path} maxSystemFontMultiplier={maxSystemFontMultiplier}/>;
  if(n.layout==='lesson-sections')return <LessonSections node={n} scale={scale} dark={dark} path={path} maxSystemFontMultiplier={maxSystemFontMultiplier}/>;
  if(n.layout==='adaptive-row'&&layout.stackRows)return <View testID={n.testId}
    style={[s.view,{flexDirection:'column',alignItems:'stretch',minWidth:0}]}>
    {(n.children??[]).filter(child=>!(child.kind==='box'&&!child.children?.length&&child.style?.flex)).map((child,index)=><NativeView
      key={child.key??`${path}.${index}`} node={{...child,style:{...child.style,flex:undefined,flexBasis:undefined,width:'100%',minWidth:0}}}
      scale={scale} dark={dark} path={`${path}.${index}`} maxSystemFontMultiplier={maxSystemFontMultiplier}/>)}
  </View>;
  const maxWidth=n.contentWidth==='reading'?layout.readingMaxWidth:layout.contentMaxWidth;
  const contentStyle=[s.view,{width:'100%' as const,maxWidth,alignSelf:'center' as const,paddingHorizontal:layout.horizontalPadding,
    ...(layout.compactHeight?{paddingTop:12,paddingBottom:20}:{})}];
  if(n.scroll&&n.reading)return <ReadingScrollView key={n.key} testID={n.testId} {...n.reading}
    keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator
    contentContainerStyle={contentStyle} style={{flex:1}}>{children}</ReadingScrollView>;
  if(n.scroll&&n.catalog)return <CatalogScrollView key={n.key} testID={n.testId} {...n.catalog} layoutKey={layout.layoutKey}
    keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator
    contentContainerStyle={contentStyle} style={{flex:1}}>{children}</CatalogScrollView>;
  if (n.scroll) return <ScrollView key={n.key} testID={n.testId} keyboardShouldPersistTaps="handled"
    showsVerticalScrollIndicator contentContainerStyle={contentStyle} style={{flex:1}}>{children}</ScrollView>;
  return <View testID={n.testId} style={[{minWidth:0},s.view,...(n.contentWidth==='reading'?[{width:'100%' as const,maxWidth:layout.readingMaxWidth,alignSelf:'center' as const}]:[])]}>{children}</View>;
}
