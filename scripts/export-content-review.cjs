'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const raw=fs.readFileSync(path.join(root,'generated/content.json'));
const c=JSON.parse(raw),hash=crypto.createHash('sha256').update(raw).digest('hex');
const items=[...c.lessons.map(l=>({kind:'이론',id:l.id,title:l.title,dialect:l.dialect,body:l.body,summary:l.summary,example:l.example,sourceIds:l.sourceIds})),
 ...Object.values(c.questions).map(q=>({kind:q.examId?'모의고사':'확인문제',...q,title:q.stem}))];
const payload=JSON.stringify({hash,items,sources:c.sources}).replace(/</g,'\\u003c');
const html=`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>SQLD Pass 콘텐츠 검수</title><style>
body{font:16px/1.7 system-ui,sans-serif;color:#172033;background:#f6f8fc;margin:0}main{max-width:1000px;margin:auto;padding:28px}h1{margin:0}header{background:#fff;padding:22px;border:1px solid #dfe7f1;border-radius:16px}input,select,textarea,button{font:inherit;border:1px solid #b6c6de;border-radius:8px;padding:10px;box-sizing:border-box}input,textarea,select{width:100%;background:white}button{cursor:pointer;background:#2457d6;color:white}label{display:block;margin-top:14px}article{white-space:pre-wrap;background:white;border:1px solid #dfe7f1;border-radius:16px;padding:22px;margin-top:20px;overflow-wrap:anywhere}pre{white-space:pre-wrap;background:#13233d;color:white;padding:16px;border-radius:8px;overflow:auto}.hint{color:#53647f}.row{display:flex;gap:12px;flex-wrap:wrap}.row>*{flex:1}#progress{font-weight:bold;color:#2457d6}a{color:#2457d6}#hash{font-size:12px;word-break:break-all}</style>
<main><header><h1>SQLD Pass 콘텐츠 검수</h1><p>이론 60개 · 문항 1,120개. 아래 검수 기록은 이 브라우저에만 저장됩니다. 원본 콘텐츠와 출시 승인 상태는 변경하지 않습니다.</p>
<p class="hint">정답·해설·출처를 독립적으로 검토하고, SQL은 표기된 Oracle 19c / SQL Server 2022에서 확인하세요. 체크 완료만으로 스토어 배포가 승인되지 않습니다.</p>
<div id="hash"></div><p id="progress"></p><label>검수자<input id="reviewer" placeholder="실제 검수자 이름"></label><label>검색<input id="query" placeholder="문항 ID, 키워드, SQL, DBMS"></label><label>검수 대상<select id="items"></select></label>
<div class="row"><label>검수 상태<select id="status"><option value="pending">미검수</option><option value="reviewed">검토 완료</option><option value="changes">수정 필요</option></select></label><label>DBMS 실행 상태<select id="dbms"><option value="pending">미확인</option><option value="executed">표기된 DBMS에서 실행 확인</option><option value="not-applicable">SQL 실행 대상 아님</option></select></label></div>
<label>검수·실행 근거와 수정 의견<textarea id="notes" rows="4" placeholder="DBMS 버전, 실제 결과, 공식 문서와 대조 내용, 정오표"></textarea></label><p class="row"><button id="previous">이전 항목</button><button id="next">다음 항목</button><button id="export">검수 기록 JSON 저장</button></p><p id="message" role="status"></p></header><article id="detail"></article></main>
<script id="data" type="application/json">${payload}</script><script>
const data=JSON.parse(document.getElementById('data').textContent),key='sqld-review-'+data.hash;
const el=id=>document.getElementById(id);let saved={reviewer:'',records:{}};
try{saved=JSON.parse(localStorage.getItem(key))||saved}catch{};
let filtered=data.items,current=filtered[0];el('hash').textContent='검수 원본 SHA-256: '+data.hash;el('reviewer').value=saved.reviewer;
function store(){try{localStorage.setItem(key,JSON.stringify(saved));el('message').textContent='이 브라우저에 검수 기록을 저장했습니다. 별도 보관하려면 JSON 저장을 사용하세요.'}catch{el('message').textContent='브라우저 저장에 실패했습니다. JSON으로 저장해 주세요.'}progress()}
function progress(){const r=Object.values(saved.records);el('progress').textContent='검토 완료 '+r.filter(x=>x.status==='reviewed').length+' / '+data.items.length+' · 수정 필요 '+r.filter(x=>x.status==='changes').length}
function add(tag,text,parent=el('detail')){const n=document.createElement(tag);n.textContent=text;parent.append(n);return n}
function show(){if(!current)return;el('items').value=current.id;el('detail').replaceChildren();add('h2',current.id+' · '+current.kind);add('h3',current.title);add('p','DBMS: '+current.dialect);
if(current.body)add('div',current.body);if(current.sql)add('pre',current.sql);if(current.tables?.length)add('pre','입력 표\\n'+JSON.stringify(current.tables,null,2));
if(current.options){for(const o of current.options)add('p',o.id+'. '+o.text);add('h3','원본 정답: '+current.answer);add('p',current.explanation);if(current.optionExplanations)add('pre',JSON.stringify(current.optionExplanations,null,2))}
if(current.example)add('pre','예제와 예상 결과\\n'+JSON.stringify(current.example,null,2));if(current.summary)add('p',current.summary.join('\\n'));
add('h3','원본 출처');for(const id of current.sourceIds||[]){const s=data.sources[id];if(!s)continue;const a=add('a',id+' · '+s.title);if(/^https:\\/\\//.test(s.url)){a.href=s.url;a.target='_blank';a.rel='noopener noreferrer'}add('br','')}
const r=saved.records[current.id]||{};el('status').value=r.status||'pending';el('dbms').value=r.dbms||'pending';el('notes').value=r.notes||'';progress()}
function list(){const q=el('query').value.toLowerCase();filtered=data.items.filter(x=>JSON.stringify(x).toLowerCase().includes(q));el('items').replaceChildren();for(const i of filtered){const o=document.createElement('option');o.value=i.id;o.textContent=i.id+' · '+i.title.slice(0,85);el('items').append(o)}current=filtered.find(x=>x.id===current?.id)||filtered[0];if(current)show();else el('detail').textContent='검색 결과가 없습니다.'}
function change(){if(!current)return;saved.records[current.id]={status:el('status').value,dbms:el('dbms').value,notes:el('notes').value,reviewer:el('reviewer').value,updatedAt:new Date().toISOString()};store()}
el('query').oninput=list;el('items').onchange=()=>{current=data.items.find(x=>x.id===el('items').value);show()};for(const id of ['status','dbms','notes'])el(id).onchange=change;
el('reviewer').onchange=()=>{saved.reviewer=el('reviewer').value;store()};function step(n){const idx=filtered.findIndex(x=>x.id===current?.id);current=filtered[Math.max(0,Math.min(filtered.length-1,idx+n))];show()}
el('previous').onclick=()=>step(-1);el('next').onclick=()=>step(1);el('export').onclick=()=>{const blob=new Blob([JSON.stringify({contentSha256:data.hash,exportedAt:new Date().toISOString(),...saved},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='sqld-content-review.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};list();
</script></html>`;
const out=path.join(root,'.build/content-review');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'index.html'),html);
fs.writeFileSync(path.join(out,'inventory.json'),JSON.stringify({contentSha256:hash,lessons:c.lessons.length,questions:Object.keys(c.questions).length,records:items.map(x=>({id:x.id,kind:x.kind,dialect:x.dialect,status:'pending'}))},null,2));
console.log(`Exported ${items.length} review items to ${out}; no approval flags changed.`);
