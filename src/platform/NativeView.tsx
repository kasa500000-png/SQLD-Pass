import React,{useState} from 'react';
import {
  Modal, Platform, Pressable, ScrollView, View,
  type TextStyle, type ViewStyle
} from 'react-native';
import type {Node, Style} from '../ui/nodes';
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
export interface NativeViewProps {node: Node; scale: number; dark: boolean; path?: string;}
function LessonSections({node,scale,dark,path}:NativeViewProps){
  const layout=useResponsiveLayout();
  const [measuredWidth,setMeasuredWidth]=useState(0);
  const available=Math.min(measuredWidth||layout.usableWidth,layout.usableWidth);
  const columns=layout.sectionColumns===2&&available>=1000?2:1;
  const gap=16,columnWidth=columns===2?(available-gap)/2:available;
  return <View testID={node.testId} onLayout={event=>setMeasuredWidth(event.nativeEvent.layout.width)}
    style={{width:'100%',minWidth:0,flexDirection:'row',flexWrap:'wrap',alignItems:'flex-start',gap}}>
    {(node.children??[]).map((section,index)=><View key={section.key??index}
      testID={`lesson-section-column-${index}`} style={{width:columnWidth,minWidth:0}}>
      <NativeView node={section} scale={scale} dark={dark} path={`${path}.${index}`}/>
    </View>)}
  </View>;
}
/** Maps the shared UI tree to real RN controls; no WebView/HTML rendering. */
export function NativeView({node: n, scale, dark, path = '0'}: NativeViewProps): React.JSX.Element {
  const layout=useResponsiveLayout();
  const s = styles(n.style, scale), ink = dark ? '#F0F5FF' : '#172033', line = dark ? '#2C3C55' : '#DFE7F1';
  const iconColor=typeof s.text.color==='string'?s.text.color:ink;
  const children = (n.children ?? []).map((child, i) => <NativeView
    key={child.key ?? `${path}.${i}`} node={child} scale={scale} dark={dark} path={`${path}.${i}`} />);
  if (n.kind === 'icon' && n.icon) return <View style={s.view} accessible={!!n.label} accessibilityRole={n.label?'image':undefined} accessibilityLabel={n.label} pointerEvents="none"><LearningIcon name={n.icon} size={n.iconSize??22} color={iconColor}/></View>;
  if (n.kind === 'text') return <Text accessibilityRole={n.heading ? 'header' : n.alert?'alert':undefined} accessibilityLiveRegion={n.alert?'polite':undefined}
    testID={n.testId} style={[s.view, {color: ink, flexShrink: 1}, s.text]}><RichText value={n.text ?? ''} /></Text>;
  if (n.kind === 'button') return <Pressable testID={n.testId} accessibilityRole={n.role ?? 'button'}
    accessibilityLabel={n.label ?? n.text} accessibilityState={{disabled: !!n.disabled, selected: !!n.selected, checked: n.checked, expanded:n.expanded}}
    disabled={n.disabled} onPress={() => {void n.action?.();}}
    style={({pressed}) => [{minHeight: 48,minWidth:0,maxWidth:'100%', justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 10}, s.view, {opacity: n.disabled ? (n.role==='radio'?1:0.45) : pressed ? 0.78 : 1}]}>
    {(n.text||n.icon)?<View style={{flexDirection:n.iconPosition==='above'?'column':'row',alignItems:'center',justifyContent:'center',gap:n.iconPosition==='above'?4:8}}>
      {n.icon&&n.iconPosition!=='trailing'?<LearningIcon name={n.icon} size={n.iconSize??(n.role==='tab'?23:20)} color={iconColor}/>:null}
      {n.text ? <Text style={[{color: ink, textAlign: 'center', fontSize: 15 * scale, fontWeight: '600', flexShrink: 1}, s.text]}><RichText value={n.text} /></Text> : null}
      {n.icon&&n.iconPosition==='trailing'?<LearningIcon name={n.icon} size={n.iconSize??20} color={iconColor}/>:null}
    </View>:null}
    {children}
  </Pressable>;
  if (n.kind === 'input') return <TextInput testID={n.testId} accessibilityLabel={n.label}
    value={n.value ?? ''} onChangeText={n.onChange} placeholder={n.placeholder}
    placeholderTextColor={dark ? '#B0BFD6' : '#53647F'} autoCorrect={false}
    autoCapitalize="none" multiline={n.multiline} keyboardAppearance={dark?'dark':'light'} keyboardType={n.inputMode === 'numeric' ? 'number-pad' : 'default'}
    style={[{color: ink}, s.view, s.text]} />;
  if (n.kind === 'date') return <DateField node={n} scale={scale} dark={dark} />;
  if (n.kind === 'code') return <StudyCode key={n.text} node={n} scale={scale} />;
  if (n.kind === 'table') return <StudyTable node={n} scale={scale} dark={dark} />;
  if (n.kind === 'progress') return <View accessibilityRole="progressbar" accessibilityLabel={n.label??'진행률'}
    accessibilityValue={{min: 0, max: 100, now: Math.round((n.progress ?? 0) * 100)}} style={{height: 8, backgroundColor: line, borderRadius: 8, overflow: 'hidden'}}>
    <View style={{height:8,width:`${Math.round((n.progress??0)*100)}%`,backgroundColor:String(n.style?.backgroundColor??'#2457D6')}} />
  </View>;
  if (n.kind === 'modal') return <Modal transparent visible animationType="fade" onRequestClose={n.close}>
    <SafeAreaView accessibilityViewIsModal style={{flex:1,backgroundColor:'rgba(10,20,40,0.5)',justifyContent:'center',paddingHorizontal:layout.horizontalPadding,paddingVertical:12}}>
      <ScrollView style={{maxHeight:'100%',flexGrow:0,width:'100%',maxWidth:560,alignSelf:'center'}} contentContainerStyle={{flexGrow:0,alignItems:'center'}} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </SafeAreaView>
  </Modal>;
  if(n.layout==='lesson-sections')return <LessonSections node={n} scale={scale} dark={dark} path={path}/>;
  if(n.layout==='adaptive-row'&&layout.stackRows)return <View testID={n.testId}
    style={[s.view,{flexDirection:'column',alignItems:'stretch',minWidth:0}]}>
    {(n.children??[]).filter(child=>!(child.kind==='box'&&!child.children?.length&&child.style?.flex)).map((child,index)=><NativeView
      key={child.key??`${path}.${index}`} node={{...child,style:{...child.style,flex:undefined,flexBasis:undefined,width:'100%',minWidth:0}}}
      scale={scale} dark={dark} path={`${path}.${index}`}/>)}
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
  return <View testID={n.testId} style={[{minWidth:0},s.view]}>{children}</View>;
}
