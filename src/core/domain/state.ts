import type {AppState,Content,Subject} from '../types';
import {canStudyQuestion,scoreExam} from './exam';

export const SUBJECTS:Record<Subject,string>={S1:'데이터 모델링의 이해',S2:'SQL 기본 및 활용'};
export function dayKey(time=Date.now()):string { const d=new Date(time); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
export function addDays(day:string,n:number):string { const [y,m,d]=day.split('-').map(Number);return dayKey(new Date(y,m-1,d+n,12).getTime()); }
export function validTargetDate(value:string,today=dayKey()):boolean {
  if(value==='')return true; if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const [y,m,d]=value.split('-').map(Number);return dayKey(new Date(y,m-1,d,12).getTime())===value&&value>=today&&y<2100;
}
export function initialState(content:Content,time=Date.now()):AppState {
  return {schema:1,contentVersion:content.manifest.version,revision:0,onboarded:false,startedDay:dayKey(time),settings:{minutes:45,targetDate:'',theme:'light',fontScale:1},readLessons:[],bookmarks:[],completedDays:[],studyDays:[],responses:[],reviews:{},practice:null,exams:[]};
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
  if(s.practice){const p=s.practice;if(!Array.isArray(p.questionIds)||!p.questionIds.length||!Number.isInteger(p.index)||p.index<0||p.index>=p.questionIds.length||p.questionIds.some(id=>!content.questions[id]||!canStudyQuestion(checked,content.questions[id])))throw new Error('진행 중 연습의 문항 상태가 올바르지 않습니다.');if(p.selected!==null&&!content.questions[p.questionIds[p.index]].options.some(o=>o.id===p.selected))throw new Error('진행 중 연습의 선택지가 올바르지 않습니다.');}
  return checked;
}
export function assertContent(c:Content):void {
  if(c.lessons.length!==60||c.exams.length!==20||Object.keys(c.questions).length!==1120)throw new Error('콘텐츠 수량 불일치');const lessonIds=new Set(c.lessons.map(x=>x.id));
  for(const [id,q] of Object.entries(c.questions)){if(q.id!==id||q.options.length!==4||new Set(q.options.map(o=>o.id)).size!==4||!q.options.some(o=>o.id===q.answer)||!q.explanation)throw new Error(`문항 검증 실패: ${id}`);if(q.lessonIds.some(x=>!lessonIds.has(x)))throw new Error(`이론 연결 실패: ${id}`);}
  for(const l of c.lessons)if(l.example&&(!Array.isArray(l.example.columns)||!Array.isArray(l.example.rows)||!Array.isArray(l.example.tables)))throw new Error(`예제 결과 형식 오류: ${l.id}`);
  const exposed=new Set<string>();for(const e of c.exams){const qs=e.questionIds.map(id=>c.questions[id]);if(qs.length!==50||qs.some(q=>!q)||qs.filter(q=>q.subject==='S1').length!==10||qs.filter(q=>q.subject==='S2').length!==40)throw new Error(`시험 구성 실패: ${e.id}`);for(const q of qs){if(exposed.has(q.id)||q.examId!==e.id)throw new Error('시험 문항 ID 중복');exposed.add(q.id);}}
  for(const l of c.lessons)if(l.questionIds.some(id=>!c.questions[id]||c.questions[id].examId!==null))throw new Error('학습·평가 풀 분리 실패');
}
export function canRelease(c:Content):boolean {return c.manifest.releaseReady&&c.manifest.humanReviewed&&c.manifest.officialSyllabusVerified&&c.lessons.every(l=>l.releaseReady&&l.humanReviewed)&&Object.values(c.questions).every(q=>q.releaseReady&&q.humanReviewed);}
