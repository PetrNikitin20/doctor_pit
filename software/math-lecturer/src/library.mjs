import {mkdir,readFile,writeFile,rename,unlink,readdir} from 'node:fs/promises';
import {resolve,extname,basename} from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {runPython} from './labs.mjs';
export class Library {
 constructor(folder){this.folder=resolve(folder,'articles');this.items=[];}
 async load(){await mkdir(this.folder,{recursive:true});for(const file of await readdir(this.folder)){if(/^[\da-f-]+\.json$/.test(file)){try{const d=JSON.parse(await readFile(resolve(this.folder,file),'utf8'));if(d.id&&Array.isArray(d.blocks))this.items.push(d);}catch{/* Incomplete imports are not indexed. */}}}return this;}
 publicItems(){return this.items.map(({blocks,...item})=>({...item,fragments:blocks.length}));}
 sources(){return this.items.filter(x=>!x.needsOcr).flatMap(item=>item.blocks.map((b,i)=>({id:`custom:${item.id}:${i}`,paper:`custom:${item.id}`,title:`${item.title} · ${b.location}`,kind:'article',text:b.text,path:item.filename,line:i+1,sha256:item.sha256,libraryId:item.id})));}
 groups(){return this.items.filter(x=>!x.needsOcr).map(x=>({id:`custom:${x.id}`,label:x.title,eyebrow:'Добавленная статья',description:'Локальная библиотека · '+x.blocks.length+' фрагментов',custom:true}));}
 formulas(){return this.items.filter(x=>!x.needsOcr).flatMap(item=>{
  const found=[];item.blocks.forEach((b,bi)=>{
   const pattern=/\$\$([\s\S]*?)\$\$|\$([^$\n]+)\$|\\\[([\s\S]*?)\\\]|\\begin\{equation\*?\}([\s\S]*?)\\end\{equation\*?\}/g;
   for(const match of b.text.matchAll(pattern)){
    const tex=(match[1]??match[2]??match[3]??match[4]).trim();if(!tex||tex.length>6000)continue;
    found.push({id:`custom:${item.id}:f${found.length+1}`,paper:`custom:${item.id}`,index:found.length+1,title:`${item.title} · формула ${found.length+1}`,
     tex,explain:`Извлечено: ${b.location}. Для пояснения обозначений и вывода нажмите «Объяснить каждый шаг». Сверьте запись с оригиналом.`,sourceId:`custom:${item.id}:${bi}`,imported:true});
   }
  });return found;
 });}
 lessons(){return this.items.filter(x=>!x.needsOcr).flatMap(item=>{
  const size=3,out=[];
  for(let start=0;start<item.blocks.length;start+=size){
   const selected=item.blocks.slice(start,start+size),part=Math.floor(start/size)+1;
   out.push({id:`custom:${item.id}:lesson:${part}`,group:`custom:${item.id}`,title:`Часть ${part} · ${selected[0].location}`,lead:item.title,
    steps:[{title:'Порядок разбора',body:'Прочитайте извлечённый текст и при необходимости откройте оригинал. Кнопка «Начать диалог с лектором» попросит локальную модель разобрать постановку, символы, вывод и границы этой части. Затем задавайте уточняющие вопросы. Для деталей эксперимента загрузите также описание или текст кода отдельным материалом.'},
     ...selected.slice(0,4).map(b=>({title:b.location,body:b.text.slice(0,3500)}))],
    sourceIds:selected.map((_,i)=>`custom:${item.id}:${start+i}`),formulaIds:this.formulas().filter(f=>selected.some((_,i)=>f.sourceId===`custom:${item.id}:${start+i}`)).map(f=>f.id),lab:null,minutes:15,custom:true,libraryId:item.id});
  }return out;
 });}
 async add(filename,title,buffer){
  const ext=extname(filename).toLowerCase();if(!['.pdf','.docx','.txt','.md','.tex','.json','.py','.mjs','.csv'].includes(ext))throw Object.assign(Error('Поддерживаются PDF, DOCX, TXT, MD, TeX, JSON, CSV и текст кода Python/JavaScript'),{status:400});
  if(buffer.length>20_000_000||buffer.length<5)throw Object.assign(Error('Размер файла: от 5 байт до 20 МБ'),{status:400});
  if(this.items.length>=100)throw Object.assign(Error('Лимит локальной библиотеки – 100 материалов'),{status:400});
  const digest=createHash('sha256').update(buffer).digest('hex');const old=this.items.find(x=>x.sha256===digest);if(old)return {...old,duplicate:true};
  const id=randomUUID(),path=resolve(this.folder,id+ext);await writeFile(path,buffer,{flag:'wx'});
  try{
   const extracted=await runPython('scripts/import_article.py',{path},{timeout:90000});
   const item={id,title:String(title||basename(filename,ext)).slice(0,180),filename:basename(filename).slice(0,180),ext,sha256:digest,addedAt:new Date().toISOString(),...extracted};
   const temp=resolve(this.folder,id+'.json.tmp');await writeFile(temp,JSON.stringify(item));await rename(temp,resolve(this.folder,id+'.json'));this.items.push(item);return item;
  }catch(error){await unlink(path).catch(()=>{});throw error;}
 }
 file(id){const item=this.items.find(x=>x.id===id);return item?{path:resolve(this.folder,id+item.ext),item}:null;}
}
