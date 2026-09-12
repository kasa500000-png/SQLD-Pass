const path=require('node:path');
const {checkAdsRelease,codeHash}=require('../config/ads-config.cjs');
const root=path.resolve(__dirname,'..');
if(process.argv.includes('--hash'))console.log(codeHash(root));
else {const c=checkAdsRelease(root);console.log(`Ads configuration valid: ${c.mode}. Configuration checks are not device-QA evidence.`);}
