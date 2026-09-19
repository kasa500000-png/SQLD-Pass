'use strict';
// Only touches this app on the explicitly named test device. Tap bounds come from
// a fresh UI Automator tree, never guessed screenshot coordinates.
const fs=require('node:fs'),path=require('node:path'),{execFileSync,spawnSync}=require('node:child_process');
const [action,serial,label='screen']=process.argv.slice(2);
if(!['capture','tap','scroll'].includes(action)||!serial)throw new Error('Usage: node scripts/android-qa.cjs capture|tap|scroll SERIAL LABEL');
const adb=(...args)=>execFileSync('adb',['-s',serial,...args],{maxBuffer:16*1024*1024,timeout:45000});
const temporary='/sdcard/sqld-pass-qa-'+Date.now()+'.xml';
const dump=spawnSync('adb',['-s',serial,'shell','uiautomator','dump',temporary],{encoding:'utf8',timeout:45000});
if(dump.error||dump.status!==0||/ERROR|null root/i.test(dump.stdout+dump.stderr)||!dump.stdout.includes(temporary))throw new Error('No fresh UI tree available. Wait for app startup and capture again.');
const xml=adb('exec-out','cat',temporary).toString('utf8');
adb('shell','rm',temporary);
if(!xml.includes('package="com.sqldpass.app.internal"'))throw new Error('SQLD Pass internal app is not foreground; no unrelated app screenshot captured.');
const decode=s=>s.replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
const nodes=[...xml.matchAll(/<node\s([^>]+)>/g)].map(m=>Object.fromEntries([...m[1].matchAll(/([\w-]+)="([^"]*)"/g)].map(x=>[x[1],decode(x[2])])));
if(action==='scroll'){
  const targets=nodes.filter(n=>n.scrollable==='true'&&n.class==='android.widget.ScrollView');
  if(targets.length!==1)throw new Error(`Expected one vertical scroller, found ${targets.length}`);
  const [x1,y1,x2,y2]=targets[0].bounds.match(/\d+/g).map(Number);
  const x=Math.floor((x1+x2)/2),top=Math.floor(y1+(y2-y1)*0.18),bottom=Math.floor(y1+(y2-y1)*0.82);
  adb('shell','input','swipe',String(x),String(label==='up'?top:bottom),String(x),String(label==='up'?bottom:top),'350');
  console.log('Scrolled within '+targets[0].bounds);
}else if(action==='tap'){
  let matches=nodes.filter(n=>(n.text===label||n['content-desc']===label)&&n.enabled==='true'&&n.bounds);
  matches=matches.filter(n=>{const [x1,y1,x2,y2]=n.bounds.match(/\d+/g).map(Number);return x2>x1&&y2>y1;});
  const clickable=matches.filter(n=>n.clickable==='true');if(clickable.length)matches=clickable;
  const unique=[...new Map(matches.map(n=>[n.bounds,n])).values()];
  if(unique.length!==1)throw new Error(`Expected one enabled '${label}', found ${unique.length}. Capture/scroll and inspect before retrying.`);
  const bounds=unique[0].bounds.match(/\d+/g).map(Number);if(bounds.length!==4)throw new Error('Invalid UI bounds');
  const x=Math.floor((bounds[0]+bounds[2])/2),y=Math.floor((bounds[1]+bounds[3])/2);
  adb('shell','input','tap',String(x),String(y));console.log(`Tapped '${label}' at ${x},${y} from current UI tree.`);
}else{
  const out=path.resolve(__dirname,'../.build/android-qa');fs.mkdirSync(out,{recursive:true});
  const file=label.replace(/[^a-zA-Z0-9_-]/g,'_');
  fs.writeFileSync(path.join(out,file+'.xml'),xml);
  fs.writeFileSync(path.join(out,file+'.png'),adb('exec-out','screencap','-p'));
  console.log(nodes.filter(n=>n.text||n['content-desc']).map(n=>`${n.clickable==='true'?'[button]':'[text]'} ${n['content-desc']||n.text} ${n.bounds}`).join('\n'));
  console.log(path.join(out,file+'.png'));
}
