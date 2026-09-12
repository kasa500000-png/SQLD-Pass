export type Subject = 'S1' | 'S2';
export type Cell = string | number | null;
export interface DataTable { name: string; columns: string[]; rows: Cell[][]; }
export interface Option { id: string; text: string; format: string; }
export interface Question {
  id: string; subject: Subject; lessonIds: string[]; stem: string; tables: DataTable[]; sql: string;
  options: Option[]; answer: string; explanation: string; optionExplanations: Record<string,string>;
  family: string; dialect: string; examId: string | null; topic: string; version: string;
  releaseReady: boolean; humanReviewed: boolean; sourceIds: string[];
}
export type PublicQuestion = Pick<Question,'id'|'subject'|'stem'|'tables'|'sql'|'options'|'dialect'>;
export interface WorkedExample { sql:string; columns:string[]; rows:Cell[][]; note:string; tables:DataTable[]; dialect:string; targetExecuted:boolean; }
export interface Lesson {
  id:string; title:string; subject:Subject; day:number; order:number; minutes:number; objectives:string[];
  prerequisites:string[]; body:string; summary:string[]; questionIds:string[]; sourceIds:string[]; dialect:string;
  example:WorkedExample|null; releaseReady:boolean; humanReviewed:boolean; version:string;
}
export interface Exam { id:string; title:string; order:number; durationSeconds:number; questionIds:string[]; version:string; releaseReady:boolean; statisticallyEquated:boolean; }
export interface StudyDay { day:number; lessonIds:string[]; task:string; mode:string; minutes:number; examId:string|null; }
export interface Manifest { schema:number; version:string; theoryVersion:string; examVersion:string; releaseReady:boolean; humanReviewed:boolean; officialSyllabusVerified:boolean; counts:{lessons:number;practice:number;exams:number;examQuestions:number}; note:string; }
export interface Content { manifest:Manifest; lessons:Lesson[]; questions:Record<string,Question>; exams:Exam[]; days:StudyDay[]; sources:Record<string,{title:string;url:string;provider:string}>; }
export interface Clock { wall:number; mono:number; runtimeId:string; }
export interface Score {
  points:number; correct:number; unanswered:number; total:number; bySubject:Record<Subject,{points:number;max:number;correct:number;total:number;meetsMinimum:boolean}>;
  practiceThresholdMet:boolean;
}
export interface ExamAttempt {
  id:string; examId:string; contentVersion:string; examVersion:string; title:string;
  status:'active'|'submitted'; startedAt:number; submittedAt?:number; durationSeconds:number;
  remainingMs:number; checkpoint:Clock; timeTrusted:boolean; timeIssues:string[];
  snapshots:Question[]; answers:Record<string,string>; flagged:string[]; index:number;
  score?:Score; isFirstAttempt:boolean; exposedFamilyCount:number; submitReason?:'manual'|'expired';
}
export interface PracticeResponse {
  id:string; questionId:string; version:string; selected:string; correct:boolean; uncertain:boolean;
  answeredAt:number; mode:'lesson'|'review';
}
export interface ReviewItem { questionId:string; dueDay:string; step:number; lastAnsweredDay:string; lastCorrect:boolean; }
export interface PracticeSession {
  id:string; questionIds:string[]; index:number; selected:string|null; uncertain:boolean;
  submitted:boolean; mode:'lesson'|'review'; sessionCorrect:number; sessionAnswered:number;
}
export interface Settings { minutes:number; targetDate:string; theme:'light'|'dark'|'system'; fontScale:number; }
export interface AppState {
  schema:1; contentVersion:string; revision:number; onboarded:boolean; startedDay:string;
  settings:Settings; readLessons:string[]; bookmarks:string[]; completedDays:number[]; studyDays:string[];
  responses:PracticeResponse[]; reviews:Record<string,ReviewItem>; practice:PracticeSession|null;
  exams:ExamAttempt[];
}
export type Tab = 'today'|'learn'|'review'|'exams';
export type Route = { name: 'welcome'|'setup'|'home'|'plan'|'catalog'|'lesson'|'practiceSetup'|'practice'|'review'|'exams'|'examIntro'|'exam'|'sheet'|'result'|'examReview'|'stats'|'settings'|'help'|'notices'|'privacy'; id?:string; index?:number; };
export interface Dialog { title:string; body:string; confirmLabel:string; destructive?:boolean; onConfirm:()=>void|Promise<void>; }
export interface Repository { load():Promise<unknown|null>; save(state:AppState):Promise<void>; clear():Promise<void>; }
export interface Services {
  repository:Repository; clock():Clock; uuid():string; openURL(url:string):Promise<void>;
  share(text:string):Promise<'shared'|'copied'|'downloaded'|'cancelled'>; platform:'native'|'web'; supportEmail?:string;
}
