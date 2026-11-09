const test=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),zlib=require('node:zlib');
const c=require('../generated/content.json'),d=require('../.build/core/domain'),{MonetizedController}=require('../.build/monetization/controller'),{renderTextbook}=require('../.build/textbook/views'),{mockWrongQuestions,mockStats}=require('../.build/mocks/domain'),{textbookMetrics}=require('../.build/textbook/learning');
const flat=n=>[n,...(n.children??[]).flatMap(flat)],text=ctrl=>flat(renderTextbook(ctrl)).map(n=>n.text??'').join('\n');
function env(raw=null,mode='off',accessPolicy){let stored=structuredClone(raw),time=Date.parse('2026-11-09T12:00:00+09:00'),seq=0,fail=false,shows=0;const services={repository:{load:async()=>structuredClone(stored),save:async s=>{if(fail)throw Error('disk');stored=structuredClone(s);},clear:async()=>{stored=null;}},clock:()=>({wall:time,mono:time,runtimeId:'mock-test'}),uuid:()=>`mock-${++seq}`,platform:'native',openURL:async()=>{}};
 const ads={mode,adultConfirmed:false,confirmAdult(){this.adultConfirmed=true;},privacyOptions:async()=>{},showReward:async cb=>{shows++;await cb();return 'closed';}};
 const ctrl=new MonetizedController(c,services,ads,accessPolicy);return {ctrl,stored:()=>stored,advance:ms=>time+=ms,fail:v=>fail=v,shows:()=>shows};}
