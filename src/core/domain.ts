import type { AppState,Clock,Content,Exam,ExamAttempt,PracticeResponse,PublicQuestion,Question,ReviewItem,Score,Subject } from './types';
export const SUBJECTS:Record<Subject,string>={S1:'데이터 모델링의 이해',S2:'SQL 기본 및 활용'};
export function dayKey(time=Date.now()):string { const d=new Date(time); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
export function addDays(day:string,n:number):string { const [y,m,d]=day.split('-').map(Number);return dayKey(new Date(y,m-1,d+n,12).getTime()); }
export function validTargetDate(value:string,today=dayKey()):boolean {
  if(value==='')return true; if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const [y,m,d]=value.split('-').map(Number);return dayKey(new Date(y,m-1,d,12).getTime())===value&&value>=today&&y<2100;
}
export function initialState(content:Content,time=Date.now()):AppState {
  return {schema:1,contentVersion:content.manifest.version,revision:0,onboarded:false,startedDay:dayKey(time),
    settings:{minutes:45,targetDate:'',theme:'light',fontScale:1},readLessons:[],bookmarks:[],completedDays:[],studyDays:[],responses:[],reviews:{},practice:null,exams:[]};
}
export function publicQuestion(q:Question):PublicQuestion { return {id:q.id,subject:q.subject,stem:q.stem,tables:q.tables,sql:q.sql,options:q.options,dialect:q.dialect}; }
export function canStudyQuestion(s:AppState,q:Question):boolean { return !q.examId||s.exams.some(e=>e.status==='submitted'&&e.snapshots.some(x=>x.id===q.id)); }
export function scoreExam(qs:Question[],answers:Record<string,string>):Score {
  if(qs.length!==50||qs.filter(q=>q.subject==='S1').length!==10||qs.filter(q=>q.subject==='S2').length!==40)throw new Error('채점할 시험 구성은 10+40문항이어야 합니다.');
  const bySubject:Score['bySubject']={S1:{points:0,max:20,correct:0,total:10,meetsMinimum:false},S2:{points:0,max:80,correct:0,total:40,meetsMinimum:false}};
  let correct=0,unanswered=0;for(const q of qs){if(!answers[q.id])unanswered++;if(answers[q.id]===q.answer){correct++;bySubject[q.subject].correct++;bySubject[q.subject].points+=2;}}
  bySubject.S1.meetsMinimum=bySubject.S1.points>=8;bySubject.S2.meetsMinimum=bySubject.S2.points>=32;
  return {points:correct*2,correct,unanswered,total:50,bySubject,practiceThresholdMet:correct*2>=60&&bySubject.S1.meetsMinimum&&bySubject.S2.meetsMinimum};
}
export function canRelease(c:Content):boolean {return c.manifest.releaseReady&&c.manifest.humanReviewed&&c.manifest.officialSyllabusVerified&&c.lessons.every(l=>l.releaseReady&&l.humanReviewed)&&Object.values(c.questions).every(q=>q.releaseReady&&q.humanReviewed);}
export function formatTime(ms:number):string {const n=Math.max(0,Math.ceil(ms/1000));return `${String(Math.floor(n/3600)).padStart(2,'0')}:${String(Math.floor(n%3600/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;}
