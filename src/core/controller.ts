import type {AppState,Content,Dialog,ExamAttempt,PracticeResult,Question,ReadingOffset,Route,Services,Settings,Tab} from './types';
import {validReadingOffset} from './domain/reading';
import {advanceClock,applyPractice,assertContent,canStudyQuestion,completedPracticeResult,dayKey,dueReviews,eligibleDay,homeRecommendation,initialState,isReviewStudyDay,migrateLearningState,nextConcept as findNextConcept,parseState,planCompletedDays,practiceQuestionIds,shortSession,startExam,submitExam,validTargetDate,type PracticeOptions} from './domain';
export class Controller {
  state:AppState; ready=false; startupError=''; notice=''; busy=false; route:Route={name:'welcome'}; stack:Route[]=[];
  dialog:Dialog|null=null; search=''; subject='all'; bookmarkedOnly=false; filter='all'; expanded=new Set<string>();
  draftSettings:Settings; settingsError=''; supportText=''; supportNotice=''; reviewLimit=20; reviewPickerOpen=false; private listeners=new Set<()=>void>(); private serial:Promise<void>=Promise.resolve();
  private version=0; private checkpointAt=0; private expiryInFlight=false; private lastExpiryTry=0;
  get isExamSubmitting(){return this.expiryInFlight;}
  private systemAppearance:'light'|'dark'='light';
  protected catalogScroll?:{context:string;position:ReadingOffset};
  protected examCatalogScroll?:{context:string;position:ReadingOffset};
  protected recordsScroll?:{context:string;position:ReadingOffset};
  protected examReviewScroll?:{context:string;position:ReadingOffset};
  examProgressFilter:'all'|'unattempted'|'completed'='all';
  get isDark(){return this.state.settings.theme==='dark'||(this.state.settings.theme==='system'&&this.systemAppearance==='dark');}
  setSystemAppearance(value:'light'|'dark'){if(this.systemAppearance!==value){this.systemAppearance=value;this.notify();}}
  readonly getSnapshot=()=>this.version;
  readonly subscribe=(fn:()=>void)=>{this.listeners.add(fn);return ()=>{this.listeners.delete(fn);};};
  constructor(readonly content:Content,readonly services:Services){this.state=initialState(content,services.clock().wall);this.draftSettings={...this.state.settings};}
  notify(){this.version++;for(const fn of this.listeners)fn();}
  protected async prepareStartup():Promise<void>{}
  async initialize(){
    this.startupError='';this.ready=false;this.notify();
    try{assertContent(this.content);this.state=parseState(await this.services.repository.load(),this.content);this.draftSettings={...this.state.settings};
      await this.prepareStartup();
      this.route=this.state.onboarded?(this.state.lastPracticeResultId&&!this.state.practice?{name:'practiceResult',id:this.state.lastPracticeResultId}:{name:'home'}):{name:'welcome'};this.ready=true;const active=this.activeExam();
      if(active)await this.checkpoint();this.notify();await this.pulse();
    }catch(e){this.startupError=e instanceof Error?e.message:String(e);this.ready=false;this.notify();}
  }
  async commit(reducer:(state:AppState)=>AppState):Promise<boolean>{
    let ok=false;
    const task=this.serial.then(async()=>{
      this.busy=true;this.notify();
      try{
        const next=reducer(this.state);if(next===this.state){ok=true;return;}
        const learning=migrateLearningState(next,this.content),completed=planCompletedDays(learning,this.content);
        for(const day of this.content.days)if(eligibleDay(learning,this.content,day.day)&&!completed.includes(day.day))completed.push(day.day);
        const stored={...learning,revision:this.state.revision+1,completedDays:Array.from(new Set([...learning.completedDays,...completed])).sort((a,b)=>a-b),planProgress:{...learning.planProgress!,completedDays:completed.sort((a,b)=>a-b)}};
        await this.services.repository.save(stored);this.state=stored;ok=true;
      }catch(e){this.notice=`저장/처리 실패: ${e instanceof Error?e.message:String(e)}. 마지막 저장 기록은 유지됩니다.`;}
      finally{this.busy=false;this.notify();}
    });this.serial=task.catch(()=>{});await task;return ok;
  }
  navigate(route:Route){this.stack.push(this.route);this.route=route;this.notice='';this.supportNotice='';this.settingsError='';this.reviewPickerOpen=false;if(route.name==='settings'||route.name==='setup')this.draftSettings={...this.state.settings};this.notify();}
  tab(tab:Tab){this.stack=[];this.route={name:({today:'home',learn:'catalog',review:'review',exams:'exams',records:'stats'} as const)[tab]};this.notice='';this.supportNotice='';this.reviewPickerOpen=false;this.notify();}
  back(){
    if(this.dialog){this.dialog=null;this.notify();return;}
    if(this.reviewPickerOpen){this.closeReviewPicker();return;}
    if(this.route.name==='practiceResult'){void this.returnPracticeHome();return;}
    if(this.route.name==='exam'){this.confirm('시험 화면을 나갈까요?','답안은 기기에 저장되며 남은 시간은 계속 흐릅니다. 종료 시각이 지나면 자동 제출합니다.','저장 후 나가기',async()=>{if(await this.checkpoint())this.tab('exams');});return;}
    this.supportNotice='';this.route=this.stack.pop()??{name:this.state.onboarded?'home':'welcome'};this.notify();
  }
  confirm(title:string,body:string,confirmLabel:string,onConfirm:()=>void|Promise<void>,destructive=false){this.dialog={title,body,confirmLabel,onConfirm,destructive};this.notify();}
  cancelDialog(){this.dialog=null;this.notify();}
  async acceptDialog(){const d=this.dialog;this.dialog=null;this.notify();if(d)await d.onConfirm();}
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
  examCatalogContext(){return JSON.stringify([this.expanded.has('exams:available'),this.examProgressFilter,this.notice,this.activeExam()?.id??null]);}
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
  async saveSettings(onboard=false){
    const d={...this.draftSettings};
    if(!validTargetDate(d.targetDate,dayKey(this.services.clock().wall))){this.settingsError='오늘 이후의 실제 날짜를 선택하거나 시험일을 비워 주세요.';this.notify();return;}
    if(![15,30,45,60,90].includes(d.minutes))return;
    this.settingsError='';
    if(await this.commit(s=>({...s,settings:d,onboarded:onboard||s.onboarded}))){this.stack=[];this.route={name:'home'};this.notice='학습 설정을 저장했습니다. 기존 기록은 유지됩니다.';this.notify();}
  }
  private async saveLessonRead(id:string):Promise<boolean>{if(!this.ready||!this.state.onboarded||!this.content.lessons.some(l=>l.id===id))return false;const ok=await this.commit(s=>s.onboarded?({...s,readLessons:Array.from(new Set([...s.readLessons,id])),studyDays:Array.from(new Set([...s.studyDays,dayKey(this.services.clock().wall)]))}):s);const recorded=ok&&this.state.onboarded&&this.state.readLessons.includes(id);if(recorded){this.notice='이론 읽음을 기록했습니다. 확인 문제로 이해를 점검해 보세요.';this.notify();}return recorded;}
  async markLesson(id:string):Promise<void>{await this.saveLessonRead(id);}
  async bookmark(id:string){await this.commit(s=>({...s,bookmarks:s.bookmarks.includes(id)?s.bookmarks.filter(x=>x!==id):[...s.bookmarks,id]}));}
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
    const q=this.getQuestion(p.questionIds[p.index]);if(!q)throw new Error('문항을 찾을 수 없습니다');
    const next=applyPractice(s,q,p.selected,p.uncertain,this.services.clock().wall,`${p.id}:${p.index}`,p.mode,p.planDay);
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
  async beginExam(examId:string){
    const exam=this.content.exams.find(e=>e.id===examId);if(!exam)return;
    const id=this.services.uuid();if(await this.commit(s=>({...s,exams:[...s.exams,startExam(s,exam,this.content,this.services.clock(),id)]}))){this.stack=[];this.route={name:'exam',id};this.checkpointAt=this.services.clock().wall;this.notify();}
  }
  remaining(){const e=this.activeExam();return e?advanceClock(e,this.services.clock()).remainingMs:0;}
  async checkpoint():Promise<boolean>{return this.commit(s=>{const active=s.exams.find(e=>e.status==='active');if(!active)return s;return {...s,exams:s.exams.map(e=>e.id===active.id?advanceClock(e,this.services.clock()):e)};});}
  async updateExamAnswer(option:string|null){await this.commit(s=>{
    const e=s.exams.find(x=>x.status==='active');if(!e)return s;const a=advanceClock(e,this.services.clock());if(a.remainingMs<=0)throw new Error('시험 시간이 끝났습니다');
    const q=a.snapshots[a.index];if(option&&!q.options.some(o=>o.id===option))throw new Error('유효하지 않은 보기');
    const answers={...a.answers};if(option)answers[q.id]=option;else delete answers[q.id];
    return {...s,exams:s.exams.map(x=>x.id===a.id?{...a,answers}:x)};
  });}
  async moveExam(index:number){const ok=await this.commit(s=>{const e=s.exams.find(x=>x.status==='active');if(!e)return s;return {...s,exams:s.exams.map(x=>x.id===e.id?{...advanceClock(e,this.services.clock()),index:Math.max(0,Math.min(49,index))}:x)};});if(ok&&this.route.name==='sheet'){this.route={name:'exam',id:this.activeExam()?.id};this.notify();}}
  async flagExam(){await this.commit(s=>{const e=s.exams.find(x=>x.status==='active');if(!e)return s;const q=e.snapshots[e.index];return {...s,exams:s.exams.map(x=>x.id===e.id?{...advanceClock(e,this.services.clock()),flagged:e.flagged.includes(q.id)?e.flagged.filter(id=>id!==q.id):[...e.flagged,q.id]}:x)};});}
  requestSubmit(){const e=this.activeExam();if(!e)return;const n=50-Object.keys(e.answers).length;this.confirm('답안을 제출할까요?',`미응답 ${n}문항은 0점으로 채점합니다. 제출 후 답안을 변경할 수 없습니다.`,'제출하고 결과 보기',()=>this.finishExam('manual'));}
  async finishExam(reason:'manual'|'expired'){
    if(this.expiryInFlight)return;const active=this.activeExam();if(!active)return;this.expiryInFlight=true;
    const ok=await this.commit(s=>{
      const e=s.exams.find(x=>x.id===active.id);if(!e||e.status==='submitted')return s;
      const submitted=submitExam(e,this.services.clock(),reason);const reviews={...s.reviews};
      for(const q of submitted.snapshots)if(submitted.answers[q.id]!==q.answer)reviews[q.id]={questionId:q.id,dueDay:dayKey(this.services.clock().wall),step:0,lastAnsweredDay:'',lastCorrect:false};
      return {...s,exams:s.exams.map(x=>x.id===e.id?submitted:x),reviews,studyDays:Array.from(new Set([...s.studyDays,dayKey(this.services.clock().wall)]))};
    });this.expiryInFlight=false;
    // A queued submission may become a no-op if a reset removed its attempt.
    if(ok&&this.state.exams.some(e=>e.id===active.id&&e.status==='submitted')){this.dialog=null;this.stack=[];this.route={name:'result',id:active.id};this.notify();}
  }
  async pulse(){
    const active=this.activeExam();if(!active)return;const now=this.services.clock();
    if(this.remaining()<=0&&now.wall-this.lastExpiryTry>5000){this.lastExpiryTry=now.wall;await this.finishExam('expired');}
    else if(now.wall-this.checkpointAt>15000){this.checkpointAt=now.wall;await this.checkpoint();}else if(this.route.name==='exam'||this.route.name==='sheet')this.notify();
  }
  async external(url:string){try{if(!/^https:\/\//i.test(url))throw new Error('HTTPS 주소만 열 수 있습니다');await this.services.openURL(url);}catch(e){this.notice=`외부 페이지를 열지 못했습니다: ${String(e)}`;this.notify();}}
  async report(qid?:string){
    const origin=this.route;
    const text=`[SQLD Pass 오류·의견 제보]\n앱: 0.1.0 / 콘텐츠: ${this.content.manifest.version}\n항목: ${qid??'일반 문의'}\n내용: ${this.supportText.trim()||'오류 상황을 작성해 주세요.'}\n학습 답안·진도·개인정보는 자동 첨부하지 않습니다.`;
    try{const outcome=await this.services.share(text);if(this.route===origin&&origin.name==='help')this.supportNotice=outcome==='cancelled'?'공유창을 닫았습니다.':outcome==='copied'?'제보 내용을 복사했습니다. 직접 전달해 주세요. 접수는 완료되지 않았습니다.':outcome==='downloaded'?'제보 내용을 텍스트 파일로 저장했습니다. 직접 전달해 주세요. 접수는 완료되지 않았습니다.':'공유창을 열었습니다. 전송·접수 여부는 앱에서 확인할 수 없습니다.';}catch(e){if(this.route===origin&&origin.name==='help')this.supportNotice=`공유창을 열지 못했습니다: ${String(e)}`;}this.notify();
  }
  async contactSupport(){
    const origin=this.route;
    const email=this.services.supportEmail;
    if(!email||!/^[-\w.+]+@[-\w.]+\.[a-z]{2,}$/i.test(email)){this.supportNotice='운영 문의 이메일이 아직 설정되지 않았습니다.';this.notify();return;}
    const body=`앱: SQLD Pass 0.1.0 / 콘텐츠: ${this.content.manifest.version}\n항목: ${this.route.id??'일반 문의'}\n내용: ${this.supportText.trim()}\n\n답안·진도·개인정보는 자동 첨부하지 않습니다.`;
    try{await this.services.openURL(`mailto:${email}?subject=${encodeURIComponent('SQLD Pass 문의')}&body=${encodeURIComponent(body)}`);if(this.route===origin&&origin.name==='help')this.supportNotice='메일 작성 화면을 열었습니다. 내용을 확인하고 직접 전송해 주세요.';}
    catch{if(this.route===origin&&origin.name==='help')this.supportNotice=`메일 앱을 열지 못했습니다. ${email}로 직접 문의하거나 제보 내용을 공유해 주세요.`;}
    this.notify();
  }
  requestReset(){this.confirm('기기의 학습 기록을 초기화할까요?','읽은 이론, 북마크, 풀이 기록, 진행 중 시험과 설정을 모두 삭제합니다. 복원할 수 없습니다. SQLD Pass의 로컬 학습 기록만 삭제됩니다.','이 앱 기록 삭제',async()=>{
    let cleared=false;
    const task=this.serial.then(async()=>{
      this.busy=true;this.notify();
      let remindersCleared=false;
      try{if(this.services.beforeFullReset){if(!await this.services.beforeFullReset())throw new Error('학습 알림 해제에 실패하여 학습 기록 삭제를 중단했습니다.');remindersCleared=true;}await this.services.repository.clear();this.state=initialState(this.content,this.services.clock().wall);this.catalogScroll=undefined;this.examCatalogScroll=undefined;this.recordsScroll=undefined;this.examReviewScroll=undefined;this.reviewPickerOpen=false;this.examProgressFilter='all';this.draftSettings={...this.state.settings};this.route={name:'welcome'};this.stack=[];this.ready=false;this.startupError='';this.notice='';cleared=true;}
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
