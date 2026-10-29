"""Structural curriculum verification. Standard library; synthetic tests only.

Rule identity denotes its complete compiled content. A changed antecedent or deadline
is represented as removal of the old rule and addition of a new rule. Read the
manuscript for the restrictions on optional-rule completions and module choices.
"""
from dataclasses import dataclass
from collections import defaultdict, deque, Counter
from pathlib import Path
from time import perf_counter_ns
from statistics import median
from random import Random
import json,csv,platform,itertools,hashlib
B=Path(__file__).resolve().parent
SEED=20261025

@dataclass(frozen=True)
class Rule:
    tail:tuple
    head:int

class Index:
    def __init__(self,n,rules):
        self.n=n;self.rules=tuple(rules)
        self.by_tail=[[] for _ in range(n)];self.by_head=[[] for _ in range(n)]
        for e,r in enumerate(rules):
            assert len(set(r.tail))==len(r.tail)
            self.by_head[r.head].append(e)
            for a in r.tail:self.by_tail[a].append(e)

def closure(g,active,seeds,record_witness=True):
    """Least Horn closure and one finite witness per discovered vertex."""
    reached=set(seeds);queue=deque(sorted(reached));witness={a:None for a in reached} if record_witness else {}
    remaining={e:len(g.rules[e].tail) for e in active};checks=0;fired=0
    def activate(e):
        nonlocal fired
        fired+=1;a=g.rules[e].head
        if a not in reached:
            reached.add(a);queue.append(a)
            if record_witness:witness[a]=e
    for e in sorted(active):
        if remaining[e]==0:activate(e)
    while queue:
        a=queue.popleft()
        for e in g.by_tail[a]:
            if e not in active:continue
            checks+=1;remaining[e]-=1
            if remaining[e]==0:activate(e)
    return reached,witness,{'vertices':len(reached),'incidence_checks':checks,'fired':fired}

def slow_closure(g,active,seeds):
    reached=set(seeds)
    while True:
        new=reached|{g.rules[e].head for e in active if set(g.rules[e].tail)<=reached}
        if new==reached:return reached
        reached=new

def model_oracle(g,active,seeds):
    """Independent oracle: intersect ALL truth assignments satisfying Horn rules."""
    assert g.n<=10
    seedmask=sum(1<<a for a in seeds);answer=(1<<g.n)-1
    encoded=[(sum(1<<a for a in g.rules[e].tail),1<<g.rules[e].head) for e in active]
    count=0
    for assignment in range(1<<g.n):
        if assignment&seedmask!=seedmask:continue
        if all(assignment&tail!=tail or assignment&head for tail,head in encoded):
            answer&=assignment;count+=1
    assert count>0
    return {i for i in range(g.n) if answer&(1<<i)}

def verify_witness(g,active,seeds,reached,witness):
    # No appeal to closure(): recursively check every predecessor certificate.
    visiting=set();checked=set()
    def visit(a):
        if a in checked:return
        assert a not in visiting,'Cyclic witness';visiting.add(a)
        e=witness[a]
        if e is None:assert a in seeds
        else:
            assert e in active and g.rules[e].head==a
            for p in g.rules[e].tail:assert p in reached;visit(p)
        visiting.remove(a);checked.add(a)
    for a in reached:visit(a)

def status(targets,lower,upper):
    assert lower<=upper
    return 'ensured' if targets<=lower else 'not_ensured' if not targets<=upper else 'undetermined'

def local_update(g,old_active,new_active,old_seeds,new_seeds,reached,delta=None,seed_delta=None):
    """Recompute the entire forward affected region from scratch, in place.

    Computing or receiving rule differences and compiling metadata are outside the
    local-core bound. The API permits an explicit delta, as in an event journal.
    """
    delta=(old_active^new_active) if delta is None else set(delta)
    # Avoid copying the whole active-rule set: the local core must not hide O(|E|).
    if seed_delta is None:seed_delta=set() if old_seeds is new_seeds else (old_seeds^new_seeds)
    else:seed_delta=set(seed_delta)
    affected={g.rules[e].head for e in delta}|seed_delta
    queue=deque(affected);region_checks=0
    while queue:
        a=queue.popleft()
        for e in g.by_tail[a]:
            if e not in old_active and e not in new_active:continue
            region_checks+=1;b=g.rules[e].head
            if b not in affected:affected.add(b);queue.append(b)
    candidates=set(e for a in affected for e in g.by_head[a] if e in new_active)
    remaining={};local_wait=defaultdict(list);boundary_checks=0
    for e in candidates:
        r=g.rules[e];inside=[];blocked=False
        for a in r.tail:
            boundary_checks+=1
            if a in affected:inside.append(a)
            elif a not in reached:blocked=True;break
        if blocked:continue
        remaining[e]=len(inside)
        for a in inside:local_wait[a].append(e)
    local=set(new_seeds&affected);todo=deque(sorted(local))
    for e,count in remaining.items():
        if count==0:
            a=g.rules[e].head
            if a not in local:local.add(a);todo.append(a)
    while todo:
        a=todo.popleft()
        for e in local_wait[a]:
            remaining[e]-=1
            if remaining[e]==0:
                b=g.rules[e].head
                if b not in local:local.add(b);todo.append(b)
    old_inside=reached&affected
    removed=old_inside-local;added=local-old_inside
    reached.difference_update(removed);reached.update(added)
    return {'affected_vertices':len(affected),'affected_rules':len(candidates),
        'region_checks':region_checks,'boundary_checks':boundary_checks,
        'removed':len(removed),'added':len(added)}

