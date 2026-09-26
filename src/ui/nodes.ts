import type {ReadingOffset} from '../core/types';
export type Style = Record<string,string|number|undefined>;
export interface Node {
  kind:'box'|'text'|'button'|'input'|'progress'|'table'|'code'|'modal'; key?:string; children?:Node[];
  text?:string; style?:Style; label?:string; testId?:string; action?:()=>void|Promise<void>;
  disabled?:boolean; selected?:boolean; value?:string; placeholder?:string; onChange?:(v:string)=>void;
  multiline?:boolean; inputMode?:'text'|'numeric'; progress?:number; columns?:string[]; rows?:(string|number|null)[][];
  scroll?:boolean; heading?:boolean; close?:()=>void; role?:'button'|'radio'|'tab'; checked?:boolean;
  reading?:{position?:ReadingOffset;onSave:(position:ReadingOffset)=>Promise<boolean>};
}
export const light={bg:'#F6F8FC',surface:'#FFFFFF',ink:'#172033',muted:'#53647F',line:'#DFE7F1',blue:'#2457D6',blueSoft:'#EAF0FF',navy:'#12254A',green:'#13734D',greenSoft:'#E9F7EF',orange:'#8A4B08',orangeSoft:'#FFF5E5',red:'#B42318',redSoft:'#FDEDEB',code:'#13233D',codeInk:'#EBF2FF'};
export const dark={bg:'#0B1220',surface:'#152136',ink:'#F0F5FF',muted:'#B0BFD6',line:'#2C3C55',blue:'#8BB1FF',blueSoft:'#20365D',navy:'#20365D',green:'#8CE0B6',greenSoft:'#19392D',orange:'#FFD39B',orangeSoft:'#44321C',red:'#FFB4AE',redSoft:'#482925',code:'#08101D',codeInk:'#EBF2FF'};
export type Palette=typeof light;
export function box(children:Node[]=[],style:Style={},key?:string):Node{return {kind:'box',children,style,key};}
export function text(value:string,style:Style={},key?:string):Node{return {kind:'text',text:value,style,key};}
export function row(children:Node[],style:Style={}):Node{return box(children,{flexDirection:'row',alignItems:'center',gap:10,...style});}
export function button(label:string,action:()=>void|Promise<void>,style:Style={},props:Partial<Node>={}):Node{return {kind:'button',text:label,label,action,style,...props};}
export function progress(value:number,color:string):Node{return {kind:'progress',progress:Math.max(0,Math.min(1,value)),style:{backgroundColor:color}};}
export function table(columns:string[],rows:(string|number|null)[][],label='데이터 표'):Node{return {kind:'table',columns,rows,label};}
export function code(sql:string):Node{return {kind:'code',text:sql,label:'SQL 코드'};}
