import type {AppState, ExamAttempt, Lesson} from '../core/types';
import {validReadingOffset} from '../core/domain/reading';
import {box,code,table,text,type Node,type Palette} from './nodes';

export function dialectLabel(value:string):string {
  const labels:Record<string,string>={concept:'개념 문항','개념':'개념 문항',common:'공통 SQL',oracle19c:'Oracle 19c',sqlserver2022:'SQL Server 2022',oracle_sqlserver:'Oracle / SQL Server 비교',oracle_sqlite:'Oracle / SQLite 비교',mixed:'DBMS별 차이 비교'};
  return labels[value]??value;
}
/** Search only theory text; unseen assessment stems and answer keys are not indexed. */
export function searchLessons(lessons:Lesson[],query:string,subject:string,bookmarks:string[]|null):Lesson[]{
  const normalize=(s:string)=>s.normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim();
  const aliases:Record<string,string>={'널':'null','조인':'join','그룹':'group','서브쿼리':'subquery'};
  const terms=normalize(query).split(' ').filter(Boolean);
  return lessons.filter(l=>(subject==='all'||l.subject===subject)&&(!bookmarks||bookmarks.includes(l.id))&&terms.every(term=>{
    const hay=normalize([l.title,l.body,...l.objectives,...l.summary].join(' '));
    return hay.includes(term)||(!!aliases[term]&&hay.includes(aliases[term]));
  }));
}
export function lessonStatus(l:Lesson,s:AppState):string {
  const done=new Set(s.responses.filter(r=>r.mode==='lesson').map(r=>r.questionId));
  const n=l.questionIds.filter(id=>done.has(id)).length;
  const position=s.reading?.positions[l.id];
  const started=position?.lessonVersion===l.version&&validReadingOffset(position);
  return `${s.readLessons.includes(l.id)?'읽음':started?'읽는 중':'읽기 전'} · 확인 ${n}/${l.questionIds.length}`;
}
export function examReviewIndices(e:ExamAttempt,onlyWrong:boolean):number[]{
  if(e.status!=='submitted')return [];
  return e.snapshots.flatMap((q,i)=>!onlyWrong||e.answers[q.id]!==q.answer?[i]:[]);
}
export function displayCell(value:string|number|null|undefined):string {
  return value===null?'NULL':value===undefined?'—':value===''?"'' (빈 문자열)":String(value);
}
function cells(line:string):string[]{
  const src=line.trim().replace(/^\|/,'').replace(/(?<!\\)\|$/,'');
  return src.split(/(?<!\\)\|/).map(s=>s.trim().replace(/\\\|/g,'|'));
}
/** A deliberately limited, non-HTML Markdown renderer. SQL is never interpreted or executed. */
export function lessonBlocks(source:string,p:Palette):Node[]{
  const lines=source.replace(/\r\n?/g,'\n').split('\n');const out:Node[]=[];let paragraph:string[]=[];
  const prose=(s:string)=>text(s,{fontSize:16,lineHeight:27,color:p.ink});
  const flush=()=>{if(paragraph.length){out.push(prose(paragraph.join('\n')));paragraph=[];}};
  for(let i=0;i<lines.length;i++){
    const line=lines[i],fence=line.match(/^\s*(`{3,}|~{3,})/);
    if(fence){flush();const snippet:string[]=[];const char=fence[1][0],len=fence[1].length;
      while(++i<lines.length){const t=lines[i].trim();if(t.length>=len&&new RegExp(`^${char}+$`).test(t))break;snippet.push(lines[i]);}
      out.push(code(snippet.join('\n')));continue;
    }
    const heading=line.match(/^\s{0,3}#{1,6}\s+(.+)$/);
    if(heading){flush();out.push({...text(heading[1],{fontSize:20,lineHeight:30,fontWeight:'700',color:p.ink,marginTop:8}),heading:true});continue;}
    if(line.trim().startsWith('|')&&i+1<lines.length&&cells(lines[i+1]).every(s=>/^:?-{3,}:?$/.test(s))){
      flush();const columns=cells(line),rows:string[][]=[];i++;
      while(i+1<lines.length&&lines[i+1].trim().startsWith('|'))rows.push(cells(lines[++i]));
      if(rows.every(r=>r.length===columns.length))out.push(table(columns,rows,'이론 데이터 표'));
      else out.push(prose([line,...rows.map(r=>r.join(' | '))].join('\n')));continue;
    }
    if(/^\s*>\s?/.test(line)){flush();out.push(box([prose(line.replace(/^\s*>\s?/,''))],{padding:14,borderRadius:12,backgroundColor:p.blueSoft}));continue;}
    if(/^\s*[-*+]\s+/.test(line)){flush();out.push(prose(line.replace(/^\s*[-*+]\s+/,'• ')));continue;}
    if(!line.trim()){flush();continue;}paragraph.push(line);
  }
  flush();return out;
}
