import type {Cell} from '../core/types';
export type ContentBlock =
 | {type:'paragraph';text:string}
 | {type:'callout'|'details';title:string;text:string;tone?:string}
 | {type:'code';code:string;label?:string}
 | {type:'table';headers:string[];rows:Cell[][];caption?:string}
 | {type:'flow';items:string[]}
 | {type:'widget';widget:string};
export interface WidgetNode {kind:'group'|'text'|'code'|'table'|'button';text?:string;children?:WidgetNode[];controls?:boolean;emphasis?:boolean;highlighted?:boolean;framed?:boolean;columns?:string[];rows?:Cell[][];highlight?:number[][];target?:number|null;selected?:boolean;disabled?:boolean;}
export interface WidgetSpec {title:string;states:{nodes:WidgetNode[]}[];}
export interface Textbook {
 id:string;parts:{id:string;title:string;chapterIds:string[]}[];
 chapters:{id:string;number:number;title:string;subtitle:string;goals:string[];recap:string[];sectionIds:string[]}[];
 glossary:{id:string;term:string;english:string;definition:string;sectionId:string}[];
 flashcards:{id:string;prompt:string;answer:string;sectionId:string}[];
 coverage:{topic:string;sections:string[]}[];datasets:unknown[];widgets:Record<string,WidgetSpec>;
 editorialNote:string;labNote:string;
}
