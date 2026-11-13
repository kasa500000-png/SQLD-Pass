const test=require('node:test'),a=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..'),prior=require('./fixtures/curated60.cjs');
const {readNotes,addMemoryNotes}=require('../scripts/add-memory-notes.cjs'),{validateContent}=require('../scripts/content-integrity.cjs');
test('83 native notes preserve every authored field except exact documented corrections',()=>{
 const c=prior(),before=structuredClone(c),original=readNotes(root);addMemoryNotes(c,root);validateContent(c);
 for(const key of ['lessons','questions','exams','days','textbook','mockPack','sources'])a.deepEqual(c[key],before[key],key);
 a.equal(c.manifest.theoryVersion,before.manifest.theoryVersion);a.equal(c.manifest.examVersion,before.manifest.examVersion);
 const n=c.memoryNotes;for(const edit of n.corrections){const item=[...original.notes,...original.quickLines].find(x=>x.id===edit.id);a.equal(item[edit.field],edit.before);item[edit.field]=edit.after;}
 for(const key of ['categories','notes','quickLines'])a.deepEqual(n[key],original[key]);
 a.deepEqual(n.categories.map(x=>x.noteIds.length),[14,9,17,11,8,14,10]);
 a.equal(n.notes.filter(x=>x.priority).length,45);a.equal(n.notes.filter(x=>x.example).length,70);
 a.ok(n.notes.find(x=>x.id==='functions-19').watch.includes("''"));a.ok(n.notes.find(x=>x.id==='functions-19').example.includes("NVL(' ', '대체')"));
 const again=prior();addMemoryNotes(again,root);a.deepEqual(c,again);
 a.throws(()=>addMemoryNotes(c,root),/unmodified/);
 for(const change of [x=>x.memoryNotes.notes.pop(),x=>x.memoryNotes.notes[0].id='changed',x=>x.memoryNotes.categories[0].noteIds.reverse(),x=>x.memoryNotes.sourceHash='fake']){const bad=structuredClone(c);change(bad);a.throws(()=>validateContent(bad),/CONTENT_INVALID/);}
});
