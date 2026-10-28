import {writeFile} from 'node:fs/promises';
const base=process.env.LECTURER_URL||'http://127.0.0.1:3210';
const start=Date.now(),events=[];let answer='',first=null,buffer='';
const response=await fetch(base+'/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({lessonId:'sitito-beta',detail:'brief',history:[],question:'Было три самостоятельных успеха из трёх, prior Beta(1,1), две предпосылки, общий риск 0,05. Чему равны a,b, среднее и нижняя граница? Проверь калькулятором. Ответь кратко: не больше 6 предложений.'}),signal:AbortSignal.timeout(300000)});
if(!response.ok)throw Error(await response.text());
const decoder=new TextDecoder();
function event(frame){
 const type=frame.match(/^event: (.*)$/m)?.[1],value=frame.match(/^data: (.*)$/m)?.[1];if(!value)return;
 const data=JSON.parse(value);events.push({type,data,elapsedMs:Date.now()-start});
 if(type==='token'){answer+=data.text;if(first===null){first=Date.now()-start;console.log('First answer token:',first,'ms');}}
 if(type==='tool')console.log('Calculator invoked:',data.name);
 if(type==='error')throw Error(data.error);
}
for await(const chunk of response.body){buffer+=decoder.decode(chunk,{stream:true});let at;while((at=buffer.indexOf('\n\n'))>=0){event(buffer.slice(0,at));buffer=buffer.slice(at+2);}}
const plain=answer.replace(/[*${}]/g,'');
const numeric=Array.from(plain.matchAll(/\d+[.,]\d+/g),m=>Number(m[0].replace(',','.')));
const checks={posterior:/Beta\s*\(\s*4\s*[,;]\s*1\s*\)/i.test(plain)||(/a\s*[=$:]*\s*4\b/.test(plain)&&/b\s*[=$:]*\s*1\b/.test(plain)),mean:numeric.some(x=>Math.abs(x-.8)<1e-8),lower:numeric.some(x=>Math.abs(x-.025**.25)<.001),riskBudget:numeric.some(x=>Math.abs(x-.025)<1e-8),noInternalTags:!/<think>|<\/think>/.test(answer),completed:events.some(e=>e.type==='done')&&!events.some(e=>e.type==='notice'&&e.data.kind!=='calculation-provenance')};
const result={firstTokenMs:first,durationMs:Date.now()-start,answer,checks,tools:events.filter(e=>e.type==='tool'),notices:events.filter(e=>e.type==='notice'),sourceCount:events.find(e=>e.type==='sources')?.data.references.length};
if(process.argv[2])await writeFile(process.argv[2],JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
if(!Object.values(checks).every(Boolean))process.exitCode=1;
