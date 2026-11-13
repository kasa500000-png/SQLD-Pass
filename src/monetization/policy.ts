import type {AppState, Content} from '../core/types';

export type AdMode = 'off' | 'test' | 'live';
export type ExamAccessPolicy = 'launch-free' | 'rewarded';
export const FREE_EXAM_IDS = ['SQLD-M01','SQLD-M02','SQLD-M03','SQLD-M04'] as const;
export const POLICY_VERSION = '2026-11-13.1';
// Shown beside every direct rewarded-ad button, before the user opts in.
export const REWARD_ACTION = '광고 1회 보고 회차 열기';
export const REWARD_DISCLOSURE = '광고 완료 후 이 회차의 두 모드·재응시·해설을 이 기기에서 계속 이용합니다.';
export const REWARD_AGE_DISCLOSURE = '만 18세 이상이며 광고 시청을 원하면 아래 버튼을 눌러 주세요.';
export const REWARD_STORAGE_DISCLOSURE = '중간에 닫으면 잠금은 유지됩니다. 무료 회차와 열린 회차는 그대로 이용할 수 있습니다. 앱 삭제·전체 데이터 삭제·기기 변경 시 해제 기록은 복원되지 않습니다.';
export interface Grant {
  examId:string; requestId:string; grantedAt:number; source:'reward'|'legacy'|'launch-free'; mode:AdMode;
}
export interface PendingReward {examId:string; requestId:string; createdAt:number; mode:'test'|'live';}
export interface Wallet {version:1; grants:Record<string,Grant>; pending:PendingReward|null;}
export type MonetizedState = AppState & {monetization?:Wallet};
export interface RewardDriver {
  readonly mode:AdMode;
  /** Called only after the user explicitly confirms adult eligibility. */
  confirmAdult():void;
  readonly adultConfirmed:boolean;
  /** Called only after explicit opt-in. onEarned is exclusively an SDK reward event. */
  showReward(onEarned:()=>Promise<void>):Promise<'closed'|'unavailable'|'cancelled'>;
  privacyOptions():Promise<void>;
}
export const disabledAds:RewardDriver = {
  mode:'off', adultConfirmed:false, confirmAdult(){}, async showReward(){return 'unavailable';}, async privacyOptions(){}
};
export function validExamId(id:string):boolean {return /^SQLD-M(0[1-9]|[1-7][0-9]|80)$/.test(id);}
/** Historical free-launch rights never expand with the current catalog. */
export function legacyLaunchExam(id:string):boolean {return /^SQLD-M(0[1-9]|1[0-9]|20)$/.test(id);}
export function isFreeExam(id:string,c?:Content):boolean {return (c?.mockPack?.freeExamIds??FREE_EXAM_IDS as readonly string[]).includes(id);}
export function walletOf(s:AppState):Wallet {
  const w=(s as MonetizedState).monetization;
  return w ?? {version:1,grants:{},pending:null};
}
export function validateWallet(value:unknown):value is Wallet {
  if(!value || typeof value!=='object')return false;
  const w=value as Wallet;
  if(w.version!==1 || !w.grants || typeof w.grants!=='object' || Array.isArray(w.grants))return false;
  for(const [id,g] of Object.entries(w.grants)){
    if(!g || !validExamId(id) || g.examId!==id || !['reward','legacy','launch-free'].includes(g.source) ||
       !(g.source==='launch-free'?g.mode==='off':['test','live'].includes(g.mode)) || typeof g.requestId!=='string' || !g.requestId ||
       !Number.isFinite(g.grantedAt) || g.grantedAt<0)return false;
  }
  const p=w.pending;
  return p===null || !!(p && validExamId(p.examId) && typeof p.requestId==='string' && p.requestId &&
    Number.isFinite(p.createdAt) && p.createdAt>=0 && ['test','live'].includes(p.mode));
}
export function migrateWallet(s:AppState):AppState {
  const old=(s as MonetizedState).monetization;
  if(old!==undefined){if(!validateWallet(old))throw new Error('모의고사 이용 권한이 손상되었습니다. 기존 학습 기록은 삭제하지 않습니다.');return s;}
  // Existing attempts from the earlier all-free version retain their access.
  const grants:Record<string,Grant>={};
  for(const e of s.exams){if(legacyLaunchExam(e.examId)&&!isFreeExam(e.examId))grants[e.examId]={
    examId:e.examId,requestId:`legacy:${e.id}`,grantedAt:Math.max(0,e.startedAt),source:'legacy',mode:'live'
  };}
  return {...s,monetization:{version:1,grants,pending:null}} as MonetizedState;
}
export function canAccessExam(s:AppState,id:string,mode:AdMode,c?:Content):boolean {
  if(!validExamId(id)||(c&&!c.exams.some(e=>e.id===id)))return false;
  if(isFreeExam(id,c))return true;
  const g=walletOf(s).grants[id];
  return !!g && (g.source==='legacy'||g.source==='launch-free'||g.mode==='live'||mode==='test');
}
/** An owner-authorized free launch entitlement, independent of ad reward events. */
export function grantLaunchFreeAccess(s:AppState,c:Content,now:number):AppState {
  if(!Number.isFinite(now)||now<0)throw new Error('무료 이용 권한의 저장 시간을 확인할 수 없습니다.');
  const migrated=migrateWallet(s),w=walletOf(migrated),grants={...w.grants};
  let changed=false;
  for(const e of c.exams){
    if(!legacyLaunchExam(e.id))continue;
    const existing=grants[e.id];
    if(existing&&(existing.source==='legacy'||existing.source==='launch-free'||existing.mode==='live'))continue;
    grants[e.id]={examId:e.id,requestId:`launch-free:${POLICY_VERSION}:${e.id}`,grantedAt:now,source:'launch-free',mode:'off'};
    changed=true;
  }
  return changed?{...migrated,monetization:{...w,grants,pending:null}} as MonetizedState:clearPending(migrated);
}
export function prepareReward(s:AppState,p:PendingReward,c:Content):AppState {
  if(!validExamId(p.examId) || isFreeExam(p.examId,c) || !c.exams.some(e=>e.id===p.examId))throw new Error('광고 해제 대상 회차가 아닙니다.');
  if(s.exams.some(e=>e.status==='active'))throw new Error('진행 중 시험을 먼저 마쳐 주세요.');
  if(canAccessExam(s,p.examId,p.mode,c))return s;
  return {...s,monetization:{...walletOf(s),pending:p}} as MonetizedState;
}
export function earnReward(s:AppState,p:PendingReward,now:number,c?:Content):AppState {
  if(c&&!c.exams.some(e=>e.id===p.examId))throw Error('현재 제공하지 않는 회차입니다.');
  const w=walletOf(s);
  if(canAccessExam(s,p.examId,p.mode,c))return s;
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
