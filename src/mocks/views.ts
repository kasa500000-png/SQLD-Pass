import type {MonetizedController} from '../monetization/controller';
import type {Question,Route} from '../core/types';
import type {ContentBlock} from '../textbook/types';
import {box,row,table,type Node} from '../ui/nodes';
import {canStudyQuestion,formatTime,publicQuestion} from '../core/domain/exam';
import {latestMocks,mockStats,mockWrongQuestions,modeName} from './domain';
interface UI{
 t:(s:string)=>Node;small:(s:string)=>Node;h:(s:string)=>Node;card:(ns:Node[],key?:string)=>Node;
 act:(s:string,fn:()=>void|Promise<void>,id?:string,selected?:boolean,disabled?:boolean)=>Node;
 go:(route:Route['name'],id?:string)=>()=>void;blocks:(bs:ContentBlock[],key:string)=>Node[];
}
/** Only called for an eligible submitted snapshot or a checked post-submit review. */
export function mockExplanation(c:MonetizedController,q:Question,u:UI):Node[]{
 const {t,small,h,act,go,blocks,card}=u;
 if(!canStudyQuestion(c.state,q))return [t('진행 중인 회차를 제출한 뒤 해설을 볼 수 있습니다.')];
 return [h(`정답 ${q.answer}번`),t(q.explanation),...(q.result?[table(q.result.headers,q.result.rows,'계산 결과 전체')]:[]),...blocks(q.explanationBlocks??[],q.id+':explanation'),h('보기별 판단 근거'),...q.options.map(o=>card([small(`${o.id}번 · ${o.id===q.answer?'정답':'오답'}`),t(q.optionExplanations[o.id])])),...q.lessonIds.map(id=>act('관련 교재 읽기',go('lesson',id),'mock-theory')),
 act(c.state.mockStudy?.bookmarks.includes(q.id)?'저장됨 · 해제':'문항 저장',()=>c.bookmarkMock(q.id),'save-mock-question',c.state.mockStudy?.bookmarks.includes(q.id)),h('오답 메모'),
 {kind:'input',key:'note:'+q.id,testId:'mock-note',label:'오답 메모',placeholder:'놓친 조건과 반례를 적어 보세요.',multiline:true,value:c.mockNoteDrafts[q.id]??c.state.mockStudy?.notes[q.id]??'',onChange:v=>{c.mockNoteDrafts[q.id]=v.slice(0,10000);c.notify();},style:{minHeight:120,padding:12,borderWidth:1,borderColor:'#64718A',borderRadius:12,fontSize:16}},
 act('메모 저장',async()=>{await c.saveMockNote(q.id,c.mockNoteDrafts[q.id]??c.state.mockStudy?.notes[q.id]??'');},'save-mock-note'),
 act('근거 자료·검산 방식',()=>c.toggleExpanded('source:'+q.id),'mock-evidence'),...(c.expanded.has('source:'+q.id)?[small('아래 내용은 원문 작성자의 검산 기록이며 앱 이관 과정의 재검증을 의미하지 않습니다.'),t(String(q.validation?.method??'자체 검토')),t(String(q.validation?.note??'원문에 포함된 의미 모델 및 검산 데이터 참조')),...q.sourceIds.map(id=>{const source=c.content.sources[id];return act(source.title,()=>c.external(source.url));})]:[])];
}
export function renderMockScreen(c:MonetizedController,u:UI):{title:string;body:Node[]}|undefined{
 if(!c.content.mockPack)return;
 const {t,small,h,act,go,blocks,card}=u,s=c.state,r=c.route,active=c.activeExam(),pack=c.content.mockPack;
 const intro=(id:string)=>go('examIntro',id);
 if(r.name==='exams')return {title:'실전',body:[h('모의고사 20회'),small('회차당 50문항 · 실전 90분 / 학습 시간 제한 없음'),
 ...(active?[card([h('진행 중인 모의고사'),t(`${active.title} · ${modeName(active.mode)}`),act('모의고사 이어하기',go('exam',active.id),'resume-mock')])]:[]),
 t(c.isLaunchFree?'이 버전에서는 모든 회차를 무료로 이용할 수 있습니다.':c.ads.mode==='off'?'1~4회와 이미 열린 회차를 이용할 수 있습니다. 추가 회차 광고 해제는 현재 제공하지 않습니다.':'1~4회는 무료입니다. 5~20회는 회차별 선택 광고 1회 완료 후 두 모드를 계속 이용합니다.'),
 act('오답·미응답 복습',go('mockReview'),'mock-wrong'),act('저장한 문항',go('mockSaved'),'mock-saved'),act('응시 기록',go('examHistory'),'mock-history'),
 ...c.content.exams.map(e=>card([h(e.title),small(c.hasAccess(e.id)?'이용 가능 · 두 응시 모드 공통':'광고 시청 후 열림'),...(['timed','study'] as const).flatMap(mode=>{const a=latestMocks(s,mode).find(a=>a.examId===e.id);return a?[small(`${modeName(mode)} 최근 ${a.score?.points??0}점`)]:[];}),act(c.hasAccess(e.id)?'응시 안내':'회차 열기 안내',c.hasAccess(e.id)?intro(e.id):()=>c.offerUnlock(e.id),'mock-'+e.id)])),act('모의고사 출처와 기준',go('mockSources'))]};
 if(r.name==='examIntro'){
  const e=c.content.exams.find(e=>e.id===r.id);if(!e)return {title:'실전',body:[t('회차를 찾을 수 없습니다.')]};
  return {title:e.title,body:[h(e.title),t('1과목 10문항 · 2과목 40문항 · 문항당 2점'),t('최종 제출 후 정답과 모든 해설을 확인합니다. 미응답은 0점이며 제출한 답안은 수정할 수 없습니다.'),t('총점 60점 이상, 1과목 4문항·2과목 16문항 이상 정답을 연습 기준으로 사용합니다. 실제 시험의 합격을 보장하지 않습니다.'),...pack.assumptions.map(small),
 ...(active?[act(`${active.title} 이어하기`,go('exam',active.id),'resume-mock')]:c.hasAccess(e.id)?[act('실전 모드 시작 · 90분',()=>c.beginExam(e.id,'timed'),'start-mock-timed'),act('학습 모드 시작 · 시간 제한 없음',()=>c.beginExam(e.id,'study'),'start-mock-study')]:[act('광고 시청 안내',()=>c.offerUnlock(e.id),'unlock-mock')]) ]};
 }
 if(r.name==='exam'||r.name==='sheet'){
  const e=c.examAttempt(r.id);if(!e||e.status!=='active')return {title:'실전',body:[t('진행 중인 응시를 찾을 수 없습니다.'),act('회차 목록',go('exams'))]};
  const q=publicQuestion(e.snapshots[e.index]);
  const header=[small(`${e.title} · ${modeName(e.mode)}`),h(e.mode==='study'?'시간 제한 없음':formatTime(c.remaining())),small(`응답 ${Object.keys(e.answers).length}/50 · 검토 표시 ${e.flagged.length}개`)];
  if(r.name==='sheet')return {title:'전체 답안표',body:[...header,t('문항을 선택해 이동하세요. ○ 미응답 / ✓ 응답 / ★ 검토 표시'),box(e.snapshots.map((q,i)=>act(`${i+1} ${e.answers[q.id]?'✓':'○'}${e.flagged.includes(q.id)?' ★':''}`,()=>c.moveExam(i),'mock-sheet-'+(i+1),i===e.index)),{flexDirection:'row',flexWrap:'wrap',gap:8}),act('최종 제출',()=>c.requestSubmit(),'submit-mock')]};
  return {title:'모의고사',body:[...header,small(`${e.index+1} / 50 · ${q.subject==='S1'?'1과목':'2과목'}`),h(q.stem),...blocks(q.blocks??[],q.id),...q.options.map(o=>({...act(`${o.id}. ${o.text}`,()=>c.updateExamAnswer(o.id),'mock-option-'+o.id,e.answers[q.id]===o.id,c.isExamSubmitting),role:'radio' as const,checked:e.answers[q.id]===o.id})),act('답안 지우기',()=>c.updateExamAnswer(null),'clear-mock-answer'),act(e.flagged.includes(q.id)?'검토 표시됨':'검토 표시',()=>c.flagExam(),'flag-mock',e.flagged.includes(q.id)),row([act('이전',()=>c.moveExam(e.index-1),'mock-previous',false,e.index===0),act('다음',()=>c.moveExam(e.index+1),'mock-next',false,e.index===49)]),act('전체 답안표',go('sheet',e.id),'mock-sheet'),act('최종 제출',()=>c.requestSubmit(),'submit-mock')]};
 }
 if(r.name==='result'||r.name==='examReview'){
  const e=c.examAttempt(r.id);if(!e||e.status!=='submitted'||!e.score)return {title:'응시 결과',body:[t('제출된 결과를 찾을 수 없습니다.')]};
  const g=e.score,locked=active?.examId===e.examId;
  const ids=e.snapshots.map((q,i)=>({q,i})).filter(({q})=>c.mockResultFilter==='wrong'?e.answers[q.id]!==q.answer:c.mockResultFilter==='flagged'?e.flagged.includes(q.id):true);
  const current=ids.find(x=>x.i===r.index)??ids[0];const pos=current?ids.indexOf(current):-1;
  const move=(i:number)=>{c.route={name:'result',id:e.id,index:ids[i].i};c.notify();};
  return {title:'응시 결과',body:[h(`${e.title} · ${g.points}점`),small(`${modeName(e.mode)} · ${new Date(e.submittedAt!).toLocaleDateString('ko-KR')}`),t(g.practiceThresholdMet?'연습 기준 충족':'연습 기준 미충족'),t(`1과목 ${g.bySubject.S1.correct}/10 · 2과목 ${g.bySubject.S2.correct}/40 · 미응답 ${g.unanswered}문항`),...(!e.timeTrusted&&e.mode!=='study'?[small('응시 중 시계 연속성을 확인하지 못한 구간이 있습니다.')]:[]),
 ...(locked?[t('같은 회차를 응시 중이므로 해설은 제출 후 다시 볼 수 있습니다.'),act('진행 중 모의고사',go('exam',active!.id))]:[
 row((['all','wrong','flagged'] as const).map((f,i)=>act(['전체','오답·미응답','검토 표시'][i],()=>{c.mockResultFilter=f;c.route={...r,index:undefined};c.notify();},'mock-result-'+f,c.mockResultFilter===f))),
 ...(current?[small(`문항 ${current.i+1} · ${pos+1}/${ids.length}`),h(current.q.stem),...blocks(current.q.blocks??[],current.q.id),...current.q.options.map(o=>t(`${o.id}. ${o.text}${e.answers[current.q.id]===o.id?' · 내 답안':''}`)),...mockExplanation(c,current.q,u),row([act('이전 해설',()=>move(pos-1),'mock-review-previous',false,pos<=0),act('다음 해설',()=>move(pos+1),'mock-review-next',false,pos>=ids.length-1)])]:[t('이 조건에 해당하는 문항이 없습니다.')])]),act('회차 목록',go('exams'))]};
 }
 if(r.name==='examHistory')return {title:'모의고사 기록',body:[h('응시 기록'),...(['timed','study'] as const).map(mode=>{const m=mockStats(s,mode);return card([h(modeName(mode)),t(`응시한 회차 ${m.completed}/20 · 최근 회차별 평균 ${m.average===null?'—':m.average+'점'}`),small(`연습 기준 충족 ${m.met}회차`)]);}),...([...s.exams].reverse().filter(e=>e.status==='submitted').slice(0,c.mockHistoryLimit).map(e=>act(`${e.title} · ${modeName(e.mode)} · ${e.score?.points??0}점\n${new Date(e.submittedAt!).toLocaleString('ko-KR')}`,()=>{c.mockResultFilter='all';c.navigate({name:'result',id:e.id});}))),...(s.exams.filter(e=>e.status==='submitted').length>c.mockHistoryLimit?[act('기록 더 보기',()=>{c.mockHistoryLimit+=20;c.notify();})]:[])]};
 if(r.name==='mockReview'||r.name==='mockSaved'){
  const all=r.name==='mockSaved'?(s.mockStudy?.bookmarks??[]).flatMap(id=>{const q=c.getQuestion(id);return q&&canStudyQuestion(s,q)?[q]:[];}):mockWrongQuestions(s);
  const term=c.mockSearch.toLocaleLowerCase();const qs=all.filter(q=>(!c.mockTopicFilter||q.conceptId===c.mockTopicFilter)&&[q.stem,q.topic,JSON.stringify(q.blocks)].join(' ').toLocaleLowerCase().includes(term));
  return {title:r.name==='mockSaved'?'저장한 문항':'모의고사 복습',body:[h(r.name==='mockSaved'?'저장한 문항':'오답·미응답 복습'),small('회차별 최근 제출을 기준으로 합니다. 복습 정답은 당시 시험 점수를 바꾸지 않습니다.'),{kind:'input',label:'모의고사 복습 검색',value:c.mockSearch,onChange:v=>{c.mockSearch=v;c.mockListLimit=20;c.notify();},placeholder:'주제 · 지문 · SQL 검색',style:{minHeight:52,padding:12}},act('주제 선택',()=>c.toggleExpanded('mock-topics')),...(c.expanded.has('mock-topics')?[act('모든 주제',()=>{c.mockTopicFilter='';c.notify();}),...pack.topics.filter(topic=>all.some(q=>q.conceptId===topic.id)).map(topic=>act(topic.title,()=>{c.mockTopicFilter=topic.id;c.mockListLimit=20;c.expanded.delete('mock-topics');c.notify();},undefined,c.mockTopicFilter===topic.id))]:[]),small(`${qs.length}문항`),...qs.slice(0,c.mockListLimit).map(q=>card([small(`${q.examId?.replace('SQLD-M','제')}회 · ${q.number}번 · ${q.topic}`),t(q.stem),act('다시 풀기',()=>c.beginPractice([q.id],'review'),'retry-'+q.id),act('해설 보기',go('mockQuestion',q.id))])),...(qs.length>c.mockListLimit?[act('더 보기',()=>{c.mockListLimit+=20;c.notify();})]:[])]};
 }
 if(r.name==='mockQuestion'){const q=r.id?c.getQuestion(r.id):undefined;return {title:'문항 해설',body:q&&canStudyQuestion(s,q)?[h(q.stem),...blocks(q.blocks??[],q.id),...q.options.map(o=>t(`${o.id}. ${o.text}`)),...mockExplanation(c,q,u)]:[t('제출한 회차의 문항만 열 수 있습니다. 같은 회차를 진행 중이면 제출 후 다시 확인하세요.')]};}
 if(r.name==='mockSources')return {title:'모의고사 출처',body:[h('출처와 검산 안내'),t(pack.editorialNote),...pack.assumptions.map(t),small('원문 작성자의 검산 기록을 보존했습니다. 실제 시험과의 통계적 동등성이나 외부 전문가 검수를 의미하지 않습니다.'),...Object.entries(c.content.sources).filter(([id])=>id.startsWith('ME20261109:')).map(([id,v])=>act(v.title,()=>c.external(v.url),id))]};
 return;
}
