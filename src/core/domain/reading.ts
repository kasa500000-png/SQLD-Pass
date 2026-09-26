import type {Content,ReadingOffset,ReadingState} from '../types';

export function validReadingOffset(value:unknown):value is ReadingOffset {
  if(!value||typeof value!=='object')return false;
  const p=value as ReadingOffset;
  return Number.isFinite(p.offset)&&Number.isFinite(p.contentHeight)&&p.offset>=0&&p.contentHeight>0&&p.offset<=p.contentHeight;
}

/** Optional UI history must never prevent recovery of answers or exam snapshots. */
export function parseReading(raw:unknown,content:Content,sameContent:boolean):ReadingState {
  const result:ReadingState={lastLessonId:null,positions:{}};
  if(!sameContent||!raw||typeof raw!=='object')return result;
  const value=raw as Partial<ReadingState>;
  for(const lesson of content.lessons){
    const position=value.positions?.[lesson.id];
    if(validReadingOffset(position)&&position.lessonVersion===lesson.version)
      result.positions[lesson.id]={offset:position.offset,contentHeight:position.contentHeight,lessonVersion:lesson.version};
  }
  if(typeof value.lastLessonId==='string'&&result.positions[value.lastLessonId])result.lastLessonId=value.lastLessonId;
  return result;
}

/** Exact offset for the same layout; proportional fallback when text size/width changes. */
export function restoredReadingOffset(saved:ReadingOffset|undefined,height:number,viewport:number):number {
  if(!saved||!validReadingOffset(saved)||!Number.isFinite(height)||!Number.isFinite(viewport)||height<=0||viewport<=0)return 0;
  return Math.max(0,Math.min(height-viewport,saved.offset*height/saved.contentHeight));
}
