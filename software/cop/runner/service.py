"""Private runner API. Docker daemon access belongs ONLY to this service.
Run with an isolated/rootless daemon, never mount its socket into the web app.
"""
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
import os,json,hmac,subprocess,threading,uuid,math
TOKEN=os.environ.get('RUNNER_TOKEN','')
IMAGE=os.environ.get('SANDBOX_IMAGE','cop-python-sandbox:local')
slots=threading.BoundedSemaphore(2)
def execute(payload):
 name='cop-job-'+uuid.uuid4().hex
 command=['docker','run','--rm','--name',name,'--network=none','--read-only','--cap-drop=ALL','--security-opt=no-new-privileges','--pids-limit=32','--memory=128m','--memory-swap=128m','--cpus=.5','--ulimit','cpu=4:4','--ulimit','nofile=64:64','--user','65534:65534','--tmpfs','/tmp:rw,noexec,nosuid,size=16m','--log-driver=none','-i',IMAGE]
 proc=subprocess.Popen(command,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL)
 output=bytearray();oversized=threading.Event()
 def read_output():
  while True:
   chunk=proc.stdout.read(4096)
   if not chunk:break
   if len(output)+len(chunk)>65536:
    oversized.set();proc.kill();break
   output.extend(chunk)
 thread=threading.Thread(target=read_output,daemon=True);thread.start()
 try:
  isolated={'code':payload['code'],'inputs':[t['input'] for t in payload['tests']]}
  proc.stdin.write(json.dumps(isolated).encode());proc.stdin.close();proc.wait(timeout=10);thread.join(timeout=1)
  if proc.returncode or oversized.is_set():raise RuntimeError('sandbox limit')
  result=json.loads(output)
  if len(result.get('cases',[]))!=len(payload['tests']):raise RuntimeError('invalid output')
  # Expected outputs never enter the untrusted container.
  cases=[]
  for actual,test in zip(result['cases'],payload['tests']):
   value,expected=actual.get('value'),test['expected']
   equal=(math.isclose(value,expected,rel_tol=1e-9,abs_tol=1e-9) if type(value) in [int,float] and type(expected) in [int,float] else type(value)==type(expected) and value==expected)
   cases.append({'passed':not actual.get('error') and equal,'error':str(actual.get('error') or '')[:80]})
  return {'cases':cases}
 finally:
  if proc.poll() is None:proc.kill();proc.wait()
  subprocess.run(['docker','rm','-f',name],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,timeout=5)
class Handler(BaseHTTPRequestHandler):
 def log_message(self,*args):pass
 def do_POST(self):
  if self.path!='/run' or not TOKEN or not hmac.compare_digest(self.headers.get('Authorization',''),'Bearer '+TOKEN):self.send_error(403);return
  length=int(self.headers.get('Content-Length',0))
  if not 0<length<=65536:self.send_error(413);return
  if not slots.acquire(blocking=False):self.send_error(429);return
  try:
   payload=json.loads(self.rfile.read(length));assert isinstance(payload['code'],str) and len(payload['code'])<=16000
   assert 0<len(payload['tests'])<=30
   result=execute(payload);content=json.dumps(result).encode()
   self.send_response(200);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(content)));self.end_headers();self.wfile.write(content)
  except Exception:self.send_error(503,'Sandbox unavailable or limit exceeded')
  finally:slots.release()
if __name__=='__main__':
 if len(TOKEN)<24:raise SystemExit('RUNNER_TOKEN must have at least 24 characters')
 ThreadingHTTPServer(('0.0.0.0',8081),Handler).serve_forever()
