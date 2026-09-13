import {render} from '../ui/views';
import {polishLearning} from '../ui/learning-polish';
import {box,button,dark,light,text,type Node} from '../ui/nodes';
import type {MonetizedController} from './controller';
import {isFreeExam} from './policy';

export function renderMonetized(c:MonetizedController):Node {
  const root=render(c),p=c.state.settings.theme==='dark'?dark:light;
  const scroll=root.children?.find(n=>n.scroll);
  if(!scroll||!c.ready)return root;
  const body=(v:string)=>text(v,{fontSize:15,lineHeight:24,color:p.ink});
  const title=(v:string)=>text(v,{fontSize:22,lineHeight:31,fontWeight:'700',color:p.ink});
  const card=(children:Node[])=>box(children,{backgroundColor:p.surface,padding:18,gap:12,borderRadius:16,borderWidth:1,borderColor:p.line});
  const action=(v:string,fn:()=>void|Promise<void>,id:string)=>button(v,fn,{minHeight:52,backgroundColor:p.blueSoft,color:p.blue,borderRadius:12,fontSize:15},{testId:id,disabled:c.busy||c.rewardBusy});
  if(c.route.name==='exams'){
    scroll.children=[title('무료 4회 + 추가 실전 16회'),body('1~4회는 광고 없이 응시합니다. 5~20회는 회차별 광고 1회 시청 후 이 기기에서 계속 이용합니다. 이론·확인 문제·복습은 무료입니다.'),...c.content.exams.map(e=>{
      const latest=[...c.state.exams].reverse().find(a=>a.examId===e.id),open=c.hasAccess(e.id);
      return card([title(e.title),body(`50문항 · 90분 · ${isFreeExam(e.id)?'무료':open?'열림 · 재시청 없음':'광고 시청 후 열림'}`),
        ...(latest?.status==='active'?[action('시험 이어하기',()=>c.navigate({name:'exam',id:latest.id}),`resume-${e.id}`)]:
          [action(open?'응시 안내 보기':'광고로 이 회차 열기',()=>open?c.navigate({name:'examIntro',id:e.id}):c.offerUnlock(e.id),`exam-${e.id}`)]),
        ...(latest?.status==='submitted'?[action(`${latest.score?.points??0}점 · 결과와 해설`,()=>c.navigate({name:'result',id:latest.id}),`result-${e.id}`)]:[])
      ]);
    })];
  }
  if(c.route.name==='examIntro'){
    const e=c.content.exams.find(x=>x.id===c.route.id);
    if(e)scroll.children=[title(e.title),body('50문항 · 90분\n1과목 10문항 / 2과목 40문항\n시험 중 광고·힌트 없음. 앱을 나가도 시간은 흐릅니다.'),
      body(c.hasAccess(e.id)?'이 회차는 열려 있습니다. 응시·제출 후 해설에 추가 시청이 필요 없습니다.':'광고 시청은 선택입니다. 무료 1~4회는 시청 없이 응시할 수 있습니다.'),
      action(c.hasAccess(e.id)?'실전 시작':'광고 1회 시청 안내',()=>c.hasAccess(e.id)?c.beginExam(e.id):c.offerUnlock(e.id),'start-exam'),
      action('모의고사 목록',()=>c.tab('exams'),'back-exams')];
  }
  const rewrite=(n:Node):Node=>{
    let updated=n;
    if(n.text==='현재 로그인·광고·원격 분석·결제가 없습니다.')updated={...n,text:'회원가입·앱 전용 서버·원격 학습 분석·결제는 없습니다. 광고 활성화 시 Google 광고 SDK와 통신합니다.'};
    if(n.text==='이 앱 학습 데이터 초기화')updated={...n,text:'학습 기록만 초기화 · 열린 회차 유지',action:()=>c.requestLearningReset()};
    return {...updated,...(updated.children?{children:updated.children.map(rewrite)}:{})};
  };
  scroll.children=scroll.children?.map(rewrite);
  if(c.route.name==='settings')scroll.children?.push(card([
    title('광고와 회차 해제'),body(`광고 모드: ${c.ads.mode==='off'?'미활성':c.ads.mode==='test'?'테스트 광고 · 수익 없음':'운영 광고'}`),
    body('무료 1~4회. 추가 회차는 각각 시청 완료 후 기기 내 유지. 앱 삭제·전체 데이터 삭제·기기 변경 시 복원하지 않습니다.'),
    action('광고 개인정보 선택',()=>c.openAdPrivacy(),'ad-privacy'),
    action('전체 데이터 삭제 · 열린 회차도 삭제',()=>c.requestReset(),'reset-all')
  ]));
  if(c.route.name==='privacy')scroll.children?.push(card([
    title('광고 데이터 안내'),body('배너 및 보상형 광고가 활성화되면 Google SDK가 광고 제공을 위해 기기·네트워크·광고 상호작용 정보를 처리할 수 있습니다. 이 앱은 답안·진도·메모를 광고 타기팅으로 전달하지 않습니다. 비개인화 요청도 개인정보 처리가 전혀 없다는 뜻은 아닙니다.'),
    body('광고를 건너뛰거나 개인정보 선택을 거부해도 무료 학습과 이미 열린 회차는 유지됩니다. 추가 광고가 제공되지 않으면 무료 1~4회를 이용해 주세요.'),
    action('광고 개인정보 선택',()=>c.openAdPrivacy(),'ad-privacy-detail')
  ]));
  if(c.route.name==='help')scroll.children?.push(action('부적절한 광고 신고 내용 작성',()=>{
    c.supportText='[광고 신고]\n표시된 화면/날짜:\n광고 내용과 문제점:\n개인정보나 광고 식별자는 적지 마세요.';c.notify();
  },'report-ad'));
  if(c.ads.mode==='test')scroll.children?.unshift(body('테스트 광고 모드입니다. 테스트 해제는 운영 광고 모드의 신규 응시권으로 이전하지 않습니다.'));
  if(c.notice&&['exams','examIntro'].includes(c.route.name))scroll.children?.unshift(body(c.notice));
  if(c.rewardBusy)scroll.children?.unshift(body('광고 처리 중입니다. 시청 완료와 저장이 확인된 뒤 회차가 열립니다.'));
  if(c.needsRewardSave)scroll.children?.unshift(action('시청 완료 보상 저장 재시도 · 재시청 없음',()=>c.retryRewardSave(),'retry-reward-save'));
  if(c.showBanner){
    const idx=root.children!.indexOf(scroll);
    // Native root replaces this named box with a fixed, separately padded banner slot.
    root.children!.splice(idx+1,0,box([],{minHeight:0},'monetization-banner'));
  }
  const lock=(n:Node):Node=>({...n,disabled:n.kind==='button'&&c.rewardBusy?true:n.disabled,children:n.children?.map(lock)});
  const improved=polishLearning(c,root,{hasAccess:id=>c.hasAccess(id),offerUnlock:id=>c.offerUnlock(id),mode:c.ads.mode,busy:c.rewardBusy,resetLearning:()=>c.requestLearningReset()});
  return c.rewardBusy?lock(improved):improved;
}