async function ready(raw,mode,policy){const e=env(raw,mode,policy);await e.ctrl.initialize();a.equal(e.ctrl.ready,true,e.ctrl.startupError);if(!e.ctrl.state.onboarded)await e.ctrl.saveSettings(true);return e;}
const source=JSON.parse(zlib.gunzipSync(fs.readFileSync('content-source/mock20-20261109.html.gz')).toString().match(/<script[^>]*id="content-data"[^>]*>([\s\S]*?)<\/script>/)[1]);
test('all 1000 questions preserve stems, SQL/table blocks, choices, answers, rationales, result tables and provenance',()=>{
 a.equal(c.exams.length,20);a.equal(Object.values(c.questions).filter(q=>q.pool==='mock').length,1000);
 for(const q of source.questions){const n=c.questions['ME20261109:'+q.id];a.equal(n.stem,q.stem);a.deepEqual(n.blocks,q.blocks);a.equal(n.answer,String(q.answerIndex+1));a.equal(n.explanation,q.explanation);a.deepEqual(n.result,q.result);a.deepEqual(n.explanationBlocks,q.explanationBlocks);a.deepEqual(n.validation,q.validation);a.deepEqual(n.sourceIds,q.sourceIds.map(id=>'ME20261109:source:'+id));a.equal(n.number,q.number);a.equal(n.conceptId,q.conceptId);a.equal(n.answerType,q.answerType);q.options.forEach((o,i)=>{a.equal(n.options[i].text,o.text);a.equal(n.optionExplanations[i+1],o.explanation);});a.deepEqual(n.lessonIds,['TB20261109:'+q.sectionId]);}
 a.equal(source.questions.filter(q=>q.result).length,660);a.equal(source.questions.filter(q=>q.explanationBlocks).length,20);
 for(const e of c.exams){a.equal(e.durationSeconds,5400);a.equal(e.questionIds.length,50);a.equal(e.questionIds.filter(id=>c.questions[id].subject==='S1').length,10);a.deepEqual(e.questionIds,source.exams[e.order-1].questionIds.map(id=>'ME20261109:'+id));}
 for(const s of source.sources)a.deepEqual(c.sources['ME20261109:source:'+s.id],{...s,id:'ME20261109:source:'+s.id,originalId:s.id,provider:s.kind});
 a.deepEqual(c.mockPack.assumptions,source.assumptions);a.deepEqual(c.mockPack.quality,source.quality);
});
test('public questions contain source blocks but no scoring, validation, result, or rationale fields',()=>{
 for(const q of Object.values(c.questions).filter(q=>q.examId)){const p=d.publicQuestion(q);a.deepEqual(p.blocks,q.blocks);for(const key of ['answer','explanation','optionExplanations','result','explanationBlocks','validation'])a.equal(p[key],undefined);}
});
test('study mode survives a long restart with no timer; only one mock can run across modes',async()=>{
 const e=await ready();await e.ctrl.beginExam('SQLD-M01','study');await e.ctrl.updateExamAnswer('2');await e.ctrl.flagExam();await e.ctrl.moveExam(12);const id=e.ctrl.activeExam().id;e.advance(12*86400000);await e.ctrl.pulse();a.equal(e.ctrl.activeExam().remainingMs,null);
 const r=await ready(e.stored());a.equal(r.ctrl.activeExam().id,id);a.equal(r.ctrl.activeExam().mode,'study');a.equal(r.ctrl.activeExam().index,12);a.equal(r.ctrl.activeExam().answers[c.exams[0].questionIds[0]],'2');a.equal(r.ctrl.activeExam().flagged.length,1);await r.ctrl.beginExam('SQLD-M02','timed');a.equal(r.ctrl.state.exams.length,1);a.equal(r.ctrl.activeExam().id,id);a.doesNotThrow(()=>d.parseState(r.stored(),c));
});
test('timed timeout scores once and backward clocks cannot add time',async()=>{
 const e=await ready();await e.ctrl.beginExam('SQLD-M01','timed');await e.ctrl.updateExamAnswer(e.ctrl.activeExam().snapshots[0].answer);const before=structuredClone(e.ctrl.activeExam());const backwards=d.advanceClock(before,{wall:before.checkpoint.wall-10000,mono:before.checkpoint.mono+1000,runtimeId:'mock-test'});a.equal(backwards.remainingMs,before.remainingMs-1000);a.equal(backwards.timeTrusted,false);
 e.advance(5400001);await e.ctrl.pulse();await e.ctrl.finishExam('manual');a.equal(e.ctrl.state.exams.length,1);a.equal(e.ctrl.state.exams[0].score.points,2);a.equal(e.ctrl.state.exams[0].submitReason,'expired');a.equal(e.ctrl.activeExam(),undefined);const r=await ready(e.stored());a.deepEqual(r.ctrl.state.exams[0].score,e.ctrl.state.exams[0].score);
});
test('immutable snapshots, ordered answers and final submission survive failures and restart',async()=>{
 const e=await ready();await e.ctrl.beginExam('SQLD-M01','study');const q=e.ctrl.activeExam().snapshots[0],orig=c.questions[q.id].stem;c.questions[q.id].stem='changed runtime';a.equal(q.stem,orig);c.questions[q.id].stem=orig;
 await Promise.all([e.ctrl.updateExamAnswer('1'),e.ctrl.updateExamAnswer('2'),e.ctrl.updateExamAnswer('3')]);a.equal(e.ctrl.activeExam().answers[q.id],'3');e.fail(true);await e.ctrl.finishExam('manual');a.equal(e.ctrl.activeExam().status,'active');e.fail(false);await e.ctrl.finishExam('manual');await e.ctrl.finishExam('manual');a.equal(e.ctrl.state.exams.length,1);a.equal(e.ctrl.state.exams[0].score.unanswered,49);a.deepEqual(d.parseState(e.stored(),c).exams[0].snapshots,e.ctrl.state.exams[0].snapshots);
});
test('retakes hide old explanations, saved notes and review entry points until final submission',async()=>{
 const e=await ready(),ctrl=e.ctrl;await ctrl.beginExam('SQLD-M01','study');const q=ctrl.activeExam().snapshots[0];a.ok(!text(ctrl).includes(q.explanation));await ctrl.finishExam('manual');const old=ctrl.state.exams[0].id;await ctrl.bookmarkMock(q.id);await ctrl.saveMockNote(q.id,'PRIVATE_NOTE');await ctrl.beginExam('SQLD-M01','timed');
 for(const route of [{name:'result',id:old},{name:'examReview',id:old,index:0},{name:'mockQuestion',id:q.id},{name:'mockSaved'},{name:'mockReview'}]){ctrl.route=route;a.ok(!text(ctrl).includes(q.explanation));a.ok(!text(ctrl).includes('PRIVATE_NOTE'));}
 await ctrl.beginPractice([q.id],'review');a.equal(ctrl.state.practice,null);await ctrl.saveMockNote(q.id,'forbidden');a.equal(ctrl.state.mockStudy.notes[q.id],'PRIVATE_NOTE');await ctrl.finishExam('manual');ctrl.route={name:'examReview',id:ctrl.state.exams.at(-1).id,index:0};a.ok(text(ctrl).includes(q.explanation));
});
test('latest submission owns wrong list; correct review removes item without changing score; retake reinstates it',async()=>{
 const e=await ready(),ctrl=e.ctrl;await ctrl.beginExam('SQLD-M01','study');await ctrl.finishExam('manual');const q=ctrl.state.exams[0].snapshots[0];a.equal(mockWrongQuestions(ctrl.state).length,50);const score=structuredClone(ctrl.state.exams[0].score);
 await ctrl.beginPractice([q.id],'review');await ctrl.selectPractice(q.answer);await ctrl.answerPractice();a.equal(mockWrongQuestions(ctrl.state).length,49);a.deepEqual(ctrl.state.exams[0].score,score);await ctrl.beginExam('SQLD-M01','timed');a.equal(ctrl.activeExam(),undefined);await ctrl.nextPractice();await ctrl.beginExam('SQLD-M01','timed');a.equal(ctrl.state.lastPracticeResultId,null);await ctrl.finishExam('manual');a.equal(mockWrongQuestions(ctrl.state).length,50);a.equal(mockStats(ctrl.state,'timed').completed,1);a.equal(mockStats(ctrl.state,'study').completed,1);a.equal(ctrl.state.exams.length,2);
 a.equal(textbookMetrics(ctrl.state,c).attempted,0);a.equal(textbookMetrics(ctrl.state,c).questions,340);
});
test('bookmarks and bounded explicit notes persist across restart; learning reset clears them but preserves rights',async()=>{
 const e=await ready(),ctrl=e.ctrl;await ctrl.beginExam('SQLD-M05','study');await ctrl.finishExam('manual');const q=ctrl.state.exams[0].snapshots[0];await ctrl.bookmarkMock(q.id);await ctrl.saveMockNote(q.id,'메'.repeat(10001));a.equal(ctrl.state.mockStudy.notes[q.id].length,10000);const r=await ready(e.stored());a.deepEqual(r.ctrl.state.mockStudy,ctrl.state.mockStudy);r.ctrl.mockNoteDrafts[q.id]='unsaved';r.ctrl.requestLearningReset();await r.ctrl.acceptDialog();a.equal(r.ctrl.state.mockStudy,undefined);a.deepEqual(r.ctrl.mockNoteDrafts,{});a.equal(r.ctrl.hasAccess('SQLD-M05'),true);
});
test('one earned test reward opens both modes and retakes; all active modes suppress home banners',async()=>{
 const e=await ready(null,'test','rewarded'),ctrl=e.ctrl;await ctrl.beginExam('SQLD-M05','study');a.equal(ctrl.activeExam(),undefined);a.ok(ctrl.dialog);await ctrl.acceptDialog();a.equal(e.shows(),1);a.equal(ctrl.hasAccess('SQLD-M05'),true);for(const mode of ['study','timed','study']){await ctrl.beginExam('SQLD-M05',mode);a.equal(ctrl.activeExam().mode,mode);ctrl.tab('today');a.equal(ctrl.showBanner,false);ctrl.offerUnlock('SQLD-M06');a.equal(ctrl.dialog,null);await ctrl.finishExam('manual');}a.equal(e.shows(),1);
});
test('compatible textbook update retains read, practice, cards, settings and grants exactly',async()=>{
 const base=await ready(),ctrl=base.ctrl;await ctrl.markLesson(c.lessons[0].id);await ctrl.toggleKnownCard(c.textbook.flashcards[0].id);await ctrl.beginPractice([c.lessons[0].questionIds[0]]);await ctrl.selectPractice('2');const raw=structuredClone(base.stored());raw.contentVersion='textbook.20261109.1';raw.textbookMigration={version:1,fromVersion:'phase1.20260908.1',noticePending:false};raw.reading={lastLessonId:c.lessons[0].id,positions:{[c.lessons[0].id]:{offset:180,contentHeight:1200,lessonVersion:c.lessons[0].version}}};const before=JSON.stringify(raw);const next=d.parseState(raw,c);a.equal(JSON.stringify(raw),before);a.equal(next.contentVersion,c.manifest.version);for(const k of ['readLessons','bookmarks','practice','knownCards','settings','monetization','textbookMigration','reading','responses'])a.deepEqual(next[k],raw[k],k);const updated=await ready(raw);a.equal(updated.stored().contentVersion,c.manifest.version);a.deepEqual(updated.ctrl.state.practice,raw.practice);
});
test('every question renders native blocks and every post-submit result table is reachable',async()=>{
 const e=await ready(),ctrl=e.ctrl;for(const exam of c.exams){await ctrl.beginExam(exam.id,'study');for(let i=0;i<50;i++){ctrl.state.exams.at(-1).index=i;const nodes=flat(renderTextbook(ctrl)),q=ctrl.activeExam().snapshots[i];a.equal(nodes.filter(n=>n.kind==='table').length,q.blocks.filter(b=>b.type==='table').length);a.ok(!text(ctrl).includes(q.explanation));}await ctrl.finishExam('manual');const id=ctrl.state.exams.at(-1).id;for(let i=0;i<50;i++){ctrl.route={name:'examReview',id,index:i};const q=ctrl.state.exams.at(-1).snapshots[i],nodes=flat(renderTextbook(ctrl));a.ok(nodes.some(n=>n.text===q.explanation));a.equal(nodes.filter(n=>n.kind==='table').length,q.blocks.filter(b=>b.type==='table').length+(q.result?1:0)+(q.explanationBlocks??[]).filter(b=>b.type==='table').length);}}
 a.equal(ctrl.state.exams.length,20);a.equal(flat(renderTextbook(ctrl)).filter(n=>n.role==='tab').length,5);
});
test('latest-submission review and statistics use saved attempt order even after clock rollback',()=>{
 const s=d.initialState(c),clock={wall:100000,mono:100000,runtimeId:'a'};let first=d.startExam(s,c.exams[0],c,clock,'a','study');first.answers=Object.fromEntries(first.snapshots.map(q=>[q.id,q.answer]));s.exams=[d.submitExam(first,clock,'manual')];const earlier={wall:50000,mono:1,runtimeId:'b'},second=d.submitExam(d.startExam(s,c.exams[0],c,earlier,'b','study'),earlier,'manual');s.exams.push(second);a.equal(mockWrongQuestions(s).length,50);a.equal(mockStats(s,'study').average,0);
});

