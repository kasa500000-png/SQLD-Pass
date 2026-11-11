'use strict';
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const {hash}=require('./content-integrity.cjs');
const SOURCES=[
 {number:2,file:'mock-vol2-20261112.html',sha256:'e6fef8f1291a784af1fa21f0c2d65641afa96c454c9ea7bfa971402114e296fb'},
 {number:3,file:'mock-vol3-20261112.html',sha256:'9a1c36c857d03e75398f467e9eef95af8568eb9811a3042db4a71461ed1f6979'}
];
function readVolume(root,spec){
 const bytes=zlib.gunzipSync(fs.readFileSync(path.join(root,'content-source',spec.file+'.gz')));
 if(hash(bytes)!==spec.sha256)throw Error('Mock volume source hash changed: '+spec.file);
 const json=bytes.toString('utf8').match(/<script[^>]*id="content-data"[^>]*>([\s\S]*?)<\/script>/);
 if(!json)throw Error('Missing mock volume content-data');
 return JSON.parse(json[1]);
}
function addMockVolumes(c,root){
 if(c.exams.length!==20||!c.mockPack||c.mockPack.volumes)throw Error('Expected unmodified20-exam base');
 const base=c.mockPack;
 const volumes=[{id:'vol1',number:1,title:'1권',version:base.version,examIds:c.exams.map(e=>e.id),topicIds:base.topics.map(t=>t.id),sourceIds:Object.keys(c.sources).filter(id=>id.startsWith('ME20261109:source:')),editorialNote:base.editorialNote,assumptions:base.assumptions,quality:base.quality,integrationNote:base.integrationNote}];
 for(const spec of SOURCES){
  const d=readVolume(root,spec),prefix=`MEV${spec.number}:`,qid=id=>prefix+id,sid=id=>prefix+'source:'+id,tid=id=>prefix+'topic:'+id;
  const version=`mock-vol${spec.number}.20261112.1`,examIds=new Map(d.exams.map(e=>[e.id,`SQLD-M${String(e.number).padStart(2,'0')}`]));
  for(const s of d.sources)c.sources[sid(s.id)]={...s,id:sid(s.id),originalId:s.id,provider:s.kind};
  for(const q of d.questions){
   if(c.questions[qid(q.id)])throw Error('Duplicate mock question '+q.id);
   c.questions[qid(q.id)]={id:qid(q.id),originalId:q.id,subject:q.subjectId===1?'S1':'S2',lessonIds:['TB20261109:'+q.sectionId],chapterId:'TB20261109:'+q.chapterId,stem:q.stem,blocks:q.blocks,tables:[],sql:'',options:q.options.map((o,i)=>({id:String(i+1),text:o.text,format:'text'})),answer:String(q.answerIndex+1),explanation:q.explanation,optionExplanations:Object.fromEntries(q.options.map((o,i)=>[String(i+1),o.explanation])),family:qid(q.id),dialect:'별도 표시가 없으면 Oracle Database 19c. SQL Server 문항은 명시.',examId:examIds.get(q.examId),topic:q.skill,conceptId:tid(q.conceptId),difficulty:q.difficulty,number:q.number,version,pool:'mock',sourceIds:q.sourceIds.map(sid),releaseReady:false,humanReviewed:false,...(q.result?{result:q.result}:{}),...(q.explanationBlocks?{explanationBlocks:q.explanationBlocks}:{}),...(q.answerType?{answerType:q.answerType}:{}),validation:q.validation};
  }
  const exams=d.exams.map(e=>({id:examIds.get(e.id),originalId:e.id,title:e.title,order:e.number,durationSeconds:e.durationMinutes*60,questionIds:e.questionIds.map(qid),version,releaseReady:false,statisticallyEquated:false}));
  c.exams.push(...exams);
  const topics=d.topics.map(t=>({...t,id:tid(t.id),originalId:t.id,sectionId:'TB20261109:'+t.sectionId,sourceIds:t.sourceIds.map(sid)}));
  base.topics.push(...topics);
  volumes.push({id:`vol${spec.number}`,number:spec.number,title:`${spec.number}권`,version,examIds:exams.map(e=>e.id),topicIds:topics.map(t=>t.id),sourceIds:d.sources.map(s=>sid(s.id)),editorialNote:d.editorialNote,assumptions:d.assumptions,quality:d.quality,integrationNote:d.integrationNote});
  c.manifest.sourceHashes[spec.file]=spec.sha256;
 }
 base.volumes=volumes;base.id='sqld-mock60-ko';base.version='mock60.20261112.1';
 c.manifest.version='textbook.20261112.1';c.manifest.examVersion=base.version;
 c.manifest.counts.exams=60;c.manifest.counts.examQuestions=3000;
 return c;
}
module.exports={addMockVolumes,readVolume,SOURCES};
