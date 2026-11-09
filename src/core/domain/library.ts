import type {AppState,Content,LibraryItem,StudyCollection} from '../types';
import {addDays,dayKey} from './state';

/** Keys match the released 0.2.0 library, including the submitted attempt identity. */
export function libraryItemKey(item:LibraryItem):string {
  return JSON.stringify(item.kind==='examReview'?[item.kind,item.attemptId,item.questionId]:[item.kind,item.id]);
}

export function validLibraryItem(value:unknown):value is LibraryItem {
  if(!value||typeof value!=='object')return false;
  const v=value as Record<string,unknown>;
  return v.kind==='examReview'?typeof v.attemptId==='string'&&!!v.attemptId&&typeof v.questionId==='string'&&!!v.questionId:
    (v.kind==='lesson'||v.kind==='question')&&typeof v.id==='string'&&!!v.id;
}

/** Refuse edits to malformed libraries instead of silently dropping unknown records. */
export function validCollections(value:unknown):value is StudyCollection[] {
  if(value===undefined)return true;
  if(!Array.isArray(value))return false;
  const ids=new Set<string>();
  return value.every(c=>{
    if(!c||typeof c!=='object'||typeof c.id!=='string'||!c.id||ids.has(c.id)||typeof c.name!=='string'||!c.name.trim()||!Number.isFinite(c.updatedAt)||!Array.isArray(c.items)||!c.items.every(validLibraryItem))return false;
    ids.add(c.id);return new Set(c.items.map(libraryItemKey)).size===c.items.length;
  });
}

export function resolveLibraryItem(s:AppState,c:Content,item:LibraryItem) {
  if(item.kind==='lesson'){
    const lesson=c.lessons.find(l=>l.id===item.id);return lesson?{title:lesson.title,kind:'lesson' as const,lesson}:null;
  }
  if(item.kind==='question'){
    const question=c.questions[item.id];
    return question&&!question.examId&&s.responses.some(r=>r.questionId===item.id)?{title:question.stem,kind:'question' as const,question}:null;
  }
  const attempt=s.exams.find(e=>e.id===item.attemptId&&e.status==='submitted');
  const index=attempt?.snapshots.findIndex(q=>q.id===item.questionId)??-1;
  return attempt&&index>=0?{title:attempt.snapshots[index].stem,kind:'examReview' as const,attempt,index,question:attempt.snapshots[index]}:null;
}

/** A week runs Monday through Sunday in the learner's local timezone. */
export function weeklyGoalProgress(s:AppState,now:number) {
  const today=dayKey(now),monday=addDays(today,-((new Date(now).getDay()+6)%7));
  const studied=new Set([...s.studyDays,...s.responses.map(r=>dayKey(r.answeredAt)),...s.exams.filter(e=>e.status==='submitted').map(e=>dayKey(e.submittedAt??e.startedAt))]);
  const days=Array.from({length:7},(_,i)=>{const day=addDays(monday,i);return {day,studied:studied.has(day)};});
  const raw=s.settings.weeklyGoalDays,goal=typeof raw==='number'&&Number.isInteger(raw)&&raw>=1&&raw<=7?raw:3;
  return {goal,days,count:days.filter(d=>d.studied).length};
}
