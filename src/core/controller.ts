import type {AppState,Content,Dialog,ExamAttempt,Question,Route,Services,Settings,Tab} from './types';
import {advanceClock,applyPractice,assertContent,canStudyQuestion,dayKey,dueReviews,eligibleDay,initialState,parseState,startExam,submitExam,validTargetDate} from './domain';
export class Controller {
  state:AppState; ready=false; startupError=''; notice=''; busy=false; route:Route={name:'welcome'}; stack:Route[]=[];
  dialog:Dialog|null=null; search=''; subject='all'; bookmarkedOnly=false; filter='all'; expanded=new Set<string>();
  draftSettings:Settings; supportText=''; private listeners=new Set<()=>void>(); private serial:Promise<void>=Promise.resolve();
  private version=0; private checkpointAt=0; private expiryInFlight=false; private lastExpiryTry=0;
  private systemAppearance:'light'|'dark'='light';
  get isDark(){return this.state.settings.theme==='dark'||(this.state.settings.theme==='system'&&this.systemAppearance==='dark');}
  setSystemAppearance(value:'light'|'dark'){if(this.systemAppearance!==value){this.systemAppearance=value;this.notify();}}
  readonly getSnapshot=()=>this.version;
  readonly subscribe=(fn:()=>void)=>{this.listeners.add(fn);return ()=>{this.listeners.delete(fn);};};
  constructor(readonly content:Content,readonly services:Services){this.state=initialState(content,services.clock().wall);this.draftSettings={...this.state.settings};}
  notify(){this.version++;for(const fn of this.listeners)fn();}
  async initialize(){
    this.startupError='';this.ready=false;this.notify();
    try{assertContent(this.content);this.state=parseState(await this.services.repository.load(),this.content);this.draftSettings={...this.state.settings};
      this.route={name:this.state.onboarded?'home':'welcome'};this.ready=true;const active=this.activeExam();
      if(active)await this.checkpoint();this.notify();await this.pulse();
    }catch(e){this.startupError=e instanceof Error?e.message:String(e);this.ready=false;this.notify();}
  }
  async commit(reducer:(state:AppState)=>AppState):Promise<boolean>{
    let ok=false;
    const task=this.serial.then(async()=>{
      this.busy=true;this.notify();
      try{
        const next=reducer(this.state);if(next===this.state){ok=true;return;}
        const completed=[...next.completedDays];
        for(const day of this.content.days)if((day.lessonIds.length||day.examId)&&eligibleDay(next,this.content,day.day)&&!completed.includes(day.day))completed.push(day.day);
        const stored={...next,revision:this.state.revision+1,completedDays:completed.sort((a,b)=>a-b)};
        await this.services.repository.save(stored);this.state=stored;ok=true;
      }catch(e){this.notice=`저장/처리 실패: ${e instanceof Error?e.message:String(e)}. 마지막 저장 기록은 유지됩니다.`;}
      finally{this.busy=false;this.notify();}
    });this.serial=task.catch(()=>{});await task;return ok;
  }
  navigate(route:Route){this.stack.push(this.route);this.route=route;this.notice='';if(route.name==='settings'||route.name==='setup')this.draftSettings={...this.state.settings};this.notify();}
  tab(tab:Tab){this.stack=[];this.route={name:({today:'home',learn:'catalog',review:'review',exams:'exams'} as const)[tab]};this.notice='';this.notify();}
  back(){
    if(this.dialog){this.dialog=null;this.notify();return;}
    if(this.route.name==='exam'){this.confirm('시험 화면을 나갈까요?','답안은 기기에 저장되며 남은 시간은 계속 흐릅니다. 종료 시각이 지나면 자동 제출합니다.','저장 후 나가기',async()=>{if(await this.checkpoint())this.tab('exams');});return;}
    this.route=this.stack.pop()??{name:this.state.onboarded?'home':'welcome'};this.notify();
  }
  confirm(title:string,body:string,confirmLabel:string,onConfirm:()=>void|Promise<void>,destructive=false){this.dialog={title,body,confirmLabel,onConfirm,destructive};this.notify();}
  cancelDialog(){this.dialog=null;this.notify();}
  async acceptDialog(){const d=this.dialog;this.dialog=null;this.notify();if(d)await d.onConfirm();}
  toggleExpanded(id:string){this.expanded.has(id)?this.expanded.delete(id):this.expanded.add(id);this.notify();}
  setSearch(text:string){this.search=text;this.notify();}
  setSubject(v:string){this.subject=v;this.notify();}
  async saveSettings(onboard=false){
    const d={...this.draftSettings};
    if(!validTargetDate(d.targetDate,dayKey(this.services.clock().wall))){this.notice='목표일은 오늘 이후의 실제 날짜를 YYYY-MM-DD로 입력하거나 비워 주세요.';this.notify();return;}
    if(![15,30,45,60,90].includes(d.minutes))return;
    if(await this.commit(s=>({...s,settings:d,onboarded:onboard||s.onboarded}))){this.stack=[];this.route={name:'home'};this.notice='학습 설정을 저장했습니다. 기존 기록은 유지됩니다.';this.notify();}
  }
  async markLesson(id:string){const ok=await this.commit(s=>({...s,readLessons:Array.from(new Set([...s.readLessons,id])),studyDays:Array.from(new Set([...s.studyDays,dayKey(this.services.clock().wall)]))}));if(ok){this.notice='이론 읽음을 기록했습니다. 확인 문제로 이해를 점검해 보세요.';this.notify();}}
  async bookmark(id:string){await this.commit(s=>({...s,bookmarks:s.bookmarks.includes(id)?s.bookmarks.filter(x=>x!==id):[...s.bookmarks,id]}));}
  currentDay(){return this.content.days.find(d=>!this.state.completedDays.includes(d.day))??this.content.days[29];}
  async markDay(day:number){if(!eligibleDay(this.state,this.content,day)){this.notice='해당 학습일의 이론과 확인 문제 또는 모의고사를 먼저 완료해 주세요.';this.notify();return;}
    await this.commit(s=>({...s,completedDays:Array.from(new Set([...s.completedDays,day]))}));}
  getQuestion(id:string):Question|undefined {
    const original=this.content.questions[id];if(original?.examId){for(const e of [...this.state.exams].reverse())if(e.status==='submitted'){const q=e.snapshots.find(x=>x.id===id);if(q)return q;}}
    return original;
  }
  async beginPractice(ids:string[],mode:'lesson'|'review'='lesson'){
    if(!ids.length){this.notice='선택 조건에 맞는 문제가 없습니다.';this.notify();return;}
    const qids=Array.from(new Set(ids)).filter(id=>{const q=this.getQuestion(id);return q&&canStudyQuestion(this.state,q);});
    if(!qids.length){this.notice='제출 전 모의고사 문제는 연습에서 열 수 없습니다.';this.notify();return;}
    const begin=async()=>{if(await this.commit(s=>({...s,practice:{id:this.services.uuid(),questionIds:qids,index:0,selected:null,uncertain:false,submitted:false,mode,sessionCorrect:0,sessionAnswered:0}})))this.navigate({name:'practice'});};
    if(this.state.practice){this.confirm('진행 중인 연습이 있어요','새 연습을 시작하면 아직 제출하지 않은 선택은 바뀝니다. 이미 제출한 풀이 기록은 유지됩니다.','새 연습 시작',begin);}else await begin();
  }
  resumePractice(){if(this.state.practice)this.navigate({name:'practice'});}
  async selectPractice(option:string){await this.commit(s=>!s.practice||s.practice.submitted?s:{...s,practice:{...s.practice,selected:option}});}
  async uncertain(){await this.commit(s=>!s.practice||s.practice.submitted?s:{...s,practice:{...s.practice,uncertain:!s.practice.uncertain}});}
  async answerPractice(){await this.commit(s=>{
    const p=s.practice;if(!p||p.submitted)return s;if(!p.selected)throw new Error('먼저 보기를 선택해 주세요');
    const q=this.getQuestion(p.questionIds[p.index]);if(!q)throw new Error('문항을 찾을 수 없습니다');
    const next=applyPractice(s,q,p.selected,p.uncertain,this.services.clock().wall,`${p.id}:${p.index}`,p.mode);
    return {...next,practice:{...p,submitted:true,sessionAnswered:p.sessionAnswered+1,sessionCorrect:p.sessionCorrect+(p.selected===q.answer?1:0)}};
  });}
  async nextPractice(){const p=this.state.practice;if(!p?.submitted)return;
    if(p.index===p.questionIds.length-1){if(await this.commit(s=>({...s,practice:null}))){this.route={name:p.mode==='review'?'review':'catalog'};this.stack=[];this.notice=`연습 완료 · ${p.sessionAnswered}문항 중 ${p.sessionCorrect}문항 정답. 확신 부족 문항은 복습으로 이어집니다.`;this.notify();}}
    else await this.commit(s=>s.practice?{...s,practice:{...s.practice,index:s.practice.index+1,selected:null,uncertain:false,submitted:false}}:s);
  }
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
    });this.expiryInFlight=false;if(ok){this.dialog=null;this.stack=[];this.route={name:'result',id:active.id};this.notify();}
  }
  async pulse(){
    const active=this.activeExam();if(!active)return;const now=this.services.clock();
    if(this.remaining()<=0&&now.wall-this.lastExpiryTry>5000){this.lastExpiryTry=now.wall;await this.finishExam('expired');}
    else if(now.wall-this.checkpointAt>15000){this.checkpointAt=now.wall;await this.checkpoint();}else if(this.route.name==='exam'||this.route.name==='sheet')this.notify();
  }
  async external(url:string){try{if(!/^https:\/\//i.test(url))throw new Error('HTTPS 주소만 열 수 있습니다');await this.services.openURL(url);}catch(e){this.notice=`외부 페이지를 열지 못했습니다: ${String(e)}`;this.notify();}}
  async report(qid?:string){
    const text=`[SQLD Pass 내부 테스트 제보]\n앱: 0.1.0 / 콘텐츠: ${this.content.manifest.version}\n항목: ${qid??'일반 문의'}\n내용: ${this.supportText.trim()||'오류 상황을 작성해 주세요.'}\n학습 답안·진도·개인정보는 자동 첨부하지 않습니다.`;
    try{const outcome=await this.services.share(text);this.notice=outcome==='cancelled'?'공유를 취소했습니다.':outcome==='copied'?'제보 내용을 복사했습니다. 직접 전달해 주세요. 접수는 완료되지 않았습니다.':outcome==='downloaded'?'제보 내용을 텍스트 파일로 저장했습니다. 직접 전달해 주세요. 접수는 완료되지 않았습니다.':'공유 동작을 완료했습니다. 실제 문의 접수 여부는 앱에서 확인하지 않습니다.';}catch(e){this.notice=`공유 실패: ${String(e)}`;}this.notify();
  }
  async contactSupport(){
    const email=this.services.supportEmail;
    if(!email||!/^[-\w.+]+@[-\w.]+\.[a-z]{2,}$/i.test(email)){this.notice='운영 문의 이메일이 아직 설정되지 않았습니다.';this.notify();return;}
    const body=`앱: SQLD Pass 0.1.0 / 콘텐츠: ${this.content.manifest.version}\n항목: ${this.route.id??'일반 문의'}\n내용: ${this.supportText.trim()}\n\n답안·진도·개인정보는 자동 첨부하지 않습니다.`;
    try{await this.services.openURL(`mailto:${email}?subject=${encodeURIComponent('SQLD Pass 문의')}&body=${encodeURIComponent(body)}`);this.notice='메일 작성 화면을 열었습니다. 내용을 확인하고 직접 전송해 주세요.';}
    catch{this.notice=`메일 앱을 열지 못했습니다. ${email}로 직접 문의하거나 제보 내용을 공유해 주세요.`;}
    this.notify();
  }
  requestReset(){this.confirm('기기의 학습 기록을 초기화할까요?','읽은 이론, 북마크, 풀이 기록, 진행 중 시험과 설정을 모두 삭제합니다. 복원할 수 없습니다. SQLD Pass의 로컬 학습 기록만 삭제됩니다.','이 앱 기록 삭제',async()=>{
    const task=this.serial.then(async()=>{
      this.busy=true;this.notify();
      try{await this.services.repository.clear();this.state=initialState(this.content,this.services.clock().wall);this.draftSettings={...this.state.settings};this.route={name:'welcome'};this.stack=[];this.ready=true;this.startupError='';this.notice='';}
      catch(e){this.notice=`초기화 실패: ${String(e)}`;}
      finally{this.busy=false;this.notify();}
    });this.serial=task.catch(()=>{});await task;
  },true);}
}
