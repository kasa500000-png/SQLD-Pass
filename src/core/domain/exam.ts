import type {AppState,Clock,Content,Exam,ExamAttempt,PublicQuestion,Question,Score} from '../types';

export function publicQuestion(q:Question):PublicQuestion { return {id:q.id,subject:q.subject,stem:q.stem,tables:q.tables,sql:q.sql,options:q.options,dialect:q.dialect}; }
export function canStudyQuestion(s:AppState,q:Question):boolean { return !q.examId||s.exams.some(e=>e.status==='submitted'&&e.snapshots.some(x=>x.id===q.id)); }
export function scoreExam(qs:Question[],answers:Record<string,string>):Score {
  if(qs.length!==50||qs.filter(q=>q.subject==='S1').length!==10||qs.filter(q=>q.subject==='S2').length!==40)throw new Error('채점할 시험 구성은 10+40문항이어야 합니다.');
  const known=new Map(qs.map(q=>[q.id,q]));for(const [id,a] of Object.entries(answers)){if(!known.has(id)||!known.get(id)!.options.some(o=>o.id===a))throw new Error('유효하지 않은 답안입니다.');}
  const bySubject:Score['bySubject']={S1:{points:0,max:20,correct:0,total:10,meetsMinimum:false},S2:{points:0,max:80,correct:0,total:40,meetsMinimum:false}};
  let correct=0,unanswered=0;for(const q of qs){if(!answers[q.id])unanswered++;if(answers[q.id]===q.answer){correct++;bySubject[q.subject].correct++;bySubject[q.subject].points+=2;}}
  bySubject.S1.meetsMinimum=bySubject.S1.points>=8;bySubject.S2.meetsMinimum=bySubject.S2.points>=32;
  return {points:correct*2,correct,unanswered,total:50,bySubject,practiceThresholdMet:correct*2>=60&&bySubject.S1.meetsMinimum&&bySubject.S2.meetsMinimum};
}
export function startExam(s:AppState,e:Exam,c:Content,clock:Clock,id:string):ExamAttempt {
  if(s.exams.some(x=>x.status==='active'))throw new Error('진행 중인 모의고사를 먼저 제출해 주세요.');
  const seen=new Set(s.exams.filter(x=>x.status==='submitted').flatMap(x=>x.snapshots.map(q=>q.family)));
  const snapshots=e.questionIds.map(id=>JSON.parse(JSON.stringify(c.questions[id])) as Question);
  return {id,examId:e.id,contentVersion:c.manifest.version,examVersion:e.version,title:e.title,status:'active',startedAt:clock.wall,
    durationSeconds:e.durationSeconds,remainingMs:e.durationSeconds*1000,checkpoint:clock,timeTrusted:true,timeIssues:[],snapshots,
    answers:{},flagged:[],index:0,isFirstAttempt:!s.exams.some(x=>x.examId===e.id&&x.status==='submitted'),exposedFamilyCount:snapshots.filter(q=>seen.has(q.family)).length};
}
export function advanceClock(a:ExamAttempt,c:Clock):ExamAttempt {
  if(a.status!=='active')return a;
  const wall=c.wall-a.checkpoint.wall;const same=c.runtimeId===a.checkpoint.runtimeId;
  const mono=same?c.mono-a.checkpoint.mono:0;const issues=[...a.timeIssues];
  if(!same&&!issues.includes('앱 재시작으로 단조 시계를 연속 검증하지 못했습니다.'))issues.push('앱 재시작으로 단조 시계를 연속 검증하지 못했습니다.');
  if((wall< -2000||(same&&Math.abs(wall-mono)>5000)||mono< -100)&&!issues.includes('기기 시간 변경 또는 시계 불일치가 감지되었습니다.'))issues.push('기기 시간 변경 또는 시계 불일치가 감지되었습니다.');
  const elapsed=Math.max(0,wall,mono);return {...a,remainingMs:Math.max(0,a.remainingMs-elapsed),checkpoint:c,timeTrusted:a.timeTrusted&&issues.length===0,timeIssues:issues};
}
export function submitExam(a:ExamAttempt,c:Clock,reason:'manual'|'expired'):ExamAttempt {
  if(a.status==='submitted')return a;const n=advanceClock(a,c);
  return {...n,status:'submitted',submittedAt:c.wall,submitReason:reason,score:scoreExam(n.snapshots,n.answers)};
}
export function formatTime(ms:number):string {const n=Math.max(0,Math.ceil(ms/1000));return `${String(Math.floor(n/3600)).padStart(2,'0')}:${String(Math.floor(n%3600/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;}
