import { betaQuantile } from '../../software/cop/src/model.mjs';
import { writeFileSync } from 'node:fs';
const out=new URL('./',import.meta.url);
export function binom(n,p){const a=Array(n+1).fill(0);for(let s=0;s<=n;s++){let c=1;for(let i=1;i<=s;i++)c=c*(n-i+1)/i;a[s]=c*p**s*(1-p)**(n-s);}return a;}
function tail(a,from){return a.slice(from).reduce((x,y)=>x+y,0);}
function complete(n,k,d,p,pAssist=.98){const x=binom(k,p),y=binom(n-d*k,pAssist);let z=0;for(let i=0;i<x.length;i++)for(let j=0;j<y.length;j++)if(d*i+j>=Math.ceil(.8*n-1e-12))z+=x[i]*y[j];return z;}
function critical(k,m=2){for(let x=0;x<=k;x++)if(betaQuantile(.05/m,1+x,1+k-x)>=.8)return x;return k+1;}
const profiles=[
 {id:'A',label:'Согласованное освоение',theta1:.95,theta2:.95,phi:.95,ready:true},
 {id:'B',label:'Зависимость от инструментальной помощи',theta1:.55,theta2:.55,phi:.55,ready:false},
 {id:'C',label:'Затруднение переноса',theta1:.95,theta2:.95,phi:.55,ready:false},
 {id:'D',label:'Пробел в одной предпосылке',theta1:.95,theta2:.55,phi:.55,ready:false}
];
const rows=[];
for(const n of [24,48,96])for(const r of [0,.25,.5,.75])for(const d of [1,2])for(const pr of profiles){
 const nIndependent=n*(1-r),k=nIndependent/d,nt=5,transfer=tail(binom(nt,pr.phi),4),c=critical(k);
 const completion=complete(n,k,d,pr.theta1)*complete(n,k,d,pr.theta2);
 const sourceMean=tail(binom(k,pr.theta1),Math.ceil(.8*k-1e-12))*tail(binom(k,pr.theta2),Math.ceil(.8*k-1e-12));
 const sourceBound=tail(binom(k,pr.theta1),c)*tail(binom(k,pr.theta2),c);
 rows.push({profile:pr.id,n,r,d,k,critical:c,completion,independent:sourceMean*transfer,uncertainty:sourceBound*transfer,transfer,sourceMean,sourceBound,validEvidence:2*k+nt,ready:pr.ready});
}
const primary=rows.filter(x=>x.n===48&&x.r===.5&&x.d===1);
const sensitivity=rows.filter(x=>x.profile==='A'&&x.r===.5&&x.d===1);
const repeated=rows.filter(x=>x.n===48&&x.r===.5&&x.d===2);
const tests={distributionMassMaxError:Math.max(...[3,6,12,24,48,96].flatMap(n=>[.55,.95,.98].map(p=>Math.abs(binom(n,p).reduce((a,b)=>a+b,0)-1)))),
 probabilityBounds:rows.every(x=>['completion','independent','uncertainty'].every(k=>x[k]>=0&&x[k]<=1+1e-12)),
 boundSubsetOfMean:rows.every(x=>x.uncertainty<=x.independent+1e-12),
 twoDifferentTransferProfilesShareSource:Math.abs(primary[0].sourceBound-primary[2].sourceBound)<1e-12,
 repeatedCannotRaiseVerifiedConfidence:repeated.every(x=>x.uncertainty<=primary.find(y=>y.profile===x.profile).uncertainty+1e-12)};
if(!Object.values(tests).every(x=>typeof x==='number'?x<1e-10:x))throw Error('Invariant failure');
const report={date:'2026-10-22',type:'Exact enumeration of synthetic binary evidence histories; no human participants, no Monte Carlo sample',profiles,parameters:{n:[24,48,96],assistanceShare:[0,.25,.5,.75],copiesPerFamily:[1,2],assistedSuccess:.98,transferTasks:5,transferRequired:4,sourceThreshold:.8,risk:.05,prerequisites:2},configurations:rows.length,policyEvaluations:rows.length*3,primary,sensitivity,repeated,tests,rows};
writeFileSync(new URL('simulation_results.json',out),JSON.stringify(report,null,2));
const cols=Object.keys(rows[0]);writeFileSync(new URL('simulation_results.csv',out),cols.join(',')+'\n'+rows.map(x=>cols.map(k=>x[k]).join(',')).join('\n'));
console.log(JSON.stringify({...report,rows:undefined},null,2));
