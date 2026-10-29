import {openDb} from '../src/db.mjs';
import {seed} from './seed.mjs';
import {createApp} from '../src/server.mjs';
if(!process.env.QA_PASSWORD||process.env.QA_PASSWORD.length<12)throw Error('Set a synthetic QA_PASSWORD for the isolated preview');
const port=Number(process.env.QA_PORT||39150),origin='http://127.0.0.1:'+port,db=await openDb({memory:true});
await seed(db,{demo:true,demoPassword:process.env.QA_PASSWORD});
const server=createApp(db,{origin});server.listen(port,'127.0.0.1',()=>console.log('Isolated synthetic QA: '+origin));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(async()=>{await db.close();process.exit(0);}));
