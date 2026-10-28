import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const base=process.env.LECTURER_URL||'http://127.0.0.1:3210';
async function request(path,options={}){const r=await fetch(base+path,{...options,signal:AbortSignal.timeout(10000)}),data=await r.json();if(!r.ok)throw Error(data.error||String(r.status));return data;}
const file=await readFile(new URL('../examples/upload-example.tex',import.meta.url));
const item=await request('/api/library',{method:'POST',headers:{'Content-Type':'application/octet-stream','X-Filename':'upload-example.tex','X-Title':encodeURIComponent('Учебный пример: экспоненциальное забывание')},body:file});
const course=await request('/api/course'),lesson=course.lessons.find(l=>l.libraryId===item.id);
assert(lesson);
const start=Date.now(),events=[];let first=null,cursor=0,finished=false,answer='';
const job=await request('/api/chat-jobs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({lessonId:lesson.id,detail:'brief',history:[],question:'Какие значения X и λ заданы в загруженном учебном примере об экспоненциальном забывании? Ответь одним предложением со ссылкой на источник.'})});
try{
 while(!finished){
  if(Date.now()-start>300000)throw Error('Live answer exceeded five minutes');
  const state=await request('/api/chat-jobs/'+job.id+'?after='+cursor);cursor=state.cursor;finished=state.finished;
  for(const event of state.events){events.push(event);if(event.type==='token'){answer+=event.data.text;first??=Date.now()-start;}if(event.type==='error')throw Error(event.data.error);}
  if(!finished)await new Promise(r=>setTimeout(r,1000));
 }
 const references=events.find(e=>e.type==='sources')?.data.references||[];
 const checks={initialState:/0[.,]65/.test(answer),forgettingRate:/0[.,]22/.test(answer),sourceCitation:/\[S1\]/.test(answer),uploadedSource:references.some(s=>s.libraryId===item.id),focusedContext:references.every(s=>s.libraryId===item.id),completed:events.some(e=>e.type==='done')};
 const result={firstTokenMs:first,durationMs:Date.now()-start,answer,checks,pollsUseIndependentRequests:true,sourceCount:references.length};
 if(process.argv[2])await writeFile(process.argv[2],JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));assert(Object.values(checks).every(Boolean));
}finally{if(!finished)await request('/api/chat-jobs/'+job.id+'/cancel',{method:'POST'}).catch(()=>{});}
