'use strict';
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),{spawnSync}=require('node:child_process');
const {hash}=require('./content-integrity.cjs');
const SOURCE_SHA='08b651aeef9b9173cf380ee4ca12c2fe9408c9b97761053976fb65466e84d56a';
const VERSION='memory-notes.20261113.1';
function readNotes(root){
 const raw=zlib.gunzipSync(fs.readFileSync(path.join(root,'content-source/memory-notes-20261113.html.gz')));
 if(hash(raw)!==SOURCE_SHA)throw Error('Memory notes authored source hash mismatch');
 const p=spawnSync('python3',[path.join(__dirname,'parse-memory-notes.py'),path.join(root,'content-source/memory-notes-20261113.html.gz')],{encoding:'utf8',maxBuffer:2*1024*1024,timeout:15000});
 if(p.status!==0)throw Error(p.stderr);return JSON.parse(p.stdout);
}
function addMemoryNotes(c,root){
 if(c.manifest.version!=='textbook.20261113.1'||c.memoryNotes)throw Error('Memory notes require unmodified curated60');
 const data=readNotes(root),corrections=JSON.parse(fs.readFileSync(path.join(root,'content-source/memory-notes-corrections.json'))),seen=new Set();
 for(const edit of corrections){
  const item=[...data.notes,...data.quickLines].find(n=>n.id===edit.id),key=edit.id+':'+edit.field;
  if(!item||seen.has(key)||item[edit.field]!==edit.before||!edit.after||!edit.source)throw Error('Memory notes correction mismatch: '+key);
  seen.add(key);item[edit.field]=edit.after;
 }
 c.memoryNotes={version:VERSION,title:'핵심 노트',...data,sourceHash:SOURCE_SHA,corrections,
  editorialNote:'첨부 핵심 암기 노트를 바탕으로 정리했습니다. SQL 예제는 표기된 DBMS의 동작을 구분해 읽어 주세요. 전체 교재와 실제 시험 공지를 함께 확인해 주세요.'};
 c.manifest.version='textbook.20261113.2';c.manifest.memoryNotesVersion=VERSION;
 c.manifest.sourceHashes['memory-notes-20261113.html']=SOURCE_SHA;
 c.manifest.note='기존 교재·연습·curated60 보존, 핵심 노트 추가. 새 통합 해시의 별도 소유자 검수 필요.';
 return c;
}
function validateMemoryNotes(c){
 const n=c.memoryNotes,check=(v,m)=>{if(!v)throw Error('CONTENT_INVALID: memory notes '+m);};
 check(n&&n.version===VERSION&&c.manifest.version==='textbook.20261113.2'&&c.manifest.memoryNotesVersion===VERSION,'version');
 check(n.sourceHash===SOURCE_SHA&&c.manifest.sourceHashes['memory-notes-20261113.html']===SOURCE_SHA,'source hash');
 check(n.categories.length===7&&n.notes.length===83&&n.quickLines.length===12,'counts');
 const ids=n.notes.map(x=>x.id),assigned=n.categories.flatMap(x=>x.noteIds);
 check(new Set(ids).size===83&&JSON.stringify(ids)===JSON.stringify(assigned),'identity and order');
 check(new Set(n.categories.map(x=>x.id)).size===7,'categories');
 check(n.notes.filter(x=>x.priority).length===45&&n.notes.filter(x=>x.example).length===70,'priority/examples');
 for(const x of n.notes)check(x.title&&x.core&&x.explanation&&typeof x.watch==='string'&&typeof x.example==='string'&&n.categories.find(g=>g.id===x.categoryId)?.noteIds.includes(x.id),'note fields');
 check(n.quickLines.every(x=>x.title&&x.text)&&new Set(n.quickLines.map(x=>x.id)).size===12,'quick lines');
}
module.exports={readNotes,addMemoryNotes,validateMemoryNotes,SOURCE_SHA,VERSION};
