import type {ContentBlock,Textbook} from '../textbook/types';
export type Subject = 'S1' | 'S2';
export type Cell = string | number | null;
export interface DataTable { name: string; columns: string[]; rows: Cell[][]; }
export interface Option { id: string; text: string; format: string; }
export interface Question {
  blocks?:ContentBlock[]; pool?:'chapter'|'mixed'|'mock'; chapterId?:string; difficulty?:string;
  conceptId?:string; number?:number; result?:{headers:string[];rows:Cell[][]}; explanationBlocks?:ContentBlock[]; validation?:Record<string,unknown>;
  id: string; subject: Subject; lessonIds: string[]; stem: string; tables: DataTable[]; sql: string;
  options: Option[]; answer: string; explanation: string; optionExplanations: Record<string,string>;
  family: string; dialect: string; examId: string | null; topic: string; version: string;
  releaseReady: boolean; humanReviewed: boolean; sourceIds: string[];
}
export type PublicQuestion = Pick<Question,'id'|'subject'|'stem'|'tables'|'sql'|'options'|'dialect'|'blocks'>;
export interface WorkedExample { sql:string; columns:string[]; rows:Cell[][]; note:string; tables:DataTable[]; dialect:string; targetExecuted:boolean; }
export interface Lesson {
  blocks?:ContentBlock[]; chapterId?:string; level?:string;
  id:string; title:string; subject:Subject; day:number; order:number; minutes:number; objectives:string[];
  prerequisites:string[]; body:string; summary:string[]; questionIds:string[]; sourceIds:string[]; dialect:string;
  example:WorkedExample|null; releaseReady:boolean; humanReviewed:boolean; version:string;
}
export interface Exam { id:string; title:string; order:number; durationSeconds:number; questionIds:string[]; version:string; releaseReady:boolean; statisticallyEquated:boolean; }
export interface StudyDay { day:number; lessonIds:string[]; task:string; mode:string; minutes:number; examId:string|null; }
export interface Manifest { schema:number; version:string; theoryVersion:string; examVersion:string; releaseReady:boolean; humanReviewed:boolean; officialSyllabusVerified:boolean; counts:{lessons:number;practice:number;exams:number;examQuestions:number}; note:string; }
export interface Content { mockPack?:{id:string;version:string;editorialNote:string;assumptions:string[];topics:{id:string;title:string;subjectId:number;sectionId:string;sourceIds:string[]}[];quality:Record<string,unknown>;integrationNote:string}; textbook?:Textbook; manifest:Manifest; lessons:Lesson[]; questions:Record<string,Question>; exams:Exam[]; days:StudyDay[]; sources:Record<string,{title:string;url:string;provider:string}>; }
export interface Clock { wall:number; mono:number; runtimeId:string; }
export interface Score {
  points:number; correct:number; unanswered:number; total:number; bySubject:Record<Subject,{points:number;max:number;correct:number;total:number;meetsMinimum:boolean}>;
  practiceThresholdMet:boolean;
}
export type ExamMode='timed'|'study';
export interface ExamAttempt {
  mode?:ExamMode;
  id:string; examId:string; contentVersion:string; examVersion:string; title:string;
  status:'active'|'submitted'; startedAt:number; submittedAt?:number; durationSeconds:number|null;
  remainingMs:number|null; checkpoint:Clock; timeTrusted:boolean; timeIssues:string[];
  /** Absent on historical records. A paused attempt remains active for access/ad policy. */
  pausedAt?:number|null; pauseCount?:number;
  snapshots:Question[]; answers:Record<string,string>; flagged:string[]; index:number;
  score?:Score; isFirstAttempt:boolean; exposedFamilyCount:number; submitReason?:'manual'|'expired';
}
export interface PracticeResponse {
  id:string; questionId:string; version:string; selected:string; correct:boolean; uncertain:boolean;
  answeredAt:number; mode:'lesson'|'review'; planDay?:number;
}
export interface ReviewItem { questionId:string; dueDay:string; step:number; lastAnsweredDay:string; lastCorrect:boolean; }
export interface PracticeSession {
  id:string; questionIds:string[]; index:number; selected:string|null; uncertain:boolean;
  submitted:boolean; mode:'lesson'|'review'; sessionCorrect:number; sessionAnswered:number;
  planDay?:number;
}
export interface PracticeResult {
  id:string; mode:'lesson'|'review'; questionIds:string[]; lessonIds:string[];
  total:number; correct:number; uncertain:number; wrongQuestionIds:string[]; uncertainQuestionIds:string[];
  completedAt:number; planDay?:number;
}
export interface PlanProgress { version:2; completedDays:number[]; legacyCompletedDays:number[]; }
export interface Settings { minutes:number; targetDate:string; theme:'light'|'dark'|'system'; fontScale:number; weeklyGoalDays?:number; }
export type LibraryItem = {kind:'lesson';id:string}|{kind:'question';id:string}|{kind:'examReview';attemptId:string;questionId:string};
export interface StudyCollection {id:string;name:string;items:LibraryItem[];updatedAt:number;}
export interface ReadingOffset { offset:number; contentHeight:number; }
export interface ReadingPosition extends ReadingOffset { lessonVersion:string; }
export interface ReadingState { lastLessonId:string|null; positions:Record<string,ReadingPosition>; }
export interface AppState {
  textbookMigration?:{version:1;fromVersion:string;noticePending:boolean};
  knownCards?:string[];
  mockStudy?:{bookmarks:string[];notes:Record<string,string>;mastered:Record<string,boolean>};
  textbookDay?:{day:string;targetDate:string;sectionIds:string[]};
  schema:1; contentVersion:string; revision:number; onboarded:boolean; startedDay:string;
  settings:Settings; readLessons:string[]; bookmarks:string[]; completedDays:number[]; studyDays:string[];
  responses:PracticeResponse[]; reviews:Record<string,ReviewItem>; practice:PracticeSession|null;
  exams:ExamAttempt[]; reading?:ReadingState; planProgress?:PlanProgress;
  practiceResults?:PracticeResult[]; lastPracticeResultId?:string|null; collections?:StudyCollection[];
}
export type Tab = 'today'|'learn'|'review'|'exams'|'records';
export type Route = { name: 'mockReview'|'mockSaved'|'mockQuestion'|'mockSources'|'chapter'|'glossary'|'flashcards'|'sources'|'welcome'|'setup'|'home'|'plan'|'day'|'catalog'|'lesson'|'lessonSummary'|'library'|'collection'|'savedQuestion'|'practiceSetup'|'practice'|'practiceResult'|'review'|'exams'|'examIntro'|'exam'|'examPause'|'sheet'|'result'|'examReview'|'stats'|'calendar'|'examHistory'|'appearance'|'data'|'settings'|'reminderSettings'|'help'|'report'|'notices'|'privacy'; id?:string; index?:number; };
export interface Dialog { title:string; body:string; confirmLabel:string; destructive?:boolean; onConfirm:()=>void|Promise<void>; }
export interface Repository { load():Promise<unknown|null>; save(state:AppState):Promise<void>; clear():Promise<void>; }
export interface Services {
  repository:Repository; clock():Clock; uuid():string; openURL(url:string):Promise<void>;
  beforeFullReset?():Promise<boolean>;
  share(text:string):Promise<'shared'|'copied'|'downloaded'|'cancelled'>; platform:'native'|'web'; supportEmail?:string; privacyUrl?:string; supportUrl?:string;
}
