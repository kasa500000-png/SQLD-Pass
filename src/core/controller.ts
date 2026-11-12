import {withDailyPlan} from '../textbook/learning';
import {mockVolumes,mockVolumeForExam} from '../mocks/domain';
import type {AppState,Clock,Content,Dialog,ExamAttempt,ExamMode,LibraryItem,PracticeResult,Question,ReadingOffset,Route,Services,Settings,Tab} from './types';
import {isExamPaused,pauseExam as pauseAttempt,resumeExam as resumeAttempt} from './domain/exam';
import {validReadingOffset} from './domain/reading';
import {libraryItemKey,resolveLibraryItem,validCollections} from './domain/library';
import {advanceClock,applyPractice,assertContent,canStudyQuestion,completedPracticeResult,dayKey,dueReviews,eligibleDay,homeRecommendation,initialState,isReviewStudyDay,migrateLearningState,nextConcept as findNextConcept,parseState,planCompletedDays,practiceQuestionIds,shortSession,startExam,submitExam,validTargetDate,type PracticeOptions} from './domain';
export class Controller {
  state:AppState; ready=false; startupError=''; notice=''; busy=false; route:Route={name:'welcome'}; stack:Route[]=[];
  dialog:Dialog|null=null; search=''; subject='all'; bookmarkedOnly=false; filter='all'; expanded=new Set<string>();
  practiceBatchSize=10; flashcardsUnknownOnly=false;
  examSheetFilter:'all'|'unanswered'|'flagged'='all';
  mockVolumeId='vol1'; mockAvailableOnly=false; mockFiltersOpen=false;
  mockFilterDraft:{progress:'all'|'unattempted'|'completed';available:boolean}={progress:'all',available:false};
  mockResultFilter:'all'|'wrong'|'flagged'='all'; mockHistoryLimit=20; mockNoteDrafts:Record<string,string>={};
  private mockListFilters={mockReview:{search:'',topic:'',limit:20},mockSaved:{search:'',topic:'',limit:20}};
  private get currentMockList(){return this.mockListFilters[this.route.name==='mockSaved'?'mockSaved':'mockReview'];}
  get mockSearch(){return this.currentMockList.search;} set mockSearch(v:string){this.currentMockList.search=v;}
  get mockTopicFilter(){return this.currentMockList.topic;} set mockTopicFilter(v:string){this.currentMockList.topic=v;}
  get mockListLimit(){return this.currentMockList.limit;} set mockListLimit(v:number){this.currentMockList.limit=v;}
  libraryEditor:{id?:string;name:string}|null=null; libraryError='';
  draftSettings:Settings; settingsError=''; supportText=''; supportNotice=''; reviewLimit=20; reviewPickerOpen=false; private listeners=new Set<()=>void>(); private serial:Promise<void>=Promise.resolve();
  private version=0; private checkpointAt=0; private expiryInFlight=false; private lastExpiryTry=0;
  get isExamSubmitting(){return this.expiryInFlight;}
  private pauseRequest?:{id:string;clock:Clock};
  private pauseInFlight?:Promise<boolean>;
  private examAppActive=true;
  get isExamPausePending(){return this.pauseRequest?.id===this.activeExam()?.id&&!!this.pauseRequest;}
  private systemAppearance:'light'|'dark'='light';
  private screenScroll=new Map<string,ReadingOffset>();
  screenPosition(context:string){return this.screenScroll.get(context);}
  rememberScreen(context:string,position:ReadingOffset){if(validReadingOffset(position)){if(this.screenScroll.size>=80&&!this.screenScroll.has(context))this.screenScroll.delete(this.screenScroll.keys().next().value!);this.screenScroll.set(context,{...position});}}
  protected catalogScroll?:{context:string;position:ReadingOffset};
  protected examCatalogScroll?:{context:string;position:ReadingOffset};
  protected recordsScroll?:{context:string;position:ReadingOffset};
  protected examReviewScroll?:{context:string;position:ReadingOffset};
  examProgressFilter:'all'|'unattempted'|'completed'='all';
  get isDark(){return this.state.settings.theme==='dark'||(this.state.settings.theme==='system'&&this.systemAppearance==='dark');}
  setSystemAppearance(value:'light'|'dark'){if(this.systemAppearance!==value){this.systemAppearance=value;this.notify();}}
  readonly getSnapshot=()=>this.version;
  readonly subscribe=(fn:()=>void)=>{this.listeners.add(fn);return ()=>{this.listeners.delete(fn);};};
  constructor(readonly content:Content,readonly services:Services){this.mockVolumeId=mockVolumes(content)[0]?.id??'vol1';this.state=initialState(content,services.clock().wall);this.draftSettings={...this.state.settings};}
  notify(){this.version++;for(const fn of this.listeners)fn();}
  protected async prepareStartup():Promise<void>{}
  async initialize(){
    this.startupError='';this.ready=false;this.notify();
    try{assertContent(this.content);const loaded=await this.services.repository.load();this.state=parseState(loaded,this.content);
      if(this.content.textbook&&loaded&&(loaded as AppState).contentVersion!==this.state.contentVersion){if(!await this.commit(s=>({...s})))throw new Error('교재 기록 전환을 저장하지 못했습니다. 다시 시도해 주세요.');}this.draftSettings={...this.state.settings};
      if(this.content.textbook&&!await this.commit(s=>withDailyPlan(s,this.content,this.services.clock().wall)))throw new Error('오늘 학습 계획을 저장하지 못했습니다.');
      await this.prepareStartup();
      this.route=this.state.onboarded?(this.state.lastPracticeResultId&&!this.state.practice?{name:'practiceResult',id:this.state.lastPracticeResultId}:{name:'home'}):{name:'welcome'};this.ready=true;const active=this.activeExam();
      if(active){if(this.content.mockPack)await this.pauseExam(false);else await this.checkpoint();}this.notify();await this.pulse();
    }catch(e){this.startupError=e instanceof Error?e.message:String(e);this.ready=false;this.notify();}
  }
  async commit(reducer:(state:AppState)=>AppState):Promise<boolean>{
    let ok=false;
    const task=this.serial.then(async()=>{
      this.busy=true;this.notify();
      try{
        const next=reducer(this.state);if(next===this.state){ok=true;return;}
        const learning=withDailyPlan(migrateLearningState(next,this.content),this.content,this.services.clock().wall),completed=planCompletedDays(learning,this.content);
        for(const day of this.content.days)if(eligibleDay(learning,this.content,day.day)&&!completed.includes(day.day))completed.push(day.day);
        const stored={...learning,revision:this.state.revision+1,completedDays:Array.from(new Set([...learning.completedDays,...completed])).sort((a,b)=>a-b),planProgress:{...learning.planProgress!,completedDays:completed.sort((a,b)=>a-b)}};
        await this.services.repository.save(stored);this.state=stored;ok=true;
      }catch(e){this.notice=`저장/처리 실패: ${e instanceof Error?e.message:String(e)}. 마지막 저장 기록은 유지됩니다.`;}
      finally{this.busy=false;this.notify();}
    });this.serial=task.catch(()=>{});await task;return ok;
  }
  async dismissMockCatalogMigration(){await this.commit(s=>s.mockCatalogMigration?{...s,mockCatalogMigration:{...s.mockCatalogMigration,noticePending:false}}:s);}
  async dismissTextbookMigration(){await this.commit(s=>s.textbookMigration?{...s,textbookMigration:{...s.textbookMigration,noticePending:false}}:s);}
  async toggleKnownCard(id:string){if(!this.content.textbook?.flashcards.some(f=>f.id===id))return;await this.commit(s=>({...s,knownCards:(s.knownCards??[]).includes(id)?s.knownCards!.filter(x=>x!==id):[...(s.knownCards??[]),id]}));}
  get settingsChanged(){return JSON.stringify(this.draftSettings)!==JSON.stringify(this.state.settings);}
  private guardSettingsExit(action:()=>void):boolean{
    if(!this.content.textbook||!['settings','appearance'].includes(this.route.name)||!this.settingsChanged)return false;
    this.dialog={title:'변경한 설정을 적용할까요?',body:'저장하면 선택한 설정을 적용한 뒤 이동합니다.',confirmLabel:'저장하고 이동',onConfirm:()=>this.saveSettings(false,action),secondaryLabel:'저장하지 않고 이동',onSecondary:()=>{this.draftSettings={...this.state.settings};action();},cancelLabel:'계속 설정'};this.notify();return true;
  }
  navigate(route:Route){
    if(this.guardSettingsExit(()=>this.navigate(route)))return;
    if(this.isExamPausePending&&route.name!=='examPause')return;
    if(this.content.mockPack&&['exam','sheet'].includes(this.route.name)&&!['exam','sheet','examPause'].includes(route.name)){void this.pauseExam().then(ok=>{if(ok)this.navigate(route);});return;}
    const e=this.examAttempt(route.id);
    if(['exam','sheet'].includes(route.name)&&e&&isExamPaused(e))route={name:'examPause',id:e.id};
    if(route.name==='examIntro'&&route.id)this.mockVolumeId=mockVolumeForExam(this.content,route.id)?.id??this.mockVolumeId;
    this.mockFiltersOpen=false;this.stack.push(this.route);this.route=route;this.notice='';this.supportNotice='';this.settingsError='';this.reviewPickerOpen=false;if(route.name==='settings'||route.name==='setup')this.draftSettings={...this.state.settings};this.notify();
  }
  tab(tab:Tab){
    if(this.guardSettingsExit(()=>this.tab(tab)))return;
    if(this.isExamPausePending)return;
    if(this.content.mockPack&&['exam','sheet'].includes(this.route.name)){void this.pauseExam().then(ok=>{if(ok)this.tab(tab);});return;}
    this.mockFiltersOpen=false;this.stack=[];this.route={name:({today:'home',learn:'catalog',review:'review',exams:'exams',records:'stats'} as const)[tab]};this.notice='';this.supportNotice='';this.reviewPickerOpen=false;this.notify();
  }
  back(){
    if(this.dialog){this.dialog=null;this.notify();return;}
    if(this.mockFiltersOpen){this.closeMockFilters();return;}
    if(this.reviewPickerOpen){this.closeReviewPicker();return;}
    if(this.guardSettingsExit(()=>this.back()))return;
    if(this.route.name==='practiceResult'){void this.returnPracticeHome();return;}
    if(this.route.name==='examPause'){if(!this.isExamPausePending)this.tab('today');return;}
    if(this.content.mockPack&&(this.route.name==='exam'||this.route.name==='sheet')){void this.pauseExam();return;}
    if(this.route.name==='exam'||this.route.name==='sheet'){this.confirm('시험 화면을 나갈까요?',this.activeExam()?.mode==='study'?'답안은 기기에 저장되며 시간 제한 없이 이어서 풀 수 있습니다.':'답안은 기기에 저장되며 남은 시간은 계속 흐릅니다. 종료 시각이 지나면 자동 제출합니다.','저장 후 나가기',async()=>{if(await this.checkpoint())this.tab('exams');});return;}
    this.supportNotice='';this.route=this.stack.pop()??{name:this.state.onboarded?'home':'welcome'};this.notify();
  }
  confirm(title:string,body:string,confirmLabel:string,onConfirm:()=>void|Promise<void>,destructive=false){this.dialog={title,body,confirmLabel,onConfirm,destructive};this.notify();}
  cancelDialog(){this.dialog=null;this.notify();}
  async acceptDialog(){const d=this.dialog;this.dialog=null;this.notify();if(d)await d.onConfirm();}
  async secondaryDialog(){const d=this.dialog;this.dialog=null;this.notify();await d?.onSecondary?.();}
  toggleExpanded(id:string){this.expanded.has(id)?this.expanded.delete(id):this.expanded.add(id);this.notify();}
  setReviewFilter(all:boolean){all?this.expanded.add('review:all'):this.expanded.delete('review:all');this.reviewLimit=20;this.notify();}
  showMoreReviews(){this.reviewLimit+=20;this.notify();}
  setSearch(text:string){if(this.search!==text)this.catalogScroll=undefined;this.search=text;this.notify();}
  setSubject(v:string){if(this.subject!==v)this.catalogScroll=undefined;this.subject=v;this.notify();}
  resetLessonSearch(){this.search='';this.subject='all';this.catalogScroll=undefined;this.notify();}
  openTheory(){this.search='';this.subject='all';this.bookmarkedOnly=false;this.catalogScroll=undefined;this.tab('learn');}
  catalogContext(){return JSON.stringify([this.bookmarkedOnly,this.subject,this.search,this.bookmarkedOnly?[...this.state.bookmarks].sort():null]);}
  catalogPosition(){return this.catalogScroll?.context===this.catalogContext()?this.catalogScroll.position:undefined;}
  /** Session-only browsing history: never saves learning progress or changes the last lesson. */
  rememberCatalog(context:string,position:ReadingOffset){
    if(this.ready&&this.state.onboarded&&context===this.catalogContext()&&validReadingOffset(position))
      this.catalogScroll={context,position:{...position}};
  }
  setExamProgressFilter(value:'all'|'unattempted'|'completed'){if(this.examProgressFilter!==value)this.examCatalogScroll=undefined;this.examProgressFilter=value;this.notify();}
  selectMockVolume(id:string){if(!mockVolumes(this.content).some(v=>v.id===id))return;this.mockVolumeId=id;this.notify();}
  mockRecordVolumes={stats:'all',examHistory:'all',mockReview:'all',mockSaved:'all'};
  selectMockRecordVolume(screen:keyof typeof this.mockRecordVolumes,id:string){
    const volume=mockVolumes(this.content).find(v=>v.id===id);if(id!=='all'&&!volume)return;
    this.mockRecordVolumes[screen]=id;
    if(screen==='mockReview'||screen==='mockSaved'){const filter=this.mockListFilters[screen];if(volume&&!volume.topicIds.includes(filter.topic))filter.topic='';filter.limit=20;}
    if(screen==='examHistory')this.mockHistoryLimit=20;this.notify();
  }
  openMockCatalog(examId?:string){if(examId)this.mockVolumeId=mockVolumeForExam(this.content,examId)?.id??this.mockVolumeId;this.navigate({name:'exams'});}
  openMockFilters(){this.mockFilterDraft={progress:this.examProgressFilter,available:this.mockAvailableOnly};this.mockFiltersOpen=true;this.notify();}
  closeMockFilters(){this.mockFiltersOpen=false;this.notify();}
  applyMockFilters(){this.examProgressFilter=this.mockFilterDraft.progress;this.mockAvailableOnly=this.mockFilterDraft.available;this.mockFiltersOpen=false;this.notify();}
  clearMockFilters(){this.examProgressFilter='all';this.mockAvailableOnly=false;this.mockFilterDraft={progress:'all',available:false};this.notify();}
  examCatalogContext(){return JSON.stringify([this.mockVolumeId,this.mockAvailableOnly,this.expanded.has('exams:available'),this.examProgressFilter,this.notice,this.activeExam()?.id??null]);}
  examCatalogPosition(){return this.examCatalogScroll?.context===this.examCatalogContext()?this.examCatalogScroll.position:undefined;}
  rememberExamCatalog(context:string,position:ReadingOffset){
    if(this.ready&&this.state.onboarded&&context===this.examCatalogContext()&&validReadingOffset(position))
      this.examCatalogScroll={context,position:{...position}};
  }
  recordsContext(){return JSON.stringify([this.notice,this.state.readLessons.length,this.state.studyDays.length,this.state.responses.length,this.state.exams.filter(e=>e.status==='submitted'&&e.score).map(e=>e.id)]);}
  recordsPosition(){return this.recordsScroll?.context===this.recordsContext()?this.recordsScroll.position:undefined;}
  rememberRecords(context:string,position:ReadingOffset){
    if(this.ready&&this.state.onboarded&&context===this.recordsContext()&&validReadingOffset(position))
      this.recordsScroll={context,position:{...position}};
  }
  examReviewContext(){return JSON.stringify([this.route.id,this.route.index??0,this.expanded.has(`wrong:${this.route.id}`)]);}
  examReviewPosition(){return this.examReviewScroll?.context===this.examReviewContext()?this.examReviewScroll.position:undefined;}
  rememberExamReview(context:string,position:ReadingOffset){
    if(this.ready&&this.state.onboarded&&this.route.name==='examReview'&&context===this.examReviewContext()&&validReadingOffset(position))
      this.examReviewScroll={context,position:{...position}};
  }
  openReviewPicker(){if(this.route.name==='examReview'&&this.examAttempt(this.route.id)?.status==='submitted'){this.reviewPickerOpen=true;this.notify();}}
  closeReviewPicker(){this.reviewPickerOpen=false;this.notify();}
  moveExamReview(index:number){
    const e=this.examAttempt(this.route.id),q=e?.snapshots[index];
    if(this.route.name!=='examReview'||e?.status!=='submitted'||!Number.isInteger(index)||!q)return;
    if(this.expanded.has(`wrong:${e.id}`)&&e.answers[q.id]===q.answer)return;
    this.reviewPickerOpen=false;this.route={...this.route,index};this.notify();
  }
  setExamReviewFilter(onlyWrong:boolean){
    const e=this.examAttempt(this.route.id);if(this.route.name!=='examReview'||e?.status!=='submitted')return;
    onlyWrong?this.expanded.add(`wrong:${e.id}`):this.expanded.delete(`wrong:${e.id}`);
    this.reviewPickerOpen=false;this.route={...this.route,index:onlyWrong?Math.max(0,e.snapshots.findIndex(q=>e.answers[q.id]!==q.answer)):0};this.notify();
  }
  returnToExamResult(){
    const e=this.examAttempt(this.route.id);if(this.route.name!=='examReview'||e?.status!=='submitted')return;
    const previous=this.stack.at(-1);if(previous?.name==='result'&&previous.id===e.id)this.stack.pop();
    this.reviewPickerOpen=false;this.route={name:'result',id:e.id};this.notify();
  }
  setTargetDate(value:string){this.draftSettings.targetDate=value;this.settingsError='';this.notify();}
  async saveSettings(onboard=false,afterSave?:()=>void){
    const d={...this.draftSettings};
    if(!validTargetDate(d.targetDate,dayKey(this.services.clock().wall))){this.settingsError='오늘 이후의 실제 날짜를 선택하거나 시험일을 비워 주세요.';this.notify();return;}
    if(d.weeklyGoalDays!==undefined&&(!Number.isInteger(d.weeklyGoalDays)||d.weeklyGoalDays<1||d.weeklyGoalDays>7)){this.settingsError='주간 목표는 1~7일 중에서 선택해 주세요.';this.notify();return;}
    if(![15,30,45,60,90].includes(d.minutes))return;
    this.settingsError='';
    if(await this.commit(s=>({...s,settings:d,onboarded:onboard||s.onboarded}))){if(afterSave){afterSave();}else if(onboard||this.route.name==='setup'||!this.content.textbook){this.stack=[];this.route={name:'home'};}else this.route=this.stack.pop()??{name:'home'};this.notice='설정을 저장했습니다.';this.notify();}
  }
  private async saveLessonRead(id:string):Promise<boolean>{if(!this.ready||!this.state.onboarded||!this.content.lessons.some(l=>l.id===id))return false;const ok=await this.commit(s=>s.onboarded?({...s,readLessons:Array.from(new Set([...s.readLessons,id])),studyDays:Array.from(new Set([...s.studyDays,dayKey(this.services.clock().wall)]))}):s);const recorded=ok&&this.state.onboarded&&this.state.readLessons.includes(id);if(recorded){this.notice='이론 읽음을 기록했습니다. 확인 문제로 이해를 점검해 보세요.';this.notify();}return recorded;}
  async markLesson(id:string):Promise<void>{await this.saveLessonRead(id);}
  async bookmark(id:string){await this.commit(s=>({...s,bookmarks:s.bookmarks.includes(id)?s.bookmarks.filter(x=>x!==id):[...s.bookmarks,id]}));}
  openLibrary(){this.libraryEditor=null;this.libraryError='';this.navigate({name:'library'});}
  editCollection(id?:string){
    if(!this.ready||!this.state.onboarded||this.isExamSubmitting)return;
    const entry=id?this.state.collections?.find(c=>c.id===id):undefined;
    if(id&&!entry)return;
    this.libraryError='';this.libraryEditor={id,name:entry?.name??''};this.notify();
  }
  setCollectionName(name:string){if(this.libraryEditor){this.libraryEditor={...this.libraryEditor,name};this.libraryError='';this.notify();}}
  cancelCollectionEditor(){this.libraryEditor=null;this.libraryError='';this.notify();}
  async saveCollection(){
    const editor=this.libraryEditor;if(!editor||!this.ready||!this.state.onboarded)return;
    const name=editor.name.trim();
    if(!name||name.length>40){this.libraryError='이름은 1~40자로 입력해 주세요.';this.notify();return;}
    const id=editor.id??this.services.uuid();
    const ok=await this.commit(s=>{
      if(!s.onboarded||!validCollections(s.collections))throw new Error('학습서재 형식을 확인할 수 없습니다. 기존 기록은 유지됩니다.');
      const entries=s.collections??[];
      if(entries.some(x=>x.id!==id&&x.name.trim().toLocaleLowerCase()===name.toLocaleLowerCase()))throw new Error('같은 이름의 서재가 있습니다.');
      if(editor.id&&!entries.some(x=>x.id===id))throw new Error('서재를 찾을 수 없습니다.');
      const updatedAt=Math.max(this.services.clock().wall,...entries.map(x=>x.updatedAt+1));
      return {...s,collections:editor.id?entries.map(x=>x.id===id?{...x,name,updatedAt}:x):[...entries,{id,name,items:[],updatedAt}]};
    });
    if(ok){this.libraryEditor=null;this.libraryError='';this.notice=editor.id?'서재 이름을 변경했습니다.':'새 서재를 만들었습니다.';this.notify();}
  }
  requestDeleteCollection(id:string){
    const entry=this.state.collections?.find(x=>x.id===id);if(!entry)return;
    this.confirm('컬렉션을 삭제할까요?',`“${entry.name}”의 저장 목록이 삭제됩니다. 원래 이론과 풀이 기록은 유지됩니다.`,'컬렉션 삭제',async()=>{
      if(await this.commit(s=>{if(!validCollections(s.collections))throw new Error('학습서재 형식을 확인할 수 없습니다.');return {...s,collections:(s.collections??[]).filter(x=>x.id!==id)};})){
        this.route={name:'library'};this.notice='컬렉션을 삭제했습니다.';this.notify();
      }
    },true);
  }
  async toggleLibraryItem(collectionId:string,item:LibraryItem){
    const key=libraryItemKey(item);
    const ok=await this.commit(s=>{
      if(!s.onboarded||!validCollections(s.collections))throw new Error('학습서재 형식을 확인할 수 없습니다. 기존 기록은 유지됩니다.');
      const entries=s.collections??[],entry=entries.find(x=>x.id===collectionId);
      if(!entry)throw new Error('서재를 찾을 수 없습니다.');
      const exists=entry.items.some(x=>libraryItemKey(x)===key);
      if(!exists&&!resolveLibraryItem(s,this.content,item))throw new Error('저장할 수 있는 학습 항목을 찾지 못했습니다.');
      const updatedAt=Math.max(this.services.clock().wall,...entries.map(x=>x.updatedAt+1));
      return {...s,collections:entries.map(x=>x.id===collectionId?{...x,items:exists?x.items.filter(v=>libraryItemKey(v)!==key):[...x.items,item],updatedAt}:x)};
    });
    if(ok){this.notice='서재 저장 목록을 변경했습니다.';this.notify();}
  }
  openLibraryItem(item:LibraryItem){
    const resolved=resolveLibraryItem(this.state,this.content,item);
    if(!resolved){this.notice='이 항목의 학습 기록을 찾을 수 없습니다. 저장 목록은 유지됩니다.';this.notify();return;}
    if(resolved.kind==='lesson')this.navigate({name:'lesson',id:resolved.lesson.id});
    else if(resolved.kind==='question')this.navigate({name:'savedQuestion',id:resolved.question.id});
    else {this.expanded.delete(`wrong:${resolved.attempt.id}`);this.navigate({name:'examReview',id:resolved.attempt.id,index:resolved.index});}
  }
  currentDay(){const completed=planCompletedDays(this.state,this.content);return this.content.days.find(d=>!completed.includes(d.day))??this.content.days[29];}
  readingPosition(id:string){
    const position=this.state.reading?.positions[id],lesson=this.content.lessons.find(l=>l.id===id);
    return lesson&&position?.lessonVersion===lesson.version&&validReadingOffset(position)?position:undefined;
  }
  lastReadingLesson(){
    const id=this.state.reading?.lastLessonId;
    return id&&this.readingPosition(id)?this.content.lessons.find(l=>l.id===id&&!this.state.readLessons.includes(id)):undefined;
  }
  async rememberReading(id:string,position:ReadingOffset):Promise<boolean>{
    const lesson=this.content.lessons.find(l=>l.id===id);
    if(!this.ready||!lesson||!validReadingOffset(position))return false;
    const next={offset:Math.round(position.offset),contentHeight:Math.max(1,Math.round(position.contentHeight)),lessonVersion:lesson.version};
    return this.commit(s=>{
      // A late unmount callback must not recreate reading history after a reset.
      if(!s.onboarded)return s;
      const old=s.reading?.positions[id];
      if(s.reading?.lastLessonId===id&&old?.offset===next.offset&&old.contentHeight===next.contentHeight&&old.lessonVersion===next.lessonVersion)return s;
      return {...s,reading:{lastLessonId:id,positions:{...s.reading?.positions,[id]:next}}};
    });
  }
  async markDay(day:number){if(!eligibleDay(this.state,this.content,day)){this.notice='해당 학습일의 확인 문제, 새 복습 또는 모의고사를 먼저 완료해 주세요.';this.notify();return;}
    await this.commit(s=>eligibleDay(s,this.content,day)?{...s,completedDays:Array.from(new Set([...s.completedDays,day]))}:s);}
  getQuestion(id:string):Question|undefined {
    const original=this.content.questions[id];if(original?.examId){for(const e of [...this.state.exams].reverse())if(e.status==='submitted'){const q=e.snapshots.find(x=>x.id===id);if(q)return q;}}
    return original;
  }
  async beginPractice(ids:string[],mode:'lesson'|'review'='lesson',options:{planDay?:number}={}){
    if(!this.ready||!this.state.onboarded)return;
    if(!ids.length){this.notice='선택 조건에 맞는 문제가 없습니다.';this.notify();return;}
    const qids=Array.from(new Set(ids)).filter(id=>{const q=this.getQuestion(id);return q&&canStudyQuestion(this.state,q);});
    if(!qids.length){this.notice='제출 전 모의고사 문제는 연습에서 열 수 없습니다.';this.notify();return;}
    if(options.planDay!==undefined){const day=this.content.days.find(d=>d.day===options.planDay),allowed=new Set(day?.lessonIds.flatMap(id=>this.content.lessons.find(l=>l.id===id)?.questionIds??[])??[]);if(!day||!isReviewStudyDay(day)||mode!=='review'||qids.some(id=>!allowed.has(id))){this.notice='이 복습일에 연결된 확인 문제를 선택해 주세요.';this.notify();return;}}
    const begin=async()=>{const id=this.services.uuid();if(await this.commit(s=>s.onboarded?({...s,lastPracticeResultId:null,practice:{id,questionIds:qids,index:0,selected:null,uncertain:false,submitted:false,mode,sessionCorrect:0,sessionAnswered:0,...(options.planDay!==undefined?{planDay:options.planDay}:{})}}):s)&&this.state.practice?.id===id)this.navigate({name:'practice'});};
    if(this.state.practice){this.confirm('진행 중인 연습이 있어요','새 연습을 시작하면 아직 제출하지 않은 선택은 바뀝니다. 이미 제출한 풀이 기록은 유지됩니다.','새 연습 시작',begin);}else await begin();
  }
  resumePractice(){if(this.state.practice)this.navigate({name:'practice'});}
  async selectPractice(option:string){const origin=this.state.practice;await this.commit(s=>!s.practice||s.practice.id!==origin?.id||s.practice.index!==origin.index||s.practice.submitted?s:{...s,practice:{...s.practice,selected:option}});}
  async uncertain(){const origin=this.state.practice;await this.commit(s=>!s.practice||s.practice.id!==origin?.id||s.practice.index!==origin.index||s.practice.submitted?s:{...s,practice:{...s.practice,uncertain:!s.practice.uncertain}});}
  async answerPractice(){const origin=this.state.practice;await this.commit(s=>{
    const p=s.practice;if(!p||p.id!==origin?.id||p.index!==origin.index||p.submitted)return s;if(!p.selected)throw new Error('먼저 보기를 선택해 주세요');
    const q=this.getQuestion(p.questionIds[p.index]);if(!q||!canStudyQuestion(s,q))throw new Error('제출 후 이용 가능한 문항인지 확인해 주세요');
    let next=applyPractice(s,q,p.selected,p.uncertain,this.services.clock().wall,`${p.id}:${p.index}`,p.mode,p.planDay);
    if(q.pool==='mock')next={...next,mockStudy:{bookmarks:next.mockStudy?.bookmarks??[],notes:next.mockStudy?.notes??{},mastered:{...next.mockStudy?.mastered,[q.id]:p.selected===q.answer&&!p.uncertain}}};
    const saved=next.responses.find(r=>r.id===`${p.id}:${p.index}`)!;
    const answers=p.questionIds.slice(0,p.index+1).flatMap((_,i)=>next.responses.filter(r=>r.id===`${p.id}:${i}`));
    return {...next,practice:{...p,selected:saved.selected,uncertain:saved.uncertain,submitted:true,sessionAnswered:answers.length,sessionCorrect:answers.filter(r=>r.correct).length}};
  });}
  async nextPractice(){const p=this.state.practice;if(!p?.submitted)return;
    if(p.index===p.questionIds.length-1){const ok=await this.commit(s=>{
      if(!s.practice||s.practice.id!==p.id||s.practice.index!==p.index||!s.practice.submitted)return s;
      const result=completedPracticeResult(s,this.content,p.id,this.services.clock().wall);
      return {...s,practice:null,lastPracticeResultId:p.id,practiceResults:[...(s.practiceResults??[]).filter(r=>r.id!==p.id),result]};
    });if(ok&&!this.state.practice&&this.state.lastPracticeResultId===p.id){this.route={name:'practiceResult',id:p.id};this.stack=[];this.notify();}}
    else await this.commit(s=>s.practice?.id===p.id&&s.practice.index===p.index&&s.practice.submitted?{...s,practice:{...s.practice,index:s.practice.index+1,selected:null,uncertain:false,submitted:false}}:s);
  }
  practiceResult(id=this.route.id??this.state.lastPracticeResultId??undefined):PracticeResult|undefined{return this.state.practiceResults?.find(r=>r.id===id);}
  nextConcept(afterLessonId?:string){return findNextConcept(this.state,this.content,afterLessonId);}
  private async dismissPracticeResult():Promise<boolean>{
    if(!this.ready||!this.state.onboarded)return false;
    const origin=this.state.lastPracticeResultId;
    const ok=await this.commit(s=>s.lastPracticeResultId===origin&&origin?{...s,lastPracticeResultId:null}:s);
    // A queued result action must not leave onboarding or replace a newer session.
    return ok&&this.ready&&this.state.onboarded&&!this.state.practice&&this.state.lastPracticeResultId===null;
  }
  async openNextConcept(afterLessonId?:string){const lesson=this.nextConcept(afterLessonId);if(await this.dismissPracticeResult()){if(lesson)this.navigate({name:'lesson',id:lesson.id});else this.tab('exams');}}
  async returnPracticeHome(){if(await this.dismissPracticeResult())this.tab('today');}
  async returnPracticeExams(){if(await this.dismissPracticeResult())this.tab('exams');}
  async beginRelatedReview(resultId?:string){const result=this.practiceResult(resultId);if(!result)return;await this.beginPractice(Array.from(new Set([...result.wrongQuestionIds,...result.uncertainQuestionIds])),'review');}
  async beginLessonPractice(lessonId:string){const lesson=this.content.lessons.find(l=>l.id===lessonId);if(lesson)await this.beginPractice(lesson.questionIds);}
  async finishLesson(lessonId:string){if(await this.saveLessonRead(lessonId))await this.beginLessonPractice(lessonId);}
  async beginPlanPractice(dayNumber:number){const day=this.content.days.find(d=>d.day===dayNumber);if(!day||day.examId)return;const ids=day.lessonIds.flatMap(id=>this.content.lessons.find(l=>l.id===id)?.questionIds??[]);await this.beginPractice(ids,isReviewStudyDay(day)?'review':'lesson',isReviewStudyDay(day)?{planDay:dayNumber}:{});}
  openPracticeSetup(){this.navigate({name:'practiceSetup'});}
  async beginTopicPractice(options:PracticeOptions={}){await this.beginPractice(practiceQuestionIds(this.state,this.content,options),'review');}
  async startHomeRecommendation(){const choice=homeRecommendation(this.state,this.content,this.services.clock().wall);if(choice.kind==='exam'){if(await this.checkpoint())this.navigate({name:'exam',id:choice.attemptId});}else if(choice.kind==='practice')this.resumePractice();else if(choice.kind==='review')await this.beginPractice(choice.questionIds,'review',choice.planDay!==undefined?{planDay:choice.planDay}:{});else if(choice.kind==='concept')this.navigate({name:'lesson',id:choice.lessonId});else this.tab('exams');}
  async beginShortSession(){if(this.activeExam()||this.state.practice){await this.startHomeRecommendation();return;}const session=shortSession(this.state,this.content,this.services.clock().wall);if(session.kind==='concept'){if(session.lessonId&&this.state.readLessons.includes(session.lessonId))await this.beginLessonPractice(session.lessonId);else this.navigate({name:'lesson',id:session.lessonId});}else if(session.kind==='review')await this.beginPractice(session.questionIds,'review',session.planDay!==undefined?{planDay:session.planDay}:{});else this.tab('exams');}
  async beginDueReview(){await this.beginPractice(dueReviews(this.state,this.content,this.services.clock().wall).slice(0,10),'review');}
  activeExam():ExamAttempt|undefined{return this.state.exams.find(e=>e.status==='active');}
  examAttempt(id?:string):ExamAttempt|undefined{return id?this.state.exams.find(e=>e.id===id):this.activeExam();}
  async bookmarkMock(id:string){await this.commit(s=>{const q=this.getQuestion(id);if(!q?.examId||!canStudyQuestion(s,q))throw new Error('제출한 회차의 문항만 저장할 수 있습니다.');const m=s.mockStudy??{bookmarks:[],notes:{},mastered:{}};return {...s,mockStudy:{...m,bookmarks:m.bookmarks.includes(id)?m.bookmarks.filter(x=>x!==id):[...m.bookmarks,id]}};});}
  async saveMockNote(id:string,value:string){const ok=await this.commit(s=>{const q=this.getQuestion(id);if(!q?.examId||!canStudyQuestion(s,q))throw new Error('제출한 회차의 문항만 저장할 수 있습니다.');const m=s.mockStudy??{bookmarks:[],notes:{},mastered:{}};return {...s,mockStudy:{...m,notes:{...m.notes,[id]:value.slice(0,10000)}}};});if(ok){this.notice='오답 메모를 저장했습니다.';this.notify();}}
  async beginExam(examId:string,mode:ExamMode='timed'){
    const exam=this.content.exams.find(e=>e.id===examId);if(!exam)return;
    if(!this.ready||!this.state.onboarded)return;
    const id=this.services.uuid();if(await this.commit(s=>{if(s.practice?.questionIds.some(qid=>this.content.questions[qid]?.examId===examId))throw new Error('이 회차의 진행 중 복습을 먼저 마쳐 주세요.');return {...s,lastPracticeResultId:null,exams:[...s.exams,startExam(s,exam,this.content,this.services.clock(),id,mode)]};})){this.stack=[];this.route={name:'exam',id};this.examSheetFilter='all';this.checkpointAt=this.services.clock().wall;this.notify();if(!this.examAppActive)await this.pauseExam();}
  }
  remaining(){const e=this.activeExam();return e?(advanceClock(e,this.isExamPausePending?this.pauseRequest!.clock:this.services.clock()).remainingMs??0):0;}
  async pauseExam(showScreen=true):Promise<boolean>{
    const active=this.activeExam();if(!active)return true;
    if(showScreen){this.dialog=null;this.stack=[];this.route={name:'examPause',id:active.id};this.notify();}
    if(isExamPaused(active))return true;
    if(!this.pauseRequest)this.pauseRequest={id:active.id,clock:this.services.clock()};
    if(this.pauseInFlight)return this.pauseInFlight;
    const request=this.pauseRequest;
    this.pauseInFlight=(async()=>{
      const ok=await this.commit(s=>{
        const e=s.exams.find(e=>e.id===request.id&&e.status==='active');if(!e)return s;
        return {...s,exams:s.exams.map(a=>a.id===e.id?pauseAttempt(a,request.clock):a)};
      });
      if(ok||this.activeExam()?.id!==request.id)this.pauseRequest=undefined;
      if(!ok){this.route={name:'examPause',id:request.id};this.notice='일시정지 내용을 저장하지 못했습니다. 앱을 닫지 말고 저장을 다시 시도해 주세요. 마지막 저장 기록은 유지됩니다.';}
      const e=this.activeExam();
      if(ok&&e?.id===request.id&&!isExamPaused(e)&&e.mode!=='study'&&(e.remainingMs??0)<=0)await this.finishExam('expired');
      this.notify();return ok;
    })();
    try{return await this.pauseInFlight;}finally{this.pauseInFlight=undefined;}
  }
  async resumeExam():Promise<boolean>{
    const active=this.activeExam();if(!active||this.isExamPausePending||!this.examAppActive)return false;
    const ok=await this.commit(s=>({...s,exams:s.exams.map(e=>e.id===active.id?resumeAttempt(e,this.services.clock()):e)}));
    if(ok&&this.activeExam()?.id===active.id){
      if(!this.examAppActive)return this.pauseExam();
      this.stack=[];this.route={name:'exam',id:active.id};this.notice='';this.checkpointAt=this.services.clock().wall;this.notify();
    }
    return ok;
  }
  async onAppBackground(){this.examAppActive=false;if(this.content.mockPack){const e=this.activeExam();if(e&&(!isExamPaused(e)||this.isExamPausePending))await this.pauseExam();}else await this.checkpoint();}
  onAppForeground(){this.examAppActive=true;this.notify();}
  async checkpoint():Promise<boolean>{return this.commit(s=>{const active=s.exams.find(e=>e.status==='active');if(!active||isExamPaused(active)||this.isExamPausePending)return s;return {...s,exams:s.exams.map(e=>e.id===active.id?advanceClock(e,this.services.clock()):e)};});}
  async updateExamAnswer(option:string|null){const target=this.activeExam();if(!target||isExamPaused(target)||this.isExamPausePending)return;const questionId=target.snapshots[target.index].id;await this.commit(s=>{
    const e=s.exams.find(x=>x.id===target.id&&x.status==='active');if(!e||isExamPaused(e))return s;const a=advanceClock(e,this.services.clock());if(a.mode!=='study'&&(a.remainingMs??0)<=0)throw new Error('시험 시간이 끝났습니다');
    const q=a.snapshots.find(q=>q.id===questionId)!;if(option&&!q.options.some(o=>o.id===option))throw new Error('유효하지 않은 보기');
    const answers={...a.answers};if(option)answers[q.id]=option;else delete answers[q.id];
    return {...s,exams:s.exams.map(x=>x.id===a.id?{...a,answers}:x)};
  });}
  async moveExam(index:number){const target=this.activeExam();if(!target||isExamPaused(target)||this.isExamPausePending||!Number.isInteger(index))return;const ok=await this.commit(s=>{const e=s.exams.find(x=>x.id===target.id&&x.status==='active');if(!e||isExamPaused(e))return s;return {...s,exams:s.exams.map(x=>x.id===e.id?{...advanceClock(e,this.services.clock()),index:Math.max(0,Math.min(49,index))}:x)};});if(ok&&this.route.name==='sheet'){this.route={name:'exam',id:this.activeExam()?.id};this.notify();}}
  async flagExam(){const target=this.activeExam();if(!target||isExamPaused(target)||this.isExamPausePending)return;const questionId=target.snapshots[target.index].id;await this.commit(s=>{const e=s.exams.find(x=>x.id===target.id&&x.status==='active');if(!e||isExamPaused(e))return s;return {...s,exams:s.exams.map(x=>x.id===e.id?{...advanceClock(e,this.services.clock()),flagged:e.flagged.includes(questionId)?e.flagged.filter(id=>id!==questionId):[...e.flagged,questionId]}:x)};});}
  requestSubmit(){const e=this.activeExam();if(!e||this.isExamPausePending)return;const n=50-Object.keys(e.answers).length;this.confirm('답안을 제출할까요?',`응답 ${50-n}문항 · 미응답 ${n}문항\n미응답은 0점입니다. 제출 후에는 답안을 바꿀 수 없으며 정답과 해설이 열립니다.`,'제출하고 결과 보기',()=>this.finishExam('manual'));}
  async finishExam(reason:'manual'|'expired'){
    if(this.expiryInFlight||this.isExamPausePending)return;const active=this.activeExam();if(!active||reason==='expired'&&(isExamPaused(active)||this.remaining()>0))return;this.expiryInFlight=true;
    const ok=await this.commit(s=>{
      const e=s.exams.find(x=>x.id===active.id);if(!e||e.status==='submitted')return s;
      const submitted=submitExam(e,this.services.clock(),reason);const reviews={...s.reviews};const mastered={...s.mockStudy?.mastered};
      for(const q of submitted.snapshots)if(q.pool==='mock'){delete reviews[q.id];delete mastered[q.id];}
      for(const q of submitted.snapshots)if(submitted.answers[q.id]!==q.answer)reviews[q.id]={questionId:q.id,dueDay:dayKey(this.services.clock().wall),step:0,lastAnsweredDay:'',lastCorrect:false};
      return {...s,...(this.content.mockPack?{mockStudy:{bookmarks:s.mockStudy?.bookmarks??[],notes:s.mockStudy?.notes??{},mastered}}:{}),exams:s.exams.map(x=>x.id===e.id?submitted:x),reviews,studyDays:Array.from(new Set([...s.studyDays,dayKey(this.services.clock().wall)]))};
    });this.expiryInFlight=false;
    // A queued submission may become a no-op if a reset removed its attempt.
    if(ok&&this.state.exams.some(e=>e.id===active.id&&e.status==='submitted')){this.mockResultFilter='all';this.dialog=null;this.stack=[];this.route={name:'result',id:active.id};this.notify();}
  }
  async pulse(){
    const active=this.activeExam();if(!active||isExamPaused(active)||this.isExamPausePending)return;const now=this.services.clock();
    if(active.mode!=='study'&&this.remaining()<=0&&now.wall-this.lastExpiryTry>5000){this.lastExpiryTry=now.wall;await this.finishExam('expired');}
    else if(now.wall-this.checkpointAt>15000){this.checkpointAt=now.wall;await this.checkpoint();}else if(this.route.name==='exam'||this.route.name==='sheet')this.notify();
  }
  async external(url:string){try{if(!/^https:\/\//i.test(url))throw new Error('HTTPS 주소만 열 수 있습니다');await this.services.openURL(url);}catch(e){this.notice=`외부 페이지를 열지 못했습니다: ${String(e)}`;this.notify();}}
  async report(qid?:string){
    const origin=this.route;
    const text=`[SQLD Pass 오류·의견 제보]\n앱: 0.1.0 / 콘텐츠: ${this.content.manifest.version}\n항목: ${qid??'일반 문의'}\n내용: ${this.supportText.trim()||'오류 상황을 작성해 주세요.'}\n학습 답안·진도·개인정보는 자동 첨부하지 않습니다.`;
    try{const outcome=await this.services.share(text);if(this.route===origin&&(origin.name==='help'||origin.name==='report'))this.supportNotice=outcome==='cancelled'?'공유창을 닫았습니다.':outcome==='copied'?'제보 내용을 복사했습니다. 직접 전달해 주세요. 접수는 완료되지 않았습니다.':outcome==='downloaded'?'제보 내용을 텍스트 파일로 저장했습니다. 직접 전달해 주세요. 접수는 완료되지 않았습니다.':'공유창을 열었습니다. 전송·접수 여부는 앱에서 확인할 수 없습니다.';}catch(e){if(this.route===origin&&(origin.name==='help'||origin.name==='report'))this.supportNotice=`공유창을 열지 못했습니다: ${String(e)}`;}this.notify();
  }
  async contactSupport(){
    const origin=this.route;
    const email=this.services.supportEmail;
    if(!email||!/^[-\w.+]+@[-\w.]+\.[a-z]{2,}$/i.test(email)){this.supportNotice='운영 문의 이메일이 아직 설정되지 않았습니다.';this.notify();return;}
    const body=`앱: SQLD Pass 0.1.0 / 콘텐츠: ${this.content.manifest.version}\n항목: ${this.route.id??'일반 문의'}\n내용: ${this.supportText.trim()}\n\n답안·진도·개인정보는 자동 첨부하지 않습니다.`;
    try{await this.services.openURL(`mailto:${email}?subject=${encodeURIComponent('SQLD Pass 문의')}&body=${encodeURIComponent(body)}`);if(this.route===origin&&(origin.name==='help'||origin.name==='report'))this.supportNotice='메일 작성 화면을 열었습니다. 내용을 확인하고 직접 전송해 주세요.';}
    catch{if(this.route===origin&&(origin.name==='help'||origin.name==='report'))this.supportNotice=`메일 앱을 열지 못했습니다. ${email}로 직접 문의하거나 제보 내용을 공유해 주세요.`;}
    this.notify();
  }
  requestReset(){this.confirm('전체 데이터를 삭제할까요?','이 기기의 학습 기록과 설정, 광고로 연 회차의 이용 권한을 모두 삭제합니다. 삭제한 데이터는 복원할 수 없습니다.','전체 데이터 삭제',async()=>{
    let cleared=false;
    const task=this.serial.then(async()=>{
      this.busy=true;this.notify();
      let remindersCleared=false;
      try{if(this.services.beforeFullReset){if(!await this.services.beforeFullReset())throw new Error('학습 알림 해제에 실패하여 학습 기록 삭제를 중단했습니다.');remindersCleared=true;}await this.services.repository.clear();this.state=initialState(this.content,this.services.clock().wall);this.mockNoteDrafts={};this.screenScroll.clear();this.catalogScroll=undefined;this.examCatalogScroll=undefined;this.recordsScroll=undefined;this.examReviewScroll=undefined;this.reviewPickerOpen=false;this.libraryEditor=null;this.libraryError='';this.examProgressFilter='all';this.draftSettings={...this.state.settings};this.route={name:'welcome'};this.stack=[];this.ready=false;this.startupError='';this.notice='';cleared=true;}
      catch(e){this.notice=`초기화 실패: ${String(e)}${remindersCleared?' 학습 알림은 해제되었고 학습 기록은 유지됩니다.':''}`;}
      finally{this.busy=false;this.notify();}
    });this.serial=task.catch(()=>{});await task;
    if(cleared){
      try{await this.prepareStartup();this.ready=true;}
      catch(e){this.startupError=e instanceof Error?e.message:String(e);this.ready=false;}
      this.notify();
    }
  },true);}
}
