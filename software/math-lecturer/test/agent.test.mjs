import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {streamModel,calculationContext,betaNarrativeCorrection} from '../src/agent.mjs';
import {betaLab} from '../src/labs.mjs';
async function fakeModel(thinking,handler,exercise){
 const previous={LLM_BASE_URL:process.env.LLM_BASE_URL,LLM_PROVIDER:process.env.LLM_PROVIDER,LLM_MODEL:process.env.LLM_MODEL};
 const server=http.createServer(async(req,res)=>{
  let raw='';for await(const b of req)raw+=b;const p=JSON.parse(raw);
  res.setHeader('Content-Type','application/json; charset=utf-8');
  if(req.url==='/api/show')return res.end(JSON.stringify({thinking}));
  handler(p,res);
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));
 process.env.LLM_BASE_URL=`http://127.0.0.1:${server.address().port}`;process.env.LLM_PROVIDER='ollama';process.env.LLM_MODEL='test-model';
 try{await exercise();}finally{await new Promise(r=>server.close(r));for(const [key,value]of Object.entries(previous))if(value===undefined)delete process.env[key];else process.env[key]=value;}
}
test('Thinking-only metadata uses a separated channel and never forwards it',async()=>{
 const events=[];await fakeModel({values:[true],default:true},(p,res)=>{
  assert.equal(p.think,true);
  res.write(JSON.stringify({message:{thinking:'INTERNAL_TEST_ONLY'}})+'\n');
  const bytes=Buffer.from(JSON.stringify({message:{content:'Ответ: альфа равна 0,5.'}})+'\n');
  for(const b of bytes)res.write(Buffer.from([b]));res.end();
 },async()=>{await streamModel([{role:'user',content:'Вопрос'}],(type,data)=>events.push({type,data}));});
 assert.equal(events.filter(e=>e.type==='token').map(e=>e.data.text).join(''),'Ответ: альфа равна 0,5.');
 assert(!JSON.stringify(events).includes('INTERNAL_TEST_ONLY'));
});
test('Lab context preserves every scalar diagnostic and chosen action without chart truncation',()=>{
 const result={kind:'ode',trace:Array.from({length:121},()=>({x1:.2})),curve:[.3],maxError:1e-12,sigmaMin:.0123,requests:[{chosen:'d1q3',gain:.12,alternatives:[{id:'a'}]}]};
 const context=calculationContext(result);assert.equal(context.maxError,1e-12);assert.equal(context.sigmaMin,.0123);assert.equal(context.requests[0].chosen,'d1q3');
 assert(!('trace'in context));assert(!('curve'in context));assert(!('alternatives'in context.requests[0]));assert.equal(result.trace.length,121);assert.equal(result.requests[0].alternatives.length,1);
});
test('A reversed Beta monotonicity claim receives a computed correction',()=>{
 const r=betaLab({n:3,successes:3,m:2}),wrong='При увеличении числа успехов среднее растёт, а нижняя граница падает.';
 const correction=betaNarrativeCorrection(wrong,r);assert.equal(correction.kind,'math-correction');assert(correction.text.includes('0,478176'));
 assert.equal(betaNarrativeCorrection('При добавлении успеха нижняя граница растёт.',r),null);
 assert.equal(betaNarrativeCorrection(wrong,{kind:'ode'}),null);
});
test('Calculator tool calls execute a bounded real calculation before the final answer',async()=>{
 const events=[];let calls=0;
 await fakeModel({values:[false],default:false},(p,res)=>{
  assert.equal(p.think,false);calls++;
  if(calls===1)return res.end(JSON.stringify({message:{tool_calls:[{function:{name:'calculate_beta',arguments:{n:3,successes:3,m:2}}}]}})+'\n');
  const tool=p.messages.find(m=>m.role==='tool'),result=JSON.parse(tool.content);assert.equal(result.a,4);assert.equal(result.b,1);assert(Math.abs(result.lower-.025**.25)<1e-12);
  res.end(JSON.stringify({message:{content:'Среднее 0,8; нижняя граница примерно 0,3976.'}})+'\n');
 },async()=>{await streamModel([{role:'user',content:'Проверь пример'}],(type,data)=>events.push({type,data}));});
 assert.equal(calls,2);assert.equal(events.filter(e=>e.type==='tool').length,1);
});
test('A calculator claim without a tool result is visibly marked as unverified',async()=>{
 const events=[];await fakeModel({values:[false]},(p,res)=>res.end(JSON.stringify({message:{content:'Калькулятор подтверждает.'}})+'\n'),async()=>{
  await streamModel([{role:'user',content:'Проверь калькулятором'}],(type,data)=>events.push({type,data}));
 });
 assert.equal(events.filter(e=>e.type==='tool').length,0);
 assert(events.some(e=>e.type==='notice'&&e.data.kind==='calculation-provenance'));
 const grounded=[];await fakeModel({values:[false]},(p,res)=>res.end(JSON.stringify({message:{content:'Готовый результат получен.'}})+'\n'),async()=>{
  await streamModel([{role:'user',content:'Проверь калькулятором'}],(type,data)=>grounded.push({type,data}),undefined,{hasVerifiedCalculation:true});
 });
 assert(!grounded.some(e=>e.type==='notice'));
});
