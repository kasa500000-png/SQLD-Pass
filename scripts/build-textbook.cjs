'use strict';
// Executes only the hash-pinned, isolated educational simulators at build time.
// No browser, network, filesystem or original page event handlers are exposed to the VM.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),vm=require('node:vm'),{spawnSync}=require('node:child_process');
const {hash,atomicWrite,validateContent}=require('./content-integrity.cjs');
const SOURCE_SHA='cb789f945b31c6e5f53ab0cf5e55d1ba43d5824882e1da85cd835dc8ee7e9182';
const PREFIX='TB20261109:';const id=s=>PREFIX+s;
function widgetsFor(html,D){
 const script=html.match(/<script>\s*('use strict';[\s\S]*?)<\/script>/)[1];
 const helpers=script.slice(script.indexOf('const esc='),script.indexOf('const now='));
 const labs=script.slice(script.indexOf('function table('),script.indexOf('function block('));
 const ctx=vm.createContext({D});vm.runInContext(helpers+'\n'+labs+'\nglobalThis.lab={render:widgetInner,labels:widgetLabels,get:()=>widgets,set:x=>{widgets=x}};',ctx,{timeout:2000});
 const initial=JSON.stringify(ctx.lab.get()),out={};
 const names=[...new Set(D.chapters.flatMap(c=>c.sections.flatMap(s=>s.blocks.filter(b=>b.type==='widget').map(b=>b.widget))))];
 for(const name of names){
  const states=[JSON.parse(initial)],index=new Map([[initial,0]]),compiled=[];
  for(let i=0;i<states.length;i++){
   if(states.length>1000)throw Error('Unbounded simulator '+name);
   const state=states[i];ctx.lab.set(state);let rendered=vm.runInContext(`lab.render(${JSON.stringify(name)})`,ctx,{timeout:2000});
   rendered=rendered.replace(/<button\b([^>]*)>/g,(full,attrs)=>{
    if(/\bdisabled(?:\s|$|=)/.test(attrs))return full;
    const attr=n=>attrs.match(new RegExp(n+'="([^"]*)"'))?.[1];
    const next=JSON.parse(JSON.stringify(state));
    if(attr('data-action')==='widget'){const k=attr('data-widget-action');if(!Object.hasOwn(next,k))throw Error('Unknown control');next[k]=k==='anatomy'?attr('data-value'):Number(attr('data-value'));}
    else if(attr('data-action')==='transaction'){
     const t=next.transaction,op=attr('data-op');
     if(op==='prepare'&&!t.draft&&t.stock>0){t.draft={orders:t.orders+1,stock:t.stock-1};t.message='변경은 만들어졌지만 아직 확정되지 않았습니다. COMMIT과 ROLLBACK 중 하나를 선택해 보세요.';}
     if(op==='commit'&&t.draft){t.orders=t.draft.orders;t.stock=t.draft.stock;t.draft=null;t.message='COMMIT: 주문 생성과 재고 차감을 함께 확정했습니다.';}
     if(op==='rollback'&&t.draft){t.draft=null;t.message='ROLLBACK: 미확정 주문 생성과 재고 차감을 함께 취소했습니다. 이전 확정 상태로 돌아갑니다.';}
     if(op==='reset')next.transaction={orders:0,stock:5,draft:null,message:'연습용 데이터를 초기화했습니다.'};
    }else throw Error('Unsupported simulator action');
    const key=JSON.stringify(next);if(!index.has(key)){index.set(key,states.length);states.push(next);}
    return '<button'+attrs+' data-next="'+index.get(key)+'">';
   });compiled.push({html:rendered});
  }
  out[name]={title:ctx.lab.labels[name],states:compiled};
 }
 const proc=spawnSync('python3',[path.join(__dirname,'compile-widget-tree.py')],{input:JSON.stringify(out),encoding:'utf8',maxBuffer:16*1024*1024});
 if(proc.status!==0)throw Error(proc.stderr);return JSON.parse(proc.stdout);
}
function build(root,{includeMocks=true}={}){
 const source=zlib.gunzipSync(fs.readFileSync(path.join(root,'content-source/textbook-20261109.html.gz')));if(hash(source)!==SOURCE_SHA)throw Error('Authored HTML hash changed; review importer and pin explicitly.');
 const html=source.toString('utf8'),D=JSON.parse(html.match(/<script type="application\/json" id="study-content">([\s\S]*?)<\/script>/)[1]);
 const version='textbook.20261109.1',sections=D.chapters.flatMap(c=>c.sections.map(s=>({...s,chapterId:c.id}))),qs=D.questions.filter(q=>q.pool!=='mock');
 const subject=q=>q.subjectId===1?'S1':q.subjectId===2?'S2':Number(q.chapterId.slice(2))<=5?'S1':'S2';
 const blocks=bs=>bs.map(b=>({...b}));
 const lessons=sections.map((s,i)=>({id:id(s.id),title:s.title,subject:Number(s.chapterId.slice(2))<=5?'S1':'S2',day:0,order:i+1,minutes:0,objectives:[s.lead],prerequisites:[],body:s.lead,summary:[s.summary],questionIds:qs.filter(q=>q.sectionId===s.id).map(q=>id(q.id)),sourceIds:s.sourceIds,dialect:'교재의 SQL·DBMS 표기 참조',example:null,releaseReady:false,humanReviewed:false,version,chapterId:id(s.chapterId),blocks:blocks(s.blocks),level:s.level,originalId:s.id}));
 const questions=Object.fromEntries(qs.map(q=>[id(q.id),{id:id(q.id),subject:subject(q),subjectMapping:q.subjectId?'source':'chapter-group',lessonIds:[id(q.sectionId)],stem:q.stem,tables:[],sql:'',blocks:blocks(q.blocks||[]),options:q.options.map((o,i)=>({id:String(i+1),text:o.text,format:'text'})),answer:String(q.answerIndex+1),explanation:q.explanation,optionExplanations:Object.fromEntries(q.options.map((o,i)=>[String(i+1),o.explanation])),family:id(q.id),dialect:'교재의 SQL·DBMS 표기 참조',examId:null,topic:q.skill,version,releaseReady:false,humanReviewed:false,sourceIds:q.sourceIds||[],pool:q.pool,chapterId:id(q.chapterId),difficulty:q.difficulty,originalId:q.id}]));
 const ranges=[[1,5,'입문과 데이터 모델링'],[6,10,'SQL 기본'],[11,14,'SQL 활용'],[15,17,'SQL 관리 구문'],[18,18,'핵심 정리']];
 const c={manifest:{schema:2,version,theoryVersion:version,examVersion:'deferred',releaseReady:false,humanReviewed:false,officialSyllabusVerified:false,adsEnabled:false,analyticsEnabled:false,counts:{lessons:lessons.length,practice:qs.length,exams:0,examQuestions:0},sourceHashes:{'textbook-20261109.html':SOURCE_SHA},note:'새 교재 이관. 검수 및 공개 배포 승인과 별개. 모의고사 보류.'},lessons,questions,exams:[],days:[],sources:Object.fromEntries(D.sources.map(s=>[s.id,{...s,provider:s.publisher}])),textbook:{id:D.id,parts:ranges.map(([lo,hi,title],i)=>({id:'part'+(i+1),title,chapterIds:D.chapters.filter(c=>c.number>=lo&&c.number<=hi).map(c=>id(c.id))})),chapters:D.chapters.map(c=>({id:id(c.id),number:c.number,title:c.title,subtitle:c.subtitle,goals:c.goals,recap:c.recap,sectionIds:c.sections.map(s=>id(s.id))})),glossary:D.glossary.map(g=>({...g,id:id(g.id),sectionId:id(g.sectionId)})),flashcards:D.flashcards.map(f=>({...f,id:id(f.id),sectionId:id(f.sectionId)})),coverage:D.coverage.map(x=>({...x,sections:x.sections.map(id)})),datasets:D.datasets,widgets:widgetsFor(html,D),editorialNote:D.editorialNote,labNote:D.labNote}};
 if(includeMocks)require('./add-mock-exams.cjs').addMockExams(c,root);
 validateContent(c);const raw=Buffer.from(JSON.stringify(c));const lock={schema:1,contentVersion:c.manifest.version,sha256:hash(raw),bytes:raw.length,counts:c.manifest.counts,sourceHashes:c.manifest.sourceHashes,status:'editorial_draft',note:'Identity only. New content requires its own review and release approval.'};
 atomicWrite(path.join(root,'content-pack/content.json.gz'),zlib.gzipSync(raw,{level:9,mtime:0}));atomicWrite(path.join(root,'content-pack/content.lock.json'),JSON.stringify(lock,null,2)+'\n');atomicWrite(path.join(root,'generated/content.json'),raw);
 return {sha256:lock.sha256,bytes:raw.length,counts:lock.counts,widgets:Object.keys(c.textbook.widgets).length,states:Object.values(c.textbook.widgets).reduce((n,w)=>n+w.states.length,0)};
}
if(require.main===module)console.log(build(path.resolve(__dirname,'..')));
module.exports={build,SOURCE_SHA};
