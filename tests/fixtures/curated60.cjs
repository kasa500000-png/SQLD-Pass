const path=require('node:path');
module.exports=()=>require('../../scripts/add-curated-volume.cjs').addCuratedVolume(require('./mock40.cjs')(),path.resolve(__dirname,'../..'));
