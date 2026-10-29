import {pathToFileURL} from 'node:url';
import {openDb} from '../src/db.mjs';
import {seed} from './seed-program.mjs';
export {seed,roles,refreshEnrollments} from './seed-program.mjs';
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const db=await openDb();try{console.log(await seed(db,{demo:process.argv.includes('--demo'),demoPassword:process.env.DEMO_PASSWORD}));}finally{await db.close();}}