def verify_small():
    rng=Random(SEED);classes=Counter();completions=0;certificate_checks=0;mutations=0;metamorphic=0
    for case in range(120):
        n=8;rules=[]
        for _ in range(14):
            tail=tuple(sorted(rng.sample(range(n),rng.randrange(0,4))))
            rules.append(Rule(tail,rng.randrange(n)))
        g=Index(n,rules);seeds=set(rng.sample(range(n),rng.randrange(0,3)))
        optional=set(rng.sample(range(len(rules)),4));known=set(range(len(rules)))-optional
        targets=set(rng.sample(range(n),3))
        lo,wl,_=closure(g,known,seeds);hi,wh,_=closure(g,known|optional,seeds)
        verify_witness(g,known,seeds,lo,wl);verify_witness(g,known|optional,seeds,hi,wh);certificate_checks+=2
        # Independent check of a negative certificate: no rule crosses into V\hi.
        blocked=set(range(n))-hi
        assert not (seeds&blocked)
        assert all(r.head not in blocked or set(r.tail)&blocked for r in rules)
        truths=[]
        for mask in range(1<<len(optional)):
            active=known|{e for j,e in enumerate(sorted(optional)) if mask&(1<<j)}
            oracle=model_oracle(g,active,seeds);got,w,_=closure(g,active,seeds)
            assert got==oracle==slow_closure(g,active,seeds)
            truths.append(targets<=oracle);completions+=1
        expected='ensured' if all(truths) else 'not_ensured' if not any(truths) else 'undetermined'
        assert status(targets,lo,hi)==expected;classes[expected]+=1
        perm=list(range(n));rng.shuffle(perm)
        renamed=Index(n,[Rule(tuple(perm[a] for a in r.tail),perm[r.head]) for r in rules])
        assert closure(renamed,known,{perm[a] for a in seeds})[0]=={perm[a] for a in lo}
        reversed_graph=Index(n,list(reversed(rules)))
        assert closure(reversed_graph,{len(rules)-1-e for e in known},seeds)[0]==lo
        extra=Index(n+2,rules+[Rule((n,),n+1),Rule((n+1,),n)])
        assert closure(extra,known|{len(rules),len(rules)+1},seeds)[0]==lo
        assert lo<=closure(g,known,seeds|{rng.randrange(n)})[0]
        metamorphic+=4
        # Deletion, addition and changed seeds, including positive cycles.
        active=known|optional;old,_,_=closure(g,active,seeds)
        for _ in range(8):
            new=set(active);e=rng.randrange(len(rules));new.symmetric_difference_update({e})
            new_seeds=set(seeds)
            if rng.random()<.3:new_seeds.symmetric_difference_update({rng.randrange(n)})
            updated=set(old);local_update(g,active,new,seeds,new_seeds,updated,{e},seed_delta=seeds^new_seeds)
            assert updated==model_oracle(g,new,new_seeds);mutations+=1
    # Deleting the only external support of a cycle must remove the entire cycle.
    g=Index(3,[Rule((0,),1),Rule((1,),2),Rule((2,),1)])
    before,_,_=closure(g,{0,1,2},{0});after=set(before)
    local_update(g,{0,1,2},{1,2},{0},{0},after,{0})
    assert after=={0}
    # Removing one of two witnesses must not remove the supported result.
    g=Index(4,[Rule((0,),2),Rule((1,),2),Rule((2,),3)])
    before,_,_=closure(g,{0,1,2},{0,1});after=set(before)
    local_update(g,{0,1,2},{1,2},{0,1},{0,1},after,{0});assert after==before
    return {'instances':120,'completion_checks':completions,'witness_checks':certificate_checks,
        'update_checks':mutations+2,'metamorphic_checks':metamorphic,'class_counts':dict(classes),'passed':True}

