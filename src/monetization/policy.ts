import type {AppState, Content} from '../core/types';

export type AdMode = 'off' | 'test' | 'live';
export const FREE_EXAM_IDS = ['SQLD-M01','SQLD-M02','SQLD-M03','SQLD-M04'] as const;
export const POLICY_VERSION = '2026-09-12.1';
export interface Grant {
  examId:string; requestId:string; grantedAt:number; source:'reward'|'legacy'; mode:'test'|'live';
}
export interface PendingReward {examId:string; requestId:string; createdAt:number; mode:'test'|'live';}
export interface Wallet {version:1; grants:Record<string,Grant>; pending:PendingReward|null;}
export type MonetizedState = AppState & {monetization?:Wallet};
export interface RewardDriver {
  readonly mode:AdMode;
  /** Called only after explicit opt-in. onEarned is exclusively an SDK reward event. */
  showReward(onEarned:()=>Promise<void>):Promise<'closed'|'unavailable'|'cancelled'>;
  privacyOptions():Promise<void>;
}
export const disabledAds:RewardDriver = {
  mode:'off', async showReward(){return 'unavailable';}, async privacyOptions(){}
};
export function validExamId(id:string):boolean {return /^SQLD-M(0[1-9]|1[0-9]|20)$/.test(id);}
export function isFreeExam(id:string):boolean {return (FREE_EXAM_IDS as readonly string[]).includes(id);}
export function walletOf(s:AppState):Wallet {
  const w=(s as MonetizedState).monetization;
  return w ?? {version:1,grants:{},pending:null};
}
export function validateWallet(value:unknown):value is Wallet {
  if(!value || typeof value!=='object')return false;
  const w=value as Wallet;
  if(w.version!==1 || !w.grants || typeof w.grants!=='object' || Array.isArray(w.grants))return false;
  for(const [id,g] of Object.entries(w.grants)){
    if(!g || !validExamId(id) || g.examId!==id || !['reward','legacy'].includes(g.source) ||
       !['test','live'].includes(g.mode) || typeof g.requestId!=='string' || !g.requestId ||
       !Number.isFinite(g.grantedAt) || g.grantedAt<0)return false;
  }
  const p=w.pending;
  return p===null || !!(p && validExamId(p.examId) && typeof p.requestId==='string' && p.requestId &&
    Number.isFinite(p.createdAt) && p.createdAt>=0 && ['test','live'].includes(p.mode));
}
export function migrateWallet(s:AppState):AppState {
  const old=(s as MonetizedState).monetization;
  if(old!==undefined){if(!validateWallet(old))throw new Error('광고 해제 기록이 손상되었습니다. 기존 학습 기록은 삭제하지 않습니다.');return s;}
  // Existing attempts from the earlier all-free version retain their access.
  const grants:Record<string,Grant>={};
  for(const e of s.exams){if(validExamId(e.examId)&&!isFreeExam(e.examId))grants[e.examId]={
    examId:e.examId,requestId:`legacy:${e.id}`,grantedAt:Math.max(0,e.startedAt),source:'legacy',mode:'live'
  };}
  return {...s,monetization:{version:1,grants,pending:null}} as MonetizedState;
}
export function canAccessExam(s:AppState,id:string,mode:AdMode):boolean {
  if(!validExamId(id))return false;
  if(isFreeExam(id))return true;
  const g=walletOf(s).grants[id];
  return !!g && (g.source==='legacy'||g.mode==='live'||mode==='test');
}
export function prepareReward(s:AppState,p:PendingReward,c:Content):AppState {
  if(!validExamId(p.examId) || isFreeExam(p.examId) || !c.exams.some(e=>e.id===p.examId))throw new Error('광고 해제 대상 회차가 아닙니다.');
  if(s.exams.some(e=>e.status==='active'))throw new Error('진행 중 시험을 먼저 마쳐 주세요.');
  if(canAccessExam(s,p.examId,p.mode))return s;
  return {...s,monetization:{...walletOf(s),pending:p}} as MonetizedState;
}
export function earnReward(s:AppState,p:PendingReward,now:number):AppState {
  const w=walletOf(s);
  if(canAccessExam(s,p.examId,p.mode))return s;
  if(!w.pending || w.pending.requestId!==p.requestId || w.pending.examId!==p.examId || w.pending.mode!==p.mode)
    throw new Error('광고 요청과 보상 이벤트가 일치하지 않습니다.');
  return {...s,monetization:{version:1,pending:null,grants:{...w.grants,[p.examId]:{
    examId:p.examId,requestId:p.requestId,grantedAt:now,source:'reward',mode:p.mode
  }}}} as MonetizedState;
}
export function clearPending(s:AppState,requestId?:string):AppState {
  const w=walletOf(s);
  if(!w.pending || (requestId&&w.pending.requestId!==requestId))return s;
  return {...s,monetization:{...w,pending:null}} as MonetizedState;
}
export function bannerAllowed(route:string,activeExam:boolean,dialog:boolean,rewardBusy:boolean):boolean {
  return ['home','stats'].includes(route)&&!activeExam&&!dialog&&!rewardBusy;
}
