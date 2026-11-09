import type {AppState,Content,Lesson} from '../core/types';
import {dayKey} from '../core/domain/state';
export function textbookMetrics(s:AppState,c:Content){
 const latest=new Map<string,boolean>();for(const r of s.responses)if(c.questions[r.questionId]&&!c.questions[r.questionId].examId)latest.set(r.questionId,r.correct);
 return {read:c.lessons.filter(l=>s.readLessons.includes(l.id)).length,sections:c.lessons.length,attempted:latest.size,questions:c.manifest.counts.practice,accuracy:latest.size?Math.round([...latest.values()].filter(Boolean).length/latest.size*100):null};
}
export function dailySections(s:AppState,c:Content,now:number):Lesson[]{
 const cached=s.textbookDay;
 if(cached&&cached.day===dayKey(now)&&cached.targetDate===s.settings.targetDate)return cached.sectionIds.flatMap(id=>c.lessons.filter(l=>l.id===id));
 const unread=c.lessons.filter(l=>!s.readLessons.includes(l.id));
 const today=dayKey(now),target=s.settings.targetDate;
 const date=(v:string)=>Date.UTC(...v.split('-').map(Number).map((n,i)=>i===1?n-1:n) as [number,number,number]);
 const remaining=target&&target>=today?Math.max(1,Math.round((date(target)-date(today))/86400000)+1):0;
 return unread.slice(0,remaining?Math.ceil(unread.length/remaining):1);
}
/** Index only theory and glossary; question answers and rationales never enter search. */
export function searchSections(c:Content,query:string):Lesson[]{
 const term=query.trim().toLocaleLowerCase();if(!term)return c.lessons;
 return c.lessons.filter(l=>[l.title,l.body,...(l.blocks??[]).flatMap(b=>b.type==='widget'?[]:b.type==='code'?[b.code]:b.type==='table'?[b.caption??'',...b.headers,...b.rows.flat().map(String)]:b.type==='flow'?b.items:'title'in b?[b.title,b.text]:[b.text]),...(c.textbook?.glossary.filter(g=>g.sectionId===l.id).flatMap(g=>[g.term,g.english,g.definition])??[])].join('\n').toLocaleLowerCase().includes(term));
}

export function withDailyPlan(s:AppState,c:Content,now:number):AppState{
 if(!c.textbook||!s.onboarded)return s;
 if(s.textbookDay?.day===dayKey(now)&&s.textbookDay.targetDate===s.settings.targetDate)return s;
 return {...s,textbookDay:{day:dayKey(now),targetDate:s.settings.targetDate,sectionIds:dailySections(s,c,now).map(l=>l.id)}};
}
