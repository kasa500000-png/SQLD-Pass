import React from 'react';
import {
  Modal, Platform, Pressable, ScrollView, Text, TextInput, View,
  type TextStyle, type ViewStyle
} from 'react-native';
import type {Node, Style} from '../ui/nodes';
import {StudyCode,StudyTable} from './StudyReadables';

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
/** Maps the shared UI tree to real RN controls; no WebView/HTML rendering. */
export function NativeView({node: n, scale, dark, path = '0'}: NativeViewProps): React.JSX.Element {
  const s = styles(n.style, scale), ink = dark ? '#F0F5FF' : '#172033', line = dark ? '#2C3C55' : '#DFE7F1';
  const children = (n.children ?? []).map((child, i) => <NativeView
    key={child.key ?? `${path}.${i}`} node={child} scale={scale} dark={dark} path={`${path}.${i}`} />);
  if (n.kind === 'text') return <Text accessibilityRole={n.heading ? 'header' : undefined}
    testID={n.testId} style={[s.view, {color: ink, flexShrink: 1}, s.text]}><RichText value={n.text ?? ''} /></Text>;
  if (n.kind === 'button') return <Pressable testID={n.testId} accessibilityRole={n.role ?? 'button'}
    accessibilityLabel={n.label ?? n.text} accessibilityState={{disabled: !!n.disabled, selected: !!n.selected, checked: n.checked}}
    disabled={n.disabled} onPress={() => {void n.action?.();}}
    style={({pressed}) => [{minHeight: 48, justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 10}, s.view, {opacity: pressed ? 0.78 : n.disabled ? 0.78 : 1}]}>
    {n.text ? <Text style={[{color: ink, textAlign: 'center', fontSize: 15 * scale, fontWeight: '600', flexShrink: 1}, s.text]}><RichText value={n.text} /></Text> : null}
    {children}
  </Pressable>;
  if (n.kind === 'input') return <TextInput testID={n.testId} accessibilityLabel={n.label}
    value={n.value ?? ''} onChangeText={n.onChange} placeholder={n.placeholder}
    placeholderTextColor={dark ? '#B0BFD6' : '#53647F'} autoCorrect={false}
    autoCapitalize="none" multiline={n.multiline} keyboardType={n.inputMode === 'numeric' ? 'number-pad' : 'default'}
    style={[{color: ink}, s.view, s.text]} />;
  if (n.kind === 'code') return <StudyCode key={n.text} node={n} scale={scale} />;
  if (n.kind === 'table') return <StudyTable node={n} scale={scale} dark={dark} />;
  if (n.kind === 'progress') return <View accessibilityRole="progressbar" accessibilityLabel="진행률"
    accessibilityValue={{min: 0, max: 100, now: Math.round((n.progress ?? 0) * 100)}} style={{height: 8, backgroundColor: line, borderRadius: 8, overflow: 'hidden'}}>
    <View style={{height:8,width:`${Math.round((n.progress??0)*100)}%`,backgroundColor:String(n.style?.backgroundColor??'#2457D6')}} />
  </View>;
  if (n.kind === 'modal') return <Modal transparent visible animationType="fade" onRequestClose={n.close}>
    <View accessibilityViewIsModal style={{flex:1,backgroundColor:'rgba(10,20,40,0.5)',justifyContent:'center',padding:24}}>
      <ScrollView style={{maxHeight:'85%',flexGrow:0,width:'100%'}} contentContainerStyle={{flexGrow:0}} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </View>
  </Modal>;
  if (n.scroll) return <ScrollView key={n.key} testID={n.testId} keyboardShouldPersistTaps="handled"
    showsVerticalScrollIndicator contentContainerStyle={s.view} style={{flex:1}}>{children}</ScrollView>;
  return <View testID={n.testId} style={s.view}>{children}</View>;
}
