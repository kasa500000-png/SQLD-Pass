'use strict';
/** Retain authored identities; only catalog presentation and availability change. */
function curateMock40(c){
 if(c.manifest.version!=='textbook.20261112.1'||c.exams.length!==60)throw Error('Expected the approved60-exam source');
 const removed=c.mockPack.volumes.find(v=>v.id==='vol1');
 c.exams=c.exams.filter(e=>e.order>20).map(e=>({...e,displayNumber:e.order-20}));
 const retained=new Set(c.exams.map(e=>e.id));
 c.questions=Object.fromEntries(Object.entries(c.questions).filter(([,q])=>!q.examId||retained.has(q.examId)));
 c.mockPack.volumes=c.mockPack.volumes.filter(v=>v.id!=='vol1').map(v=>({...v,displayNumber:v.number-1}));
 const topics=new Set(c.mockPack.volumes.flatMap(v=>v.topicIds));
 c.mockPack.topics=c.mockPack.topics.filter(t=>topics.has(t.id));
 for(const id of removed.sourceIds)delete c.sources[id];
 c.mockPack.id='sqld-mock40-ko';c.mockPack.version='mock40.20261112.1';
 c.mockPack.freeExamIds=c.mockPack.volumes.flatMap(v=>v.examIds.slice(0,5));
 // Aggregate provenance must describe retained material, not the retired first volume.
 c.mockPack.editorialNote='기존 2·3권 원문을 새 1·2권으로 구성했습니다. 원본 회차와 문항 식별자는 유지하고 표시 번호만 1~40회로 변경했습니다.';
 c.mockPack.assumptions=[...new Set(c.mockPack.volumes.flatMap(v=>v.assumptions))];
 c.mockPack.quality=Object.fromEntries(c.mockPack.volumes.map(v=>[v.id,v.quality]));
 c.mockPack.integrationNote='기존 1권 1~20회는 제외했습니다. 각 권의 첫 5회는 무료이며 나머지는 회차별 보상형 광고로 해제합니다.';
 c.manifest.version='textbook.20261112.2';c.manifest.examVersion=c.mockPack.version;
 c.manifest.counts.exams=40;c.manifest.counts.examQuestions=2000;
 c.manifest.note='교재216절·일반연습340문항 유지. 기존2·3권의40회·2000문항. 새1~5회와21~25회 무료.';
 for(const name of Object.keys(c.manifest.sourceHashes))if(!['textbook-20261109.html','mock-vol2-20261112.html','mock-vol3-20261112.html'].includes(name))delete c.manifest.sourceHashes[name];
 return c;
}
module.exports={curateMock40};
