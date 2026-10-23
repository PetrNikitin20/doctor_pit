import { betaCdf, betaQuantile, simulate } from '../../software/cop/src/model.mjs';
import { writeFileSync } from 'node:fs';
const output = new URL('./', import.meta.url);
// For positive integer a,b: I_x(a,b)=Pr{Bin(a+b-1,x)>=a}.
// A nonnegative binomial sum provides an independent reference to the continued fraction.
function choose(n,k){let c=1;for(let i=1;i<=k;i++) c=c*(n-i+1)/i;return c;}
function referenceCdf(x,a,b){const n=a+b-1;let y=0;for(let k=a;k<=n;k++) y+=choose(n,k)*x**k*(1-x)**(n-k);return y;}
function referenceQuantile(p,a,b){let l=0,r=1;for(let j=0;j<60;j++){const x=(l+r)/2;if(referenceCdf(x,a,b)<p)l=x;else r=x;}return (l+r)/2;}
const grid=[];let error=0,residual=0;
for(let n=0;n<=60;n++)for(let s=0;s<=n;s++)for(const m of [1,2,4]){
  const a=1+s,b=1+n-s,p=.05/m,q=betaQuantile(p,a,b),reference=referenceQuantile(p,a,b);
  error=Math.max(error,Math.abs(q-reference));residual=Math.max(residual,Math.abs(referenceCdf(q,a,b)-p));
  grid.push({n,s,f:n-s,m,p,q,reference,mean:a/(a+b),ready:q>=.8});
}
const perfect=[2,3,5,12,13,16,19,20,30].map(n=>({n,mean:(n+1)/(n+2),q1:betaQuantile(.05,n+1,1),q2:betaQuantile(.025,n+1,1),q4:betaQuantile(.0125,n+1,1)}));
const minimum=[1,2,4].map(m=>({m,n:grid.find(x=>x.s===x.n&&x.m===m&&x.ready).n}));
const cases=[[13,0],[12,1],[16,0],[19,1],[20,0],[30,2]].map(([s,f])=>({s,f,mean:(1+s)/(2+s+f),q1:betaQuantile(.05,1+s,1+f),q2:betaQuantile(.025,1+s,1+f),q4:betaQuantile(.0125,1+s,1+f)}));
const simulations=[32,128,512,2048].map(n=>({n,linear:simulate({algorithm:'linear',n,target:n-1,seed:17}).comparisons,binary:simulate({algorithm:'binary',n,target:n-1,seed:17}).comparisons,insertion:simulate({algorithm:'insertion',n,seed:17}).comparisons,merge:simulate({algorithm:'merge',n,seed:17}).comparisons}));
const report={date:'2026-10-22',sourceCommit:'992f964e82e30d678a73965bd29daeec18a04bf0',prior:[1,1],delta:.05,tau:.8,gridSize:grid.length,maxQuantileAbsoluteError:error,maxIndependentCdfResidual:residual,minimum,perfect,cases,simulations,limitations:'Synthetic deterministic numerical experiment. No student records or pedagogical outcome data. Numerical comparisons concern integer Beta shapes and the stated finite grid only.'};
writeFileSync(new URL('numerical_results.json',output),JSON.stringify(report,null,2));
writeFileSync(new URL('numerical_grid.csv',output),'n,s,f,m,p,q,reference,mean,ready\n'+grid.map(x=>Object.values(x).join(',')).join('\n'));
console.log(JSON.stringify(report,null,2));
