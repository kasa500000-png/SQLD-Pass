import type {AppState,Content,Lesson,PracticeResult,Question,StudyDay,Subject} from '../types';
import {dayKey,addDays} from './state';
import {canStudyQuestion} from './exam';
import {validReadingOffset} from './reading';

export interface LessonProgress {lessonId:string;read:boolean;answered:number;total:number;confirmationComplete:boolean;}
export function lessonProgress(s:AppState,c:Content,id:string):LessonProgress {
  const lesson=c.lessons.find(l=>l.id===id),ids=lesson?.questionIds??[];
  const answered=new Set(s.responses.map(r=>r.questionId));
  const count=ids.filter(qid=>answered.has(qid)).length;
  return {lessonId:id,read:s.readLessons.includes(id),answered:count,total:ids.length,confirmationComplete:!!lesson&&ids.length>0&&count===ids.length};
}
export function isReviewStudyDay(day:StudyDay):boolean {
  return day.mode==='review_and_external_assessment'&&!day.examId;
}
export function learningDayEligible(s:AppState,c:Content,day:number):boolean {
  const entry=c.days.find(d=>d.day===day);if(!entry)return false;
  if(entry.examId)return s.exams.some(e=>e.examId===entry.examId&&e.status==='submitted');
  const lessons=entry.lessonIds.map(id=>c.lessons.find(l=>l.id===id));
  if(!lessons.length||lessons.some(l=>!l))return false;
  if(isReviewStudyDay(entry)){
    // A plan-day binding is recorded only by a newly started, explicit plan review.
    // Historical first answers and ordinary due reviews never stand in for this work.
    const fresh=new Set(s.responses.filter(r=>r.planDay===day&&r.mode==='review').map(r=>r.questionId));
    return lessons.every(l=>l!.questionIds.length>0&&l!.questionIds.every(id=>fresh.has(id)));
  }
  return lessons.every(l=>lessonProgress(s,c,l!.id).confirmationComplete);
}
export function planCompletedDays(s:AppState,c:Content):number[] {
  if(s.planProgress?.version===2)return [...s.planProgress.completedDays];
  return c.days.filter(d=>!isReviewStudyDay(d)&&learningDayEligible(s,c,d.day)).map(d=>d.day).sort((a,b)=>a-b);
}
export function migrateLearningState(s:AppState,c:Content):AppState {
  if(s.planProgress?.version===2&&s.practiceResults!==undefined&&s.lastPracticeResultId!==undefined)return s;
  return {...s,planProgress:s.planProgress??{version:2,completedDays:planCompletedDays(s,c),legacyCompletedDays:[...s.completedDays]},
    practiceResults:s.practiceResults??[],lastPracticeResultId:s.lastPracticeResultId??null};
}
/** Confirmation completion advances the course without recording an unconfirmed read. */
export function nextConcept(s:AppState,c:Content,afterLessonId?:string):Lesson|undefined {
  const ordered=[...c.lessons].sort((a,b)=>a.order-b.order);
  const remaining=ordered.filter(l=>!lessonProgress(s,c,l.id).confirmationComplete);
  if(!afterLessonId)return remaining[0];
  const after=ordered.find(l=>l.id===afterLessonId);
  return (after?remaining.find(l=>l.order>after.order):undefined)??remaining[0];
}
export function completedPracticeResult(s:AppState,c:Content,sessionId:string,now:number):PracticeResult {
  const p=s.practice;if(!p||p.id!==sessionId||!p.submitted||p.index!==p.questionIds.length-1)throw new Error('아직 완료되지 않은 연습입니다.');
  const responses=p.questionIds.map((id,index)=>{
    const saved=s.responses.find(r=>r.id===`${p.id}:${index}`);
    if(!saved||saved.questionId!==id||saved.mode!==p.mode)throw new Error('저장된 풀이 기록을 확인할 수 없습니다.');
    return saved;
  });
  const wrongQuestionIds=responses.filter(r=>!r.correct).map(r=>r.questionId);
  const uncertainQuestionIds=responses.filter(r=>r.uncertain).map(r=>r.questionId);
  const available=availableQuestions(s,c);
  return {id:p.id,mode:p.mode,questionIds:[...p.questionIds],lessonIds:Array.from(new Set(p.questionIds.flatMap(id=>available.get(id)?.lessonIds??[]))),
    total:responses.length,correct:responses.length-wrongQuestionIds.length,uncertain:uncertainQuestionIds.length,
    wrongQuestionIds,uncertainQuestionIds,completedAt:now,...(p.planDay!==undefined?{planDay:p.planDay}:{})};
}

