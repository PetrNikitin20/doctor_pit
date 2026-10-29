"""Execute only the repository's authored reference bank, never submitted code."""
import json,sys,math
def equal(a,b):
    if isinstance(a,bool) or isinstance(b,bool):return type(a) is type(b) and a==b
    if isinstance(a,(int,float)) and isinstance(b,(int,float)):return math.isfinite(a) and abs(a-b)<=1e-9*max(1,abs(b))
    if isinstance(a,list) and isinstance(b,list):return len(a)==len(b) and all(equal(x,y) for x,y in zip(a,b))
    if isinstance(a,dict) and isinstance(b,dict):return a.keys()==b.keys() and all(equal(a[k],b[k]) for k in a)
    return type(a) is type(b) and a==b
tasks=json.load(sys.stdin);failures=[];count=0
for task in tasks:
    scope={}
    try:
        exec(compile(task['reference_code'],task['id'],'exec'),scope)
        for i,case in enumerate(task['tests']):
            value=scope['solve'](case['input']);count+=1
            if not equal(value,case['expected']):failures.append({'task':task['id'],'case':i,'actual':value,'expected':case['expected']})
    except Exception as error:failures.append({'task':task['id'],'error':str(error)})
print(json.dumps({'tasks':len(tasks),'cases':count,'failures':failures},ensure_ascii=False))
sys.exit(bool(failures))
