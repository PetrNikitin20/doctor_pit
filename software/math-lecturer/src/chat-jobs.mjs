import {randomUUID} from 'node:crypto';

// Browser requests stay short while slow local inference runs independently.
// Only this process's bounded, temporary answer buffers are kept in memory.
export class ChatJobs {
 constructor({timeout=600000,retention=3600000,limit=12}={}){this.timeout=timeout;this.retention=retention;this.limit=limit;this.jobs=new Map();}
 get active(){return [...this.jobs.values()].some(j=>!j.finished);}
 start(run){
  if(this.active)throw Object.assign(Error('Лектор уже отвечает. Дождитесь ответа или остановите его.'),{status:429});
  for(const [id,j]of this.jobs)if(j.finished&&Date.now()-j.at>this.retention)this.jobs.delete(id);
  while(this.jobs.size>=this.limit)this.jobs.delete(this.jobs.keys().next().value);
  const id=randomUUID(),controller=new AbortController(),job={id,controller,events:[],finished:false,at:Date.now()};this.jobs.set(id,job);
  const emit=(type,data)=>job.events.push({type,data});
  const timer=setTimeout(()=>controller.abort(),this.timeout);
  job.settled=(async()=>{
   try{const result=await run(emit,controller.signal);emit('done',result||{});}
   catch(error){emit('error',{error:error.name==='AbortError'?'Генерация остановлена':error.message});}
   finally{clearTimeout(timer);job.finished=true;job.at=Date.now();}
  })();
  return {id};
 }
 read(id,after=0){
  const job=this.jobs.get(id);if(!job)throw Object.assign(Error('Сеанс ответа не найден. Повторите вопрос.'),{status:404});
  const cursor=Number(after);if(!Number.isInteger(cursor)||cursor<0||cursor>job.events.length)throw Object.assign(Error('Неверная позиция ответа'),{status:400});
  return {id,events:job.events.slice(cursor),cursor:job.events.length,finished:job.finished};
 }
 cancel(id){const job=this.jobs.get(id);if(!job)throw Object.assign(Error('Сеанс ответа не найден'),{status:404});job.controller.abort();return {ok:true};}
}