export interface PracticeOptions {lessonIds?:string[];source?:'all'|'confirmation'|'submitted-exams';filter?:'all'|'wrong'|'uncertain'|'unanswered';limit?:number;}
export interface PracticeTopic {id:string;title:string;subject:Subject;total:number;confirmation:number;exam:number;}
export interface AccuracyMetric {total:number;correct:number;confidentCorrect:number;percent:number|null;confidentPercent:number|null;}
export interface TopicPerformance {lessonId:string;title:string;subject:Subject;first:AccuracyMetric;recent:AccuracyMetric;sampleEnough:boolean;}
export interface LearningStats {recent7:{days:{day:string;studied:boolean;answered:number;correct:number}[];activeDays:number;answered:number;correct:number};streak:number;firstAccuracy:AccuracyMetric;recentAccuracy:AccuracyMetric;weakTopics:TopicPerformance[];}
export interface LearningRecommendation {kind:'exam'|'practice'|'review'|'concept'|'complete';attemptId?:string;practiceId?:string;lessonId?:string;questionIds:string[];planDay?:number;resumeReading?:boolean;}
export interface ShortSession {kind:'concept'|'review'|'complete';lessonId?:string;questionIds:string[];goalMinutes:number;estimatedMinutes:number;planDay?:number;}
interface Outcome {questionId:string;correct:boolean;uncertain:boolean;time:number;}
const QUESTION_MINUTES=2;

