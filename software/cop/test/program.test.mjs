import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {openDb} from '../src/db.mjs';
import {seed,refreshEnrollments} from '../scripts/seed.mjs';
import {createApp} from '../src/server.mjs';
import {programCourses,programUnits,programTasks,programTransitions,curriculumSource,electiveModules} from '../content/program.mjs';
import {AI_LABS,runAiLab} from '../src/ai-simulators.mjs';
import {hornClosure,structuralBounds,binaryInputState,evaluateTransitions,compileCurriculum} from '../src/program-model.mjs';
let db,server,origin,attempt,hypothesis;const cookies={},password='Program-Test-Only-2026!';
async function call(role,path,body){const r=await fetch(origin+'/api/'+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json',Origin:origin}:{}),...(cookies[role]?{Cookie:cookies[role]}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()};}
before(async()=>{db=await openDb({memory:true});await seed(db,{demo:true,demoPassword:password});server=createApp(db,{origin:'http://127.0.0.1:39149'});await new Promise(r=>server.listen(39149,'127.0.0.1',r));origin='http://127.0.0.1:39149';for(const role of ['student','teacher','tutor','methodist','program_manager','admin']){const r=await fetch(origin+'/api/login',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({login:'demo-'+role,password})});assert.equal(r.status,200);cookies[role]=r.headers.get('set-cookie').split(';')[0];}});
after(async()=>{await new Promise(r=>server.close(r));await db.close();});
test('all requested subjects and plan/KRM subjects have versioned tasks at three levels',()=>{
 assert.equal(programCourses.length,43);assert.equal(programUnits.length,72);assert.equal(programTasks.length,216);assert.equal(new Set(programTasks.map(t=>t.id)).size,216);assert.equal(programTransitions.length,208);
 for(const id of ['ai-math','data-processing','algebra','seminar','recommenders','nlp','applied-ml']){const units=programUnits.filter(u=>u.course_id===id);assert.equal(units.length,3);for(const u of units)assert.deepEqual(programTasks.filter(t=>t.unit_id===u.id).map(t=>t.level),[1,2,3]);}
 for(const row of curriculumSource.courses.filter(r=>r.krmCompetencies.length&&(r.semesters.length||[115,119,120,121].includes(r.row))))assert(programCourses.some(c=>c.metadata.planRow===row.row));
 assert.equal(programCourses.find(c=>c.id==='algebra').year,2);assert.equal(programCourses.find(c=>c.id==='ai-math').metadata.scheduling,'proposed');assert.equal(electiveModules.length,7);
 assert.equal(new Set(programCourses.flatMap(c=>c.metadata.krmCompetencies)).size,38);
 assert(curriculumSource.krmCompetencySources['AI-S-1'].some(x=>x.rawCode==='AI S -1'));
 assert(!programCourses.find(c=>c.id==='programming').metadata.krmCompetencies.includes('PL-3'));
});
test('AI labs are deterministic, bounded, explicitly synthetic, and expose actual counterexamples',()=>{
 for(const labId of Object.keys(AI_LABS)){const a=runAiLab({labId,seed:42});assert.deepEqual(a,runAiLab({labId,seed:42}));assert.equal(a.origin,'curated_ai_error_fixture');assert(a.rows.length>0);assert(!JSON.stringify(a).includes('null'));}
 const cosine=runAiLab({labId:'cosine',parameter:7});assert(cosine.rows.every(r=>r.cosine===r.scaledCosine));
 const g=runAiLab({labId:'gradient'});assert(Math.abs(g.metrics[0].value-g.metrics[1].value)<1e-5);assert(g.metrics[2].value>1);
 const p=runAiLab({labId:'multiple'});assert(p.rows.filter(r=>r.bonferroni).every(r=>r.naive));
 assert(runAiLab({labId:'logic',parameter:1}).metrics[1].value>0);assert.throws(()=>runAiLab({labId:'missing'}));assert.throws(()=>runAiLab({labId:'gradient',seed:NaN}));
});
test('AND closure does not bootstrap cycles; lower/upper decisions agree with exhaustive completions',()=>{
 const rules=[{id:'r1',inputs:['a','b'],output:'c',status:'candidate'},{id:'r2',inputs:['c'],output:'d',status:'approved'},{id:'x',inputs:['y'],output:'x',status:'candidate'},{id:'y',inputs:['x'],output:'y',status:'candidate'}];
 assert.deepEqual(hornClosure(['a'],rules).facts,['a']);
 const bounds=structuralBounds(['a','b'],rules,['c','d','x']);assert.deepEqual(bounds.targets.map(x=>x.status),['undetermined','undetermined','not_ensured']);
 for(const atom of ['c','d','x']){const possible=[];for(let mask=0;mask<8;mask++){const selected=rules.filter(r=>r.status==='approved'||['r1','x','y'].some((id,i)=>id===r.id&&(mask&(1<<i))));possible.push(hornClosure(['a','b'],selected).facts.includes(atom));}const status=possible.every(Boolean)?'ensured':possible.some(Boolean)?'undetermined':'not_ensured';assert.equal(bounds.targets.find(t=>t.id===atom).status,status);}
});
test('transition risk uses δ/m, binary fresh independent families, exact levels and transfer',()=>{
 const now=Date.now(),controls=Array.from({length:24},(_,i)=>({unit_id:'u',level:2,family_id:'f'+i,passed:true,independent:true,approved_mapping:true,transfer:i===0,created_at:new Date(now-1000).toISOString()}));
 const state=binaryInputState(controls,'u',2,{now,m:3});assert.equal(state.n,24);assert(Math.abs(state.lower-(.05/3)**(1/25))<1e-11);assert(state.ready);
 const duplicated=[...controls,...controls.map(c=>({...c,created_at:new Date(now).toISOString()}))];assert.equal(binaryInputState(duplicated,'u',2,{now,m:3}).n,24);
 const retry=[{...controls[0],passed:false,transfer:false},{...controls[0],passed:true,transfer:true,created_at:new Date(now).toISOString()}];
 assert.equal(binaryInputState(retry,'u',2,{now}).successes,0);assert.equal(binaryInputState(retry,'u',2,{now}).transfer,false);
 assert.equal(binaryInputState(controls,'u',1,{now}).n,0);assert.equal(binaryInputState(controls.map(x=>({...x,independent:false})),'u',2,{now}).n,0);assert.equal(binaryInputState(controls.map(x=>({...x,passed:.9})),'u',2,{now}).n,0);
 const r={id:'r',status:'approved',inputs:[{unit_id:'u',min_level:2}],metadata:{kind:'interdisciplinary',calendarStatus:'requires_module_schedule'}};assert.equal(evaluateTransitions([r],controls,{now})[0].decision,'requires_calendar_review');
});
test('catalog is shared but expected outputs and fixtures stay server-side',async()=>{
 const r=await call('student','program');assert.equal(r.data.courses.length,43);assert.equal(r.data.electiveRequired,2);assert.equal((await call('student','course?id=ai-math')).data.tasks.length,9);
 const text=JSON.stringify((await call('student','course?id=ai-math')).data);assert(!text.includes('reference_code'));assert(!text.includes('ai_fixture'));assert(!text.includes('"expected"'));
});
test('new discipline records hypothesis, AI experiment, code version, fixture and artifact in its own journal',async()=>{
 let r=await call('student','hypotheses',{taskId:'ai-math-u03-l1',prediction:'Потеря множителя два изменяет шаг и скорость сходимости.',rationale:'Сверю производную квадратичной функции с конечной разностью.'});assert.equal(r.status,201);hypothesis=r.data.id;
 r=await call('student','simulate',{hypothesisId:hypothesis,parameters:{labId:'gradient',seed:42,n:20,parameter:.1},conclusion:'Конечная разность подтверждает множитель два в производной.'});assert.equal(r.status,201);assert.equal(r.data.labId,'gradient');
 assert.equal((await call('student','simulate',{hypothesisId:hypothesis,parameters:{labId:'ranking'},conclusion:'Неверный симулятор не должен попадать в журнал.'})).status,400);
 r=await call('student','attempts',{taskId:'ai-math-u03-l1',hypothesisId:hypothesis,code:'def solve(data):\n    return round(data["w"]-data["rate"]*2*(data["w"]-data["target"]),6)',explanation:'Производная квадратичной функции содержит множитель два. Начальный код сохранён до сравнения.',assistance:'independent',baseVersion:0});assert.equal(r.status,201);attempt=r.data.id;
 r=await call('student','compare',{attemptId:attempt,source:'fixture',conclusion:'Учебный ИИ-вариант теряет множитель два; проверю одинаковые входы.'});assert.equal(r.status,201);assert.equal(r.data.source,'fixture');assert(r.data.note.includes('Модель не вызывалась'));
 r=await call('student','artifacts',{attemptId:attempt,kind:'protocol',title:'Проверка градиента',content:'Гипотеза, seed=42, функция потерь, шаг 0.1, конечная разность и вывод.'});assert.equal(r.status,201);assert.equal(r.data.sha256.length,64);
 const j=(await call('student','journal?courseId=ai-math')).data;assert.equal(j.attempts.length,1);assert.equal(j.experiments.length,1);assert.equal(j.artifacts.length,1);assert(j.events.length>=5);
 const legacy=(await call('student','journal?courseId=algorithms')).data;assert.equal(legacy.attempts.length,0);assert.equal(legacy.events.length,0);
});
test('ordinary grade never becomes binary control; approved explicit review is deduplicated by family',async()=>{
 let r=await call('teacher','reviews',{attemptId:attempt,score:100,feedback:'Правильный расчёт; это обычный отзыв, а не отдельно размеченный контроль.',independent:true,transfer:true});assert.equal(r.status,201);assert.equal((await db.one('SELECT count(*)::int n FROM control_outcomes')).n,0);
 r=await call('program_manager','mapping',{taskId:'ai-math-u03-l1',indicatorCode:'MF-3.1',reason:'Проверена связь задачи с оптимизацией и требования самостоятельного контроля.',approve:true});assert.equal(r.status,200);
 const payload={attemptId:attempt,score:95,feedback:'Отдельный самостоятельный контроль проверен на сопоставимых условиях.',independent:true,transfer:true,controlOutcome:true,controlCriterion:'Сопоставимый класс: один шаг для квадратичной функции; проверены самостоятельность и новый контрпример.'};
 assert.equal((await call('teacher','reviews',payload)).status,201);assert.equal((await call('teacher','reviews',payload)).status,201);
 const report=(await call('student','program/trajectory')).data,rule=report.rules.find(r=>r.id==='ai-math-u03-to-l2');assert.equal(rule.inputs[0].n,1);assert.equal(rule.inputs[0].successes,1);assert.equal(rule.ready,false);
 assert.equal((await call('student','reviews',payload)).status,403);
});
test('elective composition is fixed separately and cannot silently mean all seven modules',async()=>{
 assert.equal((await call('student','program/choices',{modules:['1']})).status,400);assert.equal((await call('student','program/choices',{modules:['1','1']})).status,400);
 assert.equal((await call('student','program/choices',{modules:['1','7']})).status,200);const d=(await call('student','program/trajectory')).data;assert.equal(d.structure.selectionResolved,true);assert.deepEqual(d.selectedModules.sort(),['1','7']);assert(!d.structure.includedCourseIds.includes('embedded'));
 const saved=await call('student','program/trajectory',{});assert.equal(saved.status,200);assert(saved.data.id);assert.equal((await db.one('SELECT model_version FROM trajectory_decisions WHERE id=$1',[saved.data.id])).model_version,'binary-transition-v1');
});
test('methodist cannot approve a transition and a manager must confirm a cross-course calendar',async()=>{
 const id='ml-interdisciplinary',reason='Проверен порядок предпосылок и модульные контрольные точки перед машинным обучением.';
 assert.equal((await call('methodist','program/transitions',{id,reason,approve:true})).data.status,'candidate');assert.equal((await call('program_manager','program/transitions',{id,reason,approve:true})).status,400);assert.equal((await call('program_manager','program/transitions',{id,reason,approve:true,calendarConfirmed:true})).data.status,'approved');
});
test('cohorts are enrolled by every year of a multi-year subject without fabricating future students',async()=>{
 await db.query("INSERT INTO groups VALUES('qa-pm25','ПМ25 · синтетическая группа',2,'test')");await db.query("INSERT INTO users(id,login,name,password_hash,force_reset) SELECT 'qa-pm25-student','qa-pm25-student','Синтетический студент 2 курса',password_hash,false FROM users WHERE id='demo-student'");await db.query("INSERT INTO user_roles VALUES('qa-pm25-student','student')");await db.query("INSERT INTO group_members VALUES('qa-pm25','qa-pm25-student')");await refreshEnrollments(db);
 for(const id of ['algebra','programming','seminar'])assert.equal((await db.one('SELECT kind FROM enrollments WHERE user_id=$1 AND course_id=$2',['qa-pm25-student',id])).kind,'study');
 assert.equal((await db.one("SELECT kind FROM enrollments WHERE user_id='qa-pm25-student' AND course_id='ai-math'")).kind,'bridging');
 assert.equal((await db.one("SELECT count(*)::int n FROM enrollments WHERE user_id='qa-pm25-student' AND course_id='recommenders'")).n,0);assert.equal((await db.one('SELECT count(*)::int n FROM groups WHERE year IN (3,4)')).n,0);
});
test('facultatives are optional and core ML has a support path without the AI-math facultative',()=>{
 const courses=programCourses.map(c=>({...c,catalog_meta:c.metadata}));
 const base=compileCurriculum(courses,programUnits,programTasks,programTransitions,['1','7']);
 assert(!base.includedCourseIds.includes('ai-math'));assert(!base.includedCourseIds.includes('foundation-models'));
 assert.equal(base.bounds.targets.find(t=>t.id==='assess:ml-u01:L1').status,'undetermined');
 const extra=compileCurriculum(courses,programUnits,programTasks,programTransitions,['1','7'],2,['ai-math']);assert(extra.includedCourseIds.includes('ai-math'));
});
test('a scoped teacher cannot read cross-course controls or elective choices outside the assigned area',async()=>{
 const scopes=await db.rows("SELECT * FROM staff_scopes WHERE user_id='demo-teacher' AND course_id='ai-math'");
 await db.query("DELETE FROM staff_scopes WHERE user_id='demo-teacher' AND course_id='ai-math'");
 try{
  const r=await call('teacher','program/trajectory?userId=demo-student');assert.equal(r.status,200);
  assert(!r.data.rules.some(x=>x.course_id==='ai-math'||x.inputs.some(i=>i.unitId.startsWith('ai-math-'))));
  assert.deepEqual(r.data.selectedModules,[]);
  assert.equal(r.data.structure.selectionResolved,false);
  assert(r.data.rules.some(x=>x.course_id==='ml'));
 }finally{for(const s of scopes)await db.query('INSERT INTO staff_scopes(user_id,course_id,group_id,role_code) VALUES($1,$2,$3,$4)',[s.user_id,s.course_id,s.group_id,s.role_code]);}
});
