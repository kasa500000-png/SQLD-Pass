import type {WidgetSpec} from '../textbook/types';
import type {ReadingOffset} from '../core/types';
export type Style = Record<string,string|number|undefined>;
export type LearningIconName = 'home'|'book'|'timer'|'chart'|'settings'|'bookmark'|'search'|'chevron-right'|'check'|'close'|'arrow-right'|'refresh'|'bell'|'list'|'chevron-left'|'chevron-up'|'chevron-down';
export interface Node {
  widget?:WidgetSpec; highlight?:number[][];
  kind:'widget'|'box'|'text'|'button'|'input'|'date'|'progress'|'table'|'code'|'modal'|'icon'|'ring'; key?:string; children?:Node[];
  layout?:'lesson-sections'|'adaptive-row'|'dashboard'|'question-grid'|'segments';
  selectionStyle?:'tabs'|'segments';
  buttonKind?:'primary'|'secondary'|'row'|'choice'|'danger';
  feedback?:'correct'|'incorrect';
  contentWidth?:'reading';
  text?:string; subtitle?:string; style?:Style; label?:string; testId?:string; action?:()=>void|Promise<void>;
  icon?:LearningIconName; iconSize?:number; iconPosition?:'leading'|'trailing'|'above';
  disabled?:boolean; selected?:boolean; expanded?:boolean; value?:string; minimumDate?:string; placeholder?:string; onChange?:(v:string)=>void;
  clearable?:boolean; numberOfLines?:number; multiline?:boolean; inputMode?:'text'|'numeric'; progress?:number; columns?:string[]; rows?:(string|number|null)[][];
  scroll?:boolean; heading?:boolean; alert?:boolean; close?:()=>void; role?:'button'|'radio'|'tab'; checked?:boolean;
  reading?:{position?:ReadingOffset;anchorIndex?:number;onSave:(position:ReadingOffset)=>Promise<boolean>};
  catalog?:{context:string;position?:ReadingOffset;preserveContentOffset?:boolean;onRemember:(position:ReadingOffset)=>void};
}
// SQLD Pass reference design tokens. Keep light/dark semantic roles aligned.
export const light={bg:'#F6F8FC',surface:'#FFFFFF',ink:'#172033',muted:'#64718A',line:'#E6EAF1',controlBorder:'#7C889C',blue:'#2457D6',blueSoft:'#EDF3FF',navy:'#18243B',green:'#16836B',greenText:'#126B58',greenSoft:'#EAF7F1',orange:'#A96512',orangeText:'#8A530E',orangeSoft:'#FFF5E6',red:'#C34750',redText:'#A53640',redSoft:'#FFF0F1',code:'#EEF1F6',codeInk:'#24334B'};
export const dark={bg:'#101A2B',surface:'#182337',ink:'#E8EDF7',muted:'#9BAAC1',line:'#29374C',controlBorder:'#73839B',blue:'#89AAFF',blueSoft:'#253859',navy:'#253859',green:'#6FD1AF',greenText:'#6FD1AF',greenSoft:'#1D3935',orange:'#EDBC77',orangeText:'#EDBC77',orangeSoft:'#3A3025',red:'#F19A9E',redText:'#F19A9E',redSoft:'#3E2933',code:'#0C1421',codeInk:'#EBF2FF'};
export const learningType={
  title:{fontSize:20,lineHeight:29,fontWeight:'600'},
  heading:{fontSize:19,lineHeight:28,fontWeight:'600'},
  body:{fontSize:17,lineHeight:28,fontWeight:'400'},
  question:{fontSize:18,lineHeight:29,fontWeight:'600'},
  choice:{fontSize:16,lineHeight:26,fontWeight:'400'},
  meta:{fontSize:13,lineHeight:20,fontWeight:'400'},
} as const;
export const learningSpace={xs:4,sm:8,md:12,lg:16,xl:24,xxl:32} as const;
export const learningRadius={control:10,button:14,surface:16} as const;
export type Palette=typeof light;
export function box(children:Node[]=[],style:Style={},key?:string):Node{return {kind:'box',children,style,key};}
export function text(value:string,style:Style={},key?:string):Node{return {kind:'text',text:value,style,key};}
export function row(children:Node[],style:Style={}):Node{return box(children,{flexDirection:'row',alignItems:'center',gap:10,...style});}
/** Explicitly opt eligible groups into responsive wrapping; ordinary rows retain their layout. */
export function adaptiveRow(children:Node[],style:Style={}):Node{return {...row(children,{flexWrap:'wrap',...style}),layout:'adaptive-row'};}
export function button(label:string,action:()=>void|Promise<void>,style:Style={},props:Partial<Node>={}):Node{return {kind:'button',text:label,label,action,style,...props};}
export function progress(value:number,color:string):Node{return {kind:'progress',progress:Math.max(0,Math.min(1,value)),style:{backgroundColor:color}};}
export function table(columns:string[],rows:(string|number|null)[][],label='데이터 표'):Node{return {kind:'table',columns,rows,label};}
export function code(sql:string):Node{return {kind:'code',text:sql,label:'SQL 코드'};}

/** Compact selection groups wrap only when their labels need the space. */
export function segments(children:Node[]):Node{return {...row(children),layout:'segments'};}
/** Selection semantics are explicit; navigation/action groups keep their own appearance. */
export function selectionGroup(children:Node[],variant:'tabs'|'segments'='segments'):Node{
 return {...segments(children),selectionStyle:variant,children:children.map(n=>({...n,role:variant==='tabs'?'tab':'radio',checked:variant==='segments'?!!n.selected:undefined,...(variant==='segments'&&n.selected?{icon:'check' as const,iconSize:14}:{})}))};
}
export function selectionStyle(n:Node,p:Palette,variant:'tabs'|'segments'):Style{
 return {minHeight:48,fontSize:15,lineHeight:22,fontWeight:n.selected?'600':'400',color:n.selected?p.blue:p.ink,
  backgroundColor:variant==='tabs'?p.surface:n.selected?p.blueSoft:p.surface,
  borderRadius:variant==='tabs'?0:10,borderWidth:variant==='tabs'?0:n.selected?2:1,
  borderBottomWidth:variant==='tabs'?(n.selected?3:1):n.selected?2:1,borderColor:n.selected?p.blue:p.controlBorder};
}
