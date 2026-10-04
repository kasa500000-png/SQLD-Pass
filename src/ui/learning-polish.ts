import type {Controller} from '../core/controller';
import type {ExamAttempt,Lesson,Question} from '../core/types';
import {dayKey,dueReviews,confirmationAccuracy,formatTime,SUBJECTS,planCompletedDays,lessonProgress,isReviewStudyDay,homeRecommendation,shortSession,learningStats,topicPracticeOptions,practiceQuestionIds,canStudyQuestion} from '../core/domain';
import {box,button,code,dark,light,progress,row,table,text,type Node,type Style} from './nodes';
import {dialectLabel,examReviewIndices,lessonBlocks,lessonStatus,searchLessons} from './learning-format';
import {questionContext} from './question-context';
import {learningGroups,practiceSetupDraft,practiceSetupOptions,updatePracticeSetupDraft} from './learning-retention';

export const launchFreeLocalDataNotice='앱 자체 기록 복원·기기 간 동기화는 제공하지 않습니다. 앱 삭제·전체 데이터 삭제·재설치·기기 변경 후 기록 유지나 복원은 보장하지 않습니다. 이 버전의 모의고사 20회는 계속 무료로 이용할 수 있습니다.';

export interface ExamAccessUI {hasAccess(id:string):boolean;offerUnlock(id:string):void;mode:'off'|'test'|'live';launchFree?:boolean;busy:boolean;resetLearning?():void;}
/** Presentation only: does not mutate answer keys, grants, SQLite schema or approval flags. */
export function polishLearning(c:Controller,root:Node,access?:ExamAccessUI):Node {
  const scroll=root.children?.find(n=>n.scroll);if(!scroll||!c.ready)return root;
  const p=c.isDark?dark:light,s=c.state,r=c.route.name,active=c.activeExam();
  const locked=c.busy||!!access?.busy;
  const small=(v:string)=>text(v,{fontSize:13,lineHeight:21,color:p.muted});
  const body=(v:string)=>text(v,{fontSize:16,lineHeight:26,color:p.ink});
  const heading=(v:string,n=24):Node=>({...text(v,{fontSize:n,lineHeight:n+10,fontWeight:'700',color:p.ink}),heading:true});
  const card=(nodes:Node[],style:Style={},key?:string)=>box(nodes,{padding:18,gap:12,borderRadius:20,backgroundColor:p.surface,borderWidth:1,borderColor:p.line,...style},key);
  const badge=(v:string,tone:'blue'|'green'|'orange'='blue')=>box([text(v,{fontSize:12,lineHeight:19,fontWeight:'700',color:p[tone]})],{paddingHorizontal:10,paddingVertical:5,borderRadius:8,backgroundColor:p[`${tone}Soft`],alignSelf:'flex-start'});
  const action=(v:string,fn:()=>void|Promise<void>,id:string,primary=false,disabled=false)=>button(v,fn,{minHeight:52,paddingHorizontal:16,paddingVertical:12,borderRadius:16,borderWidth:primary?0:1,borderColor:p.line,backgroundColor:primary?p.blue:p.surface,color:primary?(c.isDark?p.bg:'#FFFFFF'):p.blue,fontSize:15,lineHeight:23,fontWeight:'700'},{testId:id,disabled:disabled||locked,...(primary?{icon:'arrow-right' as const,iconPosition:'trailing' as const}:{})});
  const textAction=(v:string,fn:()=>void|Promise<void>,id:string)=>button(v,fn,{minHeight:48,paddingHorizontal:4,paddingVertical:10,color:p.blue,fontSize:14,fontWeight:'600'},{testId:id,disabled:locked,icon:'chevron-right',iconPosition:'trailing'});
  const choiceChip=(v:string,selected:boolean,fn:()=>void,id:string)=>button(v,fn,{minHeight:48,paddingHorizontal:13,borderRadius:12,borderWidth:1,borderColor:selected?p.blue:p.line,backgroundColor:selected?p.blueSoft:p.surface,color:selected?p.blue:p.muted,fontSize:14},{testId:id,selected,disabled:locked});
  const notice=(v:string)=>box([small(v)],{padding:14,borderRadius:12,backgroundColor:p.blueSoft});
  const empty=(v:string,description:string)=>card([heading(v,20),body(description)]);
  // Keep the header flexible at 320dp / large text; the brand must not push MY offscreen.
  if(['home','catalog','practiceSetup','review','exams','stats'].includes(r)&&root.children?.[0]!==scroll){
    root.children![0]=row([box([text(({home:'홈',catalog:'학습',practiceSetup:'학습',review:'학습',exams:'실전',stats:'기록'} as Record<string,string>)[r]??'SQLD Pass',{fontSize:22,lineHeight:31,fontWeight:'800',color:p.ink}),...(r==='home'?[small('SQLD Pass')]:[])],{flex:1,flexShrink:1}),
      button('',()=>c.navigate({name:'settings'}),{minHeight:48,minWidth:48,padding:12,borderRadius:16,color:p.muted},{label:'설정',testId:'app-settings',disabled:locked,icon:'settings',iconSize:22})],
      {paddingHorizontal:16,paddingVertical:8,borderBottomWidth:1,borderColor:p.line,backgroundColor:p.surface});
  }
  let content:Node[]|null=null,footer:Node|undefined,top:Node|undefined,reviewPicker:Node|undefined;
  const openLesson=(l:Lesson)=>c.navigate({name:'lesson',id:l.id});
  const item=(l:Lesson)=>button('',()=>openLesson(l),{paddingVertical:15,paddingHorizontal:16,minHeight:72,borderBottomWidth:1,borderColor:p.line,backgroundColor:p.surface,alignItems:'stretch'},{key:l.id,testId:`lesson-${l.id}`,label:`${l.title}, ${lessonStatus(l,s)}`,disabled:locked,children:[row([text(String(l.order).padStart(2,'0'),{fontSize:13,fontWeight:'700',color:p.muted}),box([text(l.title,{fontSize:16,lineHeight:25,fontWeight:'600',color:p.ink}),small(`약 ${l.minutes}분 · ${lessonStatus(l,s)}`)],{flex:1,gap:4}),{kind:'icon',icon:s.readLessons.includes(l.id)?'check':'chevron-right',label:s.readLessons.includes(l.id)?'읽음':'개념 열기',style:{color:s.readLessons.includes(l.id)?p.green:p.muted},iconSize:18}])]});
  const question=(q:Question):Node[]=>{
    const inputs=questionContext(q,c.content);
    return [row([badge(q.subject==='S1'?'1과목':'2과목'),small(dialectLabel(q.dialect))],{flexWrap:'wrap'}),heading(q.stem,19),
      ...inputs.tables.flatMap(t=>[small(`입력 · ${t.name}`),table(t.columns,t.rows,t.name)]),
      ...(inputs.sql?[...(inputs.sqlLabel?[small(inputs.sqlLabel)]:[]),{...code(inputs.sql),...(inputs.sqlLabel?{label:inputs.sqlLabel}:{})}]:[])];
  };
  const options=(q:Question,selected:string|null,submitted:boolean,fn:(id:string)=>void|Promise<void>):Node[]=>q.options.map(o=>{
    const yes=submitted&&o.id===q.answer,no=submitted&&o.id===selected&&!yes,sel=selected===o.id;
    const status=yes?'정답':no?'내 선택 · 오답':sel?'선택됨':'';
    return button('',()=>fn(o.id),{padding:14,minHeight:56,borderRadius:14,borderWidth:1.5,borderColor:yes?p.green:no?p.red:sel?p.blue:p.line,backgroundColor:yes?p.greenSoft:no?p.redSoft:sel?p.blueSoft:p.surface,alignItems:'stretch'},
      {testId:`option-${o.id}`,label:`${o.id}번 ${o.text}${status?`, ${status}`:''}`,selected:sel,disabled:submitted||locked,role:'radio',checked:sel,children:[row([text(yes?'✓':no?'×':o.id,{fontSize:17,fontWeight:'700',color:yes?p.green:no?p.red:p.blue}),box([...(status?[small(status)]:[]),o.format==='sql'?code(o.text):body(o.text)],{flex:1,gap:5})],{alignItems:'flex-start'})]});
  });
  const explanation=(q:Question,selected?:string):Node[]=>{
    const wrong=q.options.filter(o=>o.id!==q.answer&&q.optionExplanations?.[o.id]);
    const selectedWrong=wrong.filter(o=>o.id===selected),others=wrong.filter(o=>o.id!==selected);
    const unfolded=c.expanded.has(`other-options:${q.id}`);
    const rationale=(id:string,mine=false)=>card([small(`${id}번${mine?' · 내가 선택한 보기':''}`),...lessonBlocks(q.optionExplanations[id],p)],{padding:14},`option-rationale-${id}`);
    return [badge(`정답 ${q.answer}번 · ${selected===q.answer?'정답':selected?'오답':'미응답'}`,selected===q.answer?'green':'orange'),heading('정답의 이유',20),...lessonBlocks(q.explanation,p),
      ...selectedWrong.map(o=>rationale(o.id,true)),
      ...q.lessonIds.flatMap(id=>{const l=c.content.lessons.find(l=>l.id===id);return l?[action(`관련 이론 · ${l.title}`,()=>openLesson(l),`related-${id}`)]:[];}),
      ...(others.length?[{...action(unfolded?'다른 보기 해설 접기':`다른 보기 해설 · ${others.length}개`,()=>c.toggleExpanded(`other-options:${q.id}`),`other-options-${q.id}`),expanded:unfolded},...(unfolded?others.map(o=>rationale(o.id)):[])]:[]),
      action(c.expanded.has(`question-info:${q.id}`)?'문항 정보 접기':'문항 정보·오류 제보',()=>c.toggleExpanded(`question-info:${q.id}`),`question-info-${q.id}`),...(c.expanded.has(`question-info:${q.id}`)?[small(`${q.id} · 콘텐츠 ${q.version} · ${dialectLabel(q.dialect)}`),action('오류 제보',()=>c.navigate({name:'help',id:q.id}),`report-${q.id}`)]:[])];
  };
  const resume=(e:ExamAttempt)=>{c.stack=[];c.navigate({name:'exam',id:e.id});};
  const framedFooter=(nodes:Node[])=>box(nodes,{paddingHorizontal:16,paddingVertical:12,gap:8,borderTopWidth:1,borderColor:p.line,backgroundColor:p.surface},'learning-footer');
  const activity=(stats:ReturnType<typeof learningStats>)=>{
    const days=stats.recent7.days,first=days[0].day,last=days.at(-1)!.day,sameYear=first.slice(0,4)===last.slice(0,4);
    const date=(day:string)=>(sameYear?day.slice(5):day).replace(/-/g,'/');
    return {...box([
    row([heading('최근 7일',18),box([],{flex:1}),small(`${stats.recent7.activeDays}일 학습`)]),
    {...small(`${date(first)}–${date(last)}`),testId:'activity-period'},
    small('풀이 수는 확인 문제·복습 기준입니다.'),
    row(days.map(day=>box([small(['일','월','화','수','목','금','토'][new Date(`${day.day}T00:00:00Z`).getUTCDay()]),small(day.day.slice(-2)),{kind:'icon',icon:day.studied?'check':'book',label:`${day.day}, ${day.studied?'학습함':'학습 기록 없음'}, 확인 문제·복습 ${day.answered}문항`,iconSize:20,style:{color:day.studied?p.blue:p.muted}},small(String(day.answered))],{flex:1,flexBasis:0,minWidth:0,gap:6,paddingVertical:10,alignItems:'center',borderRadius:14,backgroundColor:day.studied?p.blueSoft:p.surface},`activity-${day.day}`)),{gap:5,alignItems:'stretch'}),
    small(stats.streak?`${stats.streak}일 연속 학습 중`:'오늘 한 세션부터 시작해 보세요.')
  ],{gap:10}),testId:'learning-activity'};
  };
  const openTopicSetup=(ids:string|string[],filter:'all'|'wrong'='all')=>{updatePracticeSetupDraft(c,{lessonIds:typeof ids==='string'?[ids]:ids,source:'all',filter,limit:10});c.openPracticeSetup();};

  if(r==='home'){
    const now=c.services.clock().wall,d=c.currentDay(),completed=planCompletedDays(s,c.content),recommendation=homeRecommendation(s,c.content,now),session=shortSession(s,c.content,now),stats=learningStats(s,c.content,now);
    const lessons=d.lessonIds.flatMap(id=>{const l=c.content.lessons.find(l=>l.id===id);return l?[l]:[];});
    const answered=new Set(s.responses.map(a=>a.questionId)),questions=new Set(lessons.flatMap(l=>l.questionIds));
    const savedReading=recommendation.kind==='concept'&&recommendation.resumeReading?c.content.lessons.find(l=>l.id===recommendation.lessonId):undefined;
    const target=savedReading??c.content.lessons.find(l=>l.id===(session.kind==='concept'?session.lessonId:recommendation.lessonId));
    const targetDay=target?c.content.days.find(day=>day.lessonIds.includes(target.id)):undefined;
    const today=stats.recent7.days.at(-1)!,todayExams=s.exams.filter(e=>e.status==='submitted'&&dayKey(e.submittedAt??e.startedAt)===dayKey(now)).length;
    const plannedExam=completed.length<30?d.examId:null;
    const hero=active?[badge('시험 진행 중','orange'),heading(active.title,23),small(`남은 시간 ${formatTime(c.remaining())} · 화면을 나가도 계속 흐릅니다.`),action('진행 중 시험 이어하기',()=>resume(active),'home-resume-exam',true)]:s.practice?[badge('중단한 문제풀이'),heading('풀던 문제부터 이어서',23),small(`${s.practice.index+1}/${s.practice.questionIds.length}문항`),action('문제풀이 이어하기',()=>c.resumePractice(),'home-resume-practice',true)]:savedReading?[
      badge('중단한 개념'),heading(savedReading.title,23),...(targetDay?[small(`읽던 이론 · Day ${targetDay.day}`)]:[]),
      small(`전체 분량 · 개념 + 확인 ${savedReading.questionIds.length}문항 · 약 ${savedReading.minutes+savedReading.questionIds.length*2}분`),
      action('이어서 읽기',()=>openLesson(savedReading),'home-study',true),
      ...(session.kind!=='complete'&&(session.kind!=='concept'||session.lessonId!==savedReading.id)?[textAction(`${session.kind==='review'?'짧은 복습':'짧은 학습'} · 약 ${session.estimatedMinutes}분`,()=>c.beginShortSession(),'home-short-session')]:[])
    ]:session.kind==='review'?[badge('오늘의 추천'),heading('기억이 흐려지기 전에 복습',23),small(`복습 ${session.questionIds.length}문항 · 약 ${session.estimatedMinutes}분`),action('오늘 복습 시작',()=>c.beginShortSession(),'home-review',true)]:[
      badge('오늘의 추천'),heading(plannedExam?'오늘의 실전 연습':target?.title??'다음 실전 연습',23),
      ...(!plannedExam&&targetDay&&targetDay.day!==d.day&&c.readingPosition(target!.id)?[small(`읽던 이론 · Day ${targetDay.day}`)]:[]),
      ...(!plannedExam&&target?[small(s.readLessons.includes(target.id)?`확인 ${target.questionIds.length}문항 · 약 ${target.questionIds.length*2}분`:`개념 + 확인 ${target.questionIds.length}문항 · 약 ${session.kind==='concept'?session.estimatedMinutes:target.minutes+target.questionIds.length*2}분`)]:[small('50문항 · 90분을 확보하고 시작하세요.')]),
      action(plannedExam?'오늘의 모의고사 안내':target?(s.readLessons.includes(target.id)?'확인 문제 이어하기':c.readingPosition(target.id)?'이어서 읽기':'학습 시작'):'모의고사 선택',()=>plannedExam?c.navigate({name:'examIntro',id:plannedExam}):target?(s.readLessons.includes(target.id)?c.beginLessonPractice(target.id):session.kind==='concept'?c.beginShortSession():openLesson(target)):c.tab('exams'),'home-study',true)
    ];
    content=[heading(completed.length===30?'30일 과정 완료':`오늘의 학습 · Day ${d.day}`,24),small(`하루 ${s.settings.minutes}분 목표${s.settings.targetDate?` · 시험일 ${s.settings.targetDate}`:''}`),
      {...card(hero,{backgroundColor:active?p.orangeSoft:p.blueSoft,borderWidth:0,borderRadius:24,padding:20},'home-recommendation'),testId:'home-recommendation'},activity(stats),
      card([heading('오늘의 성취',18),body(`확인·복습 ${today.answered}문항 · 정답 ${today.correct}문항${todayExams?` · 모의고사 ${todayExams}회 제출`:''}`),
        ...(!d.examId?[small(`이론 ${lessons.filter(l=>s.readLessons.includes(l.id)).length}/${lessons.length} · 확인 ${[...questions].filter(id=>answered.has(id)).length}/${questions.size}`)]:[]),
        small(`전체 과정 · ${completed.length}/30일 완료`),{...progress(completed.length/30,p.blue),label:'전체 30일 과정 진행률'}]),
      heading('과목·주제 진도',19),...(['S1','S2'] as const).map(subject=>{const ls=c.content.lessons.filter(l=>l.subject===subject),done=ls.filter(l=>lessonProgress(s,c.content,l.id).confirmationComplete).length;return card([heading(SUBJECTS[subject],17),small(`개념 확인 ${done}/${ls.length} · 읽음 ${ls.filter(l=>s.readLessons.includes(l.id)).length}/${ls.length}`),{...progress(done/ls.length,p.blue),label:`${SUBJECTS[subject]} 확인 문제 완료율`}]);}),
      textAction(c.expanded.has('home:topics')?'주제 진도 접기':'주제별 진도 보기',()=>c.toggleExpanded('home:topics'),'home-topics'),
      ...(c.expanded.has('home:topics')?learningGroups(c.content).map(group=>{const done=group.lessons.filter(l=>lessonProgress(s,c.content,l.id).confirmationComplete).length;return card([row([heading(group.title,16),box([],{flex:1}),small(`${done}/${group.lessons.length}`)]),progress(done/group.lessons.length,p.blue),textAction('주제별 문제 풀기',()=>openTopicSetup(group.lessons.map(l=>l.id)),`home-topic-${group.id}`)],{padding:14});}):[]),
      textAction('30일 학습 계획',()=>c.navigate({name:'plan'}),'home-plan')];
  }
  if(r==='practiceSetup'){
    const draft=practiceSetupDraft(c),topics=topicPracticeOptions(s,c.content),ids=practiceQuestionIds(s,c.content,{...practiceSetupOptions(c),limit:undefined});
    const selectedTopics=topics.filter(t=>draft.lessonIds.includes(t.id)),selection=draft.lessonIds.length?`${selectedTopics.length}개 주제 선택`:'전체 주제';
    const change=(patch:Parameters<typeof updatePracticeSetupDraft>[1])=>{updatePracticeSetupDraft(c,patch);c.notify();};
    content=[heading('짧게 풀고, 바로 확인',24),small('확인 문제와 제출을 마친 모의고사 문항만 사용합니다.'),
      card([row([heading('주제',18),box([],{flex:1}),small(selection)]),
        ...(selectedTopics.length&&selectedTopics.length<=2?selectedTopics.map(t=>small(t.title)):[]),
        textAction(c.expanded.has('practice:topics')?'주제 선택 접기':'주제 선택',()=>c.toggleExpanded('practice:topics'),'practice-topics'),
        ...(c.expanded.has('practice:topics')?[choiceChip('전체 주제',!draft.lessonIds.length,()=>change({lessonIds:[]}),'practice-topic-all'),...learningGroups(c.content).flatMap(group=>[heading(group.title,16),...group.lessons.map(l=>{
          const topic=topics.find(t=>t.id===l.id)!;
          return choiceChip(`${l.title} · ${topic.total}문항`,draft.lessonIds.includes(l.id),()=>change({lessonIds:draft.lessonIds.includes(l.id)?draft.lessonIds.filter(id=>id!==l.id):[...draft.lessonIds,l.id]}),`practice-topic-${l.id}`);
        })])]:[])]),
      heading('문항 출처',18),row([choiceChip('전체',draft.source==='all',()=>change({source:'all'}),'practice-source-all'),choiceChip('확인 문제',draft.source==='confirmation',()=>change({source:'confirmation'}),'practice-source-confirmation'),choiceChip('제출한 시험',draft.source==='submitted-exams',()=>change({source:'submitted-exams'}),'practice-source-submitted-exams')],{flexWrap:'wrap'}),
      heading('풀이 범위',18),row(([['all','전체'],['wrong','오답'],['uncertain','확신 부족'],['unanswered','미풀이']] as const).map(([filter,label])=>choiceChip(label,draft.filter===filter,()=>change({filter}),`practice-filter-${filter}`)),{flexWrap:'wrap'}),
      heading('한 번에 풀 문항',18),row([5,10,20].map(limit=>choiceChip(`${limit}문항`,draft.limit===limit,()=>change({limit}),`practice-count-${limit}`)),{flexWrap:'wrap'}),
      ids.length?notice(`선택한 조건에 ${ids.length}문항 · 이번에는 ${Math.min(draft.limit,ids.length)}문항을 풉니다.`):empty('조건에 맞는 문항이 없어요',draft.source==='submitted-exams'?'모의고사를 제출하거나 확인 문제로 출처를 바꿔 주세요.':'주제·풀이 범위를 바꾸면 시작할 수 있습니다.')];
    footer=framedFooter([action(`문제풀이 시작 · ${Math.min(draft.limit,ids.length)}문항`,()=>c.beginTopicPractice(practiceSetupOptions(c)),'practice-setup-start',true,!ids.length)]);
  }
  if(r==='catalog'){
    const list=searchLessons(c.content.lessons,c.search,c.subject,c.bookmarkedOnly?s.bookmarks:null);
    const noBookmarks=c.bookmarkedOnly&&!s.bookmarks.length;
    const reading=c.lastReadingLesson(),current=reading&&!lessonProgress(s,c.content,reading.id).confirmationComplete?reading:c.nextConcept();
    const continuing=current&&(s.readLessons.includes(current.id)?'확인 문제 이어하기':current.id===reading?.id?'이어서 읽기':'다음 개념');
    content=[
      ...(current&&!c.search.trim()&&c.subject==='all'&&!c.bookmarkedOnly?[button('',()=>s.readLessons.includes(current.id)?c.beginLessonPractice(current.id):openLesson(current),{padding:14,minHeight:72,borderRadius:16,borderWidth:1,borderColor:p.line,backgroundColor:p.blueSoft,alignItems:'stretch'},{key:'catalog-continuation',testId:'catalog-continue',label:`${continuing}, ${current.title}, ${lessonStatus(current,s)}`,disabled:locked,children:[row([box([small(`${continuing} · ${lessonStatus(current,s)}`),heading(current.title,17)],{flex:1,gap:4}),{kind:'icon',icon:'chevron-right',label:'이어서 학습',iconSize:20,style:{color:p.blue}}])]})]:[]),
      {kind:'input',key:'lesson-search',testId:'lesson-search',label:'이론 제목과 본문 검색',value:c.search,onChange:v=>c.setSearch(v),placeholder:'조인, NULL, 정규화',style:{minHeight:52,padding:14,borderRadius:14,borderWidth:1,borderColor:p.line,color:p.ink,backgroundColor:p.surface,fontSize:16}},
      row([choiceChip('전체',c.subject==='all',()=>c.setSubject('all'),'subject-all'),choiceChip('1과목',c.subject==='S1',()=>c.setSubject('S1'),'subject-S1'),choiceChip('2과목',c.subject==='S2',()=>c.setSubject('S2'),'subject-S2'),{...choiceChip('북마크',c.bookmarkedOnly,()=>{c.bookmarkedOnly=!c.bookmarkedOnly;c.tab('learn');},'bookmarked-only'),icon:'bookmark'}],{flexWrap:'wrap'}),
      small(`${list.length}개 개념`),box(learningGroups(c.content).flatMap(group=>{
        const lessons=group.lessons.filter(l=>list.some(item=>item.id===l.id));
        return lessons.length?[heading(`${group.subject==='S1'?'1과목':'2과목'} · ${group.title}`,18),box(lessons.map(item),{borderWidth:1,borderColor:p.line,borderRadius:18,overflow:'hidden'},`group-${group.id}`)]:[];
      }),{gap:14},'lesson-grid'),
      ...(!list.length?noBookmarks?
        [empty('저장한 북마크가 없어요','이론에서 ‘북마크에 저장’을 눌러 모아 보세요.'),action('이론 학습하기',()=>c.openTheory(),'bookmarks-empty-learn')]:
        [empty(c.bookmarkedOnly?'조건에 맞는 북마크가 없어요':'검색 결과가 없어요','다른 용어로 검색하거나 필터를 초기화해 보세요.'),action('검색·필터 초기화',()=>c.resetLessonSearch(),'reset-lesson-search')]:[])];
  }
  const learningNavigation=()=>box([row([
    choiceChip('개념',r==='catalog',()=>{c.bookmarkedOnly=false;c.tab('learn');},'learn-theory'),
    choiceChip('문제',r==='practiceSetup',()=>c.openPracticeSetup(),'learn-questions'),
    choiceChip('복습',r==='review',()=>c.tab('review'),'learn-review'),
  ],{flexWrap:'wrap'}),...(r==='review'?[textAction('북마크 보기',()=>{c.bookmarkedOnly=true;c.tab('learn');},'bookmarked-only')]:[])],{gap:4});
  if(r==='plan'){
    const completed=planCompletedDays(s,c.content);
    content=[heading('30일 학습 계획',28),
      ...(s.planProgress?.legacyCompletedDays.length?[small(`이전 완료 기록 ${s.planProgress.legacyCompletedDays.length}일은 보관 중입니다. 현재 진도는 확인 문제와 계획 복습 완료를 기준으로 표시합니다.`)]:[]),
      ...c.content.days.map(d=>{const ls=d.lessonIds.flatMap(id=>{const l=c.content.lessons.find(l=>l.id===id);return l?[l]:[];});const expanded=c.expanded.has(`day:${d.day}`)||(c.currentDay().day===d.day&&!c.expanded.has(`day-closed:${d.day}`));
        const status=completed.includes(d.day)?'완료':c.currentDay().day===d.day?'현재 학습':'예정';
        const topic=d.examId?(c.content.exams.find(e=>e.id===d.examId)?.title??'실전 모의고사'):ls.map(l=>l.title.split(':')[0]).join(' · ')||'복습';
        const duration=d.examId?'시험 90분 + 해설 검토':`${ls.length}개 이론 · ${Number.isFinite(d.minutes)&&d.minutes>0?`권장 ${d.minutes}분`:'복습 시간 직접 조절'}`;
        return card([button('',()=>{if(expanded){c.expanded.delete(`day:${d.day}`);c.expanded.add(`day-closed:${d.day}`);}else{c.expanded.add(`day:${d.day}`);c.expanded.delete(`day-closed:${d.day}`);}c.notify();},
          {padding:0,minHeight:48,alignItems:'stretch',gap:8},{testId:`day-${d.day}-toggle`,label:`Day ${d.day}, ${status}, ${topic}, ${expanded?'접기':'펼치기'}`,expanded,disabled:locked,children:[row([badge(`DAY ${d.day}`,status==='완료'?'green':'blue'),small(status),box([],{flex:1}),small(expanded?'접기':'펼치기')],{flexWrap:'wrap'}),heading(topic,17),small(duration)]}),
          ...(expanded?[small(d.task),...ls.map(item),...(d.examId?[action('무료 모의고사 안내',()=>c.navigate({name:'examIntro',id:d.examId!}),`day-${d.day}-exam`,true)]:[]),...(!d.examId?[action(isReviewStudyDay(d)?'이 날의 복습 시작':'확인 문제 풀기',()=>c.beginPlanPractice(d.day),`day-${d.day}-practice`,true)]:[])]:[])],{},`day-${d.day}`);
      })];
  }
  if(r==='lesson'){
    const l=c.content.lessons.find(l=>l.id===c.route.id);
    if(l){const fold=c.expanded.has(`sources:${l.id}`);content=[row([badge(`LESSON ${String(l.order).padStart(2,'0')}`),small(`약 ${l.minutes}분 · 확인 ${l.questionIds.length}문항`),box([],{flex:1}),button('',()=>c.bookmark(l.id),{minHeight:48,minWidth:48,padding:12,color:s.bookmarks.includes(l.id)?p.blue:p.muted},{icon:'bookmark',label:s.bookmarks.includes(l.id)?'북마크 해제':'북마크에 저장',testId:'lesson-bookmark',selected:s.bookmarks.includes(l.id),disabled:locked})],{flexWrap:'wrap'}),heading(l.title,27),small(lessonStatus(l,s)),
      card([heading('이번 레슨의 목표',18),...l.objectives.map(v=>body(`✓ ${v}`))],{backgroundColor:p.blueSoft,borderWidth:0}),
      ...(l.prerequisites.length?[small('먼저 보면 좋은 이론'),...l.prerequisites.flatMap(id=>{const pre=c.content.lessons.find(x=>x.id===id);return pre?[action(pre.title,()=>openLesson(pre),`prerequisite-${id}`)]:[];})]:[]),
      ...lessonBlocks(l.body,p),...(l.example?[heading('예제로 확인하기',21),small(`${dialectLabel(l.example.dialect)} · 미리 작성한 결과 · 앱 내 SQL 실행 아님`),
        ...l.example.tables.flatMap(t=>[small(`입력 · ${t.name}`),table(t.columns,t.rows,t.name)]),code(l.example.sql),
        ...(l.example.columns.length?[small('예상 결과'),table(l.example.columns,l.example.rows,'예상 결과')]:[notice('결과 표가 없는 상태 변경·구문 설명 예제입니다.')]),small(l.example.note)]:[]),
      card([heading('핵심 요약',20),...l.summary.map(v=>body(`✓ ${v}`))],{backgroundColor:p.blueSoft,borderWidth:0}),
      action(s.readLessons.includes(l.id)?'읽음 기록됨':'읽음만 기록',async()=>{await c.markLesson(l.id);},'lesson-read',false,s.readLessons.includes(l.id)),
      action(fold?'참고자료 접기':'참고자료·버전 보기',()=>c.toggleExpanded(`sources:${l.id}`),'lesson-sources'),
      ...(fold?[small(`${l.id} · 콘텐츠 ${l.version}`),...l.sourceIds.flatMap(id=>{const source=c.content.sources[id];return source?[action(source.title,()=>c.external(source.url),`source-${id}`)]:[];}),action('이론 오류 제보',()=>c.navigate({name:'help',id:l.id}),'report-lesson')]:[])];
      footer=framedFooter([action(s.readLessons.includes(l.id)?'확인 문제 풀기':'읽기 완료하고 확인 문제',()=>s.readLessons.includes(l.id)?c.beginLessonPractice(l.id):c.finishLesson(l.id),'lesson-practice',true)]);}
  }
  if(r==='practice'&&s.practice){
    const pr=s.practice,q=c.getQuestion(pr.questionIds[pr.index]);if(q){content=[small(`문제풀이 · ${pr.index+1}/${pr.questionIds.length}문항`),progress(pr.sessionAnswered/pr.questionIds.length,p.blue),...question(q),...options(q,pr.selected,pr.submitted,id=>c.selectPractice(id)),
      ...(pr.submitted?explanation(q,pr.selected??undefined):[choiceChip('확신 부족 · 복습에 추가',pr.uncertain,()=>{void c.uncertain();},'practice-uncertain')])];
      footer=framedFooter([action(pr.submitted?(pr.index===pr.questionIds.length-1?'연습 결과 확인':'다음 문제'):'정답 확인',()=>pr.submitted?c.nextPractice():c.answerPractice(),pr.submitted?'next-practice':'submit-practice',true,!pr.submitted&&!pr.selected)]);}
  }
  if(r==='practiceResult'){
    const result=c.practiceResult();
    if(result){const next=c.nextConcept(result.lessonIds.at(-1)),reviewIds=new Set([...result.wrongQuestionIds,...result.uncertainQuestionIds]);
      const scheduled=result.questionIds.flatMap(id=>{const review=s.reviews[id],q=c.getQuestion(id);return review&&q&&canStudyQuestion(s,q)?[review]:[];}),nextReviewDay=scheduled.map(review=>review.dueDay).sort()[0];
      content=[badge(`${result.total}문항 완료`,'green'),heading('학습 완료',27),
        card([heading(`${result.correct} / ${result.total}문항 정답`,30),body(`정답률 ${Math.round(result.correct/result.total*100)}%`),small(`확신 부족 ${result.uncertain}문항`)]),
        ...(reviewIds.size?[notice(`오답·확신 부족 ${reviewIds.size}문항은 복습으로 이어집니다.`),action('방금 푼 문항 복습',()=>c.beginRelatedReview(result.id),'practice-result-review')]:[notice('이번 세션은 모든 문항을 맞혔어요. 다음 개념으로 이어가세요.')]),
        ...(nextReviewDay?[{...small(`${nextReviewDay<=dayKey(c.services.clock().wall)?'오늘 복습 가능':'다음 복습'} · ${nextReviewDay}${nextReviewDay<=dayKey(c.services.clock().wall)?' 예정':''} · ${scheduled.filter(review=>review.dueDay===nextReviewDay).length}문항`),testId:'practice-result-schedule'}]:[]),
        ...result.lessonIds.flatMap(id=>{const l=c.content.lessons.find(l=>l.id===id);return l?[textAction(l.title,()=>openLesson(l),`practice-result-lesson-${id}`)]:[];})];
      footer=framedFooter([action(next?'다음 개념 학습':'모의고사 선택',()=>next?c.openNextConcept(result.lessonIds.at(-1)):c.returnPracticeExams(),'practice-result-next',true),textAction('오늘은 여기까지',()=>c.returnPracticeHome(),'practice-result-home')]);
    }else content=[empty('완료 기록을 찾지 못했어요','저장된 학습 기록은 기록 탭에서 확인할 수 있습니다.'),action('홈으로',()=>c.tab('today'),'practice-result-home',true)];
  }
  if(r==='review'){
    const due=dueReviews(s,c.content,c.services.clock().wall),all=Object.keys(s.reviews).filter(id=>{const q=c.getQuestion(id);return q&&(!q.examId||s.exams.some(e=>e.status==='submitted'&&e.snapshots.some(x=>x.id===id)));});
    const showAll=c.expanded.has('review:all'),ids=showAll?all:due;
    const nextDay=all.map(id=>s.reviews[id].dueDay).sort()[0];
    content=[...(due.length?[action(`복습 시작 · ${Math.min(due.length,10)}문항`,()=>c.beginDueReview(),'start-review',true)]:[]),
      row([choiceChip(`오늘 ${due.length}`,!showAll,()=>c.setReviewFilter(false),'review-due'),choiceChip(`전체 ${all.length}`,showAll,()=>c.setReviewFilter(true),'review-all')],{flexWrap:'wrap'}),
      ...(!ids.length?all.length?[heading('오늘 예정된 복습이 없어요',20),small(`다음 복습 · ${nextDay} · ${all.filter(id=>s.reviews[id].dueDay===nextDay).length}문항`),action(`전체 복습 보기 · ${all.length}문항`,()=>c.setReviewFilter(true),'review-show-all')]:[heading('복습할 문제가 없어요',20),action('이론 학습하기',()=>c.openTheory(),'review-empty-learn')]:ids.slice(0,c.reviewLimit).flatMap(id=>{const q=c.getQuestion(id);return q?[card([small(`${q.subject==='S1'?'1과목':'2과목'} · ${s.reviews[id].dueDay} 예정`),body(q.stem),action('이 문항 복습',()=>c.beginPractice([id],'review'),`review-${id}`)],{},`review-card-${id}`)]:[];})),
      ...(ids.length?[small(`${Math.min(c.reviewLimit,ids.length)}/${ids.length}문항 표시`)]:[]),
      ...(ids.length>c.reviewLimit?[action('20문항 더 보기',()=>c.showMoreReviews(),'review-more')]:[])];
  }
  if(r==='exams'&&access){
    const filter=!access.launchFree&&c.expanded.has('exams:available'),available=c.content.exams.filter(e=>access.hasAccess(e.id));
    const completed=new Set(s.exams.filter(e=>e.status==='submitted').map(e=>e.examId));
    const next=c.content.exams.find(e=>access.hasAccess(e.id)&&!completed.has(e.id)&&e.id!==active?.examId);
    const es=(filter?available:c.content.exams).filter(e=>c.examProgressFilter==='completed'?completed.has(e.id):c.examProgressFilter==='unattempted'?!completed.has(e.id)&&e.id!==active?.examId:true);
    content=[small(`${c.content.exams.length}회 · 회당 50문항 · 제한시간 90분`),
      ...(!access.launchFree?[notice(access.mode==='off'?'1~4회는 무료입니다. 5~20회 신규 이용은 현재 제공하지 않으며, 이미 열린 회차는 계속 이용할 수 있습니다.':'1~4회 무료. 5~20회는 선택한 회차의 광고를 완료하면 이 기기에서 계속 이용합니다.')]:[]),
      ...(active?[card([badge('진행 중','orange'),heading(active.title,22),small(`남은 시간 ${formatTime(c.remaining())}`),action('시험 이어하기',()=>resume(active),'catalog-resume',true)],{backgroundColor:p.orangeSoft,borderWidth:0})]:next?[card([badge('다음 모의고사'),heading(next.title,22),small('90분을 확보하고 실전처럼 풀어 보세요.'),action('응시 안내 보기',()=>c.navigate({name:'examIntro',id:next.id}),'exams-next',true)],{backgroundColor:p.blueSoft,borderWidth:0})]:[]),
      row([choiceChip('전체',c.examProgressFilter==='all',()=>c.setExamProgressFilter('all'),'exams-filter-all'),choiceChip('미응시',c.examProgressFilter==='unattempted',()=>c.setExamProgressFilter('unattempted'),'exams-filter-unattempted'),choiceChip('완료',c.examProgressFilter==='completed',()=>c.setExamProgressFilter('completed'),'exams-filter-completed')],{flexWrap:'wrap'}),
      ...(!access.launchFree?[row([choiceChip(`전체 ${c.content.exams.length}회`,!filter,()=>{c.expanded.delete('exams:available');c.notify();},'exams-all'),choiceChip(`응시 가능 ${available.length}회`,filter,()=>{c.expanded.add('exams:available');c.notify();},'exams-available')],{flexWrap:'wrap'})]:[]),
      ...es.map(e=>{const attempts=s.exams.filter(a=>a.examId===e.id),latest=[...attempts].reverse().find(a=>a.status==='submitted'),first=attempts.find(a=>a.status==='submitted'&&a.isFirstAttempt),running=attempts.find(a=>a.status==='active'),open=access.hasAccess(e.id);
        const title=`제${String(e.order).padStart(2,'0')}회 모의고사`,label=running?'시험 이어하기':open?'응시 안내 보기':'광고 1회로 이 회차 열기',wrong=latest?examReviewIndices(latest,true):[];
        return {...card([row([box([heading(title,18),small(running?'진행 중':latest?'완료':'미응시'),...(!access.launchFree?[badge(e.order<=4?'무료':open?'열림':access.mode==='off'?'이용 불가':'광고 해제',open?'green':'blue')]:[])],{flex:1,gap:4}),
          ...(latest&&!running?[{...action('결과 보기',()=>c.navigate({name:'result',id:latest.id}),`result-${e.id}`,true,!!active),label:`${title}, 결과·해설 보기`}]:running||open||access.mode!=='off'?[{...action(running?'이어하기':open?'응시':'회차 열기',()=>running?resume(running):open?c.navigate({name:'examIntro',id:e.id}):access.offerUnlock(e.id),`exam-${e.id}`,false,!running&&!!active),label:`${title}, ${label}`}]:[])],{flexWrap:'wrap'}),
          ...(first?[small(`첫 응시 ${first.score?.points??0}점${latest&&latest.id!==first.id?` · 최근 ${latest.score?.points??0}점`:''}`)]:[]),
          ...(latest&&!running?[row([
            ...(wrong.length?[{...action(`오답·미응답 복습 · ${wrong.length}문항`,()=>{c.expanded.add(`wrong:${latest.id}`);c.navigate({name:'examReview',id:latest.id,index:wrong[0]});},`exam-wrong-${e.id}`,false,!!active),label:`${title}, 오답·미응답 ${wrong.length}문항 복습`}]:[]),
            ...(open?[{...action('다시 응시',()=>c.navigate({name:'examIntro',id:e.id}),`exam-${e.id}`,false,!!active),label:`${title}, 다시 응시하기`}]:[])
          ],{flexWrap:'wrap'})]:[])],{padding:16,gap:6},e.id),testId:`exam-card-${e.id}`};
      }),...(!es.length?[empty(c.examProgressFilter==='completed'?'완료한 모의고사가 없어요':'조건에 맞는 모의고사가 없어요',c.examProgressFilter==='completed'?'첫 모의고사를 마치면 결과가 여기에 표시됩니다.':'전체 목록에서 이용할 회차를 확인해 주세요.')]:[])];
  }
  if(r==='examIntro'){
    const e=c.content.exams.find(e=>e.id===c.route.id);if(e){const open=access?access.hasAccess(e.id):e.order<=4;
      content=[...(!access?.launchFree?[badge(open?'응시 가능':'광고 해제 필요',open?'green':'blue')]:[]),heading(e.title,28),card([heading('50문항 · 90분',23),body('1과목 10문항 · 20점\n2과목 40문항 · 80점\n미응답 0점 · 제출 후 답안 변경 불가')]),
        notice('시험을 시작하면 화면을 잠그거나 앱을 나가도 시간이 흐릅니다. 시간 중단 기능은 없습니다.'),
        body(access?.launchFree?'보기 선택 후 자동 저장하며, 답안표에서 미응답·보류 문항을 확인할 수 있습니다. 정답·해설은 제출 후 볼 수 있습니다.':'시험 중에는 광고와 정답·해설을 표시하지 않습니다. 보기 선택 후 자동 저장하며, 답안표에서 미응답·보류 문항을 확인할 수 있습니다.'),
        ...(!access?.launchFree?[small(open?'열린 회차는 재응시와 제출 후 해설에 추가 광고가 없습니다.':'시청은 선택입니다. 취소해도 무료 1~4회와 이미 열린 회차는 그대로 이용할 수 있습니다.')]:[]),
        ...(active?[action('진행 중 시험 이어하기',()=>resume(active),'intro-resume',true)]:[action(open?'90분 실전 시작':'광고 해제 안내 보기',()=>open?c.beginExam(e.id):access?.offerUnlock(e.id),'start-exam',true,!open&&!access)]),
        action('모의고사 목록',()=>c.tab('exams'),'back-exams'),small('학습용 자체 제작 문제이며 공식 시험·합격을 보장하지 않습니다.')];}
  }
  if(r==='exam'){
    const e=c.examAttempt(c.route.id)??active;if(e?.status==='active'){
      const q=e.snapshots[e.index];content=[...question(q),...options(q,e.answers[q.id]??null,false,id=>c.updateExamAnswer(id)),
        row([choiceChip(e.flagged.includes(q.id)?'보류됨':'보류 표시',e.flagged.includes(q.id),()=>{void c.flagExam();},'exam-flag'),action('선택 지우기',()=>c.updateExamAnswer(null),'exam-clear',false,!e.answers[q.id])],{flexWrap:'wrap'})];
      top=box([row([badge(`${e.index+1} / 50문항`),text(`남은 시간 ${formatTime(c.remaining())}`,{fontSize:17,lineHeight:26,fontWeight:'700',color:c.remaining()<=300000?p.red:p.ink})],{justifyContent:'space-between',flexWrap:'wrap'}),progress(Object.keys(e.answers).length/50,p.blue)],{paddingHorizontal:20,paddingVertical:10,gap:8,borderBottomWidth:1,borderColor:p.line,backgroundColor:p.surface},'exam-status');
      footer=framedFooter([row([action('이전',()=>c.moveExam(e.index-1),'exam-prev',false,e.index===0),action('답안표',()=>c.navigate({name:'sheet',id:e.id}),'exam-sheet'),action(e.index===49?'제출 검토':'다음',()=>e.index===49?c.navigate({name:'sheet',id:e.id}):c.moveExam(e.index+1),'exam-next',true)],{flexWrap:'wrap',justifyContent:'space-between'})]);
    }
  }
  if(r==='sheet'){
    const e=c.examAttempt(c.route.id)??active;if(e?.status==='active'){
      const missing=e.snapshots.flatMap((q,i)=>!e.answers[q.id]?[i]:[]),flagged=e.snapshots.flatMap((q,i)=>e.flagged.includes(q.id)?[i]:[]);
      content=[heading('제출 전 답안 확인',26),body(`응답 ${50-missing.length} · 미응답 ${missing.length} · 보류 ${flagged.length}`),small('보류는 응답 여부와 별개입니다. 보류했어도 선택한 답안으로 채점합니다.'),
        row([action('첫 미응답으로',()=>c.moveExam(missing[0]),'sheet-missing',false,!missing.length),action('첫 보류로',()=>c.moveExam(flagged[0]),'sheet-flagged',false,!flagged.length)],{flexWrap:'wrap'}),
        ...(['S1','S2'] as const).flatMap(subject=>[heading(SUBJECTS[subject],18),row(e.snapshots.flatMap((q,i)=>q.subject===subject?[button(`${i+1}\n${e.answers[q.id]?e.answers[q.id]+'번':'미응답'}${e.flagged.includes(q.id)?'\n보류':''}`,()=>c.moveExam(i),{width:68,minHeight:68,padding:8,borderRadius:12,borderWidth:1,borderColor:e.flagged.includes(q.id)?p.orange:e.answers[q.id]?p.blue:p.line,backgroundColor:e.answers[q.id]?p.blueSoft:p.surface,color:p.ink,fontSize:12,lineHeight:19},{testId:`sheet-${i+1}`,label:`${i+1}번, ${e.answers[q.id]?e.answers[q.id]+'번 선택':'미응답'}${e.flagged.includes(q.id)?', 보류':''}`,disabled:locked})]:[]),{flexWrap:'wrap',gap:9})]),
        notice('제출하면 답안을 변경할 수 없습니다. 미응답 문항은 0점입니다.')];
      footer=framedFooter([small(`남은 시간 ${formatTime(c.remaining())}`),action(`답안 제출 · 미응답 ${missing.length}문항`,()=>c.requestSubmit(),'submit-exam',true)]);
    }
  }
  if(r==='result'){
    const e=c.examAttempt(c.route.id);if(e?.status==='submitted'&&e.score){const score=e.score,wrong=examReviewIndices(e,true);
      content=[badge(e.isFirstAttempt?'첫 응시':'재응시'),heading(e.title,26),card([small('모의고사 결과'),heading(`${score.points} / 100점`,36),body(`정답 ${score.correct} · 오답 ${50-score.correct-score.unanswered} · 미응답 ${score.unanswered}`),badge(score.practiceThresholdMet?'연습 합격 기준 충족':'연습 기준 보완 필요',score.practiceThresholdMet?'green':'orange')]),
        ...(['S1','S2'] as const).map(id=>{const sub=score.bySubject[id];return card([heading(SUBJECTS[id],18),body(`${sub.points} / ${sub.max}점 · ${sub.correct}/${sub.total}문항`),progress(sub.points/sub.max,sub.meetsMinimum?p.green:p.orange),small(sub.meetsMinimum?'과목 최소 기준 충족':'과락 기준 미달 · 우선 복습이 필요합니다.')]);}),
        ...(!e.timeTrusted?[notice('시간 변경·앱 재시작 등으로 시간 검증이 끊겨 참고용으로 표시하는 결과입니다.')]:[]),
        ...(e.exposedFamilyCount?[small(`이전에 노출된 문항군 ${e.exposedFamilyCount}개가 포함되어 점수를 다른 시험과 단순 비교하지 않습니다.`)]:[]),
        action(`오답·미응답 ${wrong.length}문항 해설`,()=>{c.expanded.add(`wrong:${e.id}`);c.navigate({name:'examReview',id:e.id,index:wrong[0]});},'result-wrong',true,!wrong.length),
        action('전체 50문항 정답·해설',()=>{c.expanded.delete(`wrong:${e.id}`);c.navigate({name:'examReview',id:e.id,index:0});},'result-all'),
        notice('공식 시험 합격 판정이나 합격 확률이 아닙니다. 재응시 점수와 처음 보는 문제의 점수를 구분해서 확인하세요.'),action('모의고사 목록',()=>c.tab('exams'),'result-catalog')];}
  }
  if(r==='examReview'){
    const e=c.examAttempt(c.route.id);if(e?.status==='submitted'){
      const only=c.expanded.has(`wrong:${e.id}`),ids=examReviewIndices(e,only),target=c.route.index??0,i=ids.includes(target)?target:ids[0],pos=ids.indexOf(i);
      const filters=row([choiceChip('전체',!only,()=>c.setExamReviewFilter(false),'review-exam-all'),choiceChip('오답·미응답',only,()=>c.setExamReviewFilter(true),'review-exam-wrong')],{flexWrap:'wrap'});
      if(i===undefined){content=[filters,empty('오답·미응답이 없어요','전체 해설에서 풀이 과정을 다시 확인할 수 있습니다.')];}
      else {const q=e.snapshots[i];content=[filters,small(`${pos+1}/${ids.length} · 시험 ${i+1}번`),...question(q),...options(q,e.answers[q.id]??null,true,()=>{}),...explanation(q,e.answers[q.id])];}
      footer=framedFooter([...(ids.length?[action(`문항 선택 · 시험 ${i+1}번`,()=>c.openReviewPicker(),'review-question-picker')]:[]),row([action('이전 해설',()=>c.moveExamReview(ids[pos-1]),'explain-prev',false,pos<=0),action(pos>=ids.length-1?'결과로':'다음 해설',()=>pos>=ids.length-1?c.returnToExamResult():c.moveExamReview(ids[pos+1]),'explain-next',true)],{flexWrap:'wrap',justifyContent:'space-between'})]);
      if(c.reviewPickerOpen&&ids.length)reviewPicker={kind:'modal',label:'해설 문항 선택',close:()=>c.closeReviewPicker(),children:[card([
        row([box([heading('해설 문항 선택',22)],{flex:1}),action('닫기',()=>c.closeReviewPicker(),'review-picker-close')]),small(`${only?'오답·미응답':'전체'} ${ids.length}문항 · 원래 시험 번호`),
        ...(['S1','S2'] as const).flatMap(subject=>{const group=ids.filter(index=>e.snapshots[index].subject===subject);return group.length?[heading(SUBJECTS[subject],18),row(group.map(index=>{
          const q=e.snapshots[index],answer=e.answers[q.id],status=answer===q.answer?'정답':answer?'오답':'미응답';
          return button(`${index+1}\n${status}`,()=>c.moveExamReview(index),{width:76,minHeight:68,padding:8,borderRadius:12,borderWidth:index===i?2:1,borderColor:index===i?p.blue:p.line,backgroundColor:index===i?p.blueSoft:p.surface,color:status==='정답'?p.green:p.ink,fontSize:13,lineHeight:20},{testId:`review-jump-${index+1}`,label:`시험 ${index+1}번, ${status}${index===i?', 현재 문항':''}`,selected:index===i,disabled:locked});
        }),{flexWrap:'wrap',gap:8})]:[];}),action('닫기',()=>c.closeReviewPicker(),'review-picker-close-bottom')
      ])]};
    }
  }
  if(r==='stats'){
    const a=confirmationAccuracy(s,c.content),stats=learningStats(s,c.content,c.services.clock().wall);
    const attempts=[...s.exams].filter(e=>e.status==='submitted'&&e.score).sort((a,b)=>(b.submittedAt??b.startedAt)-(a.submittedAt??a.startedAt));
    const reviewResults=[...new Map((s.practiceResults??[]).filter(result=>result.mode==='review').map(result=>[result.id,result])).values()].sort((a,b)=>b.completedAt-a.completedAt).slice(0,3);
    content=[activity(stats),
      row([card([small('공부한 날짜'),heading(`${s.studyDays.length}일`,23)],{flex:1,padding:14}),card([small('읽은 이론'),heading(`${s.readLessons.length}/60`,23)],{flex:1,padding:14})]),
      {...card([heading('확인 문제 · 첫 풀이',18),...(a.total?[
        row([body(`첫 풀이 정답률 ${a.percent}%`),small(`${a.total}문항 기준`)],{flexWrap:'wrap'}),
        body(`확신 있게 맞힌 비율 ${a.confidentPercent}%`),
        body(stats.recentAccuracy.percent===null?'최근 풀이 정답률 —':`최근 풀이 정답률 ${stats.recentAccuracy.percent}%`),small(`${stats.recentAccuracy.total}문항의 마지막 풀이 기준`),
        textAction(c.expanded.has('stats:details')?'계산 기준 접기':'계산 기준',()=>c.toggleExpanded('stats:details'),'stats-details'),
        ...(c.expanded.has('stats:details')?[small('첫 풀이와 문항별 마지막 풀이를 구분합니다. 확신 부족으로 표시한 정답은 확신 비율에서 제외합니다. 반복해서 푼 한 문항을 여러 표본으로 세지 않습니다.')]:[])
      ]:[body('아직 풀이 기록이 없어요')])]),testId:'confirmation-stats'},
      heading('최근 복습 결과',20),
      ...(reviewResults.length?reviewResults.map(result=>({...card([small(dayKey(result.completedAt)),heading(`정답 ${result.correct}/${result.total}문항`,19),small(`확신 부족 ${result.uncertain}문항`),
        action('복습 문제 다시 풀기',()=>c.beginPractice(result.questionIds,'review'),`recent-review-replay-${result.id}`)],{padding:16},`recent-review-${result.id}`),testId:`recent-review-result-${result.id}`})):[{...small('완료한 복습 기록이 없어요.'),testId:'recent-review-empty'}]),
      heading('보완할 주제',20),
      ...(stats.weakTopics.length?stats.weakTopics.slice(0,3).map(topic=>card([heading(topic.title,17),small(`${topic.subject==='S1'?'1과목':'2과목'} · 최근 ${topic.recent.total}문항 기준${topic.sampleEnough?'':' · 표본이 적어 참고용'}`),
        body(`첫 풀이 ${topic.first.percent===null?'—':topic.first.percent+'%'} → 최근 ${topic.recent.percent===null?'—':topic.recent.percent+'%'}`),
        textAction('이 주제 보완하기',()=>openTopicSetup(topic.lessonId),`weak-topic-${topic.lessonId}`)],{padding:16})):[small('풀이 기록이 쌓이면 먼저 보완할 주제를 보여드려요.')]),
      heading('모의고사 응시 이력',20),
      ...(!attempts.length?[small('아직 응시 기록이 없어요'),action('실전 모의고사 보기',()=>c.tab('exams'),'records-start-exam')]:attempts.map(e=>card([row([box([heading(e.title,17),small(`${e.isFirstAttempt?'첫 응시':'재응시'} · ${new Date(e.submittedAt??e.startedAt).toLocaleDateString('ko-KR')}`)],{flex:1,gap:4}),heading(`${e.score!.points}점`,22)],{flexWrap:'wrap'}),textAction('결과·해설 보기',()=>c.navigate({name:'result',id:e.id}),`history-${e.id}`)],{padding:16})))];
  }
  if(r==='settings'){
    const accessCards=(scroll.children??[]).filter(n=>n.children?.some(ch=>ch.text==='모의고사 이용 안내'));
    content=[heading('설정',26),heading('글자 크기',20),small('시스템 글자 크기에 아래 추가 배율을 함께 적용합니다.'),row([1,1.15,1.3].map(n=>choiceChip(`${Math.round(n*100)}%`,s.settings.fontScale===n,()=>{void c.commit(s=>({...s,settings:{...s.settings,fontScale:n}}));},`font-${n}`)),{flexWrap:'wrap'}),body('이 크기로 이론과 해설이 표시됩니다.'),
      heading('화면 테마',20),row((['light','dark'] as const).map(theme=>choiceChip(theme==='light'?'라이트':'다크',s.settings.theme===theme,()=>{void c.commit(s=>({...s,settings:{...s.settings,theme}}));},`theme-${theme}`)),{flexWrap:'wrap'}),
      action('시험일·하루 학습 시간 변경',()=>c.navigate({name:'setup'}),'change-goal'),
      {...action('학습 알림',()=>c.navigate({name:'reminderSettings'}),'learning-reminder'),icon:'bell'},
      ...(access?.resetLearning?[action(access.launchFree?'학습 기록만 초기화':'학습 기록만 초기화 · 열린 회차 유지',()=>access.resetLearning!(),'reset-learning')]:[]),
      action('오류 제보·고객센터',()=>c.navigate({name:'help'}),'stats-help'),action('앱·콘텐츠 정보',()=>c.navigate({name:'notices'}),'stats-notices'),action('개인정보 안내',()=>c.navigate({name:'privacy'}),'stats-privacy'),...accessCards,notice(access?.launchFree?launchFreeLocalDataNotice:'학습 기록은 이 기기에 저장됩니다. 앱 삭제·전체 데이터 삭제·기기 변경 시 기록을 복원할 수 없습니다.')];
  }
  if(r==='setup'){
    content=[heading('목표와 학습 시간을 정해요',26),small('시험일을 모르면 비워두고 시작할 수 있습니다.'),heading('하루 학습 시간',18),row([15,30,45,60,90].map(n=>choiceChip(`${n}분`,c.draftSettings.minutes===n,()=>{c.draftSettings.minutes=n;c.notify();},`minutes-${n}`)),{flexWrap:'wrap'}),
      small('목표 시험일 · 선택 입력'),{kind:'date',testId:'target-date',label:'목표 시험일 선택',value:c.draftSettings.targetDate,minimumDate:dayKey(c.services.clock().wall),onChange:v=>c.setTargetDate(v),disabled:locked},
      ...(c.settingsError?[{...text(c.settingsError,{fontSize:14,lineHeight:22,color:p.red},'target-date-error'),testId:'target-date-error',alert:true}]:[]),
      notice('설정한 시간에 맞는 짧은 학습을 추천합니다. 모의고사는 90분을 따로 확보하세요.'),
      action(s.onboarded?'변경 사항 저장':'학습 시작',()=>c.saveSettings(!s.onboarded),'finish-setup',true)];
  }
  if(r==='help'){
    const report=(scroll.children??[]).find(n=>n.text==='제보 내용 공유하기');
    if(report)report.disabled=locked||!c.supportText.trim();
    scroll.children?.unshift(small(access?.launchFree?'공유창을 여는 기능이며 고객센터 접수 완료를 의미하지 않습니다. 개인정보는 적지 마세요.':'공유창을 여는 기능이며 고객센터 접수 완료를 의미하지 않습니다. 개인정보나 광고 식별자는 적지 마세요.'));
    if(c.supportNotice)scroll.children?.unshift(notice(c.supportNotice));
  }
  if(content&&['catalog','practiceSetup','review'].includes(r))content.unshift(learningNavigation());
  if(content){const recovery=(scroll.children??[]).filter(n=>n.testId==='retry-reward-save'||n.text?.startsWith('광고 처리 중'));scroll.children=[...(c.notice?[notice(c.notice)]:[]),...recovery,...content];}
  // Stable for timer ticks and choice saves; reset only when the actual question/lesson changes.
  const exam=r==='exam'?(c.examAttempt(c.route.id)??active):undefined;
  scroll.key=`${r}:${c.route.id??''}:${r==='exam'?exam?.index??0:r==='practice'?`${s.practice?.id??''}:${s.practice?.index??0}`:c.route.index??''}`;
  // Reward/privacy feedback must be visible even after opening a lower exam card.
  // Keep timed questions stable; only these action screens return to the notice.
  if(['exams','examIntro','settings'].includes(r))scroll.key+=`:notice:${c.notice??''}`;
  scroll.testId='learning-content';
  if(r==='catalog'){
    const context=c.catalogContext();
    scroll.catalog={context,position:c.catalogPosition(),onRemember:position=>c.rememberCatalog(context,position)};
  }
  if(r==='exams'){
    const context=c.examCatalogContext();
    scroll.catalog={context,position:c.examCatalogPosition(),onRemember:position=>c.rememberExamCatalog(context,position)};
  }
  if(r==='stats'){
    const context=c.recordsContext();
    scroll.catalog={context,position:c.recordsPosition(),onRemember:position=>c.rememberRecords(context,position)};
  }
  if(r==='examReview'){
    const context=c.examReviewContext();
    scroll.catalog={context,position:c.examReviewPosition(),preserveContentOffset:true,onRemember:position=>c.rememberExamReview(context,position)};
  }
  if(r==='lesson'&&c.content.lessons.some(l=>l.id===c.route.id)){
    const id=c.route.id!;
    scroll.reading={position:c.readingPosition(id),onSave:position=>c.rememberReading(id,position)};
  }
  if(top){const at=root.children!.indexOf(scroll);root.children!.splice(at,0,top);}
  if(footer&&r==='practiceSetup')root.children!.splice(root.children!.indexOf(scroll)+1,0,footer);
  else if(footer){root.children=root.children!.filter(n=>n===scroll||n===top||n.kind==='modal'||root.children!.indexOf(n)<root.children!.indexOf(scroll));const modal=root.children.findIndex(n=>n.kind==='modal');root.children.splice(modal<0?root.children.length:modal,0,footer);}
  if(reviewPicker)root.children!.push(reviewPicker);
  return root;
}
