import {fail,text,uuid} from './server.mjs';
import {digest,requireRole} from './security.mjs';
import {AI_LABS} from './ai-simulators.mjs';
import {evaluateTransitions,compileCurriculum} from './program-model.mjs';
import {electiveModules,VERSION,curriculumSource} from '../content/program.mjs';
export async function transitionData(db){
 const rules=await db.rows("SELECT r.*,u.course_id,c.title AS course_title FROM transition_rules r JOIN learning_units u ON u.id=r.target_unit_id JOIN courses c ON c.id=u.course_id WHERE r.status<>'retired' ORDER BY c.year,c.title,r.id");
 const inputs=await db.rows('SELECT i.*,u.course_id,u.title FROM transition_inputs i JOIN learning_units u ON u.id=i.unit_id');
 return rules.map(r=>({...r,inputs:inputs.filter(i=>i.rule_id===r.id)}));
}
export async function handleProgram(c){
 const {db,user,url,path,method,body,json,audit,event,courseAccess,studentAccess,getAttempt}=c;
 if(path==='/api/program'&&method==='GET'){
  const courses=await db.rows("SELECT c.*,(SELECT count(*)::int FROM learning_units u WHERE u.course_id=c.id) units,(SELECT count(*)::int FROM tasks t JOIN learning_units u ON u.id=t.unit_id WHERE u.course_id=c.id AND t.published) tasks FROM courses c ORDER BY c.year,c.title");
  const links=await db.rows('SELECT cc.*,k.title FROM course_competencies cc JOIN competencies k ON k.code=cc.competency_code ORDER BY cc.course_id,cc.competency_code');
  const enrolled=await db.rows('SELECT course_id,kind FROM enrollments WHERE user_id=$1',[user.id]);
  json(200,{version:VERSION,courses:courses.map(x=>({...x,competencies:links.filter(l=>l.course_id===x.id),enrollment:enrolled.find(e=>e.course_id===x.id)?.kind||null})),electiveModules,electiveRequired:curriculumSource.electiveRequired,sources:curriculumSource.sources,simulators:Object.values(AI_LABS),scope:'Стартовые авторские модули 1–4 курса. Учебные материалы и связи заданий с индикаторами требуют методической проверки; наличие кода в плане не является освоением компетенции.'});return true;
 }
 if(path==='/api/program/choices'&&method==='POST'){
  requireRole(user,'student');const ids=body.modules;
  if(!Array.isArray(ids)||ids.length!==2||new Set(ids).size!==2||ids.some(id=>!electiveModules.some(m=>m.id===id)))fail(400,'Выберите ровно два разных элективных модуля');
  await db.transaction(async tx=>{await tx.query('DELETE FROM elective_selections WHERE user_id=$1',[user.id]);for(const id of ids)await tx.query('INSERT INTO elective_selections(user_id,module_code,version) VALUES($1,$2,$3)',[user.id,id,VERSION]);await audit(tx,user,'curriculum.choices',user.id,{modules:ids,scope:'Учебный план-предпочтение; не административное зачисление'});});json(200,{ok:true});return true;
 }
 if(path==='/api/program/trajectory'&&['GET','POST'].includes(method)){
  const target=(method==='POST'?body.userId:url.searchParams.get('userId'))||user.id;
  const allRules=await transitionData(db);let rules=allRules;
  if(target!==user.id){const allowed=[];for(const courseId of new Set(allRules.flatMap(r=>[r.course_id,...r.inputs.map(i=>i.course_id)])))if(await studentAccess(user,target,courseId))allowed.push(courseId);if(!allowed.length)fail(403,'Нет доступа к этой траектории');rules=rules.filter(r=>allowed.includes(r.course_id)&&r.inputs.every(i=>allowed.includes(i.course_id)));}
  const controls=await db.rows('SELECT * FROM control_outcomes WHERE user_id=$1',[target]);
  const modules=target===user.id?(await db.rows('SELECT module_code FROM elective_selections WHERE user_id=$1',[target])).map(x=>x.module_code):[];
  const courses=await db.rows('SELECT * FROM courses'),units=await db.rows('SELECT * FROM learning_units'),tasks=await db.rows('SELECT id,unit_id,level FROM tasks WHERE published');
  const enrolled=await db.rows("SELECT course_id FROM enrollments WHERE user_id=$1 AND kind<>'preview'",[target]);
  const additional=target===user.id?courses.filter(c=>c.catalog_meta.facultative&&enrolled.some(e=>e.course_id===c.id)).map(c=>c.id):[];
  const report={version:'binary-transition-v1',rules:evaluateTransitions(rules,controls),structure:compileCurriculum(courses,units,tasks,allRules,modules,2,additional),electiveModules,selectedModules:modules,scope:'Оценки в журнале, ИИ-ответы и клиентские проверки не преобразуются в самостоятельные бинарные исходы.'+(target!==user.id?' Показаны только переходы, все предпосылки которых входят в вашу учебную область. Личные предпочтения элективов скрыты; структура показана для общей обязательной части.':'')};
  if(method==='POST'){const id=uuid();await db.query('INSERT INTO trajectory_decisions(id,user_id,model_version,recommendation,reason) VALUES($1,$2,$3,$4,$5)',[id,target,report.version,JSON.stringify(report),'Версионный рекомендательный расчёт по явно подтверждённым бинарным исходам, с δ/m для каждого AND-перехода.']);await event(db,user,'trajectory.evaluated',id,{target,version:report.version},null);report.id=id;}
  json(200,report);return true;
 }
 if(path==='/api/program/transitions'&&method==='GET'){
  requireRole(user,'admin','methodist','program_manager','teacher','tutor');json(200,{rules:await transitionData(db)});return true;
 }
 if(path==='/api/program/transitions'&&method==='POST'){
  requireRole(user,'methodist','program_manager');const reason=text(body.reason,20,3000);
  const r=await db.one('SELECT * FROM transition_rules WHERE id=$1',[body.id]);if(!r)fail(404,'Правило не найдено');
  const approved=body.approve===true&&user.roles.includes('program_manager');
  if(approved&&r.metadata.kind==='interdisciplinary'&&body.calendarConfirmed!==true)fail(400,'Для междисциплинарного правила подтвердите календарную последовательность модулей');
  await db.transaction(async tx=>{await tx.query('UPDATE transition_rules SET status=$2,version=version+1,metadata=metadata||$3::jsonb WHERE id=$1',[r.id,approved?'approved':'candidate',JSON.stringify({reviewReason:reason,calendarStatus:approved?'approved':r.metadata.calendarStatus??'requires_module_schedule',reviewedBy:user.id})]);await audit(tx,user,approved?'transition.approved':'transition.proposed',r.id,{reason});});json(200,{status:approved?'approved':'candidate'});return true;
 }
 if(path==='/api/artifacts'&&method==='POST'){
  requireRole(user,'student');const a=await getAttempt(user,body.attemptId);if(a.user_id!==user.id)fail(403,'Только собственный артефакт');
  if(!['report','dataset','prompt','ai_response','verification','protocol'].includes(body.kind))fail(400,'Неизвестный тип артефакта');
  const content=text(body.content,10,16000),title=text(body.title,3,180),id=uuid();
  await db.transaction(async tx=>{await tx.query('INSERT INTO research_artifacts(id,owner_id,task_id,attempt_id,kind,title,content,sha256) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[id,user.id,a.task_id,a.id,body.kind,title,content,digest(content)]);await event(tx,user,'artifact.recorded',id,{taskId:a.task_id,kind:body.kind},a.course_id);});json(201,{id,sha256:digest(content)});return true;
 }
 return false;
}
