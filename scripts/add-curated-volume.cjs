'use strict';
const {appendMockVolume}=require('./add-mock-volumes.cjs');
const SOURCE={number:4,file:'mock-vol4-20261113.html',version:'mock-vol4.20261113.1',sha256:'0946e1889342b912c6528ae1a1897e361bd6aa3cade490cbda1cec28c5834f25'};
function addCuratedVolume(c,root){
 if(c.manifest.version!=='textbook.20261112.2'||c.exams.length!==40)throw Error('Expected curated40 base');
 const v=appendMockVolume(c,root,SOURCE);v.displayNumber=3;c.mockPack.volumes.push(v);
 for(const e of c.exams.slice(40))e.displayNumber=e.order-20;
 const pack=c.mockPack;pack.id='sqld-mock-curated60-ko';pack.version='mock-curated60.20261113.1';
 pack.freeExamIds=pack.volumes.flatMap(v=>v.examIds.slice(0,5));
 pack.editorialNote='기존 2·3권과 원본 Vol.4를 앱의 1·2·3권으로 제공합니다. 원문 회차와 문항 식별자는 유지하고 표시 번호만 1~60회로 구성했습니다. 폐기한 원본 1권은 포함하지 않습니다.';
 pack.assumptions=[...new Set(pack.volumes.flatMap(v=>v.assumptions))];
 pack.quality=Object.fromEntries(pack.volumes.map(v=>[v.id,v.quality]));
 pack.integrationNote='각 권의 첫 5회(1~5회·21~25회·41~45회)는 무료입니다. 나머지 45회는 회차별 보상형 광고로 해제합니다. 원본 Vol.4의 중복 이론 대신 기존 교재 절에 연결합니다.';
 c.manifest.version='textbook.20261113.1';c.manifest.examVersion=pack.version;
 c.manifest.counts.exams=60;c.manifest.counts.examQuestions=3000;
 c.manifest.note='교재216절·일반연습340문항과 기존40회 유지. 원본Vol.4를 새3권41~60회로 추가. 권별첫5회 무료.';
 return c;
}
module.exports={addCuratedVolume,SOURCE};
