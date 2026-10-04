import type {Content,Lesson,Subject} from '../core/types';
import type {Controller} from '../core/controller';

export interface LearningGroup {id:string;title:string;subject:Subject;lessons:Lesson[];}
export interface PracticeSetupDraft {lessonIds:string[];source:'all'|'confirmation'|'submitted-exams';filter:'all'|'wrong'|'uncertain'|'unanswered';limit:number;}
const practiceDrafts=new WeakMap<object,PracticeSetupDraft>();
const resetObservers=new WeakSet<object>();
/** Drafts are screen choices, never learner records; rendering only reads them. */
export function practiceSetupDraft(owner:object):PracticeSetupDraft {
  return practiceDrafts.get(owner)??{lessonIds:[],source:'all',filter:'all',limit:10};
}
export function updatePracticeSetupDraft(owner:Controller,patch:Partial<PracticeSetupDraft>):void {
  if(!resetObservers.has(owner)){
    resetObservers.add(owner);
    owner.subscribe(()=>{if(!owner.state.onboarded)practiceDrafts.delete(owner);});
  }
  practiceDrafts.set(owner,{...practiceSetupDraft(owner),...patch});
}
export function practiceSetupOptions(owner:object):Omit<PracticeSetupDraft,'lessonIds'>&{lessonIds?:string[]}{
  const draft=practiceSetupDraft(owner);
  return {...draft,lessonIds:draft.lessonIds.length?[...draft.lessonIds]:undefined};
}
/** Navigation labels only; the supplied lesson text and assessment topics remain untouched. */
export function learningGroups(content:Content):LearningGroup[]{
  const groups:[string,string,Subject,number,number][]=[
    ['model','모델링 기본','S1',1,7],['normalize','정규화와 모델 해석','S1',8,14],
    ['sql-basic','SQL 기본과 조건','S2',15,24],['aggregate','집계와 정렬','S2',25,30],
    ['join','조인','S2',31,35],['subquery','서브쿼리','S2',36,40],
    ['analytic','집합·그룹·윈도우','S2',41,49],['sql-extended','SQL 확장','S2',50,55],
    ['control','데이터 변경과 제어','S2',56,60]
  ];
  return groups.map(([id,title,subject,first,last])=>({id,title,subject,lessons:content.lessons.filter(l=>l.subject===subject&&l.order>=first&&l.order<=last)})).filter(g=>g.lessons.length);
}
