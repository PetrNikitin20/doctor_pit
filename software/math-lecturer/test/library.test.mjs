import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Library} from '../src/library.mjs';
import {prepare} from '../src/agent.mjs';
import {ROOT} from '../src/corpus.mjs';
test('New articles survive reload and are immediately usable as grounded lecture sources',async()=>{
 const temp=await mkdtemp(join(tmpdir(),'pit-lecturer-test-'));
 try{
  const library=await new Library(temp).load();const text=Buffer.from('# Контрольный материал\n\nВероятность успеха p равна 0,7.\n\nМодель: $x(t)=X e^{-\\lambda t}$. Состояние меняется во времени.');
  const added=await library.add('../../test.tex','Контрольная статья',text);assert.equal(added.title,'Контрольная статья');assert.equal(added.filename,'test.tex');
  assert.equal((await library.add('again.tex','Иное название',text)).duplicate,true);assert.equal(library.items.length,1);
  const reloaded=await new Library(temp).load();assert.equal(reloaded.items.length,1);assert(reloaded.sources()[0].text.includes('0,7'));
  assert.equal(reloaded.formulas().length,1);assert(reloaded.formulas()[0].tex.includes('lambda'));
  const lesson=reloaded.lessons()[0];assert(lesson.custom);assert.equal(lesson.formulaIds.length,1);const prepared=prepare('Чему равна вероятность в добавленной статье?',lesson,[],reloaded,null);
  assert(prepared.references.some(s=>s.libraryId===added.id));assert(prepared.messages[1].content.includes('0,7'));
  assert(prepared.references.every(s=>s.libraryId===added.id));assert(prepared.messages[1].content.length<1800);
  await assert.rejects(()=>reloaded.add('bad.exe','Binary',Buffer.from('hello world')));
 }finally{
  // mkdtemp creates this task's own directory; never clean a user-selected location.
  assert(temp.startsWith(join(tmpdir(),'pit-lecturer-test-')));await rm(temp,{recursive:true,force:true});
 }
});
test('The actual PSTA Word and PDF import without losing the 22 Word formula blocks',async()=>{
 const temp=await mkdtemp(join(tmpdir(),'pit-lecturer-test-'));
 try{
  const lib=await new Library(temp).load();
  const word=await readFile(join(ROOT,'articles/ПСТА_Статья_Никитин_2026-10-24.docx'));
  await lib.add('dynamic.docx','Проверка формул',word);assert.equal(lib.formulas().length,22);
  const pdf=await readFile(join(ROOT,'articles/ПСТА_Статья_для_рецензирования.pdf'));
  const imported=await lib.add('dynamic.pdf','Проверка PDF',pdf);assert.equal(imported.pages,17);assert.equal(imported.needsOcr,false);
 }finally{assert(temp.startsWith(join(tmpdir(),'pit-lecturer-test-')));await rm(temp,{recursive:true,force:true});}
});
test('Long unbroken articles remain searchable and teachable through their final paragraph',async()=>{
 const temp=await mkdtemp(join(tmpdir(),'pit-lecturer-test-'));
 try{
  const lib=await new Library(temp).load(),tail='Заключительный маркер: критерий ультрафинальный. $x(t)=X e^{-\\lambda t}$.';
  const text='Подробное пояснение модели и эксперимента. '.repeat(600)+tail;
  const added=await lib.add('long.tex','Длинная статья',Buffer.from(text));
  assert(added.blocks.length>10);assert(added.blocks.every(b=>b.text.length<=1800));
  assert.equal(added.blocks.map(b=>b.text).join(''),text);
  assert.equal(lib.formulas().length,1);assert(lib.formulas()[0].tex.endsWith('t}'));
  const lesson=lib.lessons().at(-1),prepared=prepare('Объясни критерий ультрафинальный',lesson,[],lib);
  assert(prepared.messages[1].content.includes('ультрафинальный'));
 }finally{assert(temp.startsWith(join(tmpdir(),'pit-lecturer-test-')));await rm(temp,{recursive:true,force:true});}
});
