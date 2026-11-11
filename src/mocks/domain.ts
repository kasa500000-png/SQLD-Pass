import type {AppState,ExamAttempt,ExamMode,Question} from '../core/types';
import {canStudyQuestion} from '../core/domain/exam';
export function latestMocks(s:AppState,mode?:ExamMode):ExamAttempt[]{
 const latest=new Map<string,ExamAttempt>();
 for(const e of s.exams)if(e.status==='submitted'&&(!mode||(e.mode??'timed')===mode)){
  // Attempts append in serialized submission order; wall-clock rollback cannot revive an older result.
  latest.set(e.examId,e);
 }
 return [...latest.values()];
}
export function mockWrongQuestions(s:AppState):Question[]{
 return latestMocks(s).flatMap(e=>e.snapshots.filter(q=>e.answers[q.id]!==q.answer&&!s.mockStudy?.mastered[q.id]&&canStudyQuestion(s,q)));
}
export function mockStats(s:AppState,mode:ExamMode){const es=latestMocks(s,mode);return {completed:es.length,average:es.length?Math.round(es.reduce((n,e)=>n+(e.score?.points??0),0)/es.length):null,met:es.filter(e=>e.score?.practiceThresholdMet).length};}
export const modeName=(mode?:ExamMode)=>mode==='study'?'학습 모드':'실전 모드';

export const pauseUsage=(e:ExamAttempt)=>e.pauseCount===undefined?'이전 버전 응시 기록':e.pauseCount?`일시정지 사용 · ${e.pauseCount}회`:'일시정지 없이 제출';
