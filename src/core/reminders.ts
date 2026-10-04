export const STUDY_REMINDER_ID = 'sqld-pass.study-reminder.daily.v1';
export const STUDY_REMINDER_PREFIX = 'sqld-pass.study-reminder.';
export const STUDY_REMINDER_KIND = 'sqld-pass-study-reminder';

export interface ReminderPreferences { enabled:boolean; hour:number; minute:number; timezone:string; }
export interface ReminderPermission { granted:boolean; canAskAgain:boolean; }
export interface ScheduledReminder {
  identifier:string; kind?:unknown; hour?:number; minute?:number; timezone?:unknown;
}
export interface ReminderRepository {
  load():Promise<unknown>;
  save(preferences:ReminderPreferences):Promise<void>;
}
export interface ReminderNotifications {
  initialize(onTap:()=>void, isExamActive:()=>boolean):Promise<()=>void>;
  permission():Promise<ReminderPermission>;
  requestPermission():Promise<ReminderPermission>;
  scheduled():Promise<ScheduledReminder[]>;
  cancel(identifier:string):Promise<void>;
  schedule(preferences:ReminderPreferences):Promise<void>;
}
export interface ReminderBindings { isExamActive:()=>boolean; onReview:()=>boolean; }
export type ReminderStatus = 'off'|'scheduled'|'paused'|'denied'|'unavailable';
export interface ReminderSnapshot {
  ready:boolean; busy:boolean; preferences:ReminderPreferences; status:ReminderStatus; error:string;
}
export function validReminderTime(hour:number,minute:number):boolean {
  return Number.isInteger(hour)&&hour>=0&&hour<=23&&Number.isInteger(minute)&&minute>=0&&minute<=59;
}
export function defaultReminderPreferences(timezone:string):ReminderPreferences {
  return {enabled:false,hour:20,minute:0,timezone};
}
export function normalizeReminderPreferences(value:unknown,timezone:string):ReminderPreferences {
  if(!value||typeof value!=='object')return defaultReminderPreferences(timezone);
  const p=value as Partial<ReminderPreferences>;
  if(typeof p.hour!=='number'||typeof p.minute!=='number'||!validReminderTime(p.hour,p.minute))return defaultReminderPreferences(timezone);
  return {enabled:p.enabled===true,hour:p.hour,minute:p.minute,timezone:typeof p.timezone==='string'&&p.timezone?p.timezone:timezone};
}
export function isStudyReminder(request:Pick<ScheduledReminder,'identifier'|'kind'>):boolean {
  return request.identifier.startsWith(STUDY_REMINDER_PREFIX)&&request.kind===STUDY_REMINDER_KIND;
}
export function reminderTimeLabel(hour:number,minute:number):string {
  return `${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`;
}

