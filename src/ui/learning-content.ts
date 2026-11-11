import {box,text,learningType,type Node,type Palette} from './nodes';

/** Presentation only: never rewrites authored stems, SQL or answer strings. */
export function questionPrompt(stem:string,p:Palette):Node {
  return box([
    {...text(stem,{...learningType.question,color:p.ink}),heading:true},
  ],{padding:12,gap:8,borderRadius:12,backgroundColor:p.surface});
}
export function answerSummary(selected:string|undefined,answer:string,p:Palette):Node {
  const correct=selected===answer;
  return box([
    {...text(selected?(correct?'정답입니다':'오답입니다'):'미응답 문항입니다',{...learningType.heading,color:correct?p.greenText:p.redText}),alert:true},
    text(`내 답: ${selected?selected+'번':'미응답'} · 정답: ${answer}번`,{...learningType.body,color:p.ink}),
  ],{paddingVertical:12,gap:8});
}
