const {test}=require('node:test');
const assert=require('node:assert/strict');
const {canRelease}=require('../.build/core/domain.js');
const content=require('../generated/content.json');
const sourceLock=require('../content-pack/content.lock.json');

function receipt(overrides={}) {
  return {schemaVersion:1,approved:true,contentSha256:sourceLock.sha256,contentVersion:sourceLock.contentVersion,...overrides};
}

test('matching external receipt permits the unchanged draft source and does not change its flags',()=>{
  const original=JSON.stringify(content);
  assert.equal(content.manifest.releaseReady,false);
  assert.equal(content.manifest.humanReviewed,false);
  assert.equal(content.manifest.officialSyllabusVerified,false);
  assert.equal(canRelease(content,receipt(),sourceLock),true);
  assert.equal(JSON.stringify(content),original);
});

test('missing or malformed approval fails closed without throwing',()=>{
  for(const value of [undefined,null,false,true,1,'approved',[],{},receipt({schemaVersion:2}),receipt({schemaVersion:'1'}),receipt({approved:false}),receipt({approved:'true'}),receipt({contentSha256:undefined}),receipt({contentVersion:undefined})]) {
    assert.equal(canRelease(content,value,sourceLock),false);
  }
});

test('approval is bound to the exact source hash and both source and runtime content versions',()=>{
  assert.equal(canRelease(content,receipt({contentSha256:'0'.repeat(64)}),sourceLock),false);
  assert.equal(canRelease(content,receipt({contentSha256:sourceLock.sha256.toUpperCase()}),sourceLock),false);
  assert.equal(canRelease(content,receipt({contentVersion:'another-pack'}),sourceLock),false);
  assert.equal(canRelease({...content,manifest:{...content.manifest,version:'another-pack'}},receipt(),sourceLock),false);
  const other={...sourceLock,contentVersion:'another-pack'};
  assert.equal(canRelease(content,receipt({contentVersion:other.contentVersion}),other),false);
});

test('missing or damaged source identity cannot authorize production',()=>{
  for(const value of [undefined,null,[],{}, {...sourceLock,schema:2},{...sourceLock,schema:'1'},
    {...sourceLock,sha256:'invalid'},{...sourceLock,sha256:'0'.repeat(63)},
    {...sourceLock,sha256:sourceLock.sha256.toUpperCase()},{...sourceLock,contentVersion:''},
    {...sourceLock,contentVersion:' '+sourceLock.contentVersion}]) {
    assert.equal(canRelease(content,receipt(),value),false);
  }
});

test('editorial approval flags alone cannot bypass the external receipt gate',()=>{
  const allFlagsApproved={...content,
    manifest:{...content.manifest,releaseReady:true,humanReviewed:true,officialSyllabusVerified:true},
    lessons:content.lessons.map(l=>({...l,releaseReady:true,humanReviewed:true})),
    questions:Object.fromEntries(Object.entries(content.questions).map(([id,q])=>[id,{...q,releaseReady:true,humanReviewed:true}]))
  };
  assert.equal(canRelease(allFlagsApproved),false);
  assert.equal(canRelease(allFlagsApproved,undefined,sourceLock),false);
  assert.equal(canRelease(allFlagsApproved,receipt({approved:false}),sourceLock),false);
});
