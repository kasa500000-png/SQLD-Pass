const path=require('node:path');
module.exports=()=>require('../../scripts/add-mock-volumes.cjs').addMockVolumes(structuredClone(require('./textbook20.cjs')),path.resolve(__dirname,'../..'));
