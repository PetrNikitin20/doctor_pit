import test from 'node:test';
import assert from 'node:assert/strict';
import {ChatJobs} from '../src/chat-jobs.mjs';
test('Long answers survive independent polling without losing or duplicating events',async()=>{
 const jobs=new ChatJobs();let resume;const gate=new Promise(r=>resume=r);
 const {id}=jobs.start(async emit=>{emit('token',{text:'Начало'});await gate;emit('token',{text:' и конец'});return {model:'test'};});
 const first=jobs.read(id);assert.equal(first.finished,false);assert.equal(first.events[0].data.text,'Начало');
 assert.throws(()=>jobs.start(async()=>{}),e=>e.status===429);
 resume();await jobs.jobs.get(id).settled;
 const rest=jobs.read(id,first.cursor);assert.equal(rest.finished,true);assert.equal(rest.events.length,2);assert.equal(rest.events[0].data.text,' и конец');assert.equal(rest.events[1].type,'done');
 assert.equal(jobs.read(id,rest.cursor).events.length,0);assert.throws(()=>jobs.read(id,-1),e=>e.status===400);
});
test('Cancellation and failed generation release the single local model slot',async()=>{
 const jobs=new ChatJobs({limit:2});
 const {id}=jobs.start(async(emit,signal)=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('Stopped','AbortError')),{once:true})));
 jobs.cancel(id);await jobs.jobs.get(id).settled;
 assert.equal(jobs.active,false);assert.equal(jobs.read(id).events[0].data.error,'Генерация остановлена');
 const failed=jobs.start(async()=>{throw Error('Test failure');});await jobs.jobs.get(failed.id).settled;assert.equal(jobs.active,false);
 const next=jobs.start(async()=>({}));await jobs.jobs.get(next.id).settled;assert.equal(jobs.jobs.size,2);assert.throws(()=>jobs.read(id),e=>e.status===404);
});
