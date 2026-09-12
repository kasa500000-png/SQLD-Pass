const test = require('node:test');
const assert = require('node:assert/strict');
const {scoreExam, validTargetDate} = require('../.build/core/domain.js');

function questions() {
  return Array.from({length: 50}, (_, i) => ({
    id: `Q${i+1}`, subject: i < 10 ? 'S1' : 'S2', answer: 'A',
    options: ['A','B','C','D'].map(id => ({id, text: id, format: 'text'}))
  }));
}

test('50문항 10+40 구성에서 전부 정답이면 100점', () => {
  const qs = questions();
  const answers = Object.fromEntries(qs.map(q => [q.id, 'A']));
  const score = scoreExam(qs, answers);
  assert.equal(score.points, 100);
  assert.equal(score.bySubject.S1.points, 20);
  assert.equal(score.bySubject.S2.points, 80);
  assert.equal(score.practiceThresholdMet, true);
});

test('총점이 높아도 1과목 최소 기준 미달이면 연습 기준 미충족', () => {
  const qs = questions();
  const answers = Object.fromEntries(qs.map(q => [q.id, q.subject === 'S1' ? 'B' : 'A']));
  const score = scoreExam(qs, answers);
  assert.equal(score.points, 80);
  assert.equal(score.bySubject.S1.meetsMinimum, false);
  assert.equal(score.practiceThresholdMet, false);
});

test('목표일은 오늘 이후의 실제 YYYY-MM-DD만 허용', () => {
  assert.equal(validTargetDate('2026-09-12', '2026-09-12'), true);
  assert.equal(validTargetDate('2026-02-30', '2026-01-01'), false);
  assert.equal(validTargetDate('2026-09-11', '2026-09-12'), false);
});
