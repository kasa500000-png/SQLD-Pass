import type {AppState,Content,PracticeResponse,Question,ReviewItem} from '../types';
import {canStudyQuestion} from './exam';
import {addDays,dayKey} from './state';

export function reviewAfter(old:ReviewItem|undefined,qid:string,correct:boolean,uncertain:boolean,now:number):ReviewItem {
  const today=dayKey(now);const successful=correct&&!uncertain;
  const step=!successful?0:old?(old.lastAnsweredDay===today?old.step:Math.min(3,old.step+1)):0;
  return {questionId:qid,dueDay:addDays(today,[1,3,7,14][step]),step,lastAnsweredDay:today,lastCorrect:successful};
}
export function applyPractice(s:AppState,q:Question,selected:string,uncertain:boolean,now:number,responseId:string,mode:'lesson'|'review'):AppState {
  if(!canStudyQuestion(s,q))throw new Error('제출 전 모의고사 문항은 일반 연습에 노출할 수 없습니다.');
  if(!q.options.some(o=>o.id===selected))throw new Error('보기를 선택해 주세요.');
  if(s.responses.some(r=>r.id===responseId))return s;
  const correct=selected===q.answer;const response:PracticeResponse={id:responseId,questionId:q.id,version:q.version,selected,uncertain,correct,answeredAt:now,mode};
  const reviews={...s.reviews};if(!correct||uncertain||reviews[q.id])reviews[q.id]=reviewAfter(reviews[q.id],q.id,correct,uncertain,now);
  return {...s,responses:[...s.responses,response],reviews,studyDays:Array.from(new Set([...s.studyDays,dayKey(now)]))};
}
export function dueReviews(s:AppState,c:Content,now:number):string[]{ return Object.values(s.reviews).filter(r=>r.dueDay<=dayKey(now)&&c.questions[r.questionId]&&canStudyQuestion(s,c.questions[r.questionId])).sort((a,b)=>a.dueDay.localeCompare(b.dueDay)).map(r=>r.questionId); }
/** First saved answers to lesson confirmation questions, including their review sessions. */
export function confirmationAccuracy(s:AppState,c:Content){
  const questionIds=new Set(c.lessons.flatMap(l=>l.questionIds));
  const first=new Map<string,PracticeResponse>();
  for(const response of s.responses){
    if(questionIds.has(response.questionId)&&!first.has(response.questionId))first.set(response.questionId,response);
  }
  const answers=[...first.values()],total=answers.length;
  const correct=answers.filter(r=>r.correct).length,confidentCorrect=answers.filter(r=>r.correct&&!r.uncertain).length;
  return {total,correct,confidentCorrect,percent:total?Math.round(correct/total*100):null,confidentPercent:total?Math.round(confidentCorrect/total*100):null};
}
export function eligibleDay(s:AppState,c:Content,day:number):boolean {
  const d=c.days.find(x=>x.day===day);if(!d)return false;
  if(d.examId)return s.exams.some(e=>e.examId===d.examId&&e.status==='submitted');
  if(d.lessonIds.length)return d.lessonIds.every(id=>s.readLessons.includes(id)&&c.lessons.find(l=>l.id===id)!.questionIds.every(q=>s.responses.some(r=>r.questionId===q)));
  return s.studyDays.includes(dayKey())||s.readLessons.length===60;
}
