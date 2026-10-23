"""Reproducible numerical study. Synthetic requests, no student records.
Python standard library only. Exact Fraction probabilities and reference optimizer.
"""
from fractions import Fraction as F
from functools import lru_cache
from math import comb,prod,floor
from pathlib import Path
from time import perf_counter
from statistics import mean,median
import json,csv,platform,hashlib,itertools
B=Path(__file__).parent
TAU=F(4,5);DELTA=F(1,20);C_BAD=F(10);C_WAIT=F(1);C_DIAG=F(1,100)

@lru_cache(None)
def cdf(a,b):
    n=a+b-1
    return F(sum(comb(n,l)*4**l for l in range(a,n+1)),5**n)

def readiness(state):
    f=[cdf(*pair) for pair in state]
    return prod(1-x for x in f),sum(f)<=DELTA

@lru_cache(None)
def terminal(state):
    p,allowed=readiness(state)
    choices=[(C_WAIT*p,'defer')]
    if allowed:choices.append((C_BAD*(1-p),'advance'))
    return min(choices)

def rising(a,n):return prod(range(a,a+n))

def predictive(a,b,q):
    probs=[F(comb(q,h)*rising(a,h)*rising(b,q-h),rising(a+b,q)) for h in range(q+1)]
    assert sum(probs)==1
    return probs

@lru_cache(None)
def diagnostic(state,j,q):
    a,b=state[j];value=C_DIAG*q
    for h,prob in enumerate(predictive(a,b,q)):
        new=list(state);new[j]=(a+h,b+q-h)
        value+=prob*terminal(tuple(new))[0]
    return value

class LCG:
    def __init__(self,seed):self.x=seed
    def next(self):self.x=(1664525*self.x+1013904223)&0xffffffff;return self.x

HIST=[(n-f+1,f+1) for n in [8,12,16,20,24,32,40,48,64] for f in range(min(6,n)+1)]
# Predefined near-boundary library: at least one useful q=1 or q=3 observation.
LIB=[]
for a in HIST:
    for b in HIST:
        st=(a,b);v,_=terminal(st)
        if any(diagnostic(st,j,q)<v for j in [0,1] for q in [1,3]):LIB.append(st)
assert LIB

def instance(n,seed):
    rng=LCG(seed);out=[]
    for i in range(n):
        # Each fourth request is sampled without near-boundary enrichment.
        if i%4==3:st=(HIST[rng.next()%len(HIST)],HIST[rng.next()%len(HIST)])
        else:st=LIB[rng.next()%len(LIB)]
        base,act=terminal(st)
        options=[{'id':act,'t':0,'c':0,'g':F(0),'loss':base}]
        for j in [0,1]:
            for q in [1,3]:
                t=q+(rng.next()%3);c=q*(1+rng.next()%4)
                value=diagnostic(st,j,q);gain=base-value
                if gain>0:options.append({'id':f'd{j+1}q{q}','t':t,'c':c,'g':gain,'loss':value})
        out.append({'state':st,'base':base,'options':options})
    return out

def prune(states,C):
    """Remove resource-dominated states using a prefix maximum Fenwick tree."""
    bit=[None]*(C+2);out={}
    for (t,c),(v,path) in sorted(states.items()):
        k=c+1;best=None
        while k:
            if bit[k] is not None and (best is None or bit[k]>best):best=bit[k]
            k-=k&-k
        if best is not None and best>=v:continue
        out[t,c]=(v,path);k=c+1
        while k<len(bit):
            if bit[k] is None or v>bit[k]:bit[k]=v
            k+=k&-k
    return out

