import type {AppState,Content,Exam,ExamAttempt,ExamMode,MockVolume,Question} from '../core/types';
import {canStudyQuestion} from '../core/domain/exam';
export function latestMocks(s:AppState,mode?:ExamMode,examIds?:readonly string[]):ExamAttempt[]{
 const latest=new Map<string,ExamAttempt>();
 for(const e of s.exams)if(e.status==='submitted'&&(!mode||(e.mode??'timed')===mode)&&(!examIds||examIds.includes(e.examId))){
  // Attempts append in serialized submission order; wall-clock rollback cannot revive an older result.
  latest.set(e.examId,e);
 }
 return [...latest.values()];
}
export function mockWrongQuestions(s:AppState):Question[]{
 return latestMocks(s).flatMap(e=>e.snapshots.filter(q=>e.answers[q.id]!==q.answer&&!s.mockStudy?.mastered[q.id]&&canStudyQuestion(s,q)));
}
export function mockStats(s:AppState,mode:ExamMode,examIds?:readonly string[]){const es=latestMocks(s,mode,examIds);return {completed:es.length,average:es.length?Math.round(es.reduce((n,e)=>n+(e.score?.points??0),0)/es.length):null,met:es.filter(e=>e.score?.practiceThresholdMet).length};}
export const modeName=(mode?:ExamMode)=>mode==='study'?'학습 모드':'실전 모드';

export const pauseUsage=(e:ExamAttempt)=>e.pauseCount===undefined?'이전 버전 응시 기록':e.pauseCount?`일시정지 사용 · ${e.pauseCount}회`:'일시정지 없이 제출';

/** Volume membership is catalog metadata; historical snapshots stay untouched. */
export function mockVolumes(c:Content):MockVolume[]{
 const p=c.mockPack;if(!p)return [];
 if(p.volumes)return p.volumes.map(v=>v.displayNumber?{...v,title:`${v.displayNumber}권`}:v);
 return [{id:'vol1',number:1,title:'1권',version:p.version,examIds:c.exams.map(e=>e.id),topicIds:p.topics.map(t=>t.id),sourceIds:Object.keys(c.sources).filter(id=>id.startsWith('ME20261109:source:')),editorialNote:p.editorialNote,assumptions:p.assumptions,quality:p.quality,integrationNote:p.integrationNote}];
}
export function mockVolumeForExam(c:Content,examId:string){return mockVolumes(c).find(v=>v.examIds.includes(examId));}
export function mockVolumeRange(c:Content,v:MockVolume){const ns=c.exams.filter(e=>v.examIds.includes(e.id)).map(e=>e.displayNumber??e.order);return ns.length?`${Math.min(...ns)}~${Math.max(...ns)}회`:'';}
export function mockScopeExamIds(c:Content,scope:string){return mockVolumes(c).find(v=>v.id===scope)?.examIds??c.exams.map(e=>e.id);}
export function mockExamTitle(c:Content,e:Exam|ExamAttempt):string {
 const catalog=c.exams.find(x=>x.id===('examId' in e?e.examId:e.id));
 return catalog?.displayNumber?`제${String(catalog.displayNumber).padStart(2,'0')}회 실전 모의고사`:e.title;
}
export function mockQuestionOrigin(c:Content,q:Question){const e=c.exams.find(e=>e.id===q.examId);return `${mockVolumeForExam(c,q.examId??'')?.title??'모의고사'} · 제${String(e?.displayNumber??e?.order??q.examId?.replace('SQLD-M','')).padStart(2,'0')}회 · ${q.number}번`;}
