"""Read-only teaching calls into the four papers' original experiment modules."""
from pathlib import Path
from fractions import Fraction
import sys,os,json,importlib.util
ROOT=Path(__file__).resolve().parents[3]
if os.environ.get('RESEARCH_DEPS'):sys.path.insert(0,os.environ['RESEARCH_DEPS'])
def load(name,path):
    spec=importlib.util.spec_from_file_location(name,ROOT/path);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
def main(p):
    if p['kind']=='allocation':
        m=load('finite_diagnostic','research/injoit/experiment.py')
        n=int(p.get('n',6));seed=int(p.get('seed',1));T=int(p.get('T',5));C=int(p.get('C',8));eps=Fraction(str(p.get('epsilon',.0001)))
        data=m.instance(n,seed);exact=m.solve(data,T,C);rounded=m.solve(data,T,C,eps)
        greedy=m.greedy(data,T,C) if T and C else {'gain':Fraction(0),'path':(0,)*n,'teacher':0,'compute':0}
        def unpack(result):
            if isinstance(result,tuple):return {'gain':float(result[0])}
            return {k:float(v) if isinstance(v,Fraction) else list(v) if isinstance(v,tuple) else v for k,v in result.items()}
        rows=[]
        for i,req in enumerate(data):
            action=req['options'][rounded['path'][i]]
            rows.append({'request':i+1,'state':req['state'],'baseLoss':float(req['base']),
                'alternatives':[{**a,'g':float(a['g']),'loss':float(a['loss'])} for a in req['options']],
                'chosen':action['id'],'teacher':action['t'],'compute':action['c'],'gain':float(action['g'])})
        result={'kind':'allocation','input':{'n':n,'seed':seed,'T':T,'C':C,'epsilon':float(eps)},'exact':unpack(exact),'rounded':unpack(rounded),'greedy':unpack(greedy),'gap':float(exact['gain']-rounded['gain']),'bound':float(n*eps),'requests':rows,'scope':'Учебный запуск исходного алгоритма. Архивные измерения времени статьи не изменяются.'}
        assert 0<=exact['gain']-rounded['gain']<=n*eps
        assert rounded['teacher']<=T and rounded['compute']<=C
        return result
    if p['kind']=='ode':
        import numpy as np
        from scipy.integrate import solve_ivp
        m=load('learning_ode','research/diff_eq/experiment.py')
        names=m.NAMES;psi=np.array([float(p.get(k,v)) for k,v in zip(names,m.TRUE)])
        mode=p.get('mode','M');design={**m.DEFAULT,'h':float(p.get('h',1))}
        observed=m.forward(psi,mode,design);recovered=m.recover(observed,mode,design)
        independent=m.independent_forward(psi,mode,design)
        jac=m.finite_jac(lambda q:m.forward(q,mode,design),psi)
        smin=float(np.linalg.svd(jac,compute_uv=False)[-1])
        X1,l1,e1,X2,l2,e2,a1,a2,b=psi;h=design['h'];L=design['L'];c1=design['c1'];c2=design['c2'];T1=2*h+L
        times0=np.linspace(0,2*h,35);first=np.column_stack((X1*np.exp(-l1*times0),X2*np.exp(-l2*times0)))
        times1=np.linspace(0,L,35);k=a1*c1+l1;eq=a1*c1/k
        mid=np.column_stack((eq+(first[-1,0]-eq)*np.exp(-k*times1),first[-1,1]*np.exp(-l2*times1)))
        times2=np.linspace(0,design['t2'],51)
        sol=solve_ivp(lambda t,x:[-l1*x[0],c2*(a2+b*x[0])*(1-x[1])-l2*x[1]],[0,design['t2']],mid[-1],t_eval=times2,rtol=1e-10,atol=1e-12,method='DOP853')
        trace=[]
        for times,values,offset,stage in [(times0,first,0,1),(times1[1:],mid[1:],2*h,2),(times2[1:],sol.y.T[1:],T1,3)]:
            for t,(x1,x2) in zip(times,values):trace.append({'t':float(t+offset),'x1':float(x1),'x2':float(x2),'p1':float(m.observation(x1,e1,1)),'p2':float(m.observation(x2,e2,1)),'stage':stage})
        labels=['P10','P11','P12','P20','P21','P22','p7','p8','p9']
        return {'kind':'ode','input':dict(zip(names,psi.tolist()))|{'h':h,'mode':mode},'design':design,
            'parameters':[{'name':name,'truth':float(t),'recovered':float(v),'error':float(abs(t-v))} for name,t,v in zip(names,psi,recovered)],
            'observations':[{'name':name,'value':float(v)} for name,v in zip(labels,observed)],'trace':trace,
            'maxError':float(np.max(np.abs(psi-recovered))),'independentError':float(np.max(np.abs(observed-independent))),
            'sigmaMin':smin,'localFactor':2/smin,'boundaries':[2*h,T1],
            'scope':'Точные синтетические вероятности и известный протокол. Это не девять ответов одного студента.'}
    raise ValueError('Unknown teaching experiment')
try:
    data=json.load(sys.stdin);print(json.dumps(main(data),ensure_ascii=False,allow_nan=False))
except Exception as exc:
    print(json.dumps({'error':str(exc)},ensure_ascii=False));sys.exit(1)
