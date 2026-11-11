import type {MonetizedController} from '../monetization/controller';
import type {Question,Route} from '../core/types';
import type {ContentBlock} from '../textbook/types';
import {box,row,adaptiveRow,segments,table,dark,light,type Node} from '../ui/nodes';
import {canStudyQuestion,formatTime,isExamPaused,publicQuestion} from '../core/domain/exam';
import {questionPrompt,answerSummary} from '../ui/learning-content';
import {latestMocks,mockStats,mockWrongQuestions,modeName,pauseUsage} from './domain';
import {REWARD_ACTION,REWARD_DISCLOSURE,REWARD_AGE_DISCLOSURE,REWARD_STORAGE_DISCLOSURE} from '../monetization/policy';
interface UI{
 t:(s:string)=>Node;small:(s:string)=>Node;h:(s:string)=>Node;card:(ns:Node[],key?:string)=>Node;
 act:(s:string,fn:()=>void|Promise<void>,id?:string,selected?:boolean,disabled?:boolean)=>Node;
 primary:(s:string,fn:()=>void|Promise<void>,id?:string,disabled?:boolean)=>Node;
 link:(s:string,fn:()=>void|Promise<void>,id?:string)=>Node;
 choice:(s:string,fn:()=>void|Promise<void>,id:string,selected:boolean,disabled?:boolean,feedback?:'correct'|'incorrect')=>Node;
 go:(route:Route['name'],id?:string)=>()=>void;blocks:(bs:ContentBlock[],key:string)=>Node[];
}
/** Only called for an eligible submitted snapshot or a checked post-submit review. */
export function mockExplanation(c:MonetizedController,q:Question,u:UI,includeSummary=true):Node[]{
 const {t,small,h,act,go,blocks,card}=u;
 if(!canStudyQuestion(c.state,q))return [t('진행 중인 회차를 제출한 뒤 해설을 볼 수 있습니다.')];
 return [...(includeSummary?[h(`정답 ${q.answer}번`),t(q.explanation)]:[]),...(q.result?[table(q.result.headers,q.result.rows,'계산 결과 전체')]:[]),...blocks(q.explanationBlocks??[],q.id+':explanation'),h('보기별 판단 근거'),...q.options.map(o=>box([small(`${o.id}번 · ${o.id===q.answer?'정답':'오답'}`),t(q.optionExplanations[o.id])],{gap:6,paddingVertical:8})),...q.lessonIds.map(id=>u.link(`관련 교재 읽기\n${c.content.lessons.find(l=>l.id===id)?.title??''}`,go('lesson',id),'mock-theory')),
 segments([act(c.state.mockStudy?.bookmarks.includes(q.id)?'저장됨 · 해제':'문항 저장',()=>c.bookmarkMock(q.id),'save-mock-question',c.state.mockStudy?.bookmarks.includes(q.id)),act('오답 메모'+((c.state.mockStudy?.notes[q.id]||c.mockNoteDrafts[q.id])?' · 작성됨':''),()=>c.toggleExpanded('note:'+q.id),'toggle-mock-note')]),
 ...(c.expanded.has('note:'+q.id)?[small('메모 저장을 눌러야 기기에 남습니다. 저장 전 앱을 종료하면 작성 내용이 사라질 수 있습니다.'),{kind:'input' as const,key:'note:'+q.id,testId:'mock-note',label:'오답 메모',placeholder:'놓친 조건과 반례를 적어 보세요.',multiline:true,value:c.mockNoteDrafts[q.id]??c.state.mockStudy?.notes[q.id]??'',onChange:(v:string)=>{c.mockNoteDrafts[q.id]=v.slice(0,10000);c.notify();},style:{minHeight:120,padding:12,borderWidth:1,borderColor:'#64718A',borderRadius:12,fontSize:16}},
 act('메모 저장',async()=>{await c.saveMockNote(q.id,c.mockNoteDrafts[q.id]??c.state.mockStudy?.notes[q.id]??'');},'save-mock-note')]:[]),
 act('근거 자료·검산 방식',()=>c.toggleExpanded('source:'+q.id),'mock-evidence'),...(c.expanded.has('source:'+q.id)?[small('아래 내용은 원문 작성자의 검산 기록이며 앱 이관 과정의 재검증을 의미하지 않습니다.'),t(String(q.validation?.method??'자체 검토')),t(String(q.validation?.note??'원문에 포함된 의미 모델 및 검산 데이터 참조')),...q.sourceIds.map(id=>{const source=c.content.sources[id];return act(source.title,()=>c.external(source.url));})]:[])];
}
export function renderMockScreen(c:MonetizedController,u:UI):{title:string;body:Node[];header?:Node[];footer?:Node[];focus?:boolean}|undefined{
 if(!c.content.mockPack)return;
 const {t,small,h,act,primary,link,choice,go,blocks,card}=u,s=c.state,r=c.route,active=c.activeExam(),pack=c.content.mockPack,p=c.isDark?dark:light;
 const intro=(id:string)=>go('examIntro',id);
 const rewardInfo=(details=false)=>[small(REWARD_DISCLOSURE),small(REWARD_AGE_DISCLOSURE),...(details?[small(REWARD_STORAGE_DISCLOSURE),small('광고 클릭·설치·추적 허용은 필요 없습니다.')]:[]),...(c.ads.mode==='test'?[small('테스트 광고 · 운영 버전으로 해제 이전 안 됨')]:[])];
 if(r.name==='exams')return {title:'실전',body:[h('모의고사 20회'),small('회차당 50문항 · 실전 90분 / 학습 시간 제한 없음'),
 ...(active?[card([h(isExamPaused(active)?'일시정지한 모의고사':'진행 중인 모의고사'),t(`${active.title} · ${modeName(active.mode)}`),primary('모의고사 이어하기',go('exam',active.id),'resume-mock')])]:[]),
 small(c.isLaunchFree?'이 버전에서는 모든 회차를 무료로 이용할 수 있습니다.':c.ads.mode==='off'?'1~4회와 이미 열린 회차를 이용할 수 있습니다. 추가 회차 광고 해제는 현재 제공하지 않습니다.':'1~4회는 무료입니다. 5~20회는 회차별 선택 광고 1회 완료 후 두 모드를 계속 이용합니다.'),
 segments([act('오답 복습',go('mockReview'),'mock-wrong'),act('저장 문항',go('mockSaved'),'mock-saved'),act('응시 기록',go('examHistory'),'mock-history')]),
 segments((['all','unattempted','completed'] as const).map((f,i)=>act(['전체','미응시','응시 완료'][i],()=>c.setExamProgressFilter(f),'exam-filter-'+f,c.examProgressFilter===f))),
 ...c.content.exams.filter(e=>c.examProgressFilter==='all'||(s.exams.some(a=>a.examId===e.id&&a.status==='submitted')===(c.examProgressFilter==='completed'))).map(e=>{
   const open=c.hasAccess(e.id),history=(['timed','study'] as const).map(mode=>{const a=latestMocks(s,mode).find(a=>a.examId===e.id);return a?` · ${modeName(mode)} ${a.score?.points??0}점`:'';}).join('');
   if(open||c.ads.mode==='off')return link(`${e.title}\n${active?.examId===e.id?(isExamPaused(active)?'일시정지 · 이어하기':'진행 중'):open?(e.order<=4?'무료 · 이용 가능':'열림 · 재시청 없음'):'현재 잠김'}${history}`,intro(e.id),'mock-'+e.id);
   return card([h(e.title),...rewardInfo(),primary(REWARD_ACTION,()=>c.watchAdToUnlock(e.id),'mock-'+e.id,!!active||c.rewardBusy),link('광고·저장 안내',intro(e.id),'reward-info-'+e.id)],'reward-'+e.id);
 }),act('모의고사 출처와 기준',go('mockSources'))]};
 if(r.name==='examIntro'){
  const e=c.content.exams.find(e=>e.id===r.id);if(!e)return {title:'실전',body:[t('회차를 찾을 수 없습니다.')]};
  const mode=c.expanded.has('intro:study')?'study':'timed';
  return {title:'응시 안내',body:[h(e.title),small('50문항 · 1과목 10문항 / 2과목 40문항'),
   segments([act('실전 · 90분',()=>{c.expanded.delete('intro:study');c.notify();},'mode-timed',mode==='timed'),act('학습 · 무제한',()=>{c.expanded.add('intro:study');c.notify();},'mode-study',mode==='study')]),
   card([t(mode==='timed'?'풀이 시간은 총 90분입니다. 일시정지하거나 앱을 벗어나면 남은 시간을 저장합니다.':'시간 제한 없이 풀어보세요. 중단한 문항과 답안을 저장합니다.'),small('돌아오면 이어서 풀기를 눌러 재개합니다. 일시정지 이력은 결과에 표시됩니다.'),small('두 모드 모두 최종 제출 후 정답과 해설을 확인합니다.'),small('미응답은 0점입니다. 제출한 답안은 변경할 수 없습니다.')]),
   act('응시 기준 자세히',()=>c.toggleExpanded('intro:rules'),'exam-rules',c.expanded.has('intro:rules')),
   ...(c.expanded.has('intro:rules')?[t('문항당 2점. 총점 60점 이상, 1과목 4문항·2과목 16문항 이상 정답을 연습 기준으로 사용합니다. 실제 시험의 합격을 보장하지 않습니다.'),...pack.assumptions.map(small)]:[])],
   footer:active?[primary('진행 중 모의고사 이어하기',go('exam',active.id),'resume-mock')]:c.hasAccess(e.id)?[primary(mode==='timed'?'실전 모드 시작 · 90분':'학습 모드 시작',()=>c.beginExam(e.id,mode),mode==='timed'?'start-mock-timed':'start-mock-study')]:[...rewardInfo(true),primary(REWARD_ACTION,()=>c.watchAdToUnlock(e.id),'unlock-mock',c.rewardBusy||c.ads.mode==='off')]};
 }
 if(r.name==='examPause'||(['exam','sheet'].includes(r.name)&&active&&isExamPaused(active))){
  const e=c.examAttempt(r.id);if(!e||e.status!=='active')return {title:'일시정지',body:[t('진행 중인 모의고사가 없습니다.'),link('회차 목록',go('exams'))]};
  const pending=c.isExamPausePending;
  return {title:'일시정지',focus:true,body:[small(e.title),h(pending?'일시정지 저장 확인이 필요합니다':'잠시 쉬어도 괜찮아요'),t(pending?'앱을 닫기 전에 저장을 다시 시도해 주세요.':e.mode==='study'?'문항 위치와 답안을 저장했습니다.':'답안과 남은 시간을 저장했습니다. 쉬는 동안 시간은 줄어들지 않습니다.'),card([small(e.mode==='study'?'학습 모드 · 시간 제한 없음':'남은 풀이 시간'),h(e.mode==='study'?`${e.index+1}번부터 이어서`:formatTime(c.remaining())),t(`응답 ${Object.keys(e.answers).length} · 미응답 ${50-Object.keys(e.answers).length}`)]),small('진행 중인 회차를 제출하면 다른 모의고사를 시작할 수 있습니다.')],footer:pending?[primary('일시정지 저장 다시 시도',async()=>{await c.pauseExam();},'retry-pause')]:[primary('이어서 풀기',async()=>{await c.resumeExam();},'resume-paused-mock'),segments([act('홈으로',()=>c.tab('today'),'pause-home'),act('여기까지 제출',()=>c.requestSubmit(),'pause-submit')])]};
 }
 if(r.name==='exam'||r.name==='sheet'){
  const e=c.examAttempt(r.id);if(!e||e.status!=='active')return {title:'실전',body:[t('진행 중인 응시를 찾을 수 없습니다.'),link('회차 목록',go('exams'))]};
  const q=publicQuestion(e.snapshots[e.index]);
  const header=[row([small(`${e.index+1} / 50 · ${q.subject==='S1'?'1과목':'2과목'}`),...(r.name==='exam'?[act(e.flagged.includes(q.id)?'★ 검토':'검토',()=>c.flagExam(),'flag-mock',e.flagged.includes(q.id))]:[]),box([],{flex:1}),t(e.mode==='study'?'시간 제한 없음':formatTime(c.remaining()))],{flexWrap:'wrap',gap:8})];
  if(r.name==='sheet'){
   const visible=e.snapshots.map((q,i)=>({q,i})).filter(({q})=>c.examSheetFilter==='unanswered'?!e.answers[q.id]:c.examSheetFilter==='flagged'?e.flagged.includes(q.id):true);
   return {title:'전체 답안표',focus:true,header,body:[segments((['all','unanswered','flagged'] as const).map((f,i)=>act([`전체 50`,`미응답 ${50-Object.keys(e.answers).length}`,`검토 ${e.flagged.length}`][i],()=>{c.examSheetFilter=f;c.notify();},'sheet-filter-'+f,c.examSheetFilter===f))),small(`○ 미응답 / ✓ 응답 / ★ 검토 · ${visible.length}문항`),{...box(visible.map(({q,i})=>({...act(String(i+1),()=>c.moveExam(i),'mock-sheet-'+(i+1),i===e.index),subtitle:`${e.answers[q.id]?'✓':'○'}${e.flagged.includes(q.id)?' ★':''}`,style:{...act('',()=>{},undefined,i===e.index).style,paddingHorizontal:2,paddingVertical:6,minHeight:56,fontSize:14,borderWidth:1,borderColor:p.line},label:`${i+1}번, ${e.answers[q.id]?'응답':'미응답'}${e.flagged.includes(q.id)?', 검토 표시':''}`}))),layout:'question-grid'},...(!visible.length?[t('이 조건에 해당하는 문항이 없습니다.'),act('전체 문항 보기',()=>{c.examSheetFilter='all';c.notify();})]:[])],footer:[segments([act('문제로 돌아가기',go('exam',e.id),'back-to-mock'),primary('최종 제출',()=>c.requestSubmit(),'submit-mock')])]};
  }
  return {title:`제${e.examId.replace('SQLD-M','')}회 · ${e.mode==='study'?'학습':'실전'}`,focus:true,header,body:[questionPrompt(q.stem,p),...blocks(q.blocks??[],q.id),...q.options.map(o=>choice(`${o.id}. ${o.text}`,()=>c.updateExamAnswer(o.id),'mock-option-'+o.id,e.answers[q.id]===o.id,c.isExamSubmitting)),...(e.answers[q.id]?[act('선택한 답 지우기',()=>c.updateExamAnswer(null),'clear-mock-answer')]:[])],footer:[row([act('이전',()=>c.moveExam(e.index-1),'mock-previous',false,e.index===0),act('답안표',go('sheet',e.id),'mock-sheet'),primary(e.index===49?'최종 제출':'다음',()=>e.index===49?c.requestSubmit():c.moveExam(e.index+1),e.index===49?'submit-mock':'mock-next')],{justifyContent:'space-between',flexWrap:'wrap'})]};
 }
 if(r.name==='result'||r.name==='examReview'){
  const e=c.examAttempt(r.id);if(!e||e.status!=='submitted'||!e.score)return {title:'응시 결과',body:[t('제출된 결과를 찾을 수 없습니다.')]};
  const g=e.score,locked=active?.examId===e.examId;
  const ids=e.snapshots.map((q,i)=>({q,i})).filter(({q})=>c.mockResultFilter==='wrong'?e.answers[q.id]!==q.answer:c.mockResultFilter==='flagged'?e.flagged.includes(q.id):true);
  const current=ids.find(x=>x.i===r.index)??ids[0];const pos=current?ids.indexOf(current):-1;
  const move=(i:number)=>{if(!ids[i])return;c.route={name:'examReview',id:e.id,index:ids[i].i};c.reviewPickerOpen=false;c.notify();};
  if(r.name==='result')return {title:'응시 결과',body:[small(`${e.title} · ${modeName(e.mode)}`),h(`${g.points} / 100점`),t(g.practiceThresholdMet?'연습 기준 충족':'연습 기준 미충족'),small(new Date(e.submittedAt!).toLocaleDateString('ko-KR')),small(pauseUsage(e)),
    card([t(`1과목 ${g.bySubject.S1.correct}/10 · 2과목 ${g.bySubject.S2.correct}/40`),t(`정답 ${g.correct} · 오답 ${g.total-g.correct-g.unanswered} · 미응답 ${g.unanswered}`),small('50문항 · 문항당 2점 · 미응답 0점')]),
    ...(!e.timeTrusted&&e.mode!=='study'?[small('응시 중 시계 연속성을 확인하지 못한 구간이 있습니다.')]:[]),
    ...(locked?[t('같은 회차를 응시 중이므로 해설은 제출 후 다시 볼 수 있습니다.'),primary('진행 중 모의고사',go('exam',active!.id))]:[primary('오답·미응답 복습',()=>{c.mockResultFilter='wrong';c.navigate({name:'examReview',id:e.id});},'review-wrong',g.points===100),link('전체 해설 보기',()=>{c.mockResultFilter='all';c.navigate({name:'examReview',id:e.id});},'review-all')]),link('회차 목록',go('exams'))]};
  if(locked)return {title:'문항 해설',body:[t('같은 회차를 제출한 뒤 해설을 볼 수 있습니다.'),primary('진행 중 모의고사',go('exam',active!.id))]};
  return {title:'문항 해설',header:[segments((['all','wrong','flagged'] as const).map((f,i)=>act(['전체','오답·미응답','검토'][i],()=>{c.mockResultFilter=f;c.route={...r,index:undefined};c.notify();},'mock-result-'+f,c.mockResultFilter===f)))],body:[row([small(current?`문항 ${current.i+1} · ${pos+1}/${ids.length}`:'해설'),box([],{flex:1}),act('결과 요약',()=>c.returnToExamResult(),'result-summary')]),
   ...(current?[answerSummary(e.answers[current.q.id],current.q.answer,p),h('해설'),t(current.q.explanation),{...link('문제와 제출한 답안',()=>c.toggleExpanded('original:'+e.id+':'+current.q.id),'review-original'),expanded:c.expanded.has('original:'+e.id+':'+current.q.id)},...(c.expanded.has('original:'+e.id+':'+current.q.id)?[questionPrompt(current.q.stem,p),...blocks(current.q.blocks??[],current.q.id),...current.q.options.map(o=>choice(`${o.id}. ${o.text}${o.id===current.q.answer?' · 정답':''}${e.answers[current.q.id]===o.id?' · 내 답':''}`,()=>{},'explanation-option-'+o.id,e.answers[current.q.id]===o.id,true,o.id===current.q.answer?'correct':e.answers[current.q.id]===o.id?'incorrect':undefined))]:[]),...mockExplanation(c,current.q,u,false)]:[t('이 조건에 해당하는 문항이 없습니다.'),link('전체 해설 보기',()=>{c.mockResultFilter='all';c.notify();})]),
   ...(c.reviewPickerOpen?[{kind:'modal' as const,close:()=>{c.reviewPickerOpen=false;c.notify();},children:[card([row([h('문항 선택'),box([],{flex:1}),act('닫기',()=>{c.reviewPickerOpen=false;c.notify();})]),{...box(ids.map(({q,i},j)=>({...act(String(i+1),()=>move(j),'review-jump-'+(i+1),i===current?.i),subtitle:e.answers[q.id]===q.answer?'✓':'○',style:{...act('',()=>{},undefined,i===current?.i).style,paddingHorizontal:2,paddingVertical:6,minHeight:56,fontSize:14},label:`${i+1}번, ${e.answers[q.id]===q.answer?'정답':e.answers[q.id]?'오답':'미응답'}`}))),layout:'question-grid' as const},act('닫기',()=>{c.reviewPickerOpen=false;c.notify();})])]}]:[])],
   footer:[row([act('이전',()=>move(pos-1),'mock-review-previous',false,pos<=0),act('문항 선택',()=>{c.reviewPickerOpen=!c.reviewPickerOpen;c.notify();},'review-picker'),primary('다음',()=>move(pos+1),'mock-review-next',pos<0||pos>=ids.length-1)],{justifyContent:'space-between',flexWrap:'wrap'})]};
 }
 if(r.name==='examHistory')return {title:'모의고사 기록',body:[h('응시 기록'),...(!s.exams.some(e=>e.status==='submitted')?[t('아직 제출한 모의고사가 없습니다.'),primary('첫 모의고사 시작',go('exams'),'history-start')]:[]),...(['timed','study'] as const).map(mode=>{const m=mockStats(s,mode);return card([h(modeName(mode)),t(`응시한 회차 ${m.completed}/20 · 최근 회차별 평균 ${m.average===null?'—':m.average+'점'}`),small('각 회차의 가장 최근 제출 결과를 집계합니다. 일시정지 사용 결과도 포함합니다.'),small(`연습 기준 충족 ${m.met}회차`)]);}),...([...s.exams].reverse().filter(e=>e.status==='submitted').slice(0,c.mockHistoryLimit).map(e=>link(`${e.title} · ${modeName(e.mode)} · ${e.score?.points??0}점\n${new Date(e.submittedAt!).toLocaleString('ko-KR')} · ${pauseUsage(e)}`,()=>{c.mockResultFilter='all';c.navigate({name:'result',id:e.id});}))),...(s.exams.filter(e=>e.status==='submitted').length>c.mockHistoryLimit?[act('기록 더 보기',()=>{c.mockHistoryLimit+=20;c.notify();})]:[])]};
 if(r.name==='mockReview'||r.name==='mockSaved'){
  const all=r.name==='mockSaved'?(s.mockStudy?.bookmarks??[]).flatMap(id=>{const q=c.getQuestion(id);return q&&canStudyQuestion(s,q)?[q]:[];}):mockWrongQuestions(s);
  const term=c.mockSearch.toLocaleLowerCase();const qs=all.filter(q=>(!c.mockTopicFilter||q.conceptId===c.mockTopicFilter)&&[q.stem,q.topic,JSON.stringify(q.blocks)].join(' ').toLocaleLowerCase().includes(term));
  return {title:r.name==='mockSaved'?'저장한 문항':'모의고사 복습',body:[h(r.name==='mockSaved'?'저장한 문항':'오답·미응답 복습'),small(r.name==='mockSaved'?'제출한 회차에서 저장한 문항입니다. 같은 회차 응시 중에는 해설이 숨겨집니다.':'회차별 최근 제출을 기준으로 합니다. 복습 정답은 당시 시험 점수를 바꾸지 않습니다.'),...(all.length?[{kind:'input' as const,testId:'mock-review-search',clearable:true,label:'모의고사 복습 검색',value:c.mockSearch,onChange:(v:string)=>{c.mockSearch=v;c.mockListLimit=20;c.notify();},placeholder:'주제 · 지문 · SQL 검색',style:{minHeight:52,padding:12}},act('주제 선택',()=>c.toggleExpanded('mock-topics')),...(c.expanded.has('mock-topics')?[act('모든 주제',()=>{c.mockTopicFilter='';c.notify();}),...pack.topics.filter(topic=>all.some(q=>q.conceptId===topic.id)).map(topic=>act(topic.title,()=>{c.mockTopicFilter=topic.id;c.mockListLimit=20;c.expanded.delete('mock-topics');c.notify();},undefined,c.mockTopicFilter===topic.id))]:[]),small(`${qs.length}문항`)]:[]),...(!qs.length?[card([h(all.length?'검색 결과가 없습니다':r.name==='mockSaved'?'아직 저장한 문항이 없습니다':'복습할 문항이 없습니다'),t(all.length?'검색어나 주제 필터를 바꿔보세요.':r.name==='mockSaved'?'제출 후 해설에서 문항을 저장할 수 있습니다. 같은 회차 응시 중에는 저장 문항이 잠시 숨겨집니다.':'모의고사를 제출하면 오답과 미응답을 모아볼 수 있습니다.'),link(all.length?'검색 조건 초기화':'모의고사 보기',all.length?()=>{c.mockSearch='';c.mockTopicFilter='';c.notify();}:go('exams'))])]:[]),...qs.slice(0,c.mockListLimit).map(q=>link(`${q.topic}\n${q.examId?.replace('SQLD-M','제')}회 · ${q.number}번 · ${q.stem}`,go('mockQuestion',q.id),'review-question-'+q.id)),...(qs.length>c.mockListLimit?[act('더 보기',()=>{c.mockListLimit+=20;c.notify();})]:[])]};
 }
 if(r.name==='mockQuestion'){const q=r.id?c.getQuestion(r.id):undefined;return {title:'문항 해설',body:q&&canStudyQuestion(s,q)?[small(`${q.examId?.replace('SQLD-M','제')}회 · ${q.number}번 · ${q.topic}`),primary('다시 풀기',()=>c.beginPractice([q.id],'review'),'retry-'+q.id),h(`정답 ${q.answer}번`),t(q.explanation),{...link('문제와 보기',()=>c.toggleExpanded('original:saved:'+q.id),'review-original'),expanded:c.expanded.has('original:saved:'+q.id)},...(c.expanded.has('original:saved:'+q.id)?[questionPrompt(q.stem,p),...blocks(q.blocks??[],q.id),...q.options.map(o=>choice(`${o.id}. ${o.text}${o.id===q.answer?' · 정답':''}`,()=>{},'explanation-option-'+o.id,false,true,o.id===q.answer?'correct':undefined))]:[]),...mockExplanation(c,q,u,false)]:[t('제출한 회차의 문항만 열 수 있습니다. 같은 회차를 진행 중이면 제출 후 다시 확인하세요.')]};}
 if(r.name==='mockSources')return {title:'모의고사 출처',body:[h('출처와 검산 안내'),t(pack.editorialNote),...pack.assumptions.map(t),small('원문 작성자의 검산 기록을 보존했습니다. 실제 시험과의 통계적 동등성이나 외부 전문가 검수를 의미하지 않습니다.'),...Object.entries(c.content.sources).filter(([id])=>id.startsWith('ME20261109:')).map(([id,v])=>act(v.title,()=>c.external(v.url),id))]};
 return;
}
