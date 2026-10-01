import type {Content,DataTable,Question} from '../core/types';

export interface QuestionContext {tables:DataTable[];sql:string;sqlLabel?:'기준 SQL';}

const practiceInputLessons:Readonly<Record<string,string>>={
  'SQLD-L025-Q02':'SQLD-L025',
  'SQLD-L027-Q02':'SQLD-L027',
  'SQLD-L034-Q02':'SQLD-L034'
};

/** Supply missing practice inputs only; authored content and exam snapshots stay unchanged. */
export function questionContext(q:Question,content:Content):QuestionContext {
  const original:QuestionContext={tables:q.tables,sql:q.sql};
  const lessonId=practiceInputLessons[q.id];
  if(q.examId!==null||!lessonId||!q.lessonIds.includes(lessonId))return original;
  const example=content.lessons.find(l=>l.id===lessonId)?.example;
  if(!example)return original;
  const basisSQL=q.id==='SQLD-L034-Q02'&&!q.sql?example.sql:'';
  return {tables:q.tables.length?q.tables:example.tables,sql:q.sql||basisSQL,
    ...(basisSQL?{sqlLabel:'기준 SQL' as const}:{})};
}
