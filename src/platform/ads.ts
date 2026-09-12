import {AppState} from 'react-native';
import type {AdMode,RewardDriver} from '../monetization/policy';

type SDK = typeof import('react-native-google-mobile-ads');
const requested=process.env.EXPO_PUBLIC_ADS_MODE;
const appEnv=process.env.EXPO_PUBLIC_APP_ENV ?? 'development';
const mode:AdMode=requested==='test'&&appEnv!=='production'?'test':requested==='live'&&appEnv==='production'?'live':'off';
const UNIT=/^ca-app-pub-\d{16}\/\d{10}$/;
const NON_PERSONALIZED={requestNonPersonalizedAdsOnly:true};

export class NativeAds implements RewardDriver {
  readonly mode=mode;
  private module:SDK|null=null;
  private ready=false;
  private preparation:Promise<boolean>|null=null;
  private gathered=false;
  private rewardActive=false;
  private revision=0;
  private listeners=new Set<()=>void>();
  private started=performance.now();
  private lastBanner=-Infinity;
  private bannerRequests=0;
  readonly subscribe=(fn:()=>void)=>{this.listeners.add(fn);return ()=>{this.listeners.delete(fn);};};
  readonly snapshot=()=>this.revision;
  private changed(){this.revision++;for(const fn of this.listeners)fn();}
  sdk():SDK {if(!this.module)this.module=require('react-native-google-mobile-ads') as SDK;return this.module;}
  get bannersReady(){return this.ready&&!this.rewardActive&&this.mode!=='off';}
  unit(kind:'banner'|'rewarded'):string {
    const sdk=this.sdk();if(this.mode==='test')return kind==='banner'?sdk.TestIds.BANNER:sdk.TestIds.REWARDED;
    const ios=require('react-native').Platform.OS==='ios';
    const value=kind==='banner'?(ios?process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER:process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER):
      (ios?process.env.EXPO_PUBLIC_ADMOB_IOS_REWARDED:process.env.EXPO_PUBLIC_ADMOB_ANDROID_REWARDED);
    if(this.mode!=='live'||!value||!UNIT.test(value)||value.includes('3940256099942544'))throw new Error('운영 광고 ID 설정이 필요합니다.');
    return value;
  }
  async prepare():Promise<boolean>{
    if(this.mode==='off'||AppState.currentState!=='active')return false;
    if(this.preparation)return this.preparation;
    this.preparation=(async()=>{
      try{
        const sdk=this.sdk();
        if(!this.gathered){
          await sdk.AdsConsent.gatherConsent();this.gathered=true;
        }
        const info=await sdk.AdsConsent.getConsentInfo();
        if(!info.canRequestAds){this.ready=false;this.changed();return false;}
        if(!this.ready){
          await sdk.default().setRequestConfiguration({maxAdContentRating:sdk.MaxAdContentRating.G});
          await sdk.default().initialize();
          this.ready=true;this.changed();
        }
        return true;
      }catch{this.ready=false;this.changed();return false;}
      finally{this.preparation=null;}
    })();return this.preparation;
  }
  bannerDelay():number {
    if(this.mode==='off'||this.bannerRequests>=6)return Infinity;
    return Math.max(0,45000-(performance.now()-this.started),90000-(performance.now()-this.lastBanner));
  }
  reserveBanner():boolean {
    if(!this.bannersReady||this.bannerDelay()>0||AppState.currentState!=='active')return false;
    this.lastBanner=performance.now();this.bannerRequests++;return true;
  }
  async privacyOptions(){
    if(this.mode==='off')throw new Error('광고 미활성');
    this.ready=false;this.changed();
    if(this.preparation)await this.preparation;
    this.ready=false;this.changed();
    try{
      const sdk=this.sdk();const info=await sdk.AdsConsent.requestInfoUpdate();
      if(info.privacyOptionsRequirementStatus===sdk.AdsConsentPrivacyOptionsRequirementStatus.REQUIRED)
        await sdk.AdsConsent.showPrivacyOptionsForm();
      else await sdk.AdsConsent.loadAndShowConsentFormIfRequired();
    }finally{this.gathered=true;this.ready=false;this.changed();}
  }
  async showReward(onEarned:()=>Promise<void>):Promise<'closed'|'unavailable'|'cancelled'>{
    if(this.rewardActive||this.mode==='off')return 'unavailable';
    this.rewardActive=true;this.changed();
    try{
      if(!await this.prepare()||AppState.currentState!=='active')return 'unavailable';
      const sdk=this.sdk(),ad=sdk.RewardedAd.createForAdRequest(this.unit('rewarded'),NON_PERSONALIZED);
      return await new Promise<'closed'|'unavailable'|'cancelled'>(resolve=>{
        let finished=false,earned=false,write:Promise<void>=Promise.resolve();
        const off:(()=>void)[]=[];
        let timer:ReturnType<typeof setTimeout>;
        const finish=(result:'closed'|'unavailable'|'cancelled')=>{
          if(finished)return;finished=true;clearTimeout(timer);off.forEach(fn=>fn());
          void write.catch(()=>{}).then(()=>resolve(result));
        };
        off.push(ad.addAdEventListener(sdk.RewardedAdEventType.EARNED_REWARD,()=>{
          if(finished||earned)return;earned=true;
          write=Promise.resolve().then(onEarned);
        }));
        off.push(ad.addAdEventListener(sdk.AdEventType.CLOSED,()=>finish('closed')));
        off.push(ad.addAdEventListener(sdk.AdEventType.ERROR,()=>finish('unavailable')));
        off.push(ad.addAdEventListener(sdk.RewardedAdEventType.LOADED,()=>{
          if(finished)return;
          if(AppState.currentState!=='active'){finish('cancelled');return;}
          clearTimeout(timer);
          // A watchdog recovers the JS request, never grants a reward, and is not an SDK dismissal.
          timer=setTimeout(()=>finish('cancelled'),180000);
          void ad.show().catch(()=>finish('unavailable'));
        }));
        timer=setTimeout(()=>finish('unavailable'),15000);
        try{ad.load();}catch{finish('unavailable');}
      });
    }catch{return 'unavailable';}
    finally{this.rewardActive=false;this.changed();}
  }
}
export const nativeAds=new NativeAds();
