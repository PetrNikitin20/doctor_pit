import { loadPyodide } from "/vendor/pyodide/pyodide.mjs";
// This module is served with its own restrictive CSP: runtime assets only,
// no API/external fetches, nested workers, DOM, host files or user credentials.
const runtime = await loadPyodide({
  indexURL: new URL("/vendor/pyodide/", self.location.href).href,
  stdout: () => {},
  stderr: () => {},
});
self.postMessage({ type: "ready" });
self.onmessage = async ({ data }) => {
  try {
    runtime.globals.set("_cop_payload", JSON.stringify(data));
    const output = runtime.runPython(`
import json,io,contextlib,copy
class _CopSink(io.TextIOBase):
    def write(self,s): return len(s)
_cop_data=json.loads(_cop_payload)
_cop_results=[]
try:
    _cop_ns={}
    with contextlib.redirect_stdout(_CopSink()),contextlib.redirect_stderr(_CopSink()):
        exec(compile(_cop_data['code'],'solution.py','exec'),_cop_ns)
        for _cop_input in _cop_data['inputs']:
            try:
                _cop_value=_cop_ns['solve'](copy.deepcopy(_cop_input))
                json.dumps(_cop_value,allow_nan=False)
                _cop_results.append({'value':_cop_value,'error':None})
            except BaseException as _cop_e:
                _cop_results.append({'value':None,'error':type(_cop_e).__name__[:80]})
except BaseException as _cop_e:
    _cop_results=[{'value':None,'error':type(_cop_e).__name__[:80]} for _ in _cop_data['inputs']]
json.dumps(_cop_results,allow_nan=False)
`);
    if (output.length > 30000) throw new Error("Слишком большой результат");
    self.postMessage({ type: "done", outputs: JSON.parse(output) });
  } catch {
    self.postMessage({
      type: "error",
      message: "Ошибка Python или превышение лимита результата",
    });
  }
};
