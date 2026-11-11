import {renderMockScreen,mockExplanation} from '../mocks/views';
import {canStudyQuestion,formatTime,isExamPaused} from '../core/domain/exam';
import type {MonetizedController} from '../monetization/controller';
import type {ContentBlock} from './types';
import type {Route} from '../core/types';
import {box,button,code,dark,light,learningType,progress,row,segments as segmentGroup,table,text,type Node} from '../ui/nodes';
import {dailySections,searchSections,textbookMetrics} from './learning';

export function renderTextbook(c:MonetizedController):Node{
 const p=c.isDark?dark:light,tb=c.content.textbook!,s=c.state,m=textbookMetrics(s,c.content);
 const t=(v:string)=>text(v,{...learningType.body,color:p.ink});
 const small=(v:string)=>text(v,{...learningType.meta,color:p.muted});
 const h=(v:string):Node=>({...text(v,{...learningType.heading,color:p.ink}),heading:true});
 const card=(ns:Node[],key?:string)=>box(ns,{padding:14,gap:10,borderRadius:16,backgroundColor:p.surface,borderWidth:1,borderColor:p.line},key);
 const act=(label:string,action:()=>void|Promise<void>,id?:string,selected=false,disabled=false)=>button(label,action,{backgroundColor:selected?p.blueSoft:'transparent',color:selected?p.blue:p.muted,borderRadius:10,minHeight:48,fontWeight:selected?'600':'400'},{testId:id,selected,disabled:disabled||c.busy||c.rewardBusy});
 const primary=(label:string,action:()=>void|Promise<void>,id?:string,disabled=false):Node=>({...act(label,action,id,false,disabled),buttonKind:'primary'});
 const link=(label:string,action:()=>void|Promise<void>,id?:string):Node=>({...act(label,action,id),text:label.split('\n')[0],subtitle:label.includes('\n')?label.split('\n').slice(1).join(' · '):undefined,buttonKind:'row',style:{...act(label,action).style,paddingRight:30,textAlign:'left'}});
 const choice=(label:string,action:()=>void|Promise<void>,id:string,selected:boolean,disabled=false,feedback?:'correct'|'incorrect'):Node=>({...act(label,action,id,selected,disabled),buttonKind:'choice',feedback,role:'radio',checked:selected});
 const segments=segmentGroup;
 const go=(name:Route['name'],id?:string)=>()=>c.navigate({name,id});
 const sectionLink=(id:string)=>{const l=c.content.lessons.find(l=>l.id===id)!;return link(`${l.title}\n${s.readLessons.includes(id)?'✓ 읽음 완료':c.readingPosition(id)?'읽는 중':'학습 전'}`,go('lesson',id),`section-${id}`);};
 const blocks=(bs:ContentBlock[],key:string):Node[]=>bs.map((b,i)=>{
  const k=key+':'+i;
  switch(b.type){
   case 'paragraph':return {...t(b.text),key:k};
   case 'code':return box([...(b.label?[small(b.label)]:[]),code(b.code)],{gap:6},k);
   case 'table':return {...table(b.headers,b.rows,b.caption??'교재 표'),key:k};
   case 'callout':return card([h(b.title),t(b.text)],k);
   case 'flow':return card(b.items.flatMap((v,i)=>[t(`${i+1}. ${v}`),...(i<b.items.length-1?[small('↓')]:[])]),k);
   case 'details':return card([act(b.title,()=>c.toggleExpanded(k),k,c.expanded.has(k)),...(c.expanded.has(k)?[t(b.text)]:[])],k);
   case 'widget':return {kind:'widget',key:k,widget:tb.widgets[b.widget],testId:`widget-${b.widget}`} as Node;
  }
 });
 const mockUi={t,small,h,card,act,primary,link,choice,go,blocks};
 const mockScreen=c.ready?renderMockScreen(c,mockUi):undefined;
 let body:Node[]=[],footer:Node[]=[],header:Node[]=[];let title='SQLD Pass';const r=c.route.name;
 if(!c.ready)body=[h(c.startupError?'기록을 불러오지 못했습니다':'교재를 준비하고 있습니다'),t(c.startupError||'잠시 기다려 주세요.'),...(c.startupError?[act('다시 시도',()=>c.initialize())]:[])];
 else if(mockScreen){title=mockScreen.title;body=mockScreen.body;footer=mockScreen.footer??[];header=mockScreen.header??[];}
 else if(r==='welcome')body=[h('표에서 시작하는 SQLD 학습'),t('5개 Part · 18개 Chapter · 216개 학습 절'),t('개념을 읽고, SQL 결과를 살펴보고, 확인 문제로 이해를 점검하세요.'),small('학습 기록은 이 기기에 저장됩니다. 실전 탭에서 20회 모의고사를 이용하세요.'),primary('학습 시작',go('setup'),'textbook-start')];
 else if(r==='setup'||r==='settings'||r==='appearance'){
  title=r==='setup'?'학습 설정':'설정';
  body=[h('학습 계획'),small('목표일까지 남은 날짜와 읽지 않은 절 수로 오늘 분량을 안내합니다. 날짜 없이도 순서대로 학습할 수 있습니다.'),{kind:'date',value:c.draftSettings.targetDate,label:'목표 시험일',onChange:v=>c.setTargetDate(v)},act('목표일 없이 학습',()=>c.setTargetDate('')),
   h('화면 설정'),small('테마'),segments((['light','dark','system'] as const).map((theme,i)=>act(['밝게','어둡게','기기 설정'][i],()=>{c.draftSettings.theme=theme;c.notify();},undefined,c.draftSettings.theme===theme))),small('글자 크기'),segments([1,1.15,1.3].map(v=>act(`${Math.round(v*100)}%`,()=>{c.draftSettings.fontScale=v;c.notify();},undefined,c.draftSettings.fontScale===v))),
   card([small('글자 크기 미리보기'),text('매일 한 절씩, SQL을 이해하는 학습',{fontSize:16*c.draftSettings.fontScale/s.settings.fontScale,lineHeight:27*c.draftSettings.fontScale/s.settings.fontScale,color:p.ink})]),...(c.settingsError?[{...t(c.settingsError),alert:true}]:[]),
   ...(r==='setup'?[]:[h('앱 관리'),link('학습 알림',go('reminderSettings')),link('개인정보 안내',go('privacy')),link('도움말과 출처',go('help')),link('데이터 관리',go('data'))])];
  footer=[primary(r==='setup'?'설정하고 학습 시작':'설정 저장',()=>c.saveSettings(r==='setup'),'save-textbook-settings')];
 }
 else if(r==='data'){
  title='데이터 관리';body=[h('기기에 저장한 학습 기록'),t('기록과 이용 권한은 이 기기에 저장됩니다. 삭제하거나 기기를 바꾸면 복원할 수 없습니다.'),
   card([h('학습 기록 초기화'),small('학습 설정과 기존 회차 이용 권한을 유지합니다.'),{...act('학습 기록만 초기화',()=>c.requestLearningReset()),buttonKind:'danger'}]),
   card([h('전체 데이터 삭제'),small('학습 기록과 설정, 광고로 연 회차의 이용 권한을 모두 삭제합니다.'),{...act('전체 데이터 삭제',()=>c.requestReset()),buttonKind:'danger'}])];
 }
 else if(r==='home'){
  title='홈';const today=dailySections(s,c.content,c.services.clock().wall),last=c.lastReadingLesson(),active=c.activeExam();
  const latest=new Map(s.responses.filter(a=>!c.content.questions[a.questionId]?.examId).map(a=>[a.questionId,a]));
  const wrong=[...latest.values()].filter(a=>!a.correct||a.uncertain).map(a=>a.questionId);
  const next=last&&!s.readLessons.includes(last.id)?last:today.find(l=>!s.readLessons.includes(l.id))??today[0];
  const continuing=next&&!!c.readingPosition(next.id),completedToday=today.filter(l=>s.readLessons.includes(l.id)).length;
  body=[h(active||s.practice?'이어서 학습하기':'오늘의 학습'),
   ...(active?[card([small(isExamPaused(active)?'일시정지한 모의고사':'진행 중인 모의고사'),h(active.title),t(active.mode==='study'?'학습 모드 · 시간 제한 없음':`남은 시간 ${formatTime(c.remaining())}`),primary('모의고사 이어하기',go('exam',active.id),'resume-mock')])]:s.practice?[card([h('풀던 문제부터 이어서'),small(`${s.practice.index+1} / ${s.practice.questionIds.length}문항 · 답안을 저장했습니다`),primary('문제풀이 이어하기',()=>c.resumePractice(),'resume-textbook-practice')])]:[]),
   card([small(s.settings.targetDate?`목표일 ${s.settings.targetDate}`:'교재 순서대로 학습'),
    h(today.length?`오늘 분량 ${completedToday} / ${today.length}절 완료`:'전체 교재 읽음 완료'),
    ...(next?[t(next.title),(active||s.practice?link:primary)(continuing?'이어서 읽기':'교재 공부 시작',go('lesson',next.id),`section-${next.id}`)]:[t('확인 문제와 모의고사로 이해한 내용을 점검해 보세요.'),link('확인 문제 풀기',go('review'))]),
    link('전체 교재 목차',go('catalog'),'home-textbook')]),
   ...(wrong.length?[link(`오답·헷갈린 문제 복습\n${wrong.length}문항 중 ${Math.min(5,wrong.length)}문항부터`,()=>c.beginPractice(wrong.slice(0,5),'review'),'home-wrong')]:[]),
   h('나의 학습 현황'),row([box([h(`${m.read} / ${m.sections}`),small('읽음 완료한 절')],{flex:1}),box([h(`${m.attempted} / ${m.questions}`),small('풀어본 문제')],{flex:1}),box([h(m.accuracy===null?'—':m.accuracy+'%'),small('최근 답안 정답률')],{flex:1})],{flexWrap:'wrap',gap:16}),progress(m.read/m.sections,p.blue),
   small('열어본 절은 자동으로 완료되지 않습니다. 읽음 완료를 직접 표시해 주세요.'),
   h('학습 도구'),segments([act('핵심 카드',go('flashcards')),act('용어 사전',go('glossary')),act('모의고사',go('exams'))]),
   ...(c.showBanner?[act('광고 표시 설정',()=>c.openAdPrivacy(),'home-ad-settings')]:[])];
 }
 else if(r==='catalog'||r==='plan'||r==='day'){
  title='교재';body=[h('전체 목차'),{kind:'input',label:'교재 검색',placeholder:'개념 · 용어 · SQL 검색',value:c.search,onChange:v=>c.setSearch(v),style:{minHeight:52,padding:14,borderWidth:1,borderColor:p.line,borderRadius:14,backgroundColor:p.surface}},act(c.bookmarkedOnly?'✓ 저장한 절':'저장한 절',()=>{c.bookmarkedOnly=!c.bookmarkedOnly;c.notify();},'bookmarked-sections',c.bookmarkedOnly)];
  if(c.search.trim()||c.bookmarkedOnly){const found=searchSections(c.content,c.search).filter(l=>!c.bookmarkedOnly||s.bookmarks.includes(l.id));const query=c.search.trim().toLocaleLowerCase();found.sort((a,b)=>Number(b.title.toLocaleLowerCase().includes(query))-Number(a.title.toLocaleLowerCase().includes(query)));
   body.push(...(c.search?[act('검색어 지우기',()=>c.setSearch(''),'clear-textbook-search')]:[]),small(`${found.length}개 절`),...found.map(l=>{
    const ch=tb.chapters.find(ch=>ch.id===l.chapterId),source=[l.body,...(l.blocks??[]).flatMap(b=>b.type==='paragraph'?[b.text]:b.type==='code'?[b.code]:[])].join(' '),at=Math.max(0,source.toLocaleLowerCase().indexOf(query));
    const snippet=query?source.slice(Math.max(0,at-24),at+90).replace(/\s+/g,' '):'';
    return box([sectionLink(l.id),small(`CHAPTER ${ch?.number??''} · ${ch?.title??''}`),...(snippet?[small(snippet+'…')]:[])],{gap:4});}),...(!found.length?[t(c.bookmarkedOnly?'저장한 절이 없습니다. 이론 화면의 저장 버튼으로 모아보세요.':'검색 결과가 없습니다. 다른 개념이나 SQL로 검색해 보세요.'),link('전체 교재 보기',()=>{c.search='';c.bookmarkedOnly=false;c.notify();})]:[]));}
  else body.push({...box(tb.parts.map((part,i)=>card([small(`PART ${i+1}`),{...act(part.title,()=>c.toggleExpanded('part:'+part.id),'part-'+part.id),expanded:!c.expanded.has('part:'+part.id),icon:'chevron-right' as const,iconPosition:'trailing' as const,style:{textAlign:'left',color:p.ink,fontWeight:'600',fontSize:17}},...(!c.expanded.has('part:'+part.id)?part.chapterIds:[]).map(id=>{const ch=tb.chapters.find(x=>x.id===id)!;return link(`${ch.number}. ${ch.title}\n${ch.sectionIds.filter(id=>s.readLessons.includes(id)).length} / ${ch.sectionIds.length}절 읽음`,go('chapter',id),`chapter-${ch.number}`);})],part.id))),layout:'dashboard'});
  body.push(act('용어 사전',go('glossary')),act('핵심 카드',go('flashcards')),act('교재 출처와 학습 범위',go('sources')));
 }
 else if(r==='chapter'){
  const ch=tb.chapters.find(x=>x.id===c.route.id);title='장별 목차';if(ch)body=[small(`CHAPTER ${ch.number}`),h(ch.title),t(ch.subtitle),{...act('학습 목표',()=>c.toggleExpanded('goals:'+ch.id)),expanded:c.expanded.has('goals:'+ch.id),icon:'chevron-right' as const,iconPosition:'trailing' as const},...(c.expanded.has('goals:'+ch.id)?ch.goals.map(t):[]),...ch.sectionIds.map(sectionLink),card([h('마무리 점검'),...ch.recap.map(t)]),act('이 장의 확인 문제',()=>c.beginPractice(Object.values(c.content.questions).filter(q=>q.chapterId===ch.id&&q.pool==='chapter').map(q=>q.id)))];
 }
 else if(r==='lesson'||r==='lessonSummary'){
  const l=c.content.lessons.find(l=>l.id===c.route.id);title='교재 읽기';if(l){const ch=tb.chapters.find(x=>x.id===l.chapterId)!;const index=c.content.lessons.indexOf(l),next=c.content.lessons[index+1],previous=c.content.lessons[index-1];
   body=[row([small(`${ch.number}장 · ${ch.sectionIds.indexOf(l.id)+1} / ${ch.sectionIds.length}절`),box([],{flex:1}),{...act(s.bookmarks.includes(l.id)?'저장됨':'저장',()=>c.bookmark(l.id),'bookmark-section',s.bookmarks.includes(l.id)),label:s.bookmarks.includes(l.id)?'이 절 저장 해제':'이 절 저장',icon:'bookmark' as const,style:{color:p.blue}}]),h(l.title),t(l.body),...blocks(l.blocks??[],l.id),card([h('핵심 정리'),...l.summary.map(t)]),link(`이 장의 목차\n${ch.title}`,go('chapter',ch.id),'lesson-toc'),...(previous?[link(`이전 절\n${previous.title}`,go('lesson',previous.id),'previous-section')]:[]),...(next?[link(`다음 절\n${next.title}`,go('lesson',next.id),'next-section')]:[t('교재의 마지막 절입니다. 확인 문제로 학습 내용을 점검해 보세요.')]),act('이 절의 출처',go('sources',l.id))];
   footer=[segments([act(s.readLessons.includes(l.id)?'✓ 읽음 완료':'읽음 완료',()=>c.markLesson(l.id),'mark-section',s.readLessons.includes(l.id)),...(l.questionIds.length?[primary('확인 문제',()=>c.beginLessonPractice(l.id),'section-practice')]:next?[primary('다음 절',go('lesson',next.id),'next-section')]:[])])];
  }
 }
 else if(r==='review'||r==='practiceSetup'){
  title='문제풀이';const latest=new Map(s.responses.filter(a=>!c.content.questions[a.questionId]?.examId).map(a=>[a.questionId,a]));const wrong=[...latest.values()].filter(a=>!a.correct||a.uncertain).map(a=>a.questionId);
  body=[h('확인 문제와 복습'),small('장별 확인 268문항 · 종합 연습 72문항'),small('한 번에 풀 문항 수'),segments([5,10,20,0].map(n=>act(n?`${n}문항`:'전체',()=>{c.practiceBatchSize=n;c.notify();},'batch-'+n,c.practiceBatchSize===n))),...(s.practice?[act('진행 중 문제풀이 이어하기',()=>c.resumePractice())]:[]),act(`오답·헷갈린 문제 ${wrong.length}문항`,()=>c.beginPractice(wrong.slice(0,c.practiceBatchSize||wrong.length),'review'),undefined,false,!wrong.length),link('종합 연습\n72문항 중 선택한 분량 풀기',()=>c.beginPractice(Object.values(c.content.questions).filter(q=>q.pool==='mixed').map(q=>q.id).slice(0,c.practiceBatchSize||undefined))),...tb.chapters.map(ch=>{const qs=Object.values(c.content.questions).filter(q=>q.chapterId===ch.id&&q.pool==='chapter');return {...link(`${ch.number}. ${ch.title}\n${qs.length}문항 · ${Math.min(c.practiceBatchSize||qs.length,qs.length)}문항 풀기`,()=>c.beginPractice(qs.map(q=>q.id).slice(0,c.practiceBatchSize||undefined))),disabled:!qs.length||c.busy};})];
 }
 else if(r==='practice'){
  const ps=s.practice,q=ps&&c.content.questions[ps.questionIds[ps.index]];title='문제풀이';if(ps&&q&&canStudyQuestion(s,q))body=[small(`${ps.index+1} / ${ps.questionIds.length}`),t(q.stem),...blocks(q.blocks??[],q.id),...q.options.map(o=>choice(`${o.id}. ${o.text}${ps.submitted&&o.id===q.answer?' · 정답':''}${ps.submitted&&o.id===ps.selected?' · 내 답':''}`,()=>c.selectPractice(o.id),`option-${o.id}`,ps.selected===o.id,ps.submitted,ps.submitted?(o.id===q.answer?'correct':o.id===ps.selected?'incorrect':undefined):undefined)),{...act(ps.uncertain?'✓ 헷갈림 표시됨':'헷갈림 표시',()=>c.uncertain(),'uncertain',ps.uncertain,ps.submitted),style:{alignSelf:'flex-start',color:p.muted,fontSize:13}},
   ...(ps.submitted?[card([{...h(ps.selected===q.answer?'정답입니다':'다시 확인해 보세요'),alert:true},...(q.pool==='mock'?mockExplanation(c,q,mockUi):[t(`정답 ${q.answer}번`),t(q.explanation),...q.options.map(o=>t(`${o.id}. ${q.optionExplanations[o.id]}`)),...q.lessonIds.map(id=>act('관련 개념 읽기',go('lesson',id)))])])]:[])];
  if(ps&&q&&canStudyQuestion(s,q))footer=[ps.submitted?primary(ps.index+1===ps.questionIds.length?'결과 보기':'다음 문제',()=>c.nextPractice(),'next-question'):primary('답안 확인',()=>c.answerPractice(),'submit-question',!ps.selected)];
 }
 else if(r==='practiceResult'){
  const result=c.practiceResult();title='풀이 결과';if(result)body=[h(`${result.correct} / ${result.total}문항 정답`),t(`헷갈린 문제 ${result.uncertain}문항`),primary('오답·헷갈린 문제 다시 풀기',()=>c.beginRelatedReview(result.id),undefined,!result.wrongQuestionIds.length&&!result.uncertainQuestionIds.length),...result.lessonIds.map(sectionLink),act('홈으로',()=>c.returnPracticeHome())];
 }
 else if(r==='stats'||r==='calendar'||r==='examHistory'){
  title='학습 기록';body=[h('학습 현황'),link('모의고사 응시 기록 · 모드별 통계',go('examHistory')),...s.exams.filter(e=>e.status==='submitted').slice(-1).map(e=>link(`최근 시험 · ${e.title} · ${e.score?.points??0}점`,go('result',e.id))),card([t(`읽음 ${m.read}/${m.sections}절 · 풀이 ${m.attempted}/${m.questions}문항`),small(`최근 답안 정답률 ${m.accuracy===null?'—':m.accuracy+'%'}`),act('통계 기준',()=>c.toggleExpanded('stats:help')),...(c.expanded.has('stats:help')?[small('읽음은 직접 완료한 절 수, 풀어본 문제는 중복을 제외한 수입니다. 정답률은 각 문제의 마지막 답안으로 계산합니다.')]:[])]),...tb.parts.map(part=>{const ids=tb.chapters.filter(ch=>part.chapterIds.includes(ch.id)).flatMap(ch=>ch.sectionIds);const read=ids.filter(id=>s.readLessons.includes(id)).length;return box([t(part.title),small(`${read} / ${ids.length}절 읽음`),progress(read/ids.length,p.blue)],{gap:6,paddingVertical:8});}),h('최근 일반 연습'),...(s.practiceResults??[]).filter(v=>v.questionIds.every(id=>!c.content.questions[id]?.examId)).slice(-10).reverse().map(v=>act(`${new Date(v.completedAt).toLocaleDateString('ko-KR')} · ${v.correct}/${v.total} 정답`,go('practiceResult',v.id))),act('설정',go('settings'))];
 }
 else if(r==='glossary'){
  title='용어 사전';const term=c.search.trim().toLowerCase();const terms=tb.glossary.filter(g=>!term||[g.term,g.english,g.definition].join(' ').toLowerCase().includes(term));
  const limit=c.reviewLimit;body=[{kind:'input',label:'용어 검색',placeholder:'용어 검색',value:c.search,onChange:v=>{c.reviewLimit=20;c.setSearch(v);},style:{padding:14,minHeight:52,borderWidth:1,borderColor:p.line,borderRadius:14,backgroundColor:p.surface}},...(c.search?[act('검색어 지우기',()=>c.setSearch(''))]:[]),small(`${terms.length}개 용어`),...(!terms.length?[small('검색 결과가 없습니다. 다른 용어를 입력해 주세요.')]:[]),...terms.slice(0,limit).map(g=>box([{...link(`${g.term}\n${g.definition.slice(0,64)}${g.definition.length>64?'…':''}`,()=>c.toggleExpanded('glossary:'+g.id)),expanded:c.expanded.has('glossary:'+g.id)},...(c.expanded.has('glossary:'+g.id)?[small(g.english),t(g.definition),link(`교재에서 읽기\n${c.content.lessons.find(l=>l.id===g.sectionId)?.title??'관련 절'}`,go('lesson',g.sectionId))]:[])],{gap:6},g.id)),...(terms.length>limit?[act('더 보기',()=>c.showMoreReviews())]:[])];
 }
 else if(r==='flashcards'){
  title='핵심 카드';const cards=tb.flashcards.filter(f=>!c.flashcardsUnknownOnly||!(s.knownCards??[]).includes(f.id));const index=Math.min(c.route.index??0,Math.max(0,cards.length-1)),f=cards[index];
  body=[segments([act('전체 카드',()=>{c.flashcardsUnknownOnly=false;c.route.index=0;c.notify();},'cards-all',!c.flashcardsUnknownOnly),act('아직 모르는 카드',()=>{c.flashcardsUnknownOnly=true;c.route.index=0;c.notify();},'cards-unknown',c.flashcardsUnknownOnly)]),small(`${cards.length?index+1:0} / ${cards.length} · 알고 있는 카드 ${s.knownCards?.length??0}개`),...(f?[card([h(f.prompt),c.expanded.has(f.id)?act('답 접기',()=>c.toggleExpanded(f.id),'flip-card'):primary('답 확인',()=>c.toggleExpanded(f.id),'flip-card'),...(c.expanded.has(f.id)?[t(f.answer),link('관련 개념',go('lesson',f.sectionId)),act((s.knownCards??[]).includes(f.id)?'알고 있음 · 해제':'알고 있는 카드로 표시',()=>c.toggleKnownCard(f.id),'known-card',(s.knownCards??[]).includes(f.id))]:[])])]:[h('모든 카드를 알고 있음으로 표시했습니다'),t('전체 카드에서 다시 확인할 수 있습니다.')])];
  if(f)footer=[segments([act('이전 카드',()=>{c.route={name:'flashcards',index:(index+cards.length-1)%cards.length};c.notify();}),act('다음 카드',()=>{c.route={name:'flashcards',index:(index+1)%cards.length};c.notify();})])];
 }
 else if(r==='sources'){
  title='출처와 범위';const lesson=c.content.lessons.find(l=>l.id===c.route.id);const ids=lesson?.sourceIds??Object.keys(c.content.sources);body=[h(lesson?lesson.title:'교재 출처'),small('원문 편집 주석 · 교재 내 단일 모의고사 대신 별도 제작한 20회를 제공합니다.'),t(tb.editorialNote),small('공식 출제 범위의 확인 상태와 저자 제공 출처를 구분합니다. 이 화면은 공식 검수나 제휴를 의미하지 않습니다.'),...ids.map(id=>{const source=c.content.sources[id];return card([t(source.title),small(source.provider||id),act('출처 열기',()=>c.services.openURL(source.url))],id);}),...(lesson?[]:[h('교재 학습 범위'),...tb.coverage.map((v,i)=>card([act(v.topic,()=>c.toggleExpanded('coverage'+i)),...(c.expanded.has('coverage'+i)?v.sections.map(sectionLink):[])]))])];
 }
 else if(r==='privacy'){title='개인정보';body=[h('기기에 저장하는 정보'),t('진도, 답안, 복습 기록, 카드 상태는 이 기기에 저장합니다. 회원가입, 학습 서버, 클라우드 동기화는 제공하지 않습니다.'),h('삭제와 복원'),t('앱 삭제·전체 데이터 삭제·기기 변경 시 로컬 기록과 이용 권한은 복원할 수 없습니다.'),h('광고 정보 처리'),t(c.ads.mode==='off'?'현재 빌드는 광고를 요청하지 않습니다.':'광고 활성화 시 Google 광고 SDK가 기기·네트워크·광고 상호작용 정보를 처리할 수 있습니다. 답안과 진도는 광고 타기팅에 전송하지 않습니다. 비개인화 광고도 정보 처리가 있을 수 있습니다.'),...(c.ads.mode==='off'?[]:[link('광고 개인정보 선택',()=>c.openAdPrivacy())]),...(c.services.privacyUrl?[link('개인정보처리방침',()=>c.services.openURL(c.services.privacyUrl!))]:[])];}
 else if(r==='help'||r==='report'||r==='notices'){
  title='도움말';const faq=[['중간에 나가도 이어서 풀 수 있나요?','일시정지하거나 앱을 벗어나면 답안과 남은 시간을 저장합니다. 돌아와서 이어서 풀기를 누르면 재개합니다. 학습 모드는 시간 제한이 없습니다.'],['해설은 언제 열리나요?','모의고사는 두 모드 모두 최종 제출 후 해설이 열립니다. 같은 회차 재응시 중에는 이전 해설도 잠시 숨겨집니다.'],['복습하면 시험 점수가 바뀌나요?','아니요. 복습 결과와 제출 당시 시험 점수는 별도로 유지됩니다.']];
  body=[h('자주 묻는 질문'),...faq.map(([question,answer],i)=>box([{...link(question,()=>c.toggleExpanded('faq:'+i),'faq-'+i),expanded:c.expanded.has('faq:'+i)},...(c.expanded.has('faq:'+i)?[t(answer)]:[])],{gap:8})),h('교재 이용 안내'),t('목차에서 절을 읽고 읽음 완료를 표시하세요. 확인 문제의 답안을 제출하면 각 보기의 해설을 볼 수 있습니다.'),{...act('학습 도구 안내',()=>c.toggleExpanded('help:tools')),expanded:c.expanded.has('help:tools')},...(c.expanded.has('help:tools')?[t(tb.labNote),t('체험 도구는 정해진 예제를 비교하는 학습 도구입니다. 실제 DBMS에 SQL을 실행하지 않습니다.')]:[]),link('교재 출처와 학습 범위',go('sources')),...(c.services.supportUrl?[link('고객지원',()=>c.services.openURL(c.services.supportUrl!))]:[])];
 }
 else body=[h('새 교재 학습'),t('교재와 실전 탭에서 학습을 이어가세요.'),act('교재 목차',go('catalog'))];
 if(c.needsRewardSave)body.unshift(act('시청 완료 보상 저장 재시도',()=>c.retryRewardSave()));
 if(c.notice)body.unshift({...t(c.notice),alert:true});
 if(s.textbookMigration?.noticePending&&c.ready)body.unshift(card([h('새 교재로 전환했습니다'),t('이전 교재의 진도·저장 목록·풀이·모의고사 기록을 정리했습니다. 학습 설정·알림 설정과 기존 이용 권한은 유지됩니다.'),act('확인',()=>c.dismissTextbookMigration(),'dismiss-migration')]));
 const reading=r==='lesson'?c.content.lessons.find(l=>l.id===c.route.id):undefined;
 const scroll:Node={...box(body,{gap:12,paddingVertical:16},`${r}:${c.route.id??''}:${r==='practice'?s.practice?.index??0:['exam','result','examReview'].includes(r)?(r==='exam'?c.activeExam()?.index:c.route.index)??0:''}`),scroll:true,contentWidth:reading||['setup','settings','appearance','examIntro','result','examReview','practice','mockQuestion','privacy','help'].includes(r)?'reading':undefined,...(reading?{reading:{position:c.readingPosition(reading.id),onSave:pos=>c.rememberReading(reading.id,pos)}}:{})};
 if(['settings','appearance','data','catalog','chapter','exams','stats','glossary','help','sources'].includes(r)){
  const context=JSON.stringify([r,c.route.id,c.search,c.bookmarkedOnly,c.examProgressFilter]);
  scroll.catalog={context,position:c.screenPosition(context),preserveContentOffset:true,onRemember:position=>c.rememberScreen(context,position)};
 }
 const activeRoute=['exams','examIntro','exam','examPause','sheet','result','examReview','mockReview','mockSaved','mockQuestion','mockSources'].includes(r)?'exams':r==='examHistory'?'stats':['chapter','lesson','lessonSummary','glossary','flashcards','sources'].includes(r)?'catalog':['practice','practiceSetup','practiceResult'].includes(r)?'review':['settings','appearance','privacy','help','report','data'].includes(r)?'stats':r;
 const nav:Node[]=c.ready&&s.onboarded&&!mockScreen?.focus?[row(([['홈','today','home','home'],['교재','learn','catalog','book'],['문제','review','review','list'],['실전','exams','exams','timer'],['기록','records','stats','chart']] as const).map(([label,tab,route,icon])=>button(label,()=>{c.search='';c.tab(tab);},{flexGrow:0,flexShrink:0,width:'20%',paddingHorizontal:0,color:activeRoute===route?p.blue:p.muted,minHeight:52,fontSize:13},{key:`tab-${tab}`,role:'tab',disabled:c.rewardBusy,icon,iconPosition:'above',selected:activeRoute===route,testId:`tab-${tab}`})),{gap:0,backgroundColor:p.surface,borderTopWidth:1,borderColor:p.line})]:[];
 const chrome=(ns:Node[],id:string)=>({...box(ns,{width:'100%',maxWidth:1160,alignSelf:'center',paddingHorizontal:16,paddingVertical:8,gap:8,backgroundColor:p.surface,borderColor:p.line,borderTopWidth:id==='screen-footer'?1:0}),testId:id,contentWidth:scroll.contentWidth});
 const root=box([row([...(mockScreen?.focus?(r==='examPause'?[]:[act('일시정지',()=>c.back(),'leave-exam')]):c.stack.length?[{...act('',()=>c.back()),label:'뒤로',icon:'chevron-left' as const,style:{minWidth:48,minHeight:48,color:p.ink}}]:[]),text(title,{...learningType.title,color:p.ink,flex:1}),...(s.onboarded&&!mockScreen?.focus&&!['settings','appearance','setup'].includes(r)?[{...act('',go('settings')),label:'설정',icon:'settings' as const,style:{minWidth:48,minHeight:48,color:p.muted}}]:[])],{padding:12,backgroundColor:p.surface}),...(header.length?[chrome(header,'screen-header')]:[]),scroll,...(footer.length?[chrome(footer,'screen-footer')]:[]),...(c.showBanner?[box([],{},'monetization-banner')]:[]),...nav.map(n=>({...n,key:'bottom-tabs'}))],{flex:1,backgroundColor:p.bg});
 if(c.dialog)root.children!.push({kind:'modal',close:()=>c.cancelDialog(),children:[card([h(c.dialog.title),t(c.dialog.body),{...primary(c.dialog.confirmLabel,()=>c.acceptDialog()),buttonKind:c.dialog.destructive?'danger':'primary'},act('취소',()=>c.cancelDialog())])]});
 return root;
}
