import type {MemoryNotes,MemoryNoteState} from './types';
import {validReadingOffset} from '../core/domain/reading';

export type MemoryFilter='all'|'priority'|'saved';
export function searchMemoryNotes(pack:MemoryNotes,query:string,filter:MemoryFilter,bookmarks:readonly string[]){
 const words=query.trim().normalize('NFKC').toLocaleLowerCase().split(/\s+/).filter(Boolean);
 return pack.notes.filter(n=>(filter!=='priority'||n.priority)&&(filter!=='saved'||bookmarks.includes(n.id))&&words.every(word=>[n.title,n.core,n.watch,n.explanation,n.example,n.dialect].join(' ').normalize('NFKC').toLocaleLowerCase().includes(word)));
}
/** Invalid optional data stops recovery; never silently discard saved notes. */
export function validateMemoryState(value:MemoryNoteState|undefined,pack:MemoryNotes|undefined){
 if(value===undefined)return;
 const ids=new Set(pack?.notes.map(n=>n.id)),categories=new Set(pack?.categories.map(n=>n.id));
 if(!pack||!value||!Array.isArray(value.bookmarks)||new Set(value.bookmarks).size!==value.bookmarks.length||value.bookmarks.some(id=>!ids.has(id))||value.lastCategoryId!==null&&!categories.has(value.lastCategoryId)||!value.positions||typeof value.positions!=='object'||Array.isArray(value.positions)||Object.entries(value.positions).some(([id,p])=>!categories.has(id)||!p||!validReadingOffset(p)||typeof p.version!=='string'))throw Error('핵심 노트 기록이 손상되었습니다. 원본 기록을 유지했습니다.');
}
