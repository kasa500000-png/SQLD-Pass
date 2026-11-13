'use strict';
// Exact byte-equivalent authored payloads only; no semantic duplicate judgment.
const fs=require('node:fs'),crypto=require('node:crypto');
const content=require('../generated/content.json');
const qs=Object.values(content.questions).filter(q=>q.pool==='mock');
function groups(select){const by=new Map();for(const q of qs){const key=crypto.createHash('sha256').update(JSON.stringify(select(q))).digest('hex');const ids=by.get(key)??[];ids.push(q.id);by.set(key,ids);}return [...by].filter(([,ids])=>ids.length>1).map(([sha256,questionIds])=>({sha256,questionIds}));}
const result={contentVersion:content.manifest.version,scope:qs.length,method:'Exact serialized strings; no whitespace normalization, removal, or semantic equivalence assessment.',payloadFields:['stem','blocks','options.text','answer','explanation','optionExplanations','result','explanationBlocks'],payloadDuplicates:groups(q=>[q.stem,q.blocks,q.options.map(o=>o.text),q.answer,q.explanation,q.optionExplanations,q.result,q.explanationBlocks]),stemAndBlocksDuplicates:groups(q=>[q.stem,q.blocks]),stemOnlyDuplicates:groups(q=>q.stem)};
if(require.main===module){const file=process.argv[2];if(file)fs.writeFileSync(file,JSON.stringify(result,null,2)+'\n');else console.log(JSON.stringify(result,null,2));}
module.exports=result;
