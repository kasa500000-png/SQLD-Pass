import {Controller} from '../core/controller';
import type {Content, Services, Route, Tab} from '../core/types';
import {initialState} from '../core/domain';
import {bannerAllowed,canAccessExam,clearPending,disabledAds,earnReward,isFreeExam,migrateWallet,prepareReward,walletOf,type PendingReward,type RewardDriver} from './policy';

export class MonetizedController extends Controller {
  rewardBusy=false;
  private unsavedReward:PendingReward|null=null;
  constructor(content:Content,services:Services,readonly ads:RewardDriver=disabledAds){super(content,services);}
  override async initialize(){
    await super.initialize();if(!this.ready)return;
    const pending=walletOf(this.state).pending;
    const ok=await this.commit(s=>clearPending(migrateWallet(s)));
    if(!ok){this.startupError='해제 기록을 준비하지 못했습니다. 저장 상태를 확인 후 다시 시도해 주세요.';this.ready=false;}
    else if(pending)this.notice='이전 광고의 완료 보상을 확인하지 못했습니다. 무료 회차와 이미 열린 회차는 그대로 이용할 수 있습니다.';
    this.notify();
  }
  hasAccess(id:string){return canAccessExam(this.state,id,this.ads.mode);}
  get needsRewardSave(){return this.unsavedReward!==null;}
  get showBanner(){return this.ready&&this.state.onboarded&&bannerAllowed(this.route.name,!!this.activeExam(),!!this.dialog,this.rewardBusy);}
  override navigate(route:Route){if(!this.rewardBusy)super.navigate(route);}
  override tab(tab:Tab){if(!this.rewardBusy)super.tab(tab);}
  override openTheory(){if(!this.rewardBusy)super.openTheory();}
  override back(){if(!this.rewardBusy)super.back();}
  override async beginExam(id:string){
    if(this.rewardBusy)return;
    if(!this.hasAccess(id)){this.offerUnlock(id);return;}
    await super.beginExam(id);
  }
  offerUnlock(id:string){
    if(this.rewardBusy)return;
    if(this.needsRewardSave){this.notice='시청 완료한 보상이 저장되지 않았습니다. 먼저 보상 저장 재시도를 눌러 주세요.';this.notify();return;}
    if(this.activeExam()){this.notice='시험 시간은 계속 흐릅니다. 진행 중인 시험부터 마쳐 주세요.';this.notify();return;}
    const e=this.content.exams.find(x=>x.id===id);if(!e)return;
    if(this.hasAccess(id)){this.navigate({name:'examIntro',id});return;}
    this.confirm(`${e.title} 열기`,
      '보상형 광고 1회를 끝까지 시청하면 이 회차 50문항과 제출 후 해설을 이 기기에 계속 열어 둡니다. 클릭·설치·추적 허용은 필요하지 않습니다. 반복 응시는 추가 시청이 없습니다. 앱 삭제·데이터 삭제·기기 변경 시 복원되지 않습니다. 취소해도 무료 1~4회와 열린 회차는 유지됩니다.',
      '광고 1회 시청하고 열기',()=>this.unlockAfterOptIn(id));
  }
  private async saveEarned(p:PendingReward):Promise<void>{
    const ok=await this.commit(s=>earnReward(s,p,this.services.clock().wall));
    if(!ok){this.unsavedReward=p;return;}
    this.unsavedReward=null;this.notice='회차를 열었습니다. 이후 응시·제출 후 해설은 추가 광고 없이 이용할 수 있습니다.';this.notify();
  }
  async retryRewardSave(){
    if(this.rewardBusy||!this.unsavedReward)return;
    this.rewardBusy=true;this.notify();
    try{await this.saveEarned(this.unsavedReward);}finally{this.rewardBusy=false;this.notify();}
  }
  private async unlockAfterOptIn(id:string){
    if(this.rewardBusy||this.hasAccess(id)||isFreeExam(id))return;
    if(this.ads.mode==='off'){this.notice='광고 기능이 아직 활성화되지 않았습니다. 무료 1~4회를 이용해 주세요.';this.notify();return;}
    if(this.activeExam())return;
    this.rewardBusy=true;this.notice='광고를 준비하고 있습니다. 완료 전에는 회차가 열리지 않습니다.';this.notify();
    const p:PendingReward={examId:id,requestId:this.services.uuid(),createdAt:this.services.clock().wall,mode:this.ads.mode};
    let earned=false;
    try{
      if(!await this.commit(s=>prepareReward(s,p,this.content)))return;
      const outcome=await this.ads.showReward(async()=>{
        if(earned)return;earned=true;
        await this.saveEarned(p); // Save on EARNED_REWARD, not on CLOSED or an ad click.
      });
      if(!earned)this.notice=outcome==='unavailable'?'표시할 광고가 없거나 연결/동의 상태를 확인하지 못했습니다. 잠시 후 다시 시도하거나 무료 1~4회를 이용해 주세요.':'시청 완료 보상이 확인되지 않아 회차를 열지 않았습니다. 무료 학습은 계속 이용할 수 있습니다.';
      else if(this.unsavedReward)this.notice='시청은 완료됐지만 저장하지 못했습니다. 광고를 다시 보지 말고 보상 저장 재시도를 눌러 주세요.';
    }catch{
      if(!earned)this.notice='광고를 표시하지 못했습니다. 회차는 잠금 상태이며 무료 학습은 계속 가능합니다.';
    }finally{
      if(!this.unsavedReward)await this.commit(s=>clearPending(s,p.requestId));
      this.rewardBusy=false;this.notify();
    }
  }
  async openAdPrivacy(){
    if(this.rewardBusy||this.activeExam())return;
    try{await this.ads.privacyOptions();this.notice='광고 개인정보 선택을 확인했습니다. 학습/해제 기록은 바꾸지 않았습니다.';}
    catch{this.notice='개인정보 선택 화면을 열지 못했습니다. 광고 없는 무료 학습은 계속 이용할 수 있습니다.';}
    this.notify();
  }
  /** Soft reset preserves grants; explicit full reset deletes them through the existing serialized path. */
  requestLearningReset(){
    if(this.rewardBusy||this.needsRewardSave)return;
    this.confirm('학습 기록만 초기화할까요?','진도·답안·진행 중 시험을 삭제하지만 이미 열린 회차는 유지합니다.','학습만 초기화',async()=>{
      const ok=await this.commit(s=>({...initialState(this.content,this.services.clock().wall),monetization:walletOf(s)}));
      if(ok){this.catalogScroll=undefined;this.route={name:'welcome'};this.stack=[];this.draftSettings={...this.state.settings};this.notify();}
    },true);
  }
  override requestReset(){
    if(this.rewardBusy||this.needsRewardSave){this.notice='광고 처리와 보상 저장을 먼저 마쳐 주세요.';this.notify();return;}
    super.requestReset();
    if(this.dialog)this.dialog.body+=' 광고 시청으로 열린 회차도 모두 삭제되며 복원할 수 없습니다.';
    this.notify();
  }
}