function availableQuestions(s:AppState,c:Content):Map<string,Question> {
  const questions=new Map<string,Question>();
  for(const lesson of c.lessons)for(const id of lesson.questionIds){const q=c.questions[id];if(q&&!q.examId)questions.set(id,q);}
  // Saved, submitted snapshots are the only source of mock questions in learning sets.
  for(const exam of s.exams)if(exam.status==='submitted')for(const q of exam.snapshots)questions.set(q.id,q);
  return questions;
}
function outcomes(s:AppState):{first:Map<string,Outcome>;recent:Map<string,Outcome>} {
  const first=new Map<string,Outcome>(),recent=new Map<string,Outcome>();
  const record=(outcome:Outcome)=>{const oldFirst=first.get(outcome.questionId),oldRecent=recent.get(outcome.questionId);if(!oldFirst||outcome.time<oldFirst.time)first.set(outcome.questionId,outcome);if(!oldRecent||outcome.time>=oldRecent.time)recent.set(outcome.questionId,outcome);};
  for(const exam of s.exams)if(exam.status==='submitted')for(const q of exam.snapshots)record({questionId:q.id,correct:exam.answers[q.id]===q.answer,uncertain:false,time:exam.submittedAt??exam.startedAt});
  for(const response of s.responses)record({questionId:response.questionId,correct:response.correct,uncertain:response.uncertain,time:response.answeredAt});
  return {first,recent};
}
export function practiceQuestionIds(s:AppState,c:Content,options:PracticeOptions={}):string[] {
  const source=options.source??'all',filter=options.filter??'all',recent=outcomes(s).recent;
  const selected=options.lessonIds?new Set(options.lessonIds):null;
  const ids=[...availableQuestions(s,c).values()].filter(q=>
    (source==='all'||source==='confirmation'&&!q.examId||source==='submitted-exams'&&!!q.examId)&&
    (!selected||q.lessonIds.some(id=>selected.has(id)))&&
    (filter==='all'||filter==='wrong'&&recent.has(q.id)&&!recent.get(q.id)!.correct||filter==='uncertain'&&recent.get(q.id)?.uncertain||filter==='unanswered'&&!recent.has(q.id))
  ).map(q=>q.id);
  const limit=options.limit===undefined?ids.length:Number.isFinite(options.limit)?Math.max(0,Math.min(50,Math.floor(options.limit))):0;
  return ids.slice(0,limit);
}
export function topicPracticeOptions(s:AppState,c:Content):PracticeTopic[] {
  const questions=[...availableQuestions(s,c).values()];
  return [...c.lessons].sort((a,b)=>a.order-b.order).map(l=>{const own=questions.filter(q=>q.lessonIds.includes(l.id)),confirmation=own.filter(q=>!q.examId).length;return {id:l.id,title:l.title,subject:l.subject,total:own.length,confirmation,exam:own.length-confirmation};});
}
function pendingPlanReview(s:AppState,c:Content):{day:number;ids:string[]}|undefined {
  const completed=planCompletedDays(s,c),day=c.days.find(d=>!completed.includes(d.day));
  if(!day||!isReviewStudyDay(day))return;
  const done=new Set(s.responses.filter(r=>r.planDay===day.day&&r.mode==='review').map(r=>r.questionId));
  return {day:day.day,ids:day.lessonIds.flatMap(id=>c.lessons.find(l=>l.id===id)?.questionIds??[]).filter(id=>!done.has(id))};
}
function dueLearningReviews(s:AppState,c:Content,now:number):string[]{
  return Object.values(s.reviews).filter(r=>r.dueDay<=dayKey(now)&&c.questions[r.questionId]&&canStudyQuestion(s,c.questions[r.questionId])).sort((a,b)=>a.dueDay.localeCompare(b.dueDay)||a.questionId.localeCompare(b.questionId)).map(r=>r.questionId);
}
function readingConcept(s:AppState,c:Content):Lesson|undefined {
  const id=s.reading?.lastLessonId,lesson=c.lessons.find(l=>l.id===id),position=id?s.reading?.positions[id]:undefined;
  return lesson&&position?.lessonVersion===lesson.version&&validReadingOffset(position)&&!s.readLessons.includes(lesson.id)&&!lessonProgress(s,c,lesson.id).confirmationComplete?lesson:undefined;
}
export function homeRecommendation(s:AppState,c:Content,now:number):LearningRecommendation {
  const active=s.exams.find(e=>e.status==='active');if(active)return {kind:'exam',attemptId:active.id,questionIds:[]};
  if(s.practice)return {kind:'practice',practiceId:s.practice.id,questionIds:[...s.practice.questionIds]};
  const reading=readingConcept(s,c);if(reading)return {kind:'concept',lessonId:reading.id,questionIds:[...reading.questionIds],resumeReading:true};
  const due=dueLearningReviews(s,c,now);if(due.length)return {kind:'review',questionIds:due.slice(0,10)};
  const lesson=nextConcept(s,c);if(lesson)return {kind:'concept',lessonId:lesson.id,questionIds:[...lesson.questionIds]};
  const plan=pendingPlanReview(s,c);if(plan?.ids.length)return {kind:'review',questionIds:plan.ids.slice(0,10),planDay:plan.day};
  return {kind:'complete',questionIds:[]};
}
export function shortSession(s:AppState,c:Content,now:number):ShortSession {
  const goalMinutes=s.settings.minutes,limit=Math.min(10,Math.floor(goalMinutes/QUESTION_MINUTES));
  const due=dueLearningReviews(s,c,now);if(due.length){const questionIds=due.slice(0,limit);return {kind:'review',questionIds,goalMinutes,estimatedMinutes:questionIds.length*QUESTION_MINUTES};}
  const plan=pendingPlanReview(s,c);if(plan?.ids.length){const questionIds=plan.ids.slice(0,limit);return {kind:'review',questionIds,goalMinutes,estimatedMinutes:questionIds.length*QUESTION_MINUTES,planDay:plan.day};}
  const preferred=readingConcept(s,c)??nextConcept(s,c),ordered=preferred?[preferred,...c.lessons.filter(l=>l.id!==preferred.id).sort((a,b)=>a.order-b.order)]:[];
  const minutes=(l:Lesson)=>(s.readLessons.includes(l.id)?0:l.minutes)+l.questionIds.length*QUESTION_MINUTES;
  const lesson=ordered.find(l=>!lessonProgress(s,c,l.id).confirmationComplete&&minutes(l)<=goalMinutes);
  if(lesson)return {kind:'concept',lessonId:lesson.id,questionIds:[...lesson.questionIds],goalMinutes,estimatedMinutes:minutes(lesson)};
  // If only longer lessons remain, give a bounded review of work already attempted.
  const answered=outcomes(s).recent,questionIds=practiceQuestionIds(s,c).filter(id=>answered.has(id)).slice(0,limit);
  return questionIds.length?{kind:'review',questionIds,goalMinutes,estimatedMinutes:questionIds.length*QUESTION_MINUTES}:{kind:'complete',questionIds:[],goalMinutes,estimatedMinutes:0};
}
function accuracy(values:Outcome[]):AccuracyMetric {
  const total=values.length,correct=values.filter(r=>r.correct).length,confidentCorrect=values.filter(r=>r.correct&&!r.uncertain).length;
  return {total,correct,confidentCorrect,percent:total?Math.round(correct/total*100):null,confidentPercent:total?Math.round(confidentCorrect/total*100):null};
}
export function learningStats(s:AppState,c:Content,now:number):LearningStats {
  const today=dayKey(now),days=Array.from({length:7},(_,i)=>addDays(today,i-6));
  const recent7Days=days.map(day=>{const responses=s.responses.filter(r=>dayKey(r.answeredAt)===day);return {day,studied:s.studyDays.includes(day)||responses.length>0,answered:responses.length,correct:responses.filter(r=>r.correct).length};});
  const activity=new Set([...s.studyDays,...s.responses.map(r=>dayKey(r.answeredAt))]);let cursor=activity.has(today)?today:addDays(today,-1),streak=0;
  while(activity.has(cursor)){streak++;cursor=addDays(cursor,-1);}
  const confirmation=new Set(c.lessons.flatMap(l=>l.questionIds));const first=new Map<string,Outcome>(),recent=new Map<string,Outcome>();
  // Preserve first saved answers and use ordered saves for latest practice answers.
  for(const r of s.responses)if(confirmation.has(r.questionId)){const value={questionId:r.questionId,correct:r.correct,uncertain:r.uncertain,time:r.answeredAt};if(!first.has(r.questionId))first.set(r.questionId,value);recent.set(r.questionId,value);}
  const all=outcomes(s),available=availableQuestions(s,c);
  const weakTopics=c.lessons.map(l=>{const ids=new Set([...available.values()].filter(q=>q.lessonIds.includes(l.id)).map(q=>q.id));const firstMetric=accuracy([...all.first.values()].filter(r=>ids.has(r.questionId))),recentMetric=accuracy([...all.recent.values()].filter(r=>ids.has(r.questionId)));return {lessonId:l.id,title:l.title,subject:l.subject,first:firstMetric,recent:recentMetric,sampleEnough:recentMetric.total>=3};})
    .filter(t=>t.recent.total>0&&(t.recent.confidentPercent??100)<80).sort((a,b)=>(a.recent.confidentPercent??100)-(b.recent.confidentPercent??100)||b.recent.total-a.recent.total);
  return {recent7:{days:recent7Days,activeDays:recent7Days.filter(d=>d.studied).length,answered:recent7Days.reduce((n,d)=>n+d.answered,0),correct:recent7Days.reduce((n,d)=>n+d.correct,0)},streak,firstAccuracy:accuracy([...first.values()]),recentAccuracy:accuracy([...recent.values()]),weakTopics};
}
