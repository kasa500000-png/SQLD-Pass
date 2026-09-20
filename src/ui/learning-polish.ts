import type {Controller} from '../core/controller';
import type {ExamAttempt,Lesson,Question} from '../core/types';
import {dueReviews,firstAccuracy,formatTime,SUBJECTS} from '../core/domain';
import {box,button,code,dark,light,progress,row,table,text,type Node,type Style} from './nodes';
import {dialectLabel,examReviewIndices,lessonBlocks,lessonStatus,searchLessons} from './learning-format';

export interface ExamAccessUI {hasAccess(id:string):boolean;offerUnlock(id:string):void;mode:'off'|'test'|'live';busy:boolean;resetLearning?():void;}
/** Presentation only: does not mutate answer keys, grants, SQLite schema or approval flags. */
export function polishLearning(c:Controller,root:Node,access?:ExamAccessUI):Node {
  const scroll=root.children?.find(n=>n.scroll);if(!scroll||!c.ready)return root;
  const p=c.isDark?dark:light,s=c.state,r=c.route.name,active=c.activeExam();
  const locked=c.busy||!!access?.busy;
  const small=(v:string)=>text(v,{fontSize:13,lineHeight:21,color:p.muted});
  const body=(v:string)=>text(v,{fontSize:16,lineHeight:26,color:p.ink});
  const heading=(v:string,n=24):Node=>({...text(v,{fontSize:n,lineHeight:n+10,fontWeight:'700',color:p.ink}),heading:true});
  const card=(nodes:Node[],style:Style={},key?:string)=>box(nodes,{padding:16,gap:10,borderRadius:18,backgroundColor:p.surface,borderWidth:1,borderColor:p.line,...style},key);
  const badge=(v:string,tone:'blue'|'green'|'orange'='blue')=>box([text(v,{fontSize:12,lineHeight:19,fontWeight:'700',color:p[tone]})],{paddingHorizontal:10,paddingVertical:5,borderRadius:8,backgroundColor:p[`${tone}Soft`],alignSelf:'flex-start'});
  const action=(v:string,fn:()=>void|Promise<void>,id:string,primary=false,disabled=false)=>button(v,fn,{minHeight:52,paddingHorizontal:16,paddingVertical:12,borderRadius:14,borderWidth:1,borderColor:primary?p.blue:p.line,backgroundColor:primary?p.blue:p.surface,color:primary?(c.isDark?p.bg:'#FFFFFF'):p.blue,fontSize:15,lineHeight:23,fontWeight:'700'},{testId:id,disabled:disabled||locked});
  const choiceChip=(v:string,selected:boolean,fn:()=>void,id:string)=>button(v,fn,{minHeight:48,paddingHorizontal:13,borderRadius:12,borderWidth:1,borderColor:selected?p.blue:p.line,backgroundColor:selected?p.blueSoft:p.surface,color:selected?p.blue:p.muted,fontSize:14},{testId:id,selected,disabled:locked});
  const notice=(v:string)=>box([small(v)],{padding:14,borderRadius:12,backgroundColor:p.blueSoft});
  const empty=(v:string,description:string)=>card([heading(v,20),body(description)]);
  // Keep the header flexible at 320dp / large text; the brand must not push MY offscreen.
  if(['home','catalog','review','exams','stats'].includes(r)&&root.children?.[0]!==scroll){
    root.children![0]=row([box([text('SQLD Pass',{fontSize:18,lineHeight:27,fontWeight:'800',color:p.ink})],{flex:1,flexShrink:1}),
      button('설정',()=>c.navigate({name:'settings'}),{minHeight:48,minWidth:64,maxWidth:100,padding:10,borderRadius:12,backgroundColor:p.blueSoft,color:p.blue,fontSize:13,lineHeight:21},{label:'설정',testId:'app-settings',disabled:locked})],
      {paddingHorizontal:16,paddingVertical:8,borderBottomWidth:1,borderColor:p.line,backgroundColor:p.surface});
  }
  let content:Node[]|null=null,footer:Node|undefined,top:Node|undefined;
  const openLesson=(l:Lesson)=>c.navigate({name:'lesson',id:l.id});
  const item=(l:Lesson)=>button('',()=>openLesson(l),{padding:16,borderRadius:16,borderWidth:1,borderColor:p.line,backgroundColor:p.surface,alignItems:'stretch'},{key:l.id,testId:`lesson-${l.id}`,label:`${l.title}, ${lessonStatus(l,s)}`,disabled:locked,children:[row([badge(String(l.order).padStart(2,'0')),box([text(l.title,{fontSize:16,lineHeight:25,fontWeight:'700',color:p.ink}),small(`${l.subject==='S1'?'1과목':'2과목'} · 약 ${l.minutes}분 · ${lessonStatus(l,s)}`)],{flex:1,gap:5})])]});
  const question=(q:Question):Node[]=>[row([badge(q.subject==='S1'?'1과목':'2과목'),small(dialectLabel(q.dialect))],{flexWrap:'wrap'}),heading(q.stem,19),...q.tables.flatMap(t=>[small(`입력 · ${t.name}`),table(t.columns,t.rows,t.name)]),...(q.sql?[code(q.sql)]:[])];
  const options=(q:Question,selected:string|null,submitted:boolean,fn:(id:string)=>void|Promise<void>):Node[]=>q.options.map(o=>{
    const yes=submitted&&o.id===q.answer,no=submitted&&o.id===selected&&!yes,sel=selected===o.id;
    const status=yes?'정답':no?'내 선택 · 오답':sel?'선택됨':'';
    return button('',()=>fn(o.id),{padding:14,minHeight:56,borderRadius:14,borderWidth:1.5,borderColor:yes?p.green:no?p.red:sel?p.blue:p.line,backgroundColor:yes?p.greenSoft:no?p.redSoft:sel?p.blueSoft:p.surface,alignItems:'stretch'},
      {testId:`option-${o.id}`,label:`${o.id}번 ${o.text}${status?`, ${status}`:''}`,selected:sel,disabled:submitted||locked,role:'radio',checked:sel,children:[row([text(yes?'✓':no?'×':o.id,{fontSize:17,fontWeight:'700',color:yes?p.green:no?p.red:p.blue}),box([...(status?[small(status)]:[]),o.format==='sql'?code(o.text):body(o.text)],{flex:1,gap:5})],{alignItems:'flex-start'})]});
  });
  const explanation=(q:Question,selected?:string):Node[]=>[badge(`정답 ${q.answer}번 · ${selected===q.answer?'정답':selected?'오답':'미응답'}`,selected===q.answer?'green':'orange'),heading('정답의 이유',20),...lessonBlocks(q.explanation,p),
    ...q.options.filter(o=>o.id!==q.answer&&q.optionExplanations?.[o.id]).map(o=>card([small(`${o.id}번${o.id===selected?' · 내가 선택한 보기':''}`),...lessonBlocks(q.optionExplanations[o.id],p)],{padding:14})),
    ...q.lessonIds.flatMap(id=>{const l=c.content.lessons.find(l=>l.id===id);return l?[action(`관련 이론 · ${l.title}`,()=>openLesson(l),`related-${id}`)]:[];}),
    action(c.expanded.has(`question-info:${q.id}`)?'문항 정보 접기':'문항 정보·오류 제보',()=>c.toggleExpanded(`question-info:${q.id}`),`question-info-${q.id}`),...(c.expanded.has(`question-info:${q.id}`)?[small(`${q.id} · 콘텐츠 ${q.version} · ${dialectLabel(q.dialect)}`),action('오류 제보',()=>c.navigate({name:'help',id:q.id}),`report-${q.id}`)]:[])];
  const resume=(e:ExamAttempt)=>{c.stack=[];c.navigate({name:'exam',id:e.id});};
  const framedFooter=(nodes:Node[])=>box(nodes,{paddingHorizontal:16,paddingVertical:12,gap:8,borderTopWidth:1,borderColor:p.line,backgroundColor:p.surface},'learning-footer');

  if(r==='home'){
    const d=c.currentDay(),due=dueReviews(s,c.content,c.services.clock().wall);
    const next=d.lessonIds.map(id=>c.content.lessons.find(l=>l.id===id)).find(l=>l&&(!s.readLessons.includes(l.id)||l.questionIds.some(id=>!s.responses.some(a=>a.questionId===id))));
    const complete=s.completedDays.length===30;
    content=[heading(complete?'30일 과정 완료':`오늘의 학습 · Day ${d.day}`,24),
      ...(active?[card([badge('시험 진행 중','orange'),heading(active.title,20),small(`남은 시간 ${formatTime(c.remaining())} · 화면을 나가도 계속 흐릅니다.`),action('진행 중 시험 이어하기',()=>resume(active),'home-resume-exam',true)])]:[]),
      ...(!active&&s.practice?[card([badge('중단한 연습'),body(`${s.practice.index+1}/${s.practice.questionIds.length}문항`),action('문제풀이 이어하기',()=>c.resumePractice(),'home-resume-practice',true)])]:[]),
      card([row([heading(`${s.completedDays.length} / 30일`,24),badge(`${Math.round(s.completedDays.length/30*100)}%`)]),progress(s.completedDays.length/30,p.blue),body(complete?'다음 모의고사에 도전해 보세요.':d.examId?'모의고사':next?.title??'오늘 학습 완료'),
        action(complete?'모의고사 선택':d.examId?'오늘의 모의고사 안내':next?(s.readLessons.includes(next.id)?'확인 문제 이어하기':'학습 이어하기'):'오늘 계획 확인',()=>complete?c.tab('exams'):d.examId?c.navigate({name:'examIntro',id:d.examId}):next?(s.readLessons.includes(next.id)?c.beginPractice(next.questionIds):openLesson(next)):c.navigate({name:'plan'}),'home-study',!active&&!s.practice)]),
      ...(due.length?[action(`오늘 복습 · ${Math.min(due.length,10)}문항`,()=>c.beginDueReview(),'home-review')]:[]),action('30일 학습 계획',()=>c.navigate({name:'plan'}),'home-plan')];
  }
  if(r==='catalog'){
    const list=searchLessons(c.content.lessons,c.search,c.subject,c.bookmarkedOnly?s.bookmarks:null);
    content=[
      {kind:'input',testId:'lesson-search',label:'이론 제목과 본문 검색',value:c.search,onChange:v=>c.setSearch(v),placeholder:'조인, NULL, 정규화',style:{minHeight:52,padding:14,borderRadius:14,borderWidth:1,borderColor:p.line,color:p.ink,backgroundColor:p.surface,fontSize:16}},
      row([choiceChip('전체',c.subject==='all',()=>c.setSubject('all'),'subject-all'),choiceChip('1과목',c.subject==='S1',()=>c.setSubject('S1'),'subject-S1'),choiceChip('2과목',c.subject==='S2',()=>c.setSubject('S2'),'subject-S2')],{flexWrap:'wrap'}),
      small(`${list.length}개 이론`),box(list.map(item),{},'lesson-grid'),
      ...(!list.length?[empty(c.bookmarkedOnly?'조건에 맞는 북마크가 없어요':'검색 결과가 없어요','다른 용어로 검색하거나 필터를 초기화해 보세요.'),action('검색·필터 초기화',()=>{c.search='';c.subject='all';c.bookmarkedOnly=false;c.notify();},'reset-lesson-search')]:[])];
  }
  const learningNavigation=()=>row([
    choiceChip('이론',r==='catalog'&&!c.bookmarkedOnly,()=>{c.bookmarkedOnly=false;c.tab('learn');},'learn-theory'),
    choiceChip('복습',r==='review',()=>c.tab('review'),'learn-review'),
    choiceChip('북마크',r==='catalog'&&c.bookmarkedOnly,()=>{c.bookmarkedOnly=true;c.tab('learn');},'bookmarked-only')
  ],{flexWrap:'wrap'});
  if(r==='plan'){
    content=[heading('30일 학습 계획',28),
      ...c.content.days.map(d=>{const ls=d.lessonIds.flatMap(id=>{const l=c.content.lessons.find(l=>l.id===id);return l?[l]:[];});const expanded=c.expanded.has(`day:${d.day}`)||(c.currentDay().day===d.day&&!c.expanded.has(`day-closed:${d.day}`));
        return card([row([badge(`DAY ${d.day}`,s.completedDays.includes(d.day)?'green':'blue'),small(s.completedDays.includes(d.day)?'계획 완료':'학습 예정')]),body(d.examId?'실전 모의고사 응시 후 관련 개념 복습':d.task),small(`${ls.length}개 레슨 · ${d.examId?'시험 90분 + 해설 검토':Number.isFinite(d.minutes)&&d.minutes>0?`권장 ${d.minutes}분`:'복습 시간은 직접 조절'}`),
          action(expanded?'레슨 목록 접기':'모든 레슨 보기',()=>{if(expanded){c.expanded.delete(`day:${d.day}`);c.expanded.add(`day-closed:${d.day}`);}else{c.expanded.add(`day:${d.day}`);c.expanded.delete(`day-closed:${d.day}`);}c.notify();},`day-${d.day}-toggle`),
          ...(expanded?ls.map(item):[]),...(d.examId?[action('무료 모의고사 안내',()=>c.navigate({name:'examIntro',id:d.examId!}),`day-${d.day}-exam`,true)]:[]),
          ...(!d.examId&&ls.length?[action('확인 문제 풀기',()=>c.beginPractice(ls.flatMap(l=>l.questionIds)),`day-${d.day}-practice`)]:[])],{},`day-${d.day}`);
      })];
  }
  if(r==='lesson'){
    const l=c.content.lessons.find(l=>l.id===c.route.id);
    if(l){const fold=c.expanded.has(`sources:${l.id}`);content=[row([badge(`LESSON ${String(l.order).padStart(2,'0')}`),small(`약 ${l.minutes}분 · 확인 ${l.questionIds.length}문항`)],{flexWrap:'wrap'}),heading(l.title,27),small(lessonStatus(l,s)),
      action(s.bookmarks.includes(l.id)?'북마크 해제':'북마크에 저장',()=>c.bookmark(l.id),'lesson-bookmark'),
      card([heading('이번 레슨의 목표',18),...l.objectives.map(v=>body(`✓ ${v}`))],{backgroundColor:p.blueSoft,borderWidth:0}),
      ...(l.prerequisites.length?[small('먼저 보면 좋은 이론'),...l.prerequisites.flatMap(id=>{const pre=c.content.lessons.find(x=>x.id===id);return pre?[action(pre.title,()=>openLesson(pre),`prerequisite-${id}`)]:[];})]:[]),
      ...lessonBlocks(l.body,p),...(l.example?[heading('예제로 확인하기',21),small(`${dialectLabel(l.example.dialect)} · 미리 작성한 결과 · 앱 내 SQL 실행 아님`),
        ...l.example.tables.flatMap(t=>[small(`입력 · ${t.name}`),table(t.columns,t.rows,t.name)]),code(l.example.sql),
        ...(l.example.columns.length?[small('예상 결과'),table(l.example.columns,l.example.rows,'예상 결과')]:[notice('결과 표가 없는 상태 변경·구문 설명 예제입니다.')]),small(l.example.note)]:[]),
      card([heading('핵심 요약',20),...l.summary.map(v=>body(`✓ ${v}`))],{backgroundColor:p.blueSoft,borderWidth:0}),
      action(s.readLessons.includes(l.id)?'읽음 기록됨':'이론 읽음 기록',()=>c.markLesson(l.id),'lesson-read',false,s.readLessons.includes(l.id)),
      action('확인 문제 풀기',()=>c.beginPractice(l.questionIds),'lesson-practice',true),
      action(fold?'참고자료 접기':'참고자료·버전 보기',()=>c.toggleExpanded(`sources:${l.id}`),'lesson-sources'),
      ...(fold?[small(`${l.id} · 콘텐츠 ${l.version} · 독립 감수 전 원고`),...l.sourceIds.flatMap(id=>{const source=c.content.sources[id];return source?[action(source.title,()=>c.external(source.url),`source-${id}`)]:[];}),action('이론 오류 제보',()=>c.navigate({name:'help',id:l.id}),'report-lesson')]:[])];}
  }
  if(r==='practice'&&s.practice){
    const pr=s.practice,q=c.getQuestion(pr.questionIds[pr.index]);if(q){content=[small(`${pr.mode==='review'?'오답 복습':'이론 확인'} · ${pr.index+1}/${pr.questionIds.length}문항`),progress(pr.sessionAnswered/pr.questionIds.length,p.blue),...question(q),...options(q,pr.selected,pr.submitted,id=>c.selectPractice(id)),
      ...(pr.submitted?explanation(q,pr.selected??undefined):[choiceChip('확신 부족 · 복습에 추가',pr.uncertain,()=>{void c.uncertain();},'practice-uncertain')])];
      footer=framedFooter([action(pr.submitted?(pr.index===pr.questionIds.length-1?'연습 결과 확인':'다음 문제'):'정답 확인',()=>pr.submitted?c.nextPractice():c.answerPractice(),pr.submitted?'next-practice':'submit-practice',true,!pr.submitted&&!pr.selected)]);}
  }
  if(r==='review'){
    const due=dueReviews(s,c.content,c.services.clock().wall),all=Object.keys(s.reviews).filter(id=>{const q=c.getQuestion(id);return q&&(!q.examId||s.exams.some(e=>e.status==='submitted'&&e.snapshots.some(x=>x.id===id)));});
    const showAll=c.expanded.has('review:all'),ids=showAll?all:due;
    content=[...(due.length?[action(`복습 시작 · ${Math.min(due.length,10)}문항`,()=>c.beginDueReview(),'start-review',true)]:[]),
      row([choiceChip(`오늘 ${due.length}`,!showAll,()=>{c.expanded.delete('review:all');c.notify();},'review-due'),choiceChip(`전체 ${all.length}`,showAll,()=>{c.expanded.add('review:all');c.notify();},'review-all')],{flexWrap:'wrap'}),
      ...(!ids.length?[heading('복습할 문제가 없어요',20),action('이론 학습하기',()=>c.tab('learn'),'review-empty-learn')]:ids.slice(0,20).flatMap(id=>{const q=c.getQuestion(id);return q?[card([small(`${q.subject==='S1'?'1과목':'2과목'} · ${s.reviews[id].dueDay} 예정`),body(q.stem),action('이 문항 복습',()=>c.beginPractice([id],'review'),`review-${id}`)])]:[];})),...(ids.length>20?[small('처음 20문항을 표시합니다. 복습 시작은 예정 순서대로 최대 10문항씩 진행합니다.')]:[])];
  }
  if(r==='exams'&&access){
    const filter=c.expanded.has('exams:available');const es=c.content.exams.filter(e=>!filter||access.hasAccess(e.id));
    content=[heading('실전 모의고사',28),small('20회 · 회당 50문항 · 제한시간 90분'),notice(access.mode==='off'?'현재 테스트에서는 1~4회를 이용할 수 있습니다. 광고가 꺼져 있어 5~20회는 새로 해제할 수 없습니다.':'1~4회 무료. 5~20회는 선택한 회차의 광고를 완료하면 이 기기에서 계속 이용합니다.'),
      ...(active?[action(`${active.title} 이어하기`,()=>resume(active),'catalog-resume',true)]:[]),
      row([choiceChip('전체 20회',!filter,()=>{c.expanded.delete('exams:available');c.notify();},'exams-all'),choiceChip('지금 응시 가능',filter,()=>{c.expanded.add('exams:available');c.notify();},'exams-available')],{flexWrap:'wrap'}),
      ...es.map(e=>{const attempts=s.exams.filter(a=>a.examId===e.id),latest=[...attempts].reverse().find(a=>a.status==='submitted'),first=attempts.find(a=>a.status==='submitted'&&a.isFirstAttempt),running=attempts.find(a=>a.status==='active'),open=access.hasAccess(e.id);
        return card([row([badge(e.order<=4?'무료':open?'열림':access.mode==='off'?'이용 불가':'광고 해제',open?'green':'blue'),small(running?'진행 중':latest?'응시 기록 있음':'미응시')],{flexWrap:'wrap'}),heading(`제${String(e.order).padStart(2,'0')}회 모의고사`,21),small('1과목 10문항 · 2과목 40문항'),
          ...(first?[small(`첫 응시 ${first.score?.points??0}점${latest&&latest.id!==first.id?` · 최근 ${latest.score?.points??0}점`:''}`)]:[]),
          action(running?'시험 이어하기':open?(latest?'다시 응시하기':'응시 안내 보기'):access.mode==='off'?'현재 테스트에서 이용 불가':'광고 1회로 이 회차 열기',()=>running?resume(running):open?c.navigate({name:'examIntro',id:e.id}):access.offerUnlock(e.id),`exam-${e.id}`,open&&!latest,(!running&&!!active)||(!open&&access.mode==='off')),
          ...(latest?[action('결과·해설 보기',()=>c.navigate({name:'result',id:latest.id}),`result-${e.id}`,false,!!active)]:[])],{},e.id);
      })];
  }
  if(r==='examIntro'){
    const e=c.content.exams.find(e=>e.id===c.route.id);if(e){const open=access?access.hasAccess(e.id):e.order<=4;
      content=[badge(open?'응시 가능':'광고 해제 필요',open?'green':'blue'),heading(e.title,28),card([heading('50문항 · 90분',23),body('1과목 10문항 · 20점\n2과목 40문항 · 80점\n미응답 0점 · 제출 후 답안 변경 불가')]),
        notice('시험을 시작하면 화면을 잠그거나 앱을 나가도 시간이 흐릅니다. 시간 중단 기능은 없습니다.'),
        body('시험 중에는 광고와 정답·해설을 표시하지 않습니다. 보기 선택 후 자동 저장하며, 답안표에서 미응답·보류 문항을 확인할 수 있습니다.'),
        small(open?'열린 회차는 재응시와 제출 후 해설에 추가 광고가 없습니다.':'시청은 선택입니다. 취소해도 무료 1~4회와 이미 열린 회차는 그대로 이용할 수 있습니다.'),
        ...(active?[action('진행 중 시험 이어하기',()=>resume(active),'intro-resume',true)]:[action(open?'90분 실전 시작':'광고 해제 안내 보기',()=>open?c.beginExam(e.id):access?.offerUnlock(e.id),'start-exam',true,!open&&!access)]),
        action('모의고사 목록',()=>c.tab('exams'),'back-exams'),small('내부 학습용 자체 제작 문제이며 공식 시험·합격을 보장하지 않습니다.')];}
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
      content=[badge(e.isFirstAttempt?'첫 응시':'재응시'),heading(e.title,26),card([small('앱 내부 연습 결과'),heading(`${score.points} / 100점`,36),body(`정답 ${score.correct} · 오답 ${50-score.correct-score.unanswered} · 미응답 ${score.unanswered}`),badge(score.practiceThresholdMet?'연습 합격 기준 충족':'연습 기준 보완 필요',score.practiceThresholdMet?'green':'orange')]),
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
      const filters=row([choiceChip('전체',!only,()=>{c.expanded.delete(`wrong:${e.id}`);c.route={...c.route,index:0};c.notify();},'review-exam-all'),choiceChip('오답·미응답',only,()=>{c.expanded.add(`wrong:${e.id}`);c.route={...c.route,index:examReviewIndices(e,true)[0]??0};c.notify();},'review-exam-wrong')],{flexWrap:'wrap'});
      if(i===undefined){content=[filters,empty('오답·미응답이 없어요','전체 해설에서 풀이 과정을 다시 확인할 수 있습니다.')];}
      else {const q=e.snapshots[i];content=[filters,small(`${pos+1}/${ids.length} · 시험 ${i+1}번`),...question(q),...options(q,e.answers[q.id]??null,true,()=>{}),...explanation(q,e.answers[q.id])];}
      footer=framedFooter([row([action('이전 해설',()=>{c.route={...c.route,index:ids[pos-1]};c.notify();},'explain-prev',false,pos<=0),action(pos>=ids.length-1?'결과로':'다음 해설',()=>{c.route=pos>=ids.length-1?{name:'result',id:e.id}:{...c.route,index:ids[pos+1]};c.notify();},'explain-next',true)],{flexWrap:'wrap',justifyContent:'space-between'})]);
    }
  }
  if(r==='stats'){
    const a=firstAccuracy(s),first=new Map<string,(typeof s.responses)[number]>();
    for(const response of s.responses)if(!first.has(response.questionId))first.set(response.questionId,response);
    const correct=[...first.values()].filter(x=>x.correct).length;
    const attempts=[...s.exams].filter(e=>e.status==='submitted'&&e.score).sort((a,b)=>(b.submittedAt??b.startedAt)-(a.submittedAt??a.startedAt));
    content=[heading('학습 기록',24),
      row([card([small('공부한 날짜'),heading(`${s.studyDays.length}일`,23)],{flex:1,padding:14}),card([small('읽은 이론'),heading(`${s.readLessons.length}/60`,23)],{flex:1,padding:14})]),
      card([heading('확인 문제 · 첫 풀이',18),body(first.size?`첫 풀이 정답률 ${Math.round(correct/first.size*100)}%`:'아직 풀이 기록이 없어요'),body(a.percent===null?'확신 정답 비율 —':`확신 있게 맞힌 비율 ${a.percent}%`),...(first.size?[action(c.expanded.has('stats:details')?'계산 기준 접기':'계산 기준',()=>c.toggleExpanded('stats:details'),'stats-details'),...(c.expanded.has('stats:details')?[small(`${first.size}문항의 첫 답안 기준입니다. 확신 부족으로 표시한 정답은 확신 비율에서 제외합니다.`)]:[])]:[])]),
      heading('모의고사 응시 이력',20),
      ...(!attempts.length?[small('아직 응시 기록이 없어요'),action('실전 모의고사 보기',()=>c.tab('exams'),'records-start-exam')]:attempts.map(e=>card([row([badge(e.isFirstAttempt?'첫 응시':'재응시'),small(new Date(e.submittedAt??e.startedAt).toLocaleDateString('ko-KR'))],{flexWrap:'wrap'}),heading(e.title,18),body(`${e.score!.points} / 100점`),action('결과·해설 보기',()=>c.navigate({name:'result',id:e.id}),`history-${e.id}`)])))];
  }
  if(r==='settings'){
    const adCards=(scroll.children??[]).filter(n=>n.children?.some(ch=>ch.text==='광고와 회차 해제'));
    content=[heading('설정',26),heading('글자 크기',20),small('시스템 글자 크기에 아래 추가 배율을 함께 적용합니다.'),row([1,1.15,1.3].map(n=>choiceChip(`${Math.round(n*100)}%`,s.settings.fontScale===n,()=>{void c.commit(s=>({...s,settings:{...s.settings,fontScale:n}}));},`font-${n}`)),{flexWrap:'wrap'}),body('이 크기로 이론과 해설이 표시됩니다.'),
      heading('화면 테마',20),row((['light','dark'] as const).map(theme=>choiceChip(theme==='light'?'라이트':'다크',s.settings.theme===theme,()=>{void c.commit(s=>({...s,settings:{...s.settings,theme}}));},`theme-${theme}`)),{flexWrap:'wrap'}),
      action('시험일·하루 학습 시간 변경',()=>c.navigate({name:'setup'}),'change-goal'),
      ...(access?.resetLearning?[action('학습 기록만 초기화 · 열린 회차 유지',()=>access.resetLearning!(),'reset-learning')]:[]),
      action('오류 제보·고객센터',()=>c.navigate({name:'help'}),'stats-help'),action('콘텐츠 버전·상태',()=>c.navigate({name:'notices'}),'stats-notices'),action('개인정보 안내',()=>c.navigate({name:'privacy'}),'stats-privacy'),...adCards,notice('알림·계정·클라우드 복원은 아직 제공하지 않습니다. 앱 삭제·전체 초기화·기기 변경 시 기기 기록을 복원할 수 없습니다.')];
  }
  if(r==='setup'){
    content=[heading('목표와 학습 시간을 정해요',26),small('시험일을 모르면 비워두고 시작할 수 있습니다.'),heading('하루 학습 시간',18),row([15,30,45,60,90].map(n=>choiceChip(`${n}분`,c.draftSettings.minutes===n,()=>{c.draftSettings.minutes=n;c.notify();},`minutes-${n}`)),{flexWrap:'wrap'}),
      small('목표 시험일 · 선택 입력'),{kind:'input',testId:'target-date',label:'목표 시험일, YYYY-MM-DD, 선택 입력',value:c.draftSettings.targetDate,onChange:v=>{c.draftSettings.targetDate=v;c.notify();},placeholder:'YYYY-MM-DD 또는 비워두기',style:{minHeight:52,padding:14,fontSize:16,borderWidth:1,borderColor:p.line,borderRadius:12,color:p.ink,backgroundColor:p.surface}},
      notice('30개 학습일의 순서는 유지됩니다. 하루 학습 시간을 바꿔도 학습량을 자동 압축하거나 합격을 보장하지 않습니다. 모의고사는 90분을 따로 확보하세요.'),
      action(s.onboarded?'변경 사항 저장':'학습 시작',()=>c.saveSettings(!s.onboarded),'finish-setup',true)];
  }
  if(r==='help'){
    const report=(scroll.children??[]).find(n=>n.text==='제보 내용 공유하기');
    if(report)report.disabled=locked||!c.supportText.trim();
    scroll.children?.unshift(small('공유창을 여는 기능이며 고객센터 접수 완료를 의미하지 않습니다. 개인정보나 광고 식별자는 적지 마세요.'));
  }
  if(content&&['catalog','review'].includes(r))content.unshift(learningNavigation());
  if(content){const recovery=(scroll.children??[]).filter(n=>n.testId==='retry-reward-save'||n.text?.startsWith('테스트 광고 모드')||n.text?.startsWith('광고 처리 중'));scroll.children=[...(c.notice?[notice(c.notice)]:[]),...recovery,...content];}
  // Stable for timer ticks and choice saves; reset only when the actual question/lesson changes.
  const exam=r==='exam'?(c.examAttempt(c.route.id)??active):undefined;
  scroll.key=`${r}:${c.route.id??''}:${r==='exam'?exam?.index??0:r==='practice'?`${s.practice?.id??''}:${s.practice?.index??0}`:c.route.index??''}`;
  // Reward/privacy feedback must be visible even after opening a lower exam card.
  // Keep timed questions stable; only these action screens return to the notice.
  if(['exams','examIntro','settings'].includes(r))scroll.key+=`:notice:${c.notice??''}`;
  scroll.testId='learning-content';
  if(top){const at=root.children!.indexOf(scroll);root.children!.splice(at,0,top);}
  if(footer){root.children=root.children!.filter(n=>n===scroll||n===top||n.kind==='modal'||root.children!.indexOf(n)<root.children!.indexOf(scroll));const modal=root.children.findIndex(n=>n.kind==='modal');root.children.splice(modal<0?root.children.length:modal,0,footer);}
  return root;
}