test('focused exam keeps timer and navigation outside scrolling content and preserves saved exit',async()=>{
 const {ctrl}=await ready();await ctrl.beginExam('SQLD-M01','timed');await ctrl.updateExamAnswer('2');
 const root=renderTextbook(ctrl),nodes=flat(root),scroll=nodes.find(n=>n.scroll),footer=nodes.find(n=>n.testId==='screen-footer');
 a.ok(footer);a.ok(!flat(scroll).some(n=>n.testId==='mock-next'));a.ok(flat(footer).some(n=>n.testId==='mock-next'));
 a.equal(nodes.filter(n=>n.role==='tab').length,0);a.ok(nodes.some(n=>n.testId==='screen-header'));
 ctrl.route={name:'sheet',id:ctrl.activeExam().id};ctrl.back();a.ok(ctrl.dialog);await ctrl.acceptDialog();a.equal(ctrl.route.name,'exams');a.equal(Object.keys(ctrl.activeExam().answers).length,1);
});
test('result summary opens immutable explanations and question picker without changing score',async()=>{
 const {ctrl}=await ready();await ctrl.beginExam('SQLD-M01','study');await ctrl.finishExam('manual');
 const e=ctrl.state.exams[0],score=structuredClone(e.score),q=e.snapshots[0];a.ok(!text(ctrl).includes(q.explanation));
 await flat(renderTextbook(ctrl)).find(n=>n.testId==='review-all').action();a.equal(ctrl.route.name,'examReview');a.ok(text(ctrl).includes(q.explanation));
 await flat(renderTextbook(ctrl)).find(n=>n.testId==='review-picker').action();a.ok(flat(renderTextbook(ctrl)).some(n=>n.kind==='modal'));
 await flat(renderTextbook(ctrl)).find(n=>n.testId==='review-jump-13').action();a.equal(ctrl.route.index,12);a.equal(ctrl.reviewPickerOpen,false);a.deepEqual(ctrl.state.exams[0].score,score);
});
test('practice feedback marks correct and chosen wrong options only after persisted submission',async()=>{
 const {ctrl}=await ready(),q=Object.values(c.questions).find(q=>q.pool==='chapter');await ctrl.beginPractice([q.id]);const wrong=q.options.find(o=>o.id!==q.answer).id;await ctrl.selectPractice(wrong);
 a.ok(flat(renderTextbook(ctrl)).filter(n=>n.buttonKind==='choice').every(n=>!n.feedback));await ctrl.answerPractice();
 const nodes=flat(renderTextbook(ctrl));a.equal(nodes.find(n=>n.testId==='option-'+q.answer).feedback,'correct');a.equal(nodes.find(n=>n.testId==='option-'+wrong).feedback,'incorrect');
 a.ok(flat(nodes.find(n=>n.testId==='screen-footer')).some(n=>n.testId==='next-question'));
});
test('settings save returns to caller and leaves textbook records intact',async()=>{
 const {ctrl}=await ready();await ctrl.markLesson(c.lessons[0].id);ctrl.navigate({name:'chapter',id:c.textbook.chapters[0].id});ctrl.navigate({name:'settings'});ctrl.draftSettings.fontScale=1.15;await ctrl.saveSettings();
 a.equal(ctrl.route.name,'chapter');a.equal(ctrl.state.settings.fontScale,1.15);a.ok(ctrl.state.readLessons.includes(c.lessons[0].id));
});
