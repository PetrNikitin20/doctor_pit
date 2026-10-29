import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {programTasks} from '../content/program.mjs';
const result=spawnSync(process.env.PYTHON_EXE||'python',[fileURLToPath(new URL('./check-teaching-contracts.py',import.meta.url))],{input:JSON.stringify(programTasks),encoding:'utf8',windowsHide:true,timeout:30000,env:{...process.env,PYTHONIOENCODING:'utf-8'}});
if(result.error)throw result.error;process.stdout.write(result.stdout);if(result.stderr)process.stderr.write(result.stderr);process.exitCode=result.status;
