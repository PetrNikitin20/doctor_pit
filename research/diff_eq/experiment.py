"""Finite-observation identification of a triangular learning ODE.

Synthetic research experiment. No student records are read.
Python >=3.12 with the pinned dependencies; numpy scipy sympy matplotlib.
Run: python experiment.py
"""
from pathlib import Path
import sys

BASE = Path(__file__).resolve().parent
if (BASE / 'deps').exists():
    sys.path.insert(0, str(BASE / 'deps'))
import json
import csv
import hashlib
import numpy as np
from scipy.integrate import solve_ivp
from scipy.optimize import brentq, least_squares
from numpy.polynomial.legendre import leggauss

NAMES = ['X1', 'lambda1', 'eta1', 'X2', 'lambda2', 'eta2', 'alpha1', 'alpha2', 'beta']
TRUE = np.array([.65, .22, .45, .50, .15, .35, .70, .40, .90])
DEFAULT = dict(h=1.0, L=2.0, t1=1.5, t2=4.0, c1=1.0, c2=1.0)
G, W = leggauss(64)


def second_state(times, A, B, lam1, lam2, alpha, beta, c2=1.0, sensitivity=False):
    """Variation-of-constants solution on the final block, Gauss-Legendre quadrature.

    x1(s)=A exp(-lam1 s), x2(0)=B. Also returns analytic alpha,beta derivatives.
    """
    times = np.atleast_1d(times).astype(float)
    s = times[:, None] * (G[None, :] + 1) / 2
    weights = times[:, None] * W[None, :] / 2
    def kb(t):
        return c2 * A * (-np.expm1(-lam1 * t)) / lam1
    def k(t):
        return (c2 * alpha + lam2) * t + beta * kb(t)
    kt = k(times)
    e0 = (1 - B) * np.exp(-kt)
    e = np.exp(k(s) - kt[:, None])
    x = 1 - e0 - lam2 * np.sum(weights * e, axis=1)
    if not sensitivity:
        return x
    sa = c2 * times * e0 + lam2 * np.sum(weights * e * c2 * (times[:, None] - s), axis=1)
    sb = kb(times) * e0 + lam2 * np.sum(weights * e * (kb(times)[:, None] - kb(s)), axis=1)
    return x, np.column_stack((sa, sb))


def observation(x, eta, r):
    return r * eta + (1 - r * eta) * x


def block_states(psi, design):
    X1, l1, e1, X2, l2, e2, a1, a2, b = psi
    h, L, c1 = design['h'], design['L'], design['c1']
    R1 = X1 * np.exp(-2*h*l1)
    k = a1*c1 + l1
    A = a1*c1/k + (R1 - a1*c1/k)*np.exp(-k*L)
    B = X2*np.exp(-l2*(2*h+L))
    return A, B


def forward(psi, mode='M', design=None):
    d = DEFAULT if design is None else design
    X1, l1, e1, X2, l2, e2, a1, a2, b = psi
    r = np.array([0., 0., 1.]) if mode == 'M' else np.ones(3)
    t = np.arange(3)*d['h']
    p1 = observation(X1*np.exp(-l1*t), e1, r)
    p2 = observation(X2*np.exp(-l2*t), e2, r)
    A, B = block_states(psi, d)
    # All three later measurements are assisted; eta is already calibrated.
    last = second_state([d['t1'], d['t2']], A, B, l1, l2, a2, b, d['c2'])
    return np.r_[p1, p2, observation(A, e1, 1), observation(last, e2, 1)]


def calibrate(p, h, mode='M'):
    p0, p1, p2 = map(float, p)
    if mode == 'M':
        X = p0
        q = p1/p0
        eta = (p2-X*q*q)/(1-X*q*q)
    else:
        q = (p1-p2)/(p0-p1)
        eta = (p1-q*p0)/(1-q)
        X = (p0-eta)/(1-eta)
    if not (0 < q < 1 and 0 < X < 1 and 0 < eta < 1):
        raise ValueError('Empirical probabilities outside the admissible calibration image')
    return np.array([X, -np.log(q)/h, eta])


