const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto');
const raw=zlib.gunzipSync(fs.readFileSync(path.join(__dirname,'textbook20-034.json.gz')));
if(crypto.createHash('sha256').update(raw).digest('hex')!=='1f7a60245d9b75a19ad733dca7fc281539d73ebdc0fcfa25fd5a959ebd7d589d')throw Error('0.3.4 baseline changed');
module.exports=JSON.parse(raw);