/** Desired preferences live in SQLite; scheduling is a separately fallible OS operation. */
export class RemindersController {
  private snapshot:ReminderSnapshot;
  private readonly listeners=new Set<()=>void>();
  private chain:Promise<unknown>=Promise.resolve();
  private pending=0;
  private examActive=false;
  private permissionDenied=false;
  private pendingReview=false;
  private openingReview=false;
  private initialized=false;
  private sdkReady=false;
  private disposeSdk?:()=>void;
  private disposed=false;
  constructor(private readonly repository:ReminderRepository,private readonly notifications:ReminderNotifications,
    private readonly bindings:ReminderBindings,private readonly timezone:()=>string) {
    this.snapshot={ready:false,busy:false,preferences:defaultReminderPreferences(timezone()),status:'off',error:''};
  }
  readonly subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener);};};
  readonly getSnapshot=()=>this.snapshot;
  private publish(patch:Partial<ReminderSnapshot>={}) {
    this.snapshot={...this.snapshot,...patch,busy:this.pending>0};
    for(const listener of this.listeners)listener();
  }
  private active(){return this.examActive||this.bindings.isExamActive();}
  private queue(action:()=>Promise<boolean>):Promise<boolean> {
    if(this.disposed)return Promise.resolve(false);
    this.pending++;this.publish();
    const work=this.chain.then(async()=>{
      if(this.disposed)return false;
      this.publish({error:''});
      try{return await action();}
      catch {this.publish({status:'unavailable',error:'알림 설정을 완료하지 못했습니다. 다시 시도해 주세요.'});return false;}
    }).finally(()=>{this.pending--;this.publish();});
    this.chain=work;return work;
  }
  private async prepareSdk() {
    if(this.sdkReady)return;
    const dispose=await this.notifications.initialize(()=>{this.pendingReview=true;this.flushReview();},()=>this.active());
    if(this.disposed){dispose();throw Error('Disposed');}
    this.disposeSdk=dispose;
    this.sdkReady=true;
  }
  private flushReview() {
    if(!this.initialized||this.active()||!this.pendingReview||this.openingReview||this.disposed)return;
    // Navigation notifies the app controller synchronously, which can call this method again.
    this.pendingReview=false;this.openingReview=true;
    try{if(!this.bindings.onReview())this.pendingReview=true;}
    catch{this.pendingReview=true;}
    finally{this.openingReview=false;}
  }
  private async cancelOwned(requests?:ScheduledReminder[]) {
    for(const request of requests??await this.notifications.scheduled()) {
      if(this.disposed)return;
      if(isStudyReminder(request))await this.notifications.cancel(request.identifier);
    }
  }
  private async reconcile():Promise<boolean> {
    if(this.disposed)return false;
    await this.prepareSdk();
    if(this.disposed)return false;
    const requests=await this.notifications.scheduled(),owned=requests.filter(isStudyReminder);
    if(this.disposed)return false;
    const p=this.snapshot.preferences;
    if(!p.enabled||this.active()) {
      await this.cancelOwned(owned);
      if(this.disposed)return false;
      // Returning from the permission prompt refreshes the app. Keep denial help visible
      // while off, without asking for permission again or enabling reminders implicitly.
      if(!p.enabled&&this.permissionDenied) {
        const permission=await this.notifications.permission();if(this.disposed)return false;
        this.permissionDenied=!permission.granted;
      }
      this.publish({status:p.enabled?'paused':this.permissionDenied?'denied':'off'});this.flushReview();return true;
    }
    const permission=await this.notifications.permission();
    if(this.disposed)return false;
    if(!permission.granted) {
      this.permissionDenied=true;
      await this.cancelOwned(owned);if(this.disposed)return false;
      this.publish({status:'denied'});return false;
    }
    this.permissionDenied=false;
    const timezone=this.timezone();
    if(p.timezone!==timezone) {
      const updated={...p,timezone};await this.repository.save(updated);if(this.disposed)return false;
      this.publish({preferences:updated});
    }
    const current=this.snapshot.preferences;
    const matches=owned.length===1&&owned[0].identifier===STUDY_REMINDER_ID&&owned[0].hour===current.hour&&
      owned[0].minute===current.minute&&owned[0].timezone===current.timezone;
    if(!matches) {
      await this.cancelOwned(owned);
      if(this.disposed)return false;
      // Exam state may have changed while awaiting the OS or SQLite.
      if(this.active()){this.publish({status:'paused'});return true;}
      await this.notifications.schedule(current);
      // An already dispatched OS schedule cannot be recalled safely after a new app instance
      // may have reused the same identifier. The next instance reconciles persisted preference.
      if(this.disposed)return false;
      if(this.active()) {await this.cancelOwned();this.publish({status:'paused'});return true;}
    }
    this.publish({status:'scheduled'});this.flushReview();return true;
  }
  initialize():Promise<boolean> {
    return this.queue(async()=>{
      if(!this.initialized) {
        const stored=await this.repository.load();if(this.disposed)return false;
        const preferences=normalizeReminderPreferences(stored,this.timezone());
        this.initialized=true;this.publish({ready:true,preferences});
      }
      return this.reconcile();
    });
  }
  refresh():Promise<boolean>{return this.initialized?this.queue(()=>this.reconcile()):this.initialize();}
  syncExamState(active:boolean):Promise<boolean> {
    const changed=this.examActive!==active;this.examActive=active;
    if(!this.initialized)return Promise.resolve(true);
    this.flushReview();
    return changed?this.queue(()=>this.reconcile()):Promise.resolve(true);
  }
  setEnabled(enabled:boolean):Promise<boolean> {
    return this.queue(async()=>{
      if(!this.initialized)throw Error('Not ready');
      await this.prepareSdk();
      if(this.disposed)return false;
      if(enabled) {
        let permission=await this.notifications.permission();
        if(this.disposed)return false;
        // This is the only permission-request path and is called by explicit opt-in.
        if(!permission.granted&&permission.canAskAgain)permission=await this.notifications.requestPermission();
        if(this.disposed)return false;
        if(!permission.granted) {
          this.permissionDenied=true;
          await this.cancelOwned();
          if(this.disposed)return false;
          const preferences={...this.snapshot.preferences,enabled:false};
          await this.repository.save(preferences);if(this.disposed)return false;
          this.publish({preferences,status:'denied'});return false;
        }
      } else await this.cancelOwned();
      if(this.disposed)return false;
      const preferences={...this.snapshot.preferences,enabled,timezone:this.timezone()};
      await this.repository.save(preferences);if(this.disposed)return false;
      this.permissionDenied=false;
      this.publish({preferences});return this.reconcile();
    });
  }
  setTime(hour:number,minute:number):Promise<boolean> {
    if(!validReminderTime(hour,minute))return Promise.resolve(false);
    return this.queue(async()=>{
      if(!this.initialized)throw Error('Not ready');
      const preferences={...this.snapshot.preferences,hour,minute,timezone:this.timezone()};
      await this.repository.save(preferences);if(this.disposed)return false;
      this.publish({preferences});
      return preferences.enabled?this.reconcile():true;
    });
  }
  reset():Promise<boolean> {
    return this.queue(async()=>{
      await this.prepareSdk();await this.cancelOwned();
      if(this.disposed)return false;
      const preferences=defaultReminderPreferences(this.timezone());
      await this.repository.save(preferences);if(this.disposed)return false;
      this.pendingReview=false;this.permissionDenied=false;this.initialized=true;
      this.publish({ready:true,preferences,status:'off'});return true;
    });
  }
  dispose(){this.disposed=true;this.disposeSdk?.();this.listeners.clear();}
}
