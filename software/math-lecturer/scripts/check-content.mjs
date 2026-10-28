import assert from 'node:assert/strict';
import katex from 'katex';
import {lessons,groups} from '../src/course.mjs';
import {formulaList,sources} from '../src/corpus.mjs';
const covered=new Set(lessons.flatMap(l=>l.formulaIds));
assert.equal(new Set(lessons.map(l=>l.id)).size,lessons.length);
for(const l of lessons){assert(groups.some(g=>g.id===l.group));assert(l.steps.length>=3);for(const id of l.formulaIds)assert(formulaList.some(f=>f.id===id),id);}
for(const f of formulaList){
 assert(covered.has(f.id),`No lesson for ${f.id}`);assert(sources.some(s=>s.id===f.sourceId));
 katex.renderToString(f.tex,{throwOnError:true,strict:false,trust:false});
}
let inline=0;
for(const l of lessons)for(const s of l.steps)for(const match of s.body.matchAll(/\$\$([\s\S]*?)\$\$|\$([^$\n]+)\$/g)){
 katex.renderToString(match[1]??match[2],{throwOnError:true,strict:false,trust:false});inline++;
}
console.log(JSON.stringify({lessons:lessons.length,formulaBlocks:formulaList.length,inlineFormulas:inline,sourceFragments:sources.length,completeFormulaCoverage:true,katex:'passed'}));
