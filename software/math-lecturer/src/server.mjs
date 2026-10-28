import http from 'node:http';
import {readFile,stat,mkdir} from 'node:fs/promises';
import {createReadStream,existsSync,readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {resolve,extname} from 'node:path';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {groups,lessons,commonQuestions} from './course.mjs';
import {papers,sources,formulaList,allowedFiles,ROOT,publicPaper} from './corpus.mjs';
import {APP,lab} from './labs.mjs';
import {Library} from './library.mjs';
import {modelStatus,prepare,streamModel} from './agent.mjs';
import {speech} from './speech.mjs';
import {ChatJobs} from './chat-jobs.mjs';
for(const file of ['.env','.env.local']){const path=resolve(APP,file);if(existsSync(path)){const data=parseEnv(readFileSync(path,'utf8'));for(const [k,v]of Object.entries(data))if(!process.env[k])process.env[k]=v;}}
const PORT=Number(process.env.PORT||3210),HOST='127.0.0.1';
if(!Number.isInteger(PORT)||PORT<1024||PORT>65535)throw Error('Invalid PORT');
const dataDir=resolve(process.env.LECTURER_DATA_DIR||resolve(APP,'private'));
await mkdir(dataDir,{recursive:true});const library=await new Library(dataDir).load();
const audioDir=resolve(dataDir,'audio'),calculations=new Map(),chatJobs=new ChatJobs();let chatBusy=false;
const assets={
 '/':'public/index.html','/app.js':'public/app.js','/style.css':'public/style.css',
 '/vendor/katex.js':'node_modules/katex/dist/katex.min.js','/vendor/katex.css':'node_modules/katex/dist/katex.min.css',
 '/vendor/auto-render.js':'node_modules/katex/dist/contrib/auto-render.min.js','/vendor/marked.js':'node_modules/marked/lib/marked.umd.js','/vendor/purify.js':'node_modules/dompurify/dist/purify.min.js'
};
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf','.pdf':'application/pdf','.wav':'audio/wav','.json':'application/json; charset=utf-8'};
function json(res,status,value){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));}
async function body(req,limit=120000){let size=0;const chunks=[];for await(const b of req){size+=b.length;if(size>limit)throw Object.assign(Error('Запрос слишком большой'),{status:413});chunks.push(b);}return Buffer.concat(chunks);}
async function input(req){try{return JSON.parse((await body(req)).toString('utf8'));}catch(e){if(e.status)throw e;throw Object.assign(Error('Неверный JSON'),{status:400});}}
async function sendFile(res,path,{download=false,name=null}={}){
 const s=await stat(path);if(!s.isFile())throw Object.assign(Error('Файл не найден'),{status:404});
 const ext=extname(path);res.writeHead(200,{'Content-Type':mime[ext]||'text/plain; charset=utf-8','Content-Length':s.size,...(download?{'Content-Disposition':`attachment; filename*=UTF-8''${encodeURIComponent(name||path.split(/[\\/]/).at(-1))}`}:{})});
 createReadStream(path).pipe(res);
}
function safeSource(id){return [...sources,...library.sources()].find(s=>s.id===id);}
function currentLessons(){return [...lessons,...library.lessons()];}
const server=http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
 res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self'; media-src 'self' blob:; object-src 'none'; frame-ancestors 'none'");
 const allowedHosts=new Set([`${HOST}:${PORT}`,`localhost:${PORT}`]);
 if(!allowedHosts.has(req.headers.host)){return json(res,403,{error:'Недопустимый адрес сервера'});}
 const origin=req.headers.origin;
 if(origin&&![`http://${HOST}:${PORT}`,`http://localhost:${PORT}`].includes(origin))return json(res,403,{error:'Запрос разрешён только из локального кабинета'});
 let url;try{url=new URL(req.url,`http://${HOST}:${PORT}`);}catch{return json(res,400,{error:'Неверный URL'});}
 try{
  if(req.method==='GET'&&url.pathname==='/api/health')return json(res,200,{ok:true,app:'doctor-pit-math-lecturer',model:await modelStatus(),local:true,libraryCount:library.items.length});
  if(req.method==='GET'&&url.pathname==='/api/course')return json(res,200,{groups:[...groups,...library.groups()],lessons:currentLessons(),formulas:[...formulaList,...library.formulas()],papers:papers.map(publicPaper),questions:commonQuestions,library:library.publicItems()});
  if(req.method==='GET'&&url.pathname==='/api/source'){
   const s=safeSource(url.searchParams.get('id'));if(!s)throw Object.assign(Error('Источник не найден'),{status:404});return json(res,200,s);
  }
  if(req.method==='GET'&&url.pathname==='/api/research-file'){
   const name=url.searchParams.get('path');if(!allowedFiles.has(name))throw Object.assign(Error('Файл не разрешён'),{status:403});return await sendFile(res,resolve(ROOT,name),{download:url.searchParams.has('download')});
  }
  if(req.method==='GET'&&url.pathname==='/api/results'){
   const paper=papers.find(p=>p.id===url.searchParams.get('paper'));if(!paper)throw Object.assign(Error('Исследование не найдено'),{status:404});return json(res,200,paper.results);
  }
  if(req.method==='GET'&&url.pathname==='/api/library')return json(res,200,library.publicItems());
  if(req.method==='POST'&&url.pathname==='/api/library'){
   const filename=decodeURIComponent(req.headers['x-filename']||'article.txt'),title=decodeURIComponent(req.headers['x-title']||'');
   const result=await library.add(filename,title,await body(req,20_000_000));const {blocks,...meta}=result;
   return json(res,201,{...meta,fragments:blocks.length});
  }
  if(req.method==='GET'&&url.pathname.startsWith('/api/library-file/')){
   const id=url.pathname.split('/').at(-1);const f=library.file(id);if(!f)throw Object.assign(Error('Материал не найден'),{status:404});return await sendFile(res,f.path,{download:f.item.ext!=='.pdf',name:f.item.filename});
  }
  if(req.method==='POST'&&url.pathname==='/api/lab'){
   const p=await input(req);const result=await lab(p.kind,p.params);const id=randomUUID();calculations.set(id,{result,at:Date.now()});for(const [key,v]of calculations)if(Date.now()-v.at>3600000)calculations.delete(key);return json(res,200,{id,result});
  }
  if(req.method==='GET'&&/^\/api\/chat-jobs\/[a-f\d-]+$/.test(url.pathname))return json(res,200,chatJobs.read(url.pathname.split('/').at(-1),url.searchParams.get('after')||0));
  if(req.method==='POST'&&/^\/api\/chat-jobs\/[a-f\d-]+\/cancel$/.test(url.pathname))return json(res,200,chatJobs.cancel(url.pathname.split('/').at(-2)));
  if(req.method==='POST'&&['/api/chat','/api/chat-jobs'].includes(url.pathname)){
   const p=await input(req);if(typeof p.question!=='string'||p.question.length<2||p.question.length>6000)throw Object.assign(Error('Вопрос: от 2 до 6000 символов'),{status:400});
   const lesson=currentLessons().find(l=>l.id===p.lessonId);if(!lesson)throw Object.assign(Error('Занятие не найдено'),{status:404});
   if(chatBusy||chatJobs.active)throw Object.assign(Error('Лектор уже отвечает. Дождитесь ответа или остановите его.'),{status:429});
   if(!Array.isArray(p.history||[]))throw Object.assign(Error('Неверная история диалога'),{status:400});
   const {messages,references}=prepare(p.question,lesson,p.history||[],library,calculations.get(p.labId)?.result);
   if(url.pathname==='/api/chat-jobs'){
    const job=chatJobs.start(async(emit,signal)=>{
     emit('sources',{references:references.map(({text,...s})=>s)});
     await streamModel(messages,emit,signal,{maxTokens:p.detail==='brief'?500:1400,hasVerifiedCalculation:calculations.has(p.labId),verifiedCalculation:calculations.get(p.labId)?.result});
     return {model:process.env.LLM_MODEL||'qwen3:4b-instruct'};
    });
    return json(res,202,job);
   }
   chatBusy=true;res.writeHead(200,{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-store','Connection':'keep-alive'});
   const emit=(event,data)=>{if(!res.destroyed)res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);};
   const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),600000);const heartbeat=setInterval(()=>{if(!res.destroyed)res.write(': waiting\n\n');},12000);
   res.on('close',()=>{if(!res.writableEnded)controller.abort();});
   emit('sources',{references:references.map(({text,...s})=>s)});
   try{await streamModel(messages,emit,controller.signal,{maxTokens:p.detail==='brief'?500:1400,hasVerifiedCalculation:calculations.has(p.labId),verifiedCalculation:calculations.get(p.labId)?.result});emit('done',{model:process.env.LLM_MODEL||'qwen3:4b-instruct'});}catch(error){emit('error',{error:error.name==='AbortError'?'Генерация остановлена':error.message});}finally{clearTimeout(timer);clearInterval(heartbeat);chatBusy=false;res.end();}return;
  }
  if(req.method==='GET'&&url.pathname==='/api/voices'){
   try{return json(res,200,await speech(audioDir,'','','voices'));}catch{return json(res,200,{voices:[],browserFallback:true});}
  }
  if(req.method==='POST'&&url.pathname==='/api/speech'){
   const p=await input(req);return json(res,200,await speech(audioDir,p.text,p.voice));
  }
  if(req.method==='GET'&&/^\/audio\/[a-f\d]{64}\.wav$/.test(url.pathname))return await sendFile(res,resolve(audioDir,url.pathname.split('/').at(-1)));
  if(req.method==='GET'&&assets[url.pathname])return await sendFile(res,resolve(APP,assets[url.pathname]));
  if(req.method==='GET'&&/^\/vendor\/fonts\/[\w.-]+\.(woff2?|ttf)$/.test(url.pathname))return await sendFile(res,resolve(APP,'node_modules/katex/dist/fonts',url.pathname.split('/').at(-1)));
  json(res,404,{error:'Не найдено'});
 }catch(error){if(res.headersSent){res.end();return;}json(res,error.status||500,{error:error.code==='ENOENT'?'Файл не найден':error.message||'Ошибка сервера'});}
});
server.requestTimeout=180000;server.headersTimeout=15000;
server.listen(PORT,HOST,()=>console.log(`ИИ-лектор: http://${HOST}:${PORT} · ${lessons.length} занятий · ${formulaList.length} формулы · только локальный доступ`));
export {server};