def scenario(name,seed):
    """Author-constructed schema cases. Not findings in the actual curriculum."""
    rng=Random(seed)
    # Atom tuple: indicator, level, kind, semester boundary, requirement version.
    atoms=[('entry',0,'t',0,'v1'),('A',1,'t',1,'v1'),('A',1,'q',1,'v1'),
           ('B',2,'t',2,'v1'),('B',2,'q',2,'v1'),('C',2,'t',3,'v1'),('C',2,'q',3,'v1')]
    rules=[Rule((0,),1),Rule((1,),2),Rule((2,),3),Rule((3,),4),Rule((2,4),5),Rule((5,),6)]
    valid=set(range(6));known=set(valid);potential=set(valid)
    # Validity checking in this controlled suite is explicit, not inferred from prose.
    if name=='time':
        atoms[3]=('B',2,'t',4,'v1');atoms[4]=('B',2,'q',4,'v1')
        valid.remove(4);known.remove(4);potential.remove(4)
    elif name=='level':
        atoms[3]=('B',1,'t',2,'v1');atoms[4]=('B',1,'q',2,'v1')
        atoms.append(('B',2,'q',2,'v1'));rules[4]=Rule((2,7),5)
    elif name=='diagnostic':known.remove(3);potential.remove(3)
    elif name=='version':
        atoms[3]=('B',2,'t',2,'v0');atoms[4]=('B',2,'q',2,'v0')
        atoms.append(('B',2,'q',2,'v1'));rules[4]=Rule((2,7),5)
    elif name=='and':known.remove(2);potential.remove(2)
    elif name=='cycle':rules[2]=Rule((2,4),3)
    elif name=='unknown':known.remove(3)
    elif name=='alternative':
        atoms[3]=('B',2,'t',4,'v1');atoms[4]=('B',2,'q',4,'v1')
        valid.remove(4);known.remove(4);potential.remove(4)
        atoms.extend([('B',2,'q',2,'v1')]);rules.extend([Rule((2,),7),Rule((2,7),5)])
        valid.update([6,7]);known.update([6,7]);potential.update([6,7])
    elif name!='clean':raise ValueError(name)
    # Add harmless alternative edges to avoid reporting repetitions of identical graphs.
    for _ in range(rng.randrange(1,5)):
        index=len(rules);rules.append(Rule((0,),rng.choice([1,2])))
        valid.add(index);known.add(index);potential.add(index)
    g=Index(len(atoms),rules);lo,_,_=closure(g,known,{0});hi,_,_=closure(g,potential,{0})
    assert lo==model_oracle(g,known,{0}) and hi==model_oracle(g,potential,{0})
    target={6};truth=status(target,lo,hi)
    # Indicator-presence matrix: prerequisites, levels, times and control are ignored.
    matrix=any(atoms[rules[e].head][0]=='C' for e in potential)
    # Ordinary projection of the fully typed, valid graph: AND is replaced by OR.
    edges=[Rule((a,),rules[e].head) for e in known for a in rules[e].tail]
    projected=Index(len(atoms),edges);projected_reach=closure(projected,set(range(len(edges))),{0})[0]
    # An ablation which preserves levels and control but forgets time and version.
    canon={};mapping={}
    for i,a in enumerate(atoms):mapping[i]=canon.setdefault(a[:3],len(canon))
    er=[Rule(tuple(sorted({mapping[a] for a in rules[e].tail})),mapping[rules[e].head]) for e in set(range(len(rules))) if e!=3 or name!='diagnostic']
    if name=='and':er=[Rule(tuple(sorted({mapping[a] for a in rules[e].tail})),mapping[rules[e].head]) for e in range(len(rules)) if e!=2]
    # Unknown rules are conservatively excluded in the binary ablation.
    if name=='unknown':er=[Rule(tuple(sorted({mapping[a] for a in rules[e].tail})),mapping[rules[e].head]) for e in range(len(rules)) if e!=3]
    ablated=Index(len(canon),er);ar=closure(ablated,set(range(len(er))),{mapping[0]})[0]
    return {'scenario':name,'seed':seed,'truth':truth,'matrix':matrix,'ordinary':6 in projected_reach,
        'no_time_version':mapping[6] in ar,'full':truth,'vertices':len(atoms),'rules':len(rules)}

