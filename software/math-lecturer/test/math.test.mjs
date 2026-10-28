import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {ROOT} from '../src/corpus.mjs';
import {betaLab,ejceLab,lab} from '../src/labs.mjs';
const close=(a,b,tol=2e-11)=>assert(Math.abs(a-b)<tol,`${a} != ${b}`);
test('Beta bounds agree with the closed-form perfect-history distribution',()=>{
 for(const n of [0,3,12,13,16,19,30])for(const m of [1,2,4]){
  const r=betaLab({n,successes:n,m});close(r.lower,(.05/m)**(1/(n+1)));close(r.risk,.8**(n+1));
  assert(r.sensitivity.afterSuccess.lower>r.lower);assert(r.sensitivity.afterFailure.lower<r.lower);close(r.sensitivity.afterSuccess.lower,(.05/m)**(1/(n+2)));
 }
 assert(!betaLab({n:3,successes:3}).passes);assert(betaLab({n:16,successes:16}).passes);
 assert.throws(()=>betaLab({n:3,successes:4}));assert.throws(()=>betaLab({n:NaN}));
});
test('EJCE teaching calculator reproduces all 96 archived configurations',()=>{
 const archive=JSON.parse(readFileSync(resolve(ROOT,'research/ejce/simulation_results.json')));
 for(const row of archive.rows){const r=ejceLab({N:row.n,r:row.r,d:row.d,profile:row.profile});close(r.R0,row.completion);close(r.R1,row.independent);close(r.R2,row.uncertainty);assert.equal(r.critical,row.critical);}
 assert.equal(archive.rows.length,96);assert.throws(()=>ejceLab({N:25,r:.25,d:2}));
});
test('Python teaching bridge reproduces an archived exhaustive-check case',async()=>{
 const archive=JSON.parse(readFileSync(resolve(ROOT,'research/injoit/numerical_results.json')));
 const reference=archive.small.find(x=>x.n===4&&x.seed===1);
 const r=await lab('allocation',{n:4,seed:1,T:2,C:3});close(r.exact.gain,reference.exactGain);assert(r.gap<=r.bound);assert(r.rounded.teacher<=2&&r.rounded.compute<=3);
 const zero=await lab('allocation',{n:2,seed:1,T:0,C:0});assert.equal(zero.exact.gain,0);
});
test('ODE bridge recovers both calibration modes and agrees with independent DOP853',async()=>{
 for(const mode of ['M','A']){const r=await lab('ode',{mode});assert(r.maxError<1e-9);assert(r.independentError<1e-9);assert.equal(r.observations.length,9);assert(r.trace.every(p=>p.x1>0&&p.x1<1&&p.x2>0&&p.x2<1));}
});