def recover(p, mode='M', design=None):
    d = DEFAULT if design is None else design
    c = np.r_[calibrate(p[:3], d['h'], mode), calibrate(p[3:6], d['h'], mode)]
    X1, l1, e1, X2, l2, e2 = c
    A = (p[6]-e1)/(1-e1)
    B = X2*np.exp(-l2*(2*d['h']+d['L']))
    target = (p[7:]-e2)/(1-e2)
    def first(a):
        k = d['c1']*a+l1
        eq = d['c1']*a/k
        return eq+(X1*np.exp(-2*d['h']*l1)-eq)*np.exp(-k*d['L'])-A
    upper = 1.
    while first(upper) < 0 and upper < 1e6:
        upper *= 2
    a1 = brentq(first, 0., upper, xtol=1e-14)
    def fun(ab):
        return second_state([d['t1'], d['t2']], A, B, l1, l2, *ab, d['c2'])-target
    def jac(ab):
        return second_state([d['t1'], d['t2']], A, B, l1, l2, *ab, d['c2'], True)[1]
    fit = least_squares(fun, [.6, .6], jac=jac, bounds=([1e-10, 1e-10], [20., 20.]),
                        ftol=1e-14, xtol=1e-14, gtol=1e-14, max_nfev=1000)
    if np.max(np.abs(fit.fun)) > 2e-10:
        raise RuntimeError('Final block inversion did not achieve the required residual')
    return np.r_[c, a1, fit.x]


def finite_jac(fun, psi):
    # Symmetric differences; separate from analytic sensitivities used by recover.
    cols = []
    for j in range(len(psi)):
        step = 2e-5*max(1, abs(psi[j]))
        v = np.zeros(len(psi)); v[j] = step
        cols.append((fun(psi+v)-fun(psi-v))/(2*step))
    return np.column_stack(cols)


def rest_jac(X, lam, eta, h, mode):
    k = np.arange(3)
    qk = np.exp(-lam*h*k)
    r = np.array([0,0,1]) if mode == 'M' else np.ones(3)
    return np.column_stack(((1-r*eta)*qk, -(1-r*eta)*h*k*X*qk, r*(1-X*qk)))


def independent_forward(psi, mode, d):
    X1,l1,e1,X2,l2,e2,a1,a2,b = psi
    h,L,t1,t2,c1,c2 = (d[k] for k in ['h','L','t1','t2','c1','c2'])
    r = np.array([0.,0.,1.]) if mode == 'M' else np.ones(3)
    p = np.r_[observation(X1*np.exp(-l1*np.arange(3)*h),e1,r),
              observation(X2*np.exp(-l2*np.arange(3)*h),e2,r)]
    z = np.array([X1*np.exp(-2*h*l1), X2*np.exp(-2*h*l2)])
    sol1 = solve_ivp(lambda t,x:[a1*c1*(1-x[0])-l1*x[0],-l2*x[1]], [0,L], z,
                     method='DOP853',rtol=2e-12,atol=2e-14)
    A,B = sol1.y[:,-1]
    sol2 = solve_ivp(lambda t,x:[-l1*x[0], c2*(a2+b*x[0])*(1-x[1])-l2*x[1]],
                     [0,t2],[A,B],t_eval=[t1,t2],method='DOP853',rtol=2e-12,atol=2e-14)
    return np.r_[p, observation(A,e1,1), observation(sol2.y[1],e2,1)]


