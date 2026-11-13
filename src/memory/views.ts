import type {MonetizedController} from '../monetization/controller';
import {box,button,code,dark,light,learningType,row,selectionGroup,text,type Node} from '../ui/nodes';
import {searchMemoryNotes,type MemoryFilter} from './domain';

export function renderMemoryScreen(c:MonetizedController):{title:string;body:Node[]}|undefined {
 const pack=c.content.memoryNotes,r=c.route.name;
 if(!pack||!['memoryNotes','memoryCategory','memoryQuick'].includes(r))return;
 const p=c.isDark?dark:light,bookmarks=c.state.memoryNotes?.bookmarks??[];
 const t=(v:string)=>text(v,{...learningType.body,color:p.ink});
 const meta=(v:string)=>text(v,{...learningType.meta,color:p.muted});
 const h=(v:string):Node=>({...text(v,{...learningType.heading,color:p.ink}),heading:true});
 const act=(label:string,action:()=>void|Promise<void>,id:string,selected=false):Node=>button(label,action,{minHeight:48,color:selected?p.blue:p.ink},{testId:id,selected,disabled:c.busy||c.rewardBusy});
 const link=(label:string,subtitle:string,action:()=>void,id:string):Node=>({...act(label,action,id),subtitle,buttonKind:'row'});
 if(r==='memoryNotes'){
  const query=c.memorySearch.trim(),matches=searchMemoryNotes(pack,query,c.memoryFilter,bookmarks),filtered=!!query||c.memoryFilter!=='all';
  const last=pack.categories.find(x=>x.id===c.state.memoryNotes?.lastCategoryId);
  return {title:'핵심 노트',body:[
   h('짧게 정리하고, 예제로 확인하세요'),meta(`${pack.categories.length}개 분류 · ${pack.notes.length}개 노트 · 필수 ${pack.notes.filter(x=>x.priority).length}개`),
   {kind:'input',label:'핵심 노트 검색',placeholder:'제목, 개념, SQL 검색',value:c.memorySearch,clearable:true,testId:'memory-search',onChange:v=>{c.memorySearch=v;c.notify();},style:{minHeight:48,padding:12,borderWidth:1,borderColor:p.controlBorder,borderRadius:10,backgroundColor:p.surface,color:p.ink}},
   selectionGroup(([['all','전체'],['priority','필수'],['saved','저장']] as [MemoryFilter,string][]).map(([value,label])=>act(label,()=>{c.memoryFilter=value;c.notify();},'memory-filter-'+value,c.memoryFilter===value))),
   ...(!filtered?[
    ...(last&&c.memoryPosition(last.id)?[link('이어서 읽기',last.title,()=>c.openMemoryCategory(last.id),'memory-continue')]:[]),
    link('빠른 암기 12줄','자주 헷갈리는 핵심만 모아 보기',()=>c.navigate({name:'memoryQuick'}),'memory-quick'),
    ...pack.categories.map(g=>link(g.title,`${g.noteIds.length}개 노트`,()=>c.openMemoryCategory(g.id),'memory-category-'+g.id))
   ]:[
    meta(`${matches.length}개 노트`),
    ...(matches.length?pack.categories.flatMap(g=>{const ns=matches.filter(n=>n.categoryId===g.id);return ns.length?[h(g.title),...ns.map(n=>link(n.title,n.core,()=>c.openMemoryCategory(g.id,n.id),'memory-match-'+n.id))]:[];}):[
     h(c.memoryFilter==='saved'&&!query?'저장한 노트가 없습니다':'일치하는 노트가 없습니다'),
     t(c.memoryFilter==='saved'&&!query?'읽다가 다시 볼 노트의 저장 버튼을 눌러 주세요.':'검색어를 줄이거나 필터를 전체로 바꿔 보세요.'),
     act('전체 노트 보기',()=>{c.memorySearch='';c.memoryFilter='all';c.notify();},'memory-reset')
    ])
   ]),
   meta(pack.editorialNote),
   {...act('자료·출처 안내',()=>c.toggleExpanded('memory:info'),'memory-info'),expanded:c.expanded.has('memory:info')},
   ...(c.expanded.has('memory:info')?[
    h('첨부 자료의 시험 기준'),t('50문항 · 90분. 총점 60점 이상과 각 과목 40% 이상을 모두 충족해야 합니다. 1과목 10문항 중 4개, 2과목 40문항 중 16개 이상을 맞히면서 전체 30개 이상 정답이 필요합니다.'),
    meta('독립 제작한 요약 노트이며 공식 문제집이 아닙니다. 실제 시험의 최신 일정과 기준은 데이터자격검정 공지를 확인해 주세요.'),
    ...([['데이터자격검정','https://www.dataq.or.kr/'],['Oracle NVL2','https://docs.oracle.com/en/database/oracle/oracle-database/21/sqlrf/NVL2.html'],['Oracle NULL','https://docs.oracle.com/en/database/oracle/oracle-database/19/sqlrf/Nulls.html'],['원문 참고: 시험 과목 안내','https://certpass.kr/cert/sqld/']] as const).map(([label,url],i)=>link(label,'외부 웹사이트',()=>{void c.external(url);},'memory-source-'+i))
   ]:[])
  ]};
 }
 if(r==='memoryQuick')return {title:'빠른 암기',body:[h('빠른 암기 12줄'),...pack.quickLines.map(n=>box([h(n.title),t(n.text)],{gap:8,paddingVertical:16,borderBottomWidth:1,borderColor:p.line},n.id)),meta('요약만 외우기보다 분류별 설명과 예제를 함께 확인해 주세요.')]};
 const category=pack.categories.find(g=>g.id===c.route.id);
 if(!category)return {title:'핵심 노트',body:[h('분류를 찾을 수 없습니다'),act('목록으로 돌아가기',()=>c.back(),'memory-missing-back')]};
 return {title:category.title,body:[meta(`핵심 노트 · ${category.noteIds.length}개 항목`),...category.noteIds.map((id,i)=>{
  const n=pack.notes.find(n=>n.id===id)!,saved=bookmarks.includes(id);
  return {...box([
   row([meta(`${i+1} / ${category.noteIds.length}${n.priority?' · 필수':''}${n.dialect?' · '+n.dialect:''}`),box([],{flex:1}),{...act(saved?'저장됨':'저장',()=>c.bookmarkMemoryNote(id),'memory-save-'+id,saved),label:`${n.title} ${saved?'저장 해제':'저장'}`,icon:saved?'check':'bookmark'}],{flexWrap:'wrap'}),
   h(n.title),text(n.core,{...learningType.body,color:p.ink,fontWeight:'600'}),
   ...(n.watch?[box([meta('주의할 점'),t(n.watch)],{gap:4,paddingLeft:12,borderLeftWidth:2,borderColor:p.controlBorder})]:[]),
   t(n.explanation),...(n.example?[meta('SQL·값 예시'),code(n.example)]:[])
  ],{gap:12,paddingVertical:20,borderBottomWidth:1,borderColor:p.line},id),testId:'memory-note-'+id};
 })]};
}
