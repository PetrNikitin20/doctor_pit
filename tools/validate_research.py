"""Check published deterministic quantities without replacing timing baselines.

Run from any directory: python tools/validate_research.py
ODE dependencies are needed only with --ode. No student files are accessed.
"""
from pathlib import Path
from fractions import Fraction as F
from math import comb
import importlib.util,json,sys,argparse
B=Path(__file__).resolve().parents[1]
def module(name,path):
    spec=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
def close(a,b):assert abs(float(a)-float(b))<1e-10,(a,b)

def validate(ode=False):
    dp=module('finite_dp',B/'research/injoit/experiment.py')
    checks=[]
    # Independent exact integration of the beta polynomial, not the binomial tail.
    for a in range(1,16):
        for b in range(1,9):
            norm=F(__import__('math').factorial(a+b-1),__import__('math').factorial(a-1)*__import__('math').factorial(b-1))
            value=norm*sum(F((-1)**j*comb(b-1,j),a+j)*F(4,5)**(a+j) for j in range(b))
            assert value==dp.cdf(a,b)
    checks.append({'check':'beta polynomial vs exact binomial tail','cases':120,'passed':True})
    small=0
    for n in [4,6,8]:
        for seed in range(1,11):
            data=dp.instance(n,seed);T=max(2,3*n//5);C=max(3,9*n//10)
            assert dp.solve(data,T,C)['gain']==dp.exhaustive(data,T,C)[0];small+=1
    checks.append({'check':'exact optimizer vs exhaustive enumeration','cases':small,'passed':True})
    baseline=json.loads((B/'research/injoit/numerical_results.json').read_text(encoding='utf8'))
    for row in baseline['runs']:
        n,seed=row['n'],row['seed'];data=dp.instance(n,seed)
        result=dp.solve(data,row['T'],row['C'],F(1,10000))
        close(result['gain'],row['dpGain'])
        assert result['teacher']<=row['T'] and result['compute']<=row['C']
    checks.append({'check':'rounded optimizer vs archived objective and resource budgets','cases':len(baseline['runs']),'passed':True})
    data=dp.instance(48,1);ref=dp.solve(data,28,43)
    for eps in [F(1,100),F(1,1000),F(1,10000)]:
        result=dp.solve(data,28,43,eps)
        assert 0<=ref['gain']-result['gain']<=48*eps
    checks.append({'check':'additive S epsilon bound','cases':3,'passed':True})
    # Concrete distinction between the equal-allocation and summed-risk gates.
    risks=[dp.cdf(16,1),dp.cdf(24,1)]
    assert sum(risks)<=F(1,20) and not all(v<=F(1,40) for v in risks)
    checks.append({'check':'distinct risk policies explicitly documented','marginal_risks':list(map(float,risks)),'sum':float(sum(risks)),'passed':True})
    if ode:
        m=module('learning_ode',B/'research/diff_eq/experiment.py')
        old=json.loads((B/'research/diff_eq/results.json').read_text(encoding='utf8'))
        import numpy as np
        p=np.array(old['true_parameters'])
        for mode in ['M','A']:
            y=m.forward(p,mode);rec=m.recover(y,mode)
            assert max(abs(rec-p))<1e-9
            assert max(abs(y-m.independent_forward(p,mode,m.DEFAULT)))<1e-9
        checks.append({'check':'ODE inverse and independent DOP853 forward solution','cases':2,'passed':True})
    return {'date':'2026-10-23','synthetic_only':True,'checks':checks}

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--ode',action='store_true');args=parser.parse_args()
    result=validate(args.ode)
    (B/'audit/research_validation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
    print(json.dumps(result,ensure_ascii=False,indent=2))