def classifier_experiment():
    names=['clean','time','level','diagnostic','version','and','cycle','unknown','alternative']
    rows=[scenario(name,seed) for name in names for seed in range(1,41)]
    summary=[]
    for name in names:
        rs=[r for r in rows if r['scenario']==name]
        expected='ensured' if name in ['clean','alternative'] else 'undetermined' if name=='unknown' else 'not_ensured'
        assert all(r['truth']==expected for r in rs)
        summary.append({'scenario':name,'count':len(rs),'truth':expected,**{m:sum(bool(r[m]) for r in rs) for m in ['matrix','ordinary','no_time_version']}})
    return rows,summary

def make_large(n,seed,fragment=50):
    """Independent 50-vertex curriculum fragments with AND prerequisites and cycles."""
    rng=Random(seed);rules=[];seeds=set();removable=[]
    for first in range(0,n,fragment):
        stop=min(n,first+fragment);seeds.add(first)
        for head in range(first+1,stop):
            tail=(head-1,) if head==first+1 or rng.random()<.7 else tuple(sorted(rng.sample(range(first,head),2)))
            removable.append(len(rules));rules.append(Rule(tail,head))
            if head>first+2 and rng.random()<.25:rules.append(Rule((first,),head))
        # Some cycles are reachable only because the main chain supplies an entry.
        if stop-first>10:rules.append(Rule((stop-1,),stop-3))
    return Index(n,rules),seeds,removable

def benchmark():
    rows=[]
    for n in [1000,5000,10000,20000]:
        for scope in ['local','global']:
            for seed in range(1,6):
                g,seeds,removable=make_large(n,seed,50 if scope=='local' else n);active=set(range(len(g.rules)));old,_,_=closure(g,active,seeds,record_witness=False)
                # Rule IDs are supplied by the edit event; construction/indexing is not timed.
                changed=next(e for e in removable if 10<=g.rules[e].head<=15)
                new=active-{changed};local_times=[];full_times=[];stats=None
                for repeat in range(7):
                    copy=set(old)
                    def run_local():
                        nonlocal stats
                        start=perf_counter_ns();stats=local_update(g,active,new,seeds,seeds,copy,{changed});local_times.append((perf_counter_ns()-start)/1e6)
                    def run_full():
                        start=perf_counter_ns();full=closure(g,new,seeds,record_witness=False)[0];full_times.append((perf_counter_ns()-start)/1e6)
                        return full
                    if repeat%2==0:run_local();full=run_full()
                    else:full=run_full();run_local()
                    assert copy==full
                rows.append({'vertices':n,'rules':len(g.rules),'incidences':sum(len(r.tail) for r in g.rules),'seed':seed,'change_scope':scope,
                    **stats,'local_ms':median(local_times),'full_ms':median(full_times),'speedup':median(full_times)/median(local_times)})
    return rows

def write_csv(name,rows):
    with (B/name).open('w',encoding='utf-8',newline='') as f:
        w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)

def main():
    small=verify_small();cases,comparison=classifier_experiment();times=benchmark()
    report={'date':'2026-10-25','seed':SEED,'python':platform.python_version(),'platform':platform.platform(),
      'data_type':'Synthetic verification; no student observations; controlled cases are not expert-annotated curriculum defects',
      'small':small,'classifier_cases':len(cases),'classifier_summary':comparison,'timings':times,
      'timing_scope':'Median of 7 runs per configuration, alternating procedure order. Event deltas and a common incidence index are supplied. Graph compilation, initial indexing, cloning before a timed run and I/O are excluded. Local update mutates the existing reachability set. Both procedures compute reachability only; witness recording is disabled for the timed full closure. Both timings use the same pre-existing index.',
      'all_checks_passed':True}
    (B/'results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    write_csv('classification.csv',cases);write_csv('timings.csv',times)
    print(json.dumps({'small':small,'cases':len(cases),'comparison':comparison,'timing_summary':[{'n':n,'scope':scope,'full_ms':median(r['full_ms'] for r in times if r['vertices']==n and r['change_scope']==scope),'local_ms':median(r['local_ms'] for r in times if r['vertices']==n and r['change_scope']==scope),'speedup':median(r['speedup'] for r in times if r['vertices']==n and r['change_scope']==scope)} for n in [1000,5000,10000,20000] for scope in ['local','global']]},ensure_ascii=False,indent=2))
if __name__=='__main__':main()
