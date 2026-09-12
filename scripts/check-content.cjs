const fs = require('node:fs');
const path = require('node:path');
const file = path.join(__dirname, '..', 'generated', 'content.json');
const content = JSON.parse(fs.readFileSync(file, 'utf8'));
if (content.migrationIncomplete) throw new Error('Full SQLD Pass content pack has not been materialized.');
if (content.lessons?.length !== 60) throw new Error(`Expected 60 lessons, got ${content.lessons?.length ?? 0}`);
if (content.exams?.length !== 20) throw new Error(`Expected 20 mock exams, got ${content.exams?.length ?? 0}`);
if (Object.keys(content.questions ?? {}).length !== 1120) throw new Error('Expected 1,120 total questions.');
for (const exam of content.exams) {
  if (exam.questionIds?.length !== 50) throw new Error(`${exam.id} must contain 50 questions.`);
}
console.log('SQLD Pass content structure OK: 60 lessons / 120 practice / 20 exams / 1000 exam questions.');