def run():
    rng = np.random.default_rng(20261022)
    exact = []
    for i in range(40):
        psi = np.array([rng.uniform(.35,.8),rng.uniform(.12,.4),rng.uniform(.15,.6),
                          rng.uniform(.3,.75),rng.uniform(.1,.35),rng.uniform(.15,.6),
                          rng.uniform(.3,1.1),rng.uniform(.2,.8),rng.uniform(.3,1.3)])
        for mode in ['M','A']:
            p = forward(psi, mode)
            rec = recover(p, mode)
            independent = independent_forward(psi,mode,DEFAULT)
            err = float(np.max(np.abs(rec-psi)))
            forward_error = float(np.max(np.abs(p-independent)))
            assert err < 2e-7, (i,mode,err)
            assert forward_error < 2e-10, forward_error
            exact.append(dict(case=i,mode=mode,max_parameter_error=err,independent_forward_error=forward_error))
    # Symbolic, exact verification of the two calibration determinants.
    import sympy as s
    X,q,eta,h=s.symbols('X q eta h',positive=True)
    symbolic={}
    for mode in ['M','A']:
        rr=[0,0,1] if mode=='M' else [1,1,1]
        J=s.Matrix([[(1-r*eta)*q**k,-(1-r*eta)*h*k*X*q**k,r*(1-X*q**k)] for k,r in enumerate(rr)])
        expected=-h*X*q*(1-X*q*q) if mode=='M' else -h*X*(1-eta)**2*q*(1-q)**2
        assert s.simplify(J.det()-expected)==0
        symbolic[mode]=str(s.factor(J.det()))
    conditioning=[]
    for hval in [.02,.05,.1,.2,.5,1.,2.,4.]:
        d={**DEFAULT,'h':hval}
        for mode in ['M','A']:
            jr=rest_jac(*TRUE[:3],hval,mode)
            jf=finite_jac(lambda th:forward(th,mode,d),TRUE)
            A,B=block_states(TRUE,d)
            _,last_j=second_state([d['t1'],d['t2']],A,B,TRUE[1],TRUE[4],TRUE[7],TRUE[8],d['c2'],True)
            assert np.linalg.det(last_j) < 0
            conditioning.append(dict(h=hval,mode=mode,rest_sigma_min=float(np.linalg.svd(jr,compute_uv=False)[-1]),
                rest_determinant=float(np.linalg.det(jr)),full_sigma_min=float(np.linalg.svd(jf,compute_uv=False)[-1]),
                full_condition_number=float(np.linalg.cond(jf)),transfer_determinant=float(np.linalg.det(last_j))))
    # Binomial trials are a frozen-state statistical idealization, not a classroom experiment.
    noisy=[]
    for hval in [.1,1.,3.]:
        for n in [1000,10000,100000]:
            for mode in ['M','A']:
                d={**DEFAULT,'h':hval}
                p=forward(TRUE,mode,d)[:3]
                estimates=rng.binomial(n,p,size=(10000,3))/n
                errors=[]; invalid=0
                for phat in estimates:
                    try:
                        rec=calibrate(phat,hval,mode)
                        errors.append(np.abs(rec-TRUE[:3]))
                    except (ValueError,ZeroDivisionError,FloatingPointError):
                        invalid+=1
                a=np.array(errors)
                noisy.append(dict(h=hval,n=n,mode=mode,replications=10000,invalid=invalid,
                    invalid_percent=invalid/100,valid=len(errors),
                    conditional_median_abs_error=[float(z) for z in np.median(a,axis=0)] if len(a) else None,
                    conditional_p90_abs_error=[float(z) for z in np.quantile(a,.9,axis=0)] if len(a) else None))
    # Exact confounding of alpha2 and beta under a constant prerequisite.
    const=.6; lam=.15; alpha=.4; beta=.9
    delta=.25
    alpha_alt=alpha-const*delta; beta_alt=beta+delta
    assert abs((alpha+beta*const)-(alpha_alt+beta_alt*const))<1e-14
    slope_cases=[]
    for l1 in [1e-6,1e-4,.001,.01,.05,.22,.5]:
        _,jac=second_state([1.5,4],.7,.25,l1,.15,.4,.9,1,True)
        slope_cases.append(dict(lambda1=l1,determinant=float(np.linalg.det(jac)),sigma_min=float(np.linalg.svd(jac,compute_uv=False)[-1])))
    result=dict(seed=20261022,parameter_names=NAMES,true_parameters=TRUE.tolist(),design=DEFAULT,
                exact_recovery=exact,symbolic_determinants=symbolic,conditioning=conditioning,
                binomial_calibration=noisy,constant_prerequisite=dict(x1=const,alpha=alpha,beta=beta,
                alternative_alpha=alpha_alt,alternative_beta=beta_alt),transfer_excitation=slope_cases,
                scope='Synthetic only. Nine exact probabilities are not nine individual answers. Noise analysis concerns closed-form calibration, not failure of constrained MLE.')
    (BASE/'results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    for name,rows in [('conditioning',conditioning),('binomial_calibration',noisy),('exact_recovery',exact),('transfer_excitation',slope_cases)]:
        with (BASE/(name+'.csv')).open('w',newline='',encoding='utf-8-sig') as f:
            writer=csv.DictWriter(f,fieldnames=list(rows[0]));writer.writeheader();writer.writerows(rows)
    print(json.dumps(dict(exact_cases=len(exact),max_parameter_error=max(x['max_parameter_error'] for x in exact),
                    independent_forward_error=max(x['independent_forward_error'] for x in exact),
                    noisy_configurations=len(noisy),binomial_replicates=sum(x['replications'] for x in noisy)),indent=2))


if __name__=='__main__':
    run()
