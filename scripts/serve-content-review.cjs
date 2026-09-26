'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const file=path.resolve(__dirname,'../.build/content-review/index.html');
if(!fs.existsSync(file))throw new Error('Run node scripts/export-content-review.cjs first.');
http.createServer((req,res)=>{
  if(req.method!=='GET'||!['/','/index.html'].includes(req.url)){res.writeHead(404);res.end();return;}
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  fs.createReadStream(file).pipe(res);
}).listen(4180,'127.0.0.1',()=>console.log('SQLD Pass review: http://127.0.0.1:4180 (local only)'));
