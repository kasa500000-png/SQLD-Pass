import {renderMockScreen,mockExplanation} from '../mocks/views';
import {canStudyQuestion} from '../core/domain/exam';
import type {MonetizedController} from '../monetization/controller';
import type {ContentBlock} from './types';
import type {Route} from '../core/types';
import {box,button,code,dark,light,progress,row,table,text,type Node} from '../ui/nodes';
import {dailySections,searchSections,textbookMetrics} from './learning';

export function renderTextbook(c:MonetizedController):Node{
 const p=c.isDark?dark:light,tb=c.content.textbook!,s=c.state,m=textbookMetrics(s,c.content);
 const t=(v:string)=>text(v,{fontSize:16,lineHeight:27,color:p.ink});
 const small=(v:string)=>text(v,{fontSize:13,lineHeight:21,color:p.muted});
 const h=(v:string):Node=>({...text(v,{fontSize:23,lineHeight:32,fontWeight:'700',color:p.ink}),heading:true});
 const card=(ns:Node[],key?:string)=>box(ns,{padding:18,gap:12,borderRadius:20,backgroundColor:p.surface,borderWidth:1,borderColor:p.line},key);
 const act=(label:string,action:()=>void|Promise<void>,id?:string,selected=false,disabled=false)=>button(label,action,{backgroundColor:selected?p.blue:p.blueSoft,color:selected?p.surface:p.blue,borderRadius:14,minHeight:48},{testId:id,selected,disabled:disabled||c.busy||c.rewardBusy});
 const go=(name:Route['name'],id?:string)=>()=>c.navigate({name,id});
 const sectionLink=(id:string)=>{const l=c.content.lessons.find(l=>l.id===id)!;return act(`${s.readLessons.includes(id)?'✓ ':''}${l.title}`,go('lesson',id),`section-${id}`);};
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
 const mockUi={t,small,h,card,act,go,blocks};
 const mockScreen=c.ready?renderMockScreen(c,mockUi):undefined;
 let body:Node[]=[];let title='SQLD Pass';const r=c.route.name;
 if(!c.ready)body=[h(c.startupError?'기록을 불러오지 못했습니다':'교재를 준비하고 있습니다'),t(c.startupError||'잠시 기다려 주세요.'),...(c.startupError?[act('다시 시도',()=>c.initialize())]:[])];
 else if(mockScreen){title=mockScreen.title;body=mockScreen.body;}
 else if(r==='welcome')body=[h('표에서 시작하는 SQLD 학습'),t('5개 Part · 18개 Chapter · 216개 학습 절'),t('개념을 읽고, SQL 결과를 살펴보고, 확인 문제로 이해를 점검하세요.'),small('학습 기록은 이 기기에 저장됩니다. 실전 탭에서 20회 모의고사를 이용하세요.'),act('학습 시작',go('setup'),'textbook-start')];
 else if(r==='setup'||r==='settings'||r==='appearance'){
  title=r==='setup'?'학습 설정':'설정';
  body=[h('목표 시험일'),small('목표일까지 남은 날짜와 읽지 않은 절 수로 오늘 분량을 안내합니다. 날짜 없이도 순서대로 학습할 수 있습니다.'),{kind:'date',value:c.draftSettings.targetDate,label:'목표 시험일',onChange:v=>c.setTargetDate(v)},act('목표일 없이 학습',()=>c.setTargetDate('')),
   h('테마'),...(['light','dark','system'] as const).map((theme,i)=>act(['밝게','어둡게','기기 설정'][i],()=>{c.draftSettings.theme=theme;c.notify();},undefined,c.draftSettings.theme===theme)),h('글자 크기'),...[1,1.15,1.3].map(v=>act(`${Math.round(v*100)}%`,()=>{c.draftSettings.fontScale=v;c.notify();},undefined,c.draftSettings.fontScale===v)),...(c.settingsError?[t(c.settingsError)]:[]),act('설정 저장',()=>c.saveSettings(r==='setup'),'save-textbook-settings'),
   ...(r==='setup'?[]:[act('학습 알림',go('reminderSettings')),act('개인정보 안내',go('privacy')),act('도움말과 출처',go('help')),act('학습 기록만 초기화',()=>c.requestLearningReset()),act('전체 데이터 삭제',()=>c.requestReset())])];
 }
 else if(r==='home'){
  title='홈';const today=dailySections(s,c.content,c.services.clock().wall);const last=c.lastReadingLesson();
  body=[h('오늘의 학습'),...(c.activeExam()?[card([t(`${c.activeExam()!.title} · ${c.activeExam()!.mode==='study'?'학습 모드':'실전 모드'}`),act('모의고사 이어하기',go('exam',c.activeExam()!.id),'resume-mock')])]:[]),...(s.practice?[card([t('진행 중인 문제풀이가 있습니다.'),act('문제풀이 이어하기',()=>c.resumePractice(),'resume-textbook-practice')])]:[]),
   card([small(s.settings.targetDate?`목표일 ${s.settings.targetDate}`:'교재 순서대로 학습'),h(today.length?today.every(l=>s.readLessons.includes(l.id))?'오늘 분량 완료':`오늘 ${today.length}개 절`:'전체 교재를 읽었습니다'),...today.slice(0,5).map(l=>sectionLink(l.id)),...(today.length>5?[small(`외 ${today.length-5}개 절 · 목차에서 이어서 학습`),act('전체 목차',go('catalog'))]:[])]),
   ...(last?[act(`읽던 곳으로 · ${last.title}`,go('lesson',last.id))]:[]),card([h('학습 현황'),t(`읽음 ${m.read} / ${m.sections}절`),progress(m.read/m.sections,p.blue),t(`풀어본 문제 ${m.attempted} / ${m.questions}문항`),t(`최근 답안 기준 정답률 ${m.accuracy===null?'—':m.accuracy+'%'}`)]),act('핵심 카드',go('flashcards')),act('용어 사전',go('glossary')),act('모의고사 20회',go('exams'))];
 }
 else if(r==='catalog'||r==='plan'||r==='day'){
  title='교재';body=[h('전체 목차'),{kind:'input',label:'교재 검색',placeholder:'개념 · 용어 · SQL 검색',value:c.search,onChange:v=>c.setSearch(v),style:{minHeight:52,padding:14,borderWidth:1,borderColor:p.line,borderRadius:14,backgroundColor:p.surface}},act(c.bookmarkedOnly?'전체 교재 보기':'저장한 절만 보기',()=>{c.bookmarkedOnly=!c.bookmarkedOnly;c.notify();},'bookmarked-sections',c.bookmarkedOnly)];
  if(c.search.trim()||c.bookmarkedOnly){const found=searchSections(c.content,c.search).filter(l=>!c.bookmarkedOnly||s.bookmarks.includes(l.id));body.push(small(`${found.length}개 절`),...found.map(l=>sectionLink(l.id)));}
  else body.push(...tb.parts.map((part,i)=>card([small(`PART ${i+1}`),h(part.title),...part.chapterIds.map(id=>{const ch=tb.chapters.find(x=>x.id===id)!;return act(`${ch.number}. ${ch.title}\n${ch.sectionIds.filter(id=>s.readLessons.includes(id)).length} / ${ch.sectionIds.length}절 읽음`,go('chapter',id),`chapter-${ch.number}`);})],part.id)));
  body.push(act('용어 사전',go('glossary')),act('핵심 카드',go('flashcards')),act('교재 출처와 학습 범위',go('sources')));
 }
 else if(r==='chapter'){
  const ch=tb.chapters.find(x=>x.id===c.route.id);title='Chapter';if(ch)body=[small(`CHAPTER ${ch.number}`),h(ch.title),t(ch.subtitle),card([h('학습 목표'),...ch.goals.map(t)]),...ch.sectionIds.map(sectionLink),card([h('마무리 점검'),...ch.recap.map(t)]),act('이 장의 확인 문제',()=>c.beginPractice(Object.values(c.content.questions).filter(q=>q.chapterId===ch.id&&q.pool==='chapter').map(q=>q.id)))];
 }
 else if(r==='lesson'||r==='lessonSummary'){
  const l=c.content.lessons.find(l=>l.id===c.route.id);title='학습';if(l){const ch=tb.chapters.find(x=>x.id===l.chapterId)!;const next=c.content.lessons[c.content.lessons.indexOf(l)+1];
   body=[small(`CHAPTER ${ch.number} · ${ch.title}`),h(l.title),t(l.body),act(s.bookmarks.includes(l.id)?'저장됨 · 해제':'이 절 저장',()=>c.bookmark(l.id),'bookmark-section',s.bookmarks.includes(l.id)),...blocks(l.blocks??[],l.id),card([h('핵심 정리'),...l.summary.map(t)]),act(s.readLessons.includes(l.id)?'읽음 완료':'읽음 완료로 표시',()=>c.markLesson(l.id),'mark-section',s.readLessons.includes(l.id)),...(l.questionIds.length?[act(`확인 문제 ${l.questionIds.length}문항`,()=>c.beginLessonPractice(l.id),'section-practice')]:[small('이 절에 직접 연결된 확인 문제는 없습니다.')]),...(next?[act(`다음 절 · ${next.title}`,go('lesson',next.id),'next-section')]:[]),act('이 장의 목차',go('chapter',ch.id)),act('이 절의 출처',go('sources',l.id))];
  }
 }
 else if(r==='review'||r==='practiceSetup'){
  title='문제풀이';const latest=new Map(s.responses.filter(a=>!c.content.questions[a.questionId]?.examId).map(a=>[a.questionId,a]));const wrong=[...latest.values()].filter(a=>!a.correct||a.uncertain).map(a=>a.questionId);
  body=[h('확인 문제와 복습'),small('장별 확인 268문항 · 종합 연습 72문항'),...(s.practice?[act('진행 중 문제풀이 이어하기',()=>c.resumePractice())]:[]),act(`오답·헷갈린 문제 ${wrong.length}문항`,()=>c.beginPractice(wrong,'review'),undefined,false,!wrong.length),act('종합 연습 72문항',()=>c.beginPractice(Object.values(c.content.questions).filter(q=>q.pool==='mixed').map(q=>q.id))),...tb.chapters.map(ch=>{const qs=Object.values(c.content.questions).filter(q=>q.chapterId===ch.id&&q.pool==='chapter');return act(`${ch.number}. ${ch.title} · ${qs.length}문항`,()=>c.beginPractice(qs.map(q=>q.id)),undefined,false,!qs.length);})];
 }
 else if(r==='practice'){
  const ps=s.practice,q=ps&&c.content.questions[ps.questionIds[ps.index]];title='문제풀이';if(ps&&q&&canStudyQuestion(s,q))body=[small(`${ps.index+1} / ${ps.questionIds.length}`),h(q.stem),...blocks(q.blocks??[],q.id),...q.options.map(o=>({...act(`${o.id}. ${o.text}`,()=>c.selectPractice(o.id),`option-${o.id}`,ps.selected===o.id,ps.submitted),role:'radio' as const,checked:ps.selected===o.id})),act(ps.uncertain?'헷갈림 표시됨':'헷갈리는 문제로 표시',()=>c.uncertain(),'uncertain',ps.uncertain,ps.submitted),
   ...(ps.submitted?[card([h(ps.selected===q.answer?'정답입니다':'다시 확인해 보세요'),...(q.pool==='mock'?mockExplanation(c,q,mockUi):[t(`정답 ${q.answer}번`),t(q.explanation),...q.options.map(o=>t(`${o.id}. ${q.optionExplanations[o.id]}`)),...q.lessonIds.map(id=>act('관련 개념 읽기',go('lesson',id)))])]),act(ps.index+1===ps.questionIds.length?'결과 보기':'다음 문제',()=>c.nextPractice(),'next-question')]:[act('답안 확인',()=>c.answerPractice(),'submit-question',false,!ps.selected)])];
 }
 else if(r==='practiceResult'){
  const result=c.practiceResult();title='풀이 결과';if(result)body=[h(`${result.correct} / ${result.total}문항 정답`),t(`헷갈린 문제 ${result.uncertain}문항`),act('오답·헷갈린 문제 다시 풀기',()=>c.beginRelatedReview(result.id),undefined,false,!result.wrongQuestionIds.length&&!result.uncertainQuestionIds.length),...result.lessonIds.map(sectionLink),act('홈으로',()=>c.returnPracticeHome())];
 }
 else if(r==='stats'||r==='calendar'||r==='examHistory'){
  title='학습 기록';body=[h('학습 현황'),card([t(`읽음 ${m.read} / ${m.sections}절`),t(`풀어본 문제 ${m.attempted} / ${m.questions}문항`),t(`최근 답안 기준 정답률 ${m.accuracy===null?'—':m.accuracy+'%'}`),small('읽음은 직접 완료한 절 수, 풀어본 문제는 중복을 제외한 수입니다. 정답률은 각 문제의 마지막 답안으로 계산합니다.')]),...tb.parts.map(part=>{const ids=tb.chapters.filter(ch=>part.chapterIds.includes(ch.id)).flatMap(ch=>ch.sectionIds);const read=ids.filter(id=>s.readLessons.includes(id)).length;return card([h(part.title),t(`${read} / ${ids.length}절 읽음`),progress(read/ids.length,p.blue)]);}),act('모의고사 응시 기록 · 모드별 통계',go('examHistory')),h('최근 일반 연습'),...(s.practiceResults??[]).filter(v=>v.questionIds.every(id=>!c.content.questions[id]?.examId)).slice(-10).reverse().map(v=>act(`${new Date(v.completedAt).toLocaleDateString('ko-KR')} · ${v.correct}/${v.total} 정답`,go('practiceResult',v.id))),act('설정',go('settings'))];
 }
 else if(r==='glossary'){
  title='용어 사전';const term=c.search.trim().toLowerCase();const terms=tb.glossary.filter(g=>!term||[g.term,g.english,g.definition].join(' ').toLowerCase().includes(term));
  const limit=c.reviewLimit;body=[{kind:'input',label:'용어 검색',placeholder:'용어 검색',value:c.search,onChange:v=>{c.reviewLimit=20;c.setSearch(v);},style:{padding:14,minHeight:52,backgroundColor:p.surface}},small(`${terms.length}개 용어`),...terms.slice(0,limit).map(g=>card([h(g.term),small(g.english),t(g.definition),act('교재에서 읽기',go('lesson',g.sectionId))],g.id)),...(terms.length>limit?[act('더 보기',()=>c.showMoreReviews())]:[])];
 }
 else if(r==='flashcards'){
  title='핵심 카드';const index=c.route.index??0,f=tb.flashcards[index];body=[small(`${index+1} / ${tb.flashcards.length} · 알고 있는 카드 ${s.knownCards?.length??0}개`),card([h(f.prompt),act(c.expanded.has(f.id)?'답 접기':'답 확인',()=>c.toggleExpanded(f.id),'flip-card'),...(c.expanded.has(f.id)?[t(f.answer),act('관련 개념',go('lesson',f.sectionId)),act((s.knownCards??[]).includes(f.id)?'알고 있음 · 해제':'알고 있는 카드로 표시',()=>c.toggleKnownCard(f.id),'known-card',(s.knownCards??[]).includes(f.id))]:[])]),act('이전 카드',()=>{c.route={name:'flashcards',index:(index+tb.flashcards.length-1)%tb.flashcards.length};c.notify();}),act('다음 카드',()=>{c.route={name:'flashcards',index:(index+1)%tb.flashcards.length};c.notify();})];
 }
 else if(r==='sources'){
  title='출처와 범위';const lesson=c.content.lessons.find(l=>l.id===c.route.id);const ids=lesson?.sourceIds??Object.keys(c.content.sources);body=[h(lesson?lesson.title:'교재 출처'),small('원문 편집 주석 · 교재 내 단일 모의고사 대신 별도 제작한 20회를 제공합니다.'),t(tb.editorialNote),small('공식 출제 범위의 확인 상태와 저자 제공 출처를 구분합니다. 이 화면은 공식 검수나 제휴를 의미하지 않습니다.'),...ids.map(id=>{const source=c.content.sources[id];return card([t(source.title),small(source.provider||id),act('출처 열기',()=>c.services.openURL(source.url))],id);}),...(lesson?[]:[h('교재 학습 범위'),...tb.coverage.map((v,i)=>card([act(v.topic,()=>c.toggleExpanded('coverage'+i)),...(c.expanded.has('coverage'+i)?v.sections.map(sectionLink):[])]))])];
 }
 else if(r==='privacy')body=[h('개인정보와 기기 저장'),t('진도, 답안, 복습 기록, 카드 상태는 이 기기에 저장합니다. 회원가입, 학습 서버, 클라우드 동기화는 제공하지 않습니다.'),t('앱 삭제·전체 데이터 삭제·기기 변경 시 로컬 기록과 이용 권한은 복원할 수 없습니다.'),t(c.ads.mode==='off'?'현재 빌드는 광고를 요청하지 않습니다.':'광고 활성화 시 Google 광고 SDK가 기기·네트워크·광고 상호작용 정보를 처리할 수 있습니다. 답안과 진도는 광고 타기팅에 전송하지 않습니다. 비개인화 광고도 정보 처리가 있을 수 있습니다.'),...(c.ads.mode==='off'?[]:[act('광고 개인정보 선택',()=>c.openAdPrivacy())]),...(c.services.privacyUrl?[act('개인정보처리방침',()=>c.services.openURL(c.services.privacyUrl!))]:[])];
 else if(r==='help'||r==='report'||r==='notices')body=[h('교재 이용 안내'),t('목차에서 절을 읽고 읽음 완료를 표시하세요. 확인 문제의 답안을 제출하면 각 보기의 해설을 볼 수 있습니다.'),t(tb.labNote),t('체험 도구는 정해진 예제를 비교하는 학습 도구입니다. 실제 DBMS에 SQL을 실행하지 않습니다.'),act('교재 출처와 학습 범위',go('sources')),...(c.services.supportUrl?[act('고객지원',()=>c.services.openURL(c.services.supportUrl!))]:[])];
 else body=[h('새 교재 학습'),t('교재와 실전 탭에서 학습을 이어가세요.'),act('교재 목차',go('catalog'))];
 if(c.needsRewardSave)body.unshift(act('시청 완료 보상 저장 재시도',()=>c.retryRewardSave()));
 if(c.notice)body.unshift({...t(c.notice),alert:true});
 if(s.textbookMigration?.noticePending&&c.ready)body.unshift(card([h('새 교재로 전환했습니다'),t('이전 교재의 진도·저장 목록·풀이·모의고사 기록을 정리했습니다. 학습 설정·알림 설정과 기존 이용 권한은 유지됩니다.'),act('확인',()=>c.dismissTextbookMigration(),'dismiss-migration')]));
 const reading=r==='lesson'?c.content.lessons.find(l=>l.id===c.route.id):undefined;
 const scroll:Node={...box(body,{gap:18,paddingVertical:20},`${r}:${c.route.id??''}:${r==='practice'?s.practice?.index??0:['exam','result','examReview'].includes(r)?(r==='exam'?c.activeExam()?.index:c.route.index)??0:''}`),scroll:true,contentWidth:reading?'reading':undefined,...(reading?{reading:{position:c.readingPosition(reading.id),onSave:pos=>c.rememberReading(reading.id,pos)}}:{})};
 const activeRoute=['exams','examIntro','exam','sheet','result','examReview','mockReview','mockSaved','mockQuestion','mockSources'].includes(r)?'exams':r==='examHistory'?'stats':['chapter','lesson','lessonSummary','glossary','flashcards','sources'].includes(r)?'catalog':['practice','practiceSetup','practiceResult'].includes(r)?'review':['settings','appearance','privacy','help','report'].includes(r)?'stats':r;
 const nav:Node[]=c.ready&&s.onboarded?[row(([['홈','today','home','home'],['교재','learn','catalog','book'],['문제','review','review','list'],['실전','exams','exams','timer'],['기록','records','stats','chart']] as const).map(([label,tab,route,icon])=>button(label,()=>{c.search='';c.tab(tab);},{flex:1,color:activeRoute===route?p.blue:p.muted,minHeight:52,fontSize:13},{role:'tab',disabled:c.rewardBusy,icon,iconPosition:'above',selected:activeRoute===route,testId:`tab-${tab}`})),{backgroundColor:p.surface,borderTopWidth:1,borderColor:p.line})]:[];
 const root=box([row([...(c.stack.length?[act('뒤로',()=>c.back())]:[]),text(title,{fontSize:18,fontWeight:'700',color:p.ink,flex:1}),...(s.onboarded?[act('설정',go('settings'))]:[])],{padding:12,backgroundColor:p.surface}),scroll,...(c.showBanner?[box([],{},'monetization-banner')]:[]),...nav],{flex:1,backgroundColor:p.bg});
 if(c.dialog)root.children!.push({kind:'modal',close:()=>c.cancelDialog(),children:[card([h(c.dialog.title),t(c.dialog.body),act(c.dialog.confirmLabel,()=>c.acceptDialog()),act('취소',()=>c.cancelDialog())])]});
 return root;
}
