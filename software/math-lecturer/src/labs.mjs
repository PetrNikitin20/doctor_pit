import './env.mjs';
import {betaCdf,betaQuantile} from '../../cop/src/model.mjs';
import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
export const APP=resolve(fileURLToPath(new URL('../',import.meta.url)));
export function number(value,low,high,name,integer=false){const n=Number(value);if(!Number.isFinite(n)||n<low||n>high||(integer&&!Number.isInteger(n)))throw Object.assign(Error(`Параметр ${name}: допустимо ${low}…${high}${integer?', целое число':''}`),{status:400});return n;}
export function betaLab(p={}){
 const n=number(p.n??16,0,200,'n',true),successes=number(p.successes??n,0,n,'успехи',true),m=number(p.m??2,1,8,'m',true);
 const tau=number(p.tau??.8,.05,.99,'τ'),delta=number(p.delta??.05,.001,.3,'δ');
 const a=1+successes,b=1+n-successes,lower=betaQuantile(delta/m,a,b),risk=betaCdf(tau,a,b);
 const curve=Array.from({length:101},(_,i)=>{const x=i/100;return {x,cdf:betaCdf(x,a,b)};});
 const example=[16,24].map(a=>({a,b:1,risk:betaCdf(tau,a,1)}));
 const sensitivity={afterSuccess:{a:a+1,b,mean:(a+1)/(a+b+1),lower:betaQuantile(delta/m,a+1,b)},afterFailure:{a,b:b+1,mean:a/(a+b+1),lower:betaQuantile(delta/m,a,b+1)},rule:'При добавлении успеха a увеличивается на 1, b не меняется; среднее и нижняя граница растут. При добавлении неудачи a не меняется, b увеличивается на 1; среднее и нижняя граница уменьшаются. Остальные параметры фиксированы.'};
 return {kind:'beta',input:{n,successes,m,tau,delta},a,b,mean:a/(a+b),lower,risk,individualBudget:delta/m,passes:lower>=tau,curve,sensitivity,minimumPerfect:Math.ceil(Math.log(delta/m)/Math.log(tau))-1,example,scope:'Только статистическая часть допуска; структура, перенос и качество данных проверяются отдельно.'};
}
function binom(n,p){const rows=[];for(let k=0;k<=n;k++){let c=1;for(let j=1;j<=k;j++)c=c*(n-j+1)/j;rows.push(c*p**k*(1-p)**(n-k));}return rows;}
const tail=(a,k)=>a.slice(k).reduce((s,x)=>s+x,0);
export function ejceLab(p={}){
 const N=number(p.N??48,8,96,'N',true),r=number(p.r??.5,0,.75,'r'),d=number(p.d??1,1,2,'d',true);
 const k=N*(1-r)/d,assisted=N*r;
 if(!Number.isInteger(k)||!Number.isInteger(assisted))throw Object.assign(Error('N, r и d должны давать целое число самостоятельных семейств и записей с помощью'),{status:400});
 const profiles={A:[.95,.95,.95],B:[.55,.55,.55],C:[.95,.95,.55],D:[.95,.55,.55]};
 const profile=p.profile??'B';if(!profiles[profile])throw Object.assign(Error('Неизвестный профиль'),{status:400});
 const [theta1,theta2,phi]=profiles[profile];let critical=k+1;
 for(let s=0;s<=k;s++)if(betaQuantile(.025,1+s,1+k-s)>=.8){critical=s;break;}
 const transfer=tail(binom(5,phi),4),meanThreshold=Math.ceil(.8*k-1e-12);
 const complete=theta=>{let z=0;const x=binom(k,theta),y=binom(assisted,.98);for(let i=0;i<x.length;i++)for(let j=0;j<y.length;j++)if(d*i+j>=Math.ceil(.8*N-1e-12))z+=x[i]*y[j];return z;};
 const R0=complete(theta1)*complete(theta2),R1=transfer*tail(binom(k,theta1),meanThreshold)*tail(binom(k,theta2),meanThreshold),R2=transfer*tail(binom(k,theta1),critical)*tail(binom(k,theta2),critical);
 return {kind:'ejce',input:{N,r,d,profile},k,theta1,theta2,phi,transfer,critical,meanThreshold,R0,R1,R2,scope:'Точные конечные суммы в заданной синтетической модели. Доли профилей в реальной группе не оценивались.'};
}
export function runPython(script,input,{timeout=90000}={}){
 return new Promise((resolveResult,reject)=>{
  const child=spawn(process.env.PYTHON_EXE||'python',[resolve(APP,script)],{windowsHide:true,env:{...process.env,PYTHONIOENCODING:'utf-8'},stdio:['pipe','pipe','pipe']});
  let out='',err='',settled=false;
  const timer=setTimeout(()=>{child.kill();finish(Error('Расчёт превысил допустимое время. Уменьшите размер задачи.'));},timeout);
  function finish(error,value){if(settled)return;settled=true;clearTimeout(timer);error?reject(error):resolveResult(value);}
  child.on('error',()=>finish(Error('Не найден Python для вычислений. Укажите PYTHON_EXE в .env.local.')));
  child.stdout.on('data',b=>{out+=b;if(out.length>8_000_000){child.kill();finish(Error('Слишком большой результат расчёта'));}});
  child.stderr.on('data',b=>{err=(err+b).slice(-5000);});
  child.on('close',code=>{if(code!==0)return finish(Error(err.split('\n').filter(Boolean).at(-1)||'Ошибка вычислительного модуля'));try{const result=JSON.parse(out);if(result.error)finish(Error(result.error));else finish(null,result);}catch{finish(Error('Вычислительный модуль вернул неверный формат'));}});
  child.stdin.end(JSON.stringify(input));
 });
}
let computing=false;
export async function lab(kind,p={}){
 if(!p||typeof p!=='object'||Array.isArray(p))throw Object.assign(Error('Параметры лаборатории должны быть объектом'),{status:400});
 if(kind==='beta')return betaLab(p);if(kind==='ejce')return ejceLab(p);
 if(!['allocation','ode'].includes(kind))throw Object.assign(Error('Неизвестная лаборатория'),{status:400});
 if(computing)throw Object.assign(Error('Один расчёт уже выполняется. Дождитесь результата.'),{status:429});
 if(kind==='allocation'){number(p.n??6,2,12,'S',true);number(p.seed??1,1,100,'seed',true);number(p.T??5,0,60,'T',true);number(p.C??8,0,100,'C',true);number(p.epsilon??.0001,.000001,.1,'ε');}
 if(kind==='ode'){
  const bounds={X1:[.1,.9],lambda1:[.01,.8],eta1:[.05,.8],X2:[.1,.9],lambda2:[.05,.8],eta2:[.05,.8],alpha1:[.1,2],alpha2:[.1,2],beta:[.05,2],h:[.05,4]};
  for(const [key,val]of Object.entries(p))if(key in bounds)number(val,...bounds[key],key);
  if(p.mode&&!['M','A'].includes(p.mode))throw Object.assign(Error('Режим должен быть M или A'),{status:400});
 }
 computing=true;try{return await runPython('scripts/lab_bridge.py',{...p,kind});}finally{computing=false;}
}
