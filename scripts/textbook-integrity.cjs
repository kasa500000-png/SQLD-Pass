'use strict';
module.exports=function validateTextbook(c){
 const check=(v,m)=>{if(!v)throw Error('CONTENT_INVALID: textbook '+m);};
 const unique=(a)=>Array.isArray(a)&&new Set(a).size===a.length;
 const tb=c.textbook,m=c.manifest;check(tb&&m.version&&Array.isArray(c.lessons),'structure');
 const ls=new Map(c.lessons.map(l=>[l.id,l])),qs=c.questions,cs=new Map(tb.chapters.map(c=>[c.id,c]));
 check(ls.size===c.lessons.length&&cs.size===tb.chapters.length,'duplicate IDs');
 check(c.days.length===0,'textbook curriculum');
 const counts={lessons:ls.size,practice:Object.values(qs).filter(q=>!q.examId).length,exams:c.exams.length,examQuestions:Object.values(qs).filter(q=>q.examId).length};
 for(const [k,v] of Object.entries(counts))check(m.counts[k]===v,'count '+k);
 const blocks=bs=>{check(Array.isArray(bs),'blocks');for(const b of bs){check(['paragraph','table','code','callout','details','flow','widget'].includes(b.type),'unknown block');if(b.type==='table')check(b.headers.length>0&&b.rows.every(r=>r.length===b.headers.length),'table width');if(b.type==='widget')check(tb.widgets[b.widget],'widget reference');}};
 const source=ids=>check(unique(ids)&&ids.every(id=>c.sources[id]),'source reference');
 for(const l of ls.values()){check(l.id.startsWith('TB20261109:')&&l.title&&l.body&&cs.has(l.chapterId),'section');check(unique(l.questionIds)&&l.questionIds.every(id=>qs[id]?.lessonIds.includes(l.id)),'section questions');source(l.sourceIds);blocks(l.blocks);}
 for(const [id,q] of Object.entries(qs)){check(q.id===id&&(q.examId?/^(ME20261109:|MEV[234]:)/.test(id)&&q.pool==='mock':id.startsWith('TB20261109:')&&['chapter','mixed'].includes(q.pool)),'question ownership');check(q.stem&&q.explanation&&q.options.length===4&&unique(q.options.map(o=>o.id))&&q.options.some(o=>o.id===q.answer),'question answer');check(q.options.every(o=>o.text&&q.optionExplanations[o.id]),'choice rationales');check(q.lessonIds.length===1&&ls.has(q.lessonIds[0])&&(q.examId||ls.get(q.lessonIds[0]).questionIds.includes(id)),'question link');source(q.sourceIds);blocks(q.blocks);if(q.result)check(q.result.rows.every(r=>r.length===q.result.headers.length),'result table');if(q.explanationBlocks)blocks(q.explanationBlocks);}
 for(const ch of tb.chapters)check(ch.sectionIds.every(id=>ls.get(id)?.chapterId===ch.id),'chapter ownership');
 const assigned=tb.chapters.flatMap(ch=>ch.sectionIds);check(unique(assigned)&&assigned.length===ls.size&&assigned.every(id=>ls.has(id)),'chapter coverage');
 const chapters=tb.parts.flatMap(p=>p.chapterIds);check(unique(chapters)&&chapters.length===cs.size&&chapters.every(id=>cs.has(id)),'part coverage');
 for(const x of [...tb.glossary,...tb.flashcards])check(ls.has(x.sectionId),'reference link');
 for(const x of tb.coverage)check(x.sections.every(id=>ls.has(id)),'coverage link');
 for(const [name,w] of Object.entries(tb.widgets)){check(w.title&&w.states.length>0,'widget '+name);const walk=ns=>{for(const n of ns){check(['group','text','code','table','button'].includes(n.kind),'widget node');if(n.kind==='button')check(n.disabled||Number.isInteger(n.target)&&n.target>=0&&n.target<w.states.length,'widget transition');if(n.kind==='table')check(n.rows.every(r=>r.length===n.columns.length),'widget table '+name+' '+JSON.stringify(n));if(n.children)walk(n.children);}};for(const s of w.states)walk(s.nodes);}
 check(['releaseReady','humanReviewed','officialSyllabusVerified','adsEnabled','analyticsEnabled'].every(k=>typeof m[k]==='boolean'),'authored evidence flags');
 const seen=new Set();
 if(c.mockPack){
  const profile={
   'mock60.20261112.1':{version:'textbook.20261112.1',volumes:3,offset:0},
   'mock40.20261112.1':{version:'textbook.20261112.2',volumes:2,offset:20},
   'mock-curated60.20261113.1':{version:'textbook.20261113.1',volumes:3,offset:20}
  }[c.mockPack.version];
  const expanded=!!c.mockPack.volumes,curated=profile?.offset===20,total=expanded?(profile?.volumes??0)*20:20,offset=profile?.offset??0;
  check(c.exams.length===total&&counts.examQuestions===total*50,'mock totals');
  const owners=new Map();
  if(expanded){
   check(profile&&(m.version===profile.version||(m.version==='textbook.20261113.2'&&profile.version==='textbook.20261113.1'&&!!c.memoryNotes))&&m.theoryVersion==='textbook.20261109.1'&&m.examVersion===c.mockPack.version,'volume versions');
   check(c.mockPack.volumes.length===profile.volumes,'volume count');
   if(curated)check(JSON.stringify(c.mockPack.freeExamIds)===JSON.stringify(Array.from({length:profile.volumes},(_,i)=>Array.from({length:5},(_,n)=>'SQLD-M'+(offset+i*20+n+1))).flat()),'free exam scope');
   for(const [i,v] of c.mockPack.volumes.entries()){
    check(v.id===`vol${i+1+(curated?1:0)}`&&v.number===i+1+(curated?1:0)&&(!curated||v.displayNumber===i+1)&&v.title&&v.version,'volume identity');
    const expected=Array.from({length:20},(_,n)=>`SQLD-M${String(i*20+n+1+offset).padStart(2,'0')}`);
    check(JSON.stringify(v.examIds)===JSON.stringify(expected),'volume exam order');
    check(unique(v.topicIds)&&v.topicIds.length===50&&v.topicIds.every(id=>c.mockPack.topics.some(t=>t.id===id)),'volume topics');source(v.sourceIds);
    check(typeof v.editorialNote==='string'&&Array.isArray(v.assumptions)&&v.quality&&typeof v.integrationNote==='string','volume provenance');
    for(const id of v.examIds)owners.set(id,v);
   }
   check(unique(c.mockPack.volumes.flatMap(v=>v.topicIds)),'cross-volume topics');
  }
  check(unique(c.exams.map(e=>e.id)),'duplicate exams');
  check(unique(c.mockPack.topics.map(t=>t.id))&&c.mockPack.topics.length===(total/20*50),'mock topics');
  for(const t of c.mockPack.topics){check(ls.has(t.sectionId),'topic section');source(t.sourceIds);}
  for(const [i,e] of c.exams.entries()){check(e.id===`SQLD-M${String(e.order).padStart(2,'0')}`&&e.order===i+1+offset&&e.order<=total+offset&&(!curated||e.displayNumber===i+1)&&e.durationSeconds===5400,'exam identity');check(e.questionIds.length===50&&unique(e.questionIds),'exam size');const owner=owners.get(e.id),prefix=owner&&owner.number>1?`MEV${owner.number}:`:'ME20261109:';let s1=0;for(const id of e.questionIds){const q=qs[id];check(q&&q.examId===e.id&&!seen.has(id)&&id.startsWith(prefix),'exam assignment');seen.add(id);check(['S1','S2'].includes(q.subject)&&q.number===e.questionIds.indexOf(id)+1,'exam subject/order');check(c.mockPack.topics.some(t=>t.id===q.conceptId),'question concept');if(owner)check(owner.topicIds.includes(q.conceptId)&&q.sourceIds.every(id=>owner.sourceIds.includes(id)),'volume question references');if(q.subject==='S1')s1++;}check(s1===10,'exam subject ratio');}
  check(seen.size===counts.examQuestions,'unassigned exam question');
 }else check(c.exams.length===0&&counts.examQuestions===0,'unlabelled mock pack');
 if(c.memoryNotes||m.version==='textbook.20261113.2')require('./add-memory-notes.cjs').validateMemoryNotes(c);
 return {...counts,questions:counts.practice+counts.examQuestions,days:0};
};
