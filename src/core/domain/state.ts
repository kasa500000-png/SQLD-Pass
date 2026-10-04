import type {AppState,Content,Subject} from '../types';
import {canStudyQuestion,scoreExam} from './exam';
import {parseReading} from './reading';
import {isReviewStudyDay,migrateLearningState} from './learning';
import {matchesProductionContentApproval} from './release';

export const SUBJECTS:Record<Subject,string>={S1:'데이터 모델링의 이해',S2:'SQL 기본 및 활용'};
export function dayKey(time=Date.now()):string { const d=new Date(time); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
export function addDays(day:string,n:number):string { const [y,m,d]=day.split('-').map(Number);return dayKey(new Date(y,m-1,d+n,12).getTime()); }
export function validTargetDate(value:string,today=dayKey()):boolean {
  if(value==='')return true; if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const [y,m,d]=value.split('-').map(Number);return dayKey(new Date(y,m-1,d,12).getTime())===value&&value>=today&&y<2100;
}
export function initialState(content:Content,time=Date.now()):AppState {
  return {schema:1,contentVersion:content.manifest.version,revision:0,onboarded:false,startedDay:dayKey(time),settings:{minutes:45,targetDate:'',theme:'light',fontScale:1},readLessons:[],bookmarks:[],completedDays:[],studyDays:[],responses:[],reviews:{},practice:null,exams:[],planProgress:{version:2,completedDays:[],legacyCompletedDays:[]},practiceResults:[],lastPracticeResultId:null};
}
export function parseState(raw:unknown,content:Content):AppState {
  if(raw===null)return initialState(content);const s=raw as Partial<AppState>;
  if(!s||typeof s!=='object'||s.schema!==1||typeof s.revision!=='number'||!s.settings||!Array.isArray(s.exams)||!Array.isArray(s.responses)||!Array.isArray(s.readLessons)||!Array.isArray(s.bookmarks)||!Array.isArray(s.completedDays)||!Array.isArray(s.studyDays)||!s.reviews||typeof s.contentVersion!=='string'||typeof s.onboarded!=='boolean')throw new Error('학습 기록 형식이 올바르지 않습니다. 원본을 지우지 않고 복구를 중단했습니다.');
  if(![15,30,45,60,90].includes(s.settings.minutes)||![1,1.15,1.3].includes(s.settings.fontScale)||!['light','dark','system'].includes(s.settings.theme))throw new Error('설정 데이터가 손상되었습니다.');
  for(const e of s.exams){if(!Array.isArray(e.snapshots)||e.snapshots.length!==50||!e.checkpoint||!Number.isFinite(e.remainingMs)||!Number.isFinite(e.checkpoint.wall)||!Number.isFinite(e.checkpoint.mono)||!['active','submitted'].includes(e.status))throw new Error('시험 기록 형식을 확인할 수 없습니다.');}
  if(s.contentVersion!==content.manifest.version&&s.practice)throw new Error('진행 중 연습의 콘텐츠 버전이 다릅니다. 기존 버전으로 복구해야 합니다.');
  if(!Number.isInteger(s.revision)||s.revision<0||typeof s.startedDay!=='string'||typeof s.settings.targetDate!=='string')throw new Error('학습 기록의 필수 값이 손상되었습니다.');
  if(s.exams.filter(e=>e.status==='active').length>1)throw new Error('동시에 진행 중인 시험 기록이 여러 개입니다.');
  for(const e of s.exams){if(!Number.isInteger(e.index)||e.index<0||e.index>=50||e.remainingMs<0||!e.answers||!Array.isArray(e.flagged)||!Array.isArray(e.timeIssues)||typeof e.timeTrusted!=='boolean')throw new Error('시험 상태가 손상되었습니다.');scoreExam(e.snapshots,e.answers);if(e.status==='submitted'&&!e.score)throw new Error('제출된 시험에 채점 기록이 없습니다.');}
  const checked=s as AppState;
  const reviewDays=new Set(content.days.filter(isReviewStudyDay).map(d=>d.day));
  for(const r of s.responses)if(r.planDay!==undefined&&(!reviewDays.has(r.planDay)||r.mode!=='review'))throw new Error('복습일 풀이 기록이 손상되었습니다.');
  if(s.practice){const p=s.practice;if(!Array.isArray(p.questionIds)||!p.questionIds.length||new Set(p.questionIds).size!==p.questionIds.length||typeof p.id!=='string'||!p.id||typeof p.submitted!=='boolean'||typeof p.uncertain!=='boolean'||!['lesson','review'].includes(p.mode)||!Number.isInteger(p.sessionAnswered)||!Number.isInteger(p.sessionCorrect)||p.sessionCorrect<0||p.sessionCorrect>p.sessionAnswered||p.sessionAnswered<0||p.sessionAnswered>p.questionIds.length||!Number.isInteger(p.index)||p.index<0||p.index>=p.questionIds.length||p.questionIds.some(id=>!content.questions[id]||!canStudyQuestion(checked,content.questions[id])))throw new Error('진행 중 연습의 문항 상태가 올바르지 않습니다.');if(p.selected!==null&&!content.questions[p.questionIds[p.index]].options.some(o=>o.id===p.selected))throw new Error('진행 중 연습의 선택지가 올바르지 않습니다.');if(p.planDay!==undefined&&(!reviewDays.has(p.planDay)||p.mode!=='review'))throw new Error('진행 중 복습일이 올바르지 않습니다.');}
  if(s.planProgress){const p=s.planProgress;const valid=(xs:unknown)=>Array.isArray(xs)&&xs.every(x=>Number.isInteger(x)&&x>=1&&x<=30)&&new Set(xs).size===xs.length;if(p.version!==2||!valid(p.completedDays)||!valid(p.legacyCompletedDays))throw new Error('학습 계획 진도 형식이 올바르지 않습니다. 기존 기록은 유지됩니다.');}
  if(s.practiceResults!==undefined){if(!Array.isArray(s.practiceResults)||new Set(s.practiceResults.map(r=>r?.id)).size!==s.practiceResults.length)throw new Error('연습 결과 기록이 손상되었습니다.');for(const r of s.practiceResults){const subset=(ids:unknown)=>Array.isArray(ids)&&ids.every(id=>typeof id==='string'&&r.questionIds.includes(id))&&new Set(ids).size===ids.length;if(!r||typeof r.id!=='string'||!r.id||!['lesson','review'].includes(r.mode)||!Array.isArray(r.questionIds)||!r.questionIds.length||r.questionIds.some(id=>typeof id!=='string')||new Set(r.questionIds).size!==r.questionIds.length||!Array.isArray(r.lessonIds)||r.lessonIds.some(id=>typeof id!=='string')||!Number.isInteger(r.total)||r.total!==r.questionIds.length||!Number.isInteger(r.correct)||r.correct<0||r.correct>r.total||!Number.isInteger(r.uncertain)||!Number.isFinite(r.completedAt)||!subset(r.wrongQuestionIds)||!subset(r.uncertainQuestionIds)||r.correct!==r.total-r.wrongQuestionIds.length||r.uncertain!==r.uncertainQuestionIds.length||r.planDay!==undefined&&(!reviewDays.has(r.planDay)||r.mode!=='review'))throw new Error('연습 결과 기록이 손상되었습니다.');}}
  if(s.lastPracticeResultId!==undefined&&s.lastPracticeResultId!==null&&(typeof s.lastPracticeResultId!=='string'||!s.practiceResults?.some(r=>r.id===s.lastPracticeResultId)))throw new Error('마지막 연습 결과를 찾을 수 없습니다.');
  return migrateLearningState({...checked,reading:parseReading(s.reading,content,s.contentVersion===content.manifest.version)},content);
}
export function assertContent(c:Content):void {
  if(c.lessons.length!==60||c.exams.length!==20||Object.keys(c.questions).length!==1120)throw new Error('콘텐츠 수량 불일치');const lessonIds=new Set(c.lessons.map(x=>x.id));
  for(const [id,q] of Object.entries(c.questions)){if(q.id!==id||q.options.length!==4||new Set(q.options.map(o=>o.id)).size!==4||!q.options.some(o=>o.id===q.answer)||!q.explanation)throw new Error(`문항 검증 실패: ${id}`);if(q.lessonIds.some(x=>!lessonIds.has(x)))throw new Error(`이론 연결 실패: ${id}`);}
  for(const l of c.lessons)if(l.example&&(!Array.isArray(l.example.columns)||!Array.isArray(l.example.rows)||!Array.isArray(l.example.tables)))throw new Error(`예제 결과 형식 오류: ${l.id}`);
  const exposed=new Set<string>();for(const e of c.exams){const qs=e.questionIds.map(id=>c.questions[id]);if(qs.length!==50||qs.some(q=>!q)||qs.filter(q=>q.subject==='S1').length!==10||qs.filter(q=>q.subject==='S2').length!==40)throw new Error(`시험 구성 실패: ${e.id}`);for(const q of qs){if(exposed.has(q.id)||q.examId!==e.id)throw new Error('시험 문항 ID 중복');exposed.add(q.id);}}
  for(const l of c.lessons)if(l.questionIds.some(id=>!c.questions[id]||c.questions[id].examId!==null))throw new Error('학습·평가 풀 분리 실패');
}
export function canRelease(c:Content,approval?:unknown,sourceLock?:unknown):boolean {
  return matchesProductionContentApproval(c,approval,sourceLock);
}
