import {existsSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {parseEnv} from 'node:util';
for(const name of ['.env','.env.local']){
 const path=fileURLToPath(new URL('../'+name,import.meta.url));
 if(existsSync(path))for(const [key,value]of Object.entries(parseEnv(readFileSync(path,'utf8'))))if(!process.env[key])process.env[key]=value;
}
