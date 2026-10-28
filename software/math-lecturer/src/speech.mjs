import {spawn} from 'node:child_process';
import {mkdir,writeFile,unlink,access} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {APP} from './labs.mjs';
let busy=false;
export async function speech(folder,text,voice='',operation='speak'){
 if(process.platform!=='win32')throw Error('На этой системе используйте голоса браузера');
 if(busy)throw Object.assign(Error('Озвучка уже готовится. Дождитесь завершения.'),{status:429});
 if(typeof text!=='string'||text.length>12000)throw Object.assign(Error('Для одной озвучки допускается до 12000 символов'),{status:400});
 await mkdir(folder,{recursive:true});
 const hash=createHash('sha256').update(text+'\n'+voice).digest('hex');const output=resolve(folder,hash+'.wav');
 if(operation==='speak'){try{await access(output);return {url:'/audio/'+hash+'.wav',voice,cached:true};}catch{}}
 const request=resolve(folder,randomUUID()+'.json');await writeFile(request,JSON.stringify({operation,text,voice,output}));busy=true;
 try{
  const value=await new Promise((yes,no)=>{
   const exe=resolve(process.env.SystemRoot||'C:/Windows','System32/WindowsPowerShell/v1.0/powershell.exe');
   const c=spawn(exe,['-NoProfile','-ExecutionPolicy','Bypass','-File',resolve(APP,'scripts/speech.ps1'),'-RequestPath',request],{windowsHide:true});
   let out='',err='';const timer=setTimeout(()=>{c.kill();no(Error('Не удалось подготовить озвучку за 90 секунд'));},90000);
   c.stdout.on('data',x=>out+=x);c.stderr.on('data',x=>err+=x);c.on('error',error=>{clearTimeout(timer);no(error);});
   c.on('close',code=>{clearTimeout(timer);if(code)return no(Error('Русская озвучка Windows недоступна. Можно использовать голоса браузера.'));try{yes(JSON.parse(out.replace(/^\uFEFF/,'')));}catch{no(Error('Неверный ответ службы озвучки'));}});
  });return operation==='voices'?value:{...value,url:'/audio/'+hash+'.wav'};
 }finally{busy=false;await unlink(request).catch(()=>{});}
}
