'use strict';
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const {hash}=require('./content-integrity.cjs');
const MOCK_SOURCE_SHA='6184a2dec1b82fbf850004ae309fe5c373dd5a8e42e099c0a5d4a608a03320b1';
const prefix='ME20261109:',qid=id=>prefix+id,sid=id=>prefix+'source:'+id;
function addMockExams(c,root){
 const bytes=zlib.gunzipSync(fs.readFileSync(path.join(root,'content-source/mock20-20261109.html.gz')));
 if(hash(bytes)!==MOCK_SOURCE_SHA)throw Error('Mock source hash changed; review before importing.');
 const d=JSON.parse(bytes.toString('utf8').match(/<script[^>]*id="content-data"[^>]*>([\s\S]*?)<\/script>/)[1]);
 const examIds=new Map(d.exams.map(e=>[e.id,`SQLD-M${String(e.number).padStart(2,'0')}`]));
 const version='mock20.20261109.1';
 for(const s of d.sources)c.sources[sid(s.id)]={...s,id:sid(s.id),originalId:s.id,provider:s.kind};
 for(const q of d.questions)c.questions[qid(q.id)]={id:qid(q.id),originalId:q.id,subject:q.subjectId===1?'S1':'S2',lessonIds:['TB20261109:'+q.sectionId],chapterId:'TB20261109:'+q.chapterId,stem:q.stem,blocks:q.blocks,tables:[],sql:'',options:q.options.map((o,i)=>({id:String(i+1),text:o.text,format:'text'})),answer:String(q.answerIndex+1),explanation:q.explanation,optionExplanations:Object.fromEntries(q.options.map((o,i)=>[String(i+1),o.explanation])),family:qid(q.id),dialect:'별도 표시가 없으면 Oracle Database 19c. SQL Server 문항은 명시.',examId:examIds.get(q.examId),topic:q.skill,conceptId:q.conceptId,difficulty:q.difficulty,number:q.number,version,pool:'mock',sourceIds:q.sourceIds.map(sid),releaseReady:false,humanReviewed:false,...(q.result?{result:q.result}:{}),...(q.explanationBlocks?{explanationBlocks:q.explanationBlocks}:{}),...(q.answerType?{answerType:q.answerType}:{}),validation:q.validation};
 c.exams=d.exams.map(e=>({id:examIds.get(e.id),originalId:e.id,title:e.title,order:e.number,durationSeconds:e.durationMinutes*60,questionIds:e.questionIds.map(qid),version,releaseReady:false,statisticallyEquated:false}));
 c.mockPack={id:d.id,version,editorialNote:d.editorialNote,assumptions:d.assumptions,topics:d.topics.map(t=>({...t,sectionId:'TB20261109:'+t.sectionId,sourceIds:t.sourceIds.map(sid)})),quality:d.quality,integrationNote:d.integrationNote};
 c.manifest.version='textbook.20261109.2';c.manifest.examVersion=version;c.manifest.counts.exams=20;c.manifest.counts.examQuestions=1000;c.manifest.sourceHashes['mock20-20261109.html']=MOCK_SOURCE_SHA;c.manifest.note='새 교재와 모의고사 통합. 원문 보존 검증은 사람의 내용 검수 또는 공개 배포 승인을 의미하지 않습니다.';
 return c;
}
module.exports={addMockExams,MOCK_SOURCE_SHA};
