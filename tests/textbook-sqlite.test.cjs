// Execute the actual NativeRepository through an Expo-compatible async bridge
// backed by SQLite, including real transactions and injected commit failures.
const test=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const {DatabaseSync}=require('node:sqlite');
const {initialState,parseState}=require('../.build/core/domain');
const oldContent=require('./fixtures/legacy-content.cjs'),content=require('../generated/content.json');
function setup(t){
 const db=new DatabaseSync(':memory:');t.after(()=>db.close());let fail=false;
 const bridge={execAsync:async s=>db.exec(s),getFirstAsync:async(s,...p)=>db.prepare(s).get(...p),runAsync:async(s,...p)=>{if(fail&&s.includes('INSERT OR REPLACE INTO learner_state')&&p[0]==='current')throw Error('interrupted write');return db.prepare(s).run(...p);},withExclusiveTransactionAsync:async fn=>{db.exec('BEGIN EXCLUSIVE');try{await fn(bridge);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}}};
 const code=ts.transpileModule(fs.readFileSync('src/platform/native.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const module={exports:{}};vm.runInNewContext(code,{exports:module.exports,module,require:id=>id==='expo-sqlite'?{openDatabaseAsync:async()=>bridge}:id==='expo-crypto'?{randomUUID:()=> 'test'}:id==='react-native'?{}:{},Date,JSON,Set});
 return {db,repo:new module.exports.NativeRepository('isolated-test.sqlite'),fail:v=>{fail=v;}};
}
async function seed(t){const x=setup(t);await x.repo.load();const raw={...initialState(oldContent),revision:8,onboarded:true,readLessons:['SQLD-L001'],practice:{id:'old-session'},exams:[{id:'old-exam',examId:'SQLD-M05',startedAt:10,snapshots:[{stem:'retired question'}]}]};await x.repo.save({...raw,revision:1});await x.repo.save({...raw,revision:2});return x;}
test('migration atomically removes both legacy slots and detached snapshots, preserving wallet',async t=>{
 const x=await seed(t);const old=await x.repo.load(),next=parseState(old,content);next.revision=old.revision+1;await x.repo.save(next);
 a.equal(x.db.prepare('SELECT count(*) AS n FROM exam_snapshot').get().n,0);a.equal(x.db.prepare("SELECT count(*) AS n FROM learner_state WHERE slot='previous'").get().n,0);const saved=await x.repo.load();a.equal(saved.monetization.grants['SQLD-M05'].source,'legacy');a.equal(saved.exams.length,0);a.equal(saved.readLessons.length,0);await x.repo.save({...saved,revision:saved.revision+1});a.equal(x.db.prepare('SELECT count(*) AS n FROM exam_snapshot').get().n,0);a.ok(!JSON.stringify(x.db.prepare('SELECT payload FROM learner_state').all()).includes('retired question'));
});
test('interruption rolls back deletion and migration marker; retry purges once',async t=>{
 const x=await seed(t),before=x.db.prepare('SELECT * FROM learner_state ORDER BY slot').all();const old=await x.repo.load(),next={...parseState(old,content),revision:old.revision+1};x.fail(true);await a.rejects(x.repo.save(next),/interrupted write/);a.deepEqual(x.db.prepare('SELECT * FROM learner_state ORDER BY slot').all(),before);a.equal(x.db.prepare('SELECT count(*) AS n FROM exam_snapshot').get().n,1);x.fail(false);await x.repo.save(next);a.equal((await x.repo.load()).contentVersion,content.manifest.version);a.equal(x.db.prepare('SELECT count(*) AS n FROM exam_snapshot').get().n,0);
});
test('compatible textbook upgrade preserves previous slot and snapshot rows even with legacy migration marker',async t=>{
 const x=setup(t);await x.repo.load();const raw={...initialState(content),contentVersion:'textbook.20261109.1',onboarded:true,revision:1,readLessons:[content.lessons[0].id],knownCards:[content.textbook.flashcards[0].id],textbookMigration:{version:1,fromVersion:'phase1.20260908.1',noticePending:false}};await x.repo.save(raw);
 // A detached retained snapshot is a sentinel for accidental broad purge.
 x.db.prepare('INSERT INTO exam_snapshot VALUES (?,?)').run('retained-sentinel','[]');const next={...parseState(await x.repo.load(),content),revision:2};await x.repo.save(next);
 a.equal(x.db.prepare('SELECT count(*) AS n FROM exam_snapshot').get().n,1);const prior=JSON.parse(x.db.prepare("SELECT payload FROM learner_state WHERE slot='previous'").get().payload);a.equal(prior.contentVersion,'textbook.20261109.1');a.deepEqual((await x.repo.load()).readLessons,raw.readLessons);a.deepEqual((await x.repo.load()).knownCards,raw.knownCards);
});
test('native repository reloads both mock modes with their immutable complete snapshots',async t=>{
 const x=setup(t);await x.repo.load();const {startExam,submitExam}=require('../.build/core/domain');const clock={wall:10000,mono:10000,runtimeId:'sqlite'};let s={...initialState(content),revision:1};const first=submitExam(startExam(s,content.exams[0],content,clock,'timed','timed'),clock,'manual');s.exams=[first,startExam({...s,exams:[first]},content.exams[1],content,clock,'study','study')];await x.repo.save(s);const restored=await x.repo.load();a.deepEqual(restored.exams,s.exams);a.equal(x.db.prepare('SELECT count(*) AS n FROM exam_snapshot').get().n,2);a.doesNotThrow(()=>parseState(restored,content));
});
test('pause transaction preserves immutable snapshot and prior state when a write fails',async t=>{
 const x=setup(t);await x.repo.load();const {startExam,pauseExam}=require('../.build/core/domain');const clock={wall:10000,mono:10000,runtimeId:'sqlite'};
 let s={...initialState(content),revision:1,onboarded:true};const attempt=startExam(s,content.exams[0],content,clock,'paused-snapshot');attempt.answers[attempt.snapshots[0].id]='2';s.exams=[attempt];await x.repo.save(s);
 const snapshot=x.db.prepare('SELECT payload FROM exam_snapshot').get().payload;
 const paused={...s,revision:2,exams:[pauseExam(attempt,{...clock,wall:15000,mono:15000})]};x.fail(true);await a.rejects(x.repo.save(paused));a.equal((await x.repo.load()).exams[0].pausedAt,null);a.equal(x.db.prepare('SELECT payload FROM exam_snapshot').get().payload,snapshot);
 x.fail(false);await x.repo.save(paused);const loaded=parseState(await x.repo.load(),content);a.equal(loaded.exams[0].remainingMs,5395000);a.equal(loaded.exams[0].pauseCount,1);a.equal(loaded.exams[0].pausedAt,15000);a.deepEqual(loaded.exams[0].answers,attempt.answers);a.equal(x.db.prepare('SELECT payload FROM exam_snapshot').get().payload,snapshot);
});
