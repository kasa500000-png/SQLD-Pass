import type {AppState,Question} from '../types';
import {validateWallet,type MonetizedState} from '../../monetization/policy';

export const CURATED_MOCK_VERSION='textbook.20261112.2';
export const retiredMockExam=(id:string)=>/^SQLD-M(0[1-9]|1[0-9]|20)$/.test(id);
export const retiredMockQuestion=(id:string)=>id.startsWith('ME20261109:');
export const retiredMockSnapshot=(qs:Question[])=>qs.some(q=>retiredMockQuestion(q.id)||!!q.examId&&retiredMockExam(q.examId));

/** Also accepts SQLite state payloads with detached snapshots. Never mutates the input. */
export function retireOriginalMocks(s:AppState):AppState {
 const retiredAttempts=new Set(s.exams.filter(e=>retiredMockExam(e.examId)).map(e=>e.id));
 const results=s.practiceResults?.filter(r=>!r.questionIds.some(retiredMockQuestion));
 const cleanMap=<T>(m:Record<string,T>)=>Object.fromEntries(Object.entries(m).filter(([id])=>!retiredMockQuestion(id)));
 const w=(s as MonetizedState).monetization;
 if(w!==undefined&&!validateWallet(w))throw Error('모의고사 이용 권한을 확인하지 못했습니다. 기존 기록을 유지했습니다.');
 const m=s.mockStudy;
 const collections=s.collections?.map(c=>({...c,items:c.items.filter(item=>item.kind==='examReview'?!retiredAttempts.has(item.attemptId)&&!retiredMockQuestion(item.questionId):item.kind!=='question'||!retiredMockQuestion(item.id))}));
 return {...s,contentVersion:CURATED_MOCK_VERSION,
  exams:s.exams.filter(e=>!retiredMockExam(e.examId)),
  responses:s.responses.filter(r=>!retiredMockQuestion(r.questionId)),reviews:cleanMap(s.reviews),
  practice:s.practice?.questionIds.some(retiredMockQuestion)?null:s.practice,
  ...(results?{practiceResults:results,lastPracticeResultId:s.lastPracticeResultId&&results.some(r=>r.id===s.lastPracticeResultId)?s.lastPracticeResultId:null}:{}),
  ...(collections?{collections}:{}),
  ...(m?{mockStudy:{bookmarks:m.bookmarks.filter(id=>!retiredMockQuestion(id)),notes:cleanMap(m.notes),mastered:cleanMap(m.mastered)}}:{}),
  ...(w?{monetization:{...w,grants:Object.fromEntries(Object.entries(w.grants).filter(([id])=>!retiredMockExam(id))),pending:w.pending&&retiredMockExam(w.pending.examId)?null:w.pending}}:{}),
  mockCatalogMigration:{version:1,fromVersion:s.contentVersion,noticePending:true},
 } as AppState;
}
