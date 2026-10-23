"""Runs INSIDE a disposable container. Never execute this with uploaded code on the host."""
import sys,json,io,contextlib,copy,math
payload=json.load(sys.stdin)
class Sink(io.TextIOBase):
 def write(self,s): return len(s)
result=[]
try:
 namespace={}
 with contextlib.redirect_stdout(Sink()),contextlib.redirect_stderr(Sink()):
  exec(compile(payload['code'],'student.py','exec'),namespace)
  for item in payload['inputs']:
   try:
    value=namespace['solve'](copy.deepcopy(item))
    json.dumps(value,allow_nan=False)
    result.append({'value':value,'error':None})
   except BaseException as e: result.append({'value':None,'error':type(e).__name__[:80]})
except BaseException as e:
 result=[{'value':None,'error':type(e).__name__[:80]} for _ in payload['inputs']]
sys.__stdout__.write(json.dumps({'cases':result}))