def solve(data,T,C,eps=None):
    states={(0,0):(0,())};peak=1;transitions=0
    for req in data:
        scored=[(ai,a['t'],a['c'],a['g'] if eps is None else a['g']//eps) for ai,a in enumerate(req['options'])]
        nxt={}
        for (t,c),(v,path) in states.items():
            for ai,at,ac,ag in scored:
                tt=t+at;cc=c+ac
                if tt>T or cc>C:continue
                transitions+=1
                vv=v+ag
                old=nxt.get((tt,cc))
                if old is None or vv>old[0]:nxt[tt,cc]=(vv,path+(ai,))
        states=prune(nxt,C);peak=max(peak,len(states))
    (t,c),(value,path)=max(states.items(),key=lambda x:(x[1][0],-x[0][0],-x[0][1]))
    gain=sum(data[i]['options'][a]['g'] for i,a in enumerate(path))
    return {'gain':gain,'path':path,'teacher':t,'compute':c,'peak':peak,'transitions':transitions}

def greedy(data,T,C):
    candidates=[]
    for i,req in enumerate(data):
        for ai,a in enumerate(req['options'][1:],1):
            score=a['g']/F(a['t']*C+a['c']*T,T*C)
            candidates.append((score,i,ai))
    t=c=0;path=[0]*len(data)
    for _,i,ai in sorted(candidates,reverse=True):
        a=data[i]['options'][ai]
        if not path[i] and t+a['t']<=T and c+a['c']<=C:
            path[i]=ai;t+=a['t'];c+=a['c']
    return {'gain':sum(data[i]['options'][a]['g'] for i,a in enumerate(path)),'path':path,'teacher':t,'compute':c}

def exhaustive(data,T,C):
    best=F(-1);count=0
    for path in itertools.product(*(range(len(r['options'])) for r in data)):
        choices=[r['options'][a] for r,a in zip(data,path)]
        if sum(a['t'] for a in choices)<=T and sum(a['c'] for a in choices)<=C:
            count+=1;best=max(best,sum(a['g'] for a in choices))
    return best,count

def enc(x):
    if isinstance(x,F):return float(x)
    if isinstance(x,Path):return str(x)
    raise TypeError(type(x))

def run():
    small=[]
    for n in [4,6,8]:
        for seed in range(1,11):
            data=instance(n,seed);T=max(2,3*n//5);C=max(3,9*n//10)
            exact=solve(data,T,C);brute,count=exhaustive(data,T,C)
            assert exact['gain']==brute
            small.append({'n':n,'seed':seed,'feasiblePlans':count,'exactGain':brute,'agreement':True})
    print('30 independent exhaustive checks passed',flush=True)
    eps=F(1,10000);rows=[]
    for n in [24,48,96,192]:
        for seed in range(1,6):
            data=instance(n,seed);T=3*n//5;C=9*n//10;base=sum(r['base'] for r in data)
            t0=perf_counter();ref=solve(data,T,C);tr=perf_counter()-t0
            times=[]
            for rep in range(3):
                t0=perf_counter();dp=solve(data,T,C,eps);times.append(perf_counter()-t0)
            t0=perf_counter();gr=greedy(data,T,C);tg=perf_counter()-t0
            independent=[min(r['options'],key=lambda a:a['loss']) for r in data]
            loss=ref['gain']-dp['gain'];assert 0<=loss<=n*eps
            assert dp['teacher']<=T and dp['compute']<=C and gr['gain']<=ref['gain']
            rows.append({'n':n,'seed':seed,'T':T,'C':C,'baseLoss':base,'referenceGain':ref['gain'],'dpGain':dp['gain'],'greedyGain':gr['gain'],'absoluteGap':loss,'errorBound':n*eps,'dpSeconds':median(times),'referenceSeconds':tr,'greedySeconds':tg,'peak':dp['peak'],'transitions':dp['transitions'],'teacherUsed':dp['teacher'],'computeUsed':dp['compute'],'independentT':sum(a['t'] for a in independent),'independentC':sum(a['c'] for a in independent)})
        print('Completed n =',n,flush=True)
    data=instance(48,1);T=28;C=43;ref=solve(data,T,C);sensitivity=[]
    for eps in [F(1,100),F(1,1000),F(1,10000)]:
        dp=solve(data,T,C,eps);gap=ref['gain']-dp['gain'];assert 0<=gap<=48*eps
        sensitivity.append({'epsilon':eps,'gain':dp['gain'],'gap':gap,'bound':48*eps,'peak':dp['peak']})
    budgets=[]
    for percent in [0,25,50,75,100]:
        t=28*percent//100;c=43*percent//100;dp=solve(data,t,c,F(1,10000))
        budgets.append({'percent':percent,'T':t,'C':c,'gain':dp['gain'],'loss':sum(r['base'] for r in data)-dp['gain']})
    summary=[]
    for n in [24,48,96,192]:
        rr=[r for r in rows if r['n']==n]
        summary.append({'n':n,'T':rr[0]['T'],'C':rr[0]['C'],'meanBaseLoss':mean(r['baseLoss'] for r in rr),'meanDpGain':mean(r['dpGain'] for r in rr),'meanGreedyGain':mean(r['greedyGain'] for r in rr),'greedyRelativeGapPercent':100*mean((r['referenceGain']-r['greedyGain'])/r['referenceGain'] for r in rr),'maxAbsoluteDpGap':max(r['absoluteGap'] for r in rr),'medianDpMs':1000*median(r['dpSeconds'] for r in rr),'medianExactMs':1000*median(r['referenceSeconds'] for r in rr),'maxStates':max(r['peak'] for r in rr),'infeasibleIndependent':sum(r['independentT']>r['T'] or r['independentC']>r['C'] for r in rr)})
    # Reconstruct a near-boundary request and all possible observations.
    st=((16,1),(24,1));base,act=terminal(st)
    example={'state':st,'p':readiness(st)[0],'risk':sum(cdf(*p) for p in st),'base':base,'action':act,'diagnostic':[{'j':j,'q':q,'cost':diagnostic(st,j,q),'gain':base-diagnostic(st,j,q)} for j in [0,1] for q in [1,3]]}
    result={'date':'2026-10-22','kind':'synthetic finite decision optimization, no human experiment','python':platform.python_version(),'platform':platform.platform(),'processor':platform.processor(),'librarySize':len(LIB),'seedRange':[1,5],'primaryEpsilon':F(1,10000),'small':small,'runs':rows,'summary':summary,'sensitivity':sensitivity,'budgets':budgets,'example':example,'parameters':{'tau':TAU,'delta':DELTA,'badCost':C_BAD,'waitCost':C_WAIT,'diagnosticCostPerProbe':C_DIAG,'q':[1,3],'historyN':[8,12,16,20,24,32,40,48,64],'maxFailures':6,'lcgMultiplier':1664525,'lcgIncrement':1013904223,'lcgModulus':2**32}}
    (B/'numerical_results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2,default=enc),encoding='utf8')
    with (B/'numerical_runs.csv').open('w',newline='',encoding='utf8') as f:
        w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows([{k:enc(v) if isinstance(v,F) else v for k,v in r.items()} for r in rows])
    print(json.dumps({'summary':summary,'sensitivity':sensitivity,'example':example},ensure_ascii=False,indent=2,default=enc),flush=True)

if __name__=='__main__':run()
