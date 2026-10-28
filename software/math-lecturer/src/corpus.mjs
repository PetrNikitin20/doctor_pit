import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {formulas,odeNotes} from './formulas.mjs';
export const ROOT=resolve(fileURLToPath(new URL('../../../',import.meta.url)));
export const papers=[
 {id:'sitito',label:'SITITO',file:'research/article/manuscript.json',code:'research/article/numerical_experiment.mjs',result:'research/article/numerical_results.json',data:'research/article/numerical_grid.csv',builder:'research/article/build_article.py'},
 {id:'ejce',label:'EJCE',file:'research/ejce/manuscript.json',code:'research/ejce/decision_simulation.mjs',result:'research/ejce/simulation_results.json',data:'research/ejce/simulation_results.csv',builder:'research/ejce/build_docx.py'},
 {id:'injoit',label:'INJOIT',file:'research/injoit/manuscript.json',code:'research/injoit/experiment.py',result:'research/injoit/numerical_results.json',data:'research/injoit/numerical_runs.csv',builder:'research/injoit/build_article.py'},
 {id:'ode',label:'ПСТА',file:'research/diff_eq/manuscript_tusur.json',code:'research/diff_eq/experiment.py',result:'research/diff_eq/results.json',data:'research/diff_eq/binomial_calibration.csv',builder:'research/diff_eq/psta/article.tex'}
];
const read=p=>readFileSync(resolve(ROOT,p),'utf8');
const sha=s=>createHash('sha256').update(s).digest('hex');
const normalizeTex=s=>s.replaceAll('χ','\\chi ').replaceAll('κ','\\kappa ');
const odeEq=JSON.parse(read('research/diff_eq/equations_tusur.json'));
formulas.ode=odeEq.map((e,i)=>({tex:normalizeTex(e.tex),title:odeNotes[i][0],explain:odeNotes[i][1],read:odeNotes[i][1],number:e.number}));
export const sources=[];
export const formulaList=[];
export const allowedFiles=new Set(['METHODOLOGY.md']);
for(const paper of papers){
 const raw=read(paper.file),d=JSON.parse(raw);paper.title=d.title;paper.sha256=sha(raw);paper.results=JSON.parse(read(paper.result));
 let section='Введение',ei=0;
 d.blocks.forEach((block,i)=>{
  const kind=Array.isArray(block)?block[0]:block.type;
  const value=Array.isArray(block)?block[1]:block.text;
  if(['h','heading','subheading'].includes(kind))section=value;
  let text=value||JSON.stringify(block),formulaId=null;
  if(['equation','e'].includes(kind)){
   const number=Array.isArray(block)?++ei:block.id;const f=formulas[paper.id][number-1];
   if(!f)throw Error(`Missing explanation ${paper.id}:${number}`);
   formulaId=`${paper.id}:${number}`;
   const item={...f,id:formulaId,paper:paper.id,index:number,sourceId:`${paper.id}:b${i}`,section};
   formulaList.push(item);text=`Формула ${number}: ${item.tex}\nПояснение: ${item.explain}`;
  }
  sources.push({id:`${paper.id}:b${i}`,paper:paper.id,title:`${paper.label} · ${section}`,kind,formulaId,text,path:paper.file,line:i,sha256:paper.sha256});
 });
 for(const path of [paper.code,paper.builder]){
  allowedFiles.add(path);const rawCode=read(path),lines=rawCode.split(/\r?\n/);
  for(let start=0;start<lines.length;start+=32){
   sources.push({id:`${paper.id}:${path===paper.code?'code':'format'}:${start+1}`,paper:paper.id,title:`${paper.label} · ${path.split('/').at(-1)}:${start+1}`,kind:'code',text:lines.slice(start,start+36).map((s,j)=>`${start+j+1}: ${s}`).join('\n'),path,line:start+1,sha256:sha(rawCode)});
  }
 }
 for(const path of [paper.file,paper.result,paper.data])allowedFiles.add(path);
 sources.push({id:`${paper.id}:results`,paper:paper.id,title:`${paper.label} · сохранённый эксперимент`,kind:'results',text:JSON.stringify(paper.results,null,2).slice(0,15000),path:paper.result,line:1,sha256:sha(read(paper.result))});
}
const methodology=read('METHODOLOGY.md');
methodology.split(/(?=^## )/m).forEach((t,i)=>sources.push({id:`methodology:${i}`,paper:'common',title:'Согласованная методология',kind:'methodology',text:t,path:'METHODOLOGY.md',line:1,sha256:sha(methodology)}));
allowedFiles.add('research/diff_eq/conditioning.csv');
allowedFiles.add('research/diff_eq/exact_recovery.csv');
allowedFiles.add('research/diff_eq/transfer_excitation.csv');
allowedFiles.add('research/diff_eq/psta/article.tex');
for(const f of formulaList){if(!f.tex||!f.explain)throw Error(`Incomplete formula ${f.id}`);}
export function tokens(s){
 return String(s).toLowerCase().replaceAll('ё','е').replace(/β|beta|бета/g,' бета ').replace(/η|eta|эта\b/g,' поддержка ').replace(/λ|lambda|лямбда/g,' забывание ').match(/[a-zа-я0-9]{2,}/g)?.map(w=>w.slice(0,7))||[];
}
export function retrieve(question,{paper='common',formulaIds=[],extra=[],limit=5}={}){
 const all=[...sources,...extra];const query=new Set(tokens(question));
 const scored=all.map(s=>{
  const text=tokens(s.text+' '+s.title),set=new Set(text);let score=0;
  for(const q of query)if(set.has(q))score+=1.4+Math.min(2,text.filter(t=>t===q).length*.1);
  if(s.paper===paper)score+=2;
  if(formulaIds.includes(s.formulaId))score+=10;
  if(s.kind==='methodology')score+=1;
  if(s.kind==='code'&&!/код|функц|програм|python|алгоритм/i.test(question))score-=3;
  return {s,score};
 }).sort((a,b)=>b.score-a.score);
 const selected=scored.slice(0,limit).map(x=>x.s);
 const ids=new Set(selected.map(x=>x.id));
 // Surround a selected formula with its original prose, so proofs are not reduced to equations.
 for(const s of [...selected])if(s.formulaId){
  const i=all.indexOf(s);for(const adjacent of all.slice(Math.max(0,i-1),i+2)){
   if(!ids.has(adjacent.id)&&selected.length<limit+2){selected.push(adjacent);ids.add(adjacent.id);}
  }
 }
 return selected;
}
export function publicPaper(p){const {results,...meta}=p;return meta;}
