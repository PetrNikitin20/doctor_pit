import {migrate} from '../src/db.mjs';
import {hashPassword} from '../src/security.mjs';
import {programCourses as courses,programUnits as units,programTasks as tasks,programTransitions,registry,VERSION,curriculumSource} from '../content/program.mjs';
export const roles={student:'Студент',teacher:'Преподаватель',tutor:'Тьютор',methodist:'Методист',program_manager:'Руководитель программы',researcher:'Исследователь',admin:'Администратор',expert:'Внешний эксперт'};
export async function refreshEnrollments(db){
 await db.transaction(async tx=>{
  for(const c of courses){
   await tx.query("INSERT INTO enrollments(course_id,user_id,kind) SELECT DISTINCT $1,m.user_id,$3 FROM group_members m JOIN groups g ON g.id=m.group_id JOIN user_roles r ON r.user_id=m.user_id AND r.role_code='student' WHERE g.year=ANY($2::int[]) ON CONFLICT(course_id,user_id) DO UPDATE SET kind=excluded.kind",[c.id,c.metadata.years,c.metadata.facultative?'bridging':'study']);
   await tx.query("UPDATE enrollments e SET kind=CASE WHEN EXISTS(SELECT 1 FROM attempts a JOIN tasks t ON t.id=a.task_id JOIN learning_units u ON u.id=t.unit_id WHERE a.user_id=e.user_id AND u.course_id=e.course_id) THEN 'bridging' ELSE 'preview' END WHERE e.course_id=$1 AND e.user_id<>'demo-student' AND EXISTS(SELECT 1 FROM group_members m JOIN groups g ON g.id=m.group_id WHERE m.user_id=e.user_id AND NOT(g.year=ANY($2::int[])))",[c.id,c.metadata.years]);
  }
  await tx.query("INSERT INTO enrollments(course_id,user_id,kind) SELECT DISTINCT 'algorithms',r.user_id,'bridging' FROM user_roles r JOIN group_members m ON m.user_id=r.user_id JOIN groups g ON g.id=m.group_id WHERE r.role_code='student' AND g.year>1 ON CONFLICT(course_id,user_id) DO UPDATE SET kind=CASE WHEN enrollments.kind='study' THEN 'study' ELSE 'bridging' END");
 });
}
export async function seed(db,{demo=false,demoPassword}={}){
 await migrate(db);
 await db.transaction(async tx=>{
  await tx.query("INSERT INTO programs VALUES('pmo','Прикладное машинное обучение',$1,'draft') ON CONFLICT(id) DO UPDATE SET version=excluded.version",[VERSION]);
  for(const [code,title]of Object.entries(roles))await tx.query('INSERT INTO roles VALUES($1,$2) ON CONFLICT DO NOTHING',[code,title]);
  for(const c of registry.competencies)await tx.query('INSERT INTO competencies VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[c.code,'pmo',c.text]);
  for(const i of registry.indicators)await tx.query('INSERT INTO indicators VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING',[i.code,i.competency,i.text,/продвинут/i.test(i.levels)?3:/средн/i.test(i.levels)?2:1,JSON.stringify(i)]);
  for(const c of courses){
   await tx.query('INSERT INTO courses(id,program_id,title,year,semesters,status,source,catalog_meta) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(id) DO UPDATE SET title=excluded.title,year=excluded.year,semesters=excluded.semesters,status=excluded.status,source=excluded.source,catalog_meta=excluded.catalog_meta',[c.id,'pmo',c.title,c.year,JSON.stringify(c.semesters),c.status,c.source,JSON.stringify(c.metadata)]);
   for(const code of [...c.metadata.krmCompetencies,...c.metadata.proposedCompetencies])await tx.query('INSERT INTO course_competencies VALUES($1,$2,$3,$4) ON CONFLICT(course_id,competency_code) DO UPDATE SET status=excluded.status,source=excluded.source',[c.id,code,c.metadata.krmCompetencies.includes(code)?'documented':'proposed',JSON.stringify({row:c.metadata.planRow,cell:'D'+c.metadata.planRow,planSha256:curriculumSource.sources.plan.sha256,krmSha256:curriculumSource.sources.krm.sha256,krmCells:curriculumSource.krmCompetencySources[code]||[],note:c.metadata.krmCompetencies.includes(code)?'Связь дисциплины и компетенции из плана; не доказательство освоения':'Авторское предложение; нет прямого кода целевой модели в строке плана'})]);
  }
  for(const u of units)await tx.query('INSERT INTO learning_units(id,course_id,title,position,semester,description,metadata) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(id) DO UPDATE SET metadata=excluded.metadata',[u.id,u.course_id,u.title,u.position,u.semester,u.description,JSON.stringify(u.metadata)]);
  for(const t of tasks){
   await tx.query('INSERT INTO tasks(id,unit_id,title,level,kind,statement,starter,rubric,tests,reference_code,assessment_family,ai_fixture) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT DO NOTHING',[t.id,t.unit_id,t.title,t.level,t.kind,t.statement,t.starter,JSON.stringify(t.rubric),JSON.stringify(t.tests),t.reference_code,t.assessment_family,t.ai_fixture??null]);
   await tx.query('INSERT INTO task_versions(task_id,version,title,statement,tests,reference_code,ai_fixture) SELECT id,version,title,statement,tests,reference_code,ai_fixture FROM tasks WHERE id=$1 ON CONFLICT DO NOTHING',[t.id]);
   const changed=await tx.rows('UPDATE tasks SET title=$2,statement=$3,tests=$4,reference_code=$5,ai_fixture=$6,version=version+1 WHERE id=$1 AND (title<>$2 OR statement<>$3 OR tests<>$4::jsonb OR reference_code<>$5 OR ai_fixture IS DISTINCT FROM $6) RETURNING id',[t.id,t.title,t.statement,JSON.stringify(t.tests),t.reference_code,t.ai_fixture??null]);
   if(changed.length)await tx.query("UPDATE task_indicators SET status='proposed' WHERE task_id=$1",[t.id]);
   await tx.query('UPDATE tasks SET assessment_family=$2 WHERE id=$1 AND assessment_family IS NULL',[t.id,t.assessment_family]);
   await tx.query('INSERT INTO task_versions(task_id,version,title,statement,tests,reference_code,ai_fixture) SELECT id,version,title,statement,tests,reference_code,ai_fixture FROM tasks WHERE id=$1 ON CONFLICT DO NOTHING',[t.id]);
   for(const code of t.indicator_codes)await tx.query("INSERT INTO task_indicators VALUES($1,$2,1,'proposed') ON CONFLICT DO NOTHING",[t.id,code]);
  }
  for(const rule of programTransitions){
   await tx.query('INSERT INTO transition_rules(id,title,target_unit_id,target_level,status,metadata) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING',[rule.id,rule.title,rule.target_unit_id,rule.target_level,rule.status,JSON.stringify(rule.metadata)]);
   for(const input of rule.inputs)await tx.query('INSERT INTO transition_inputs VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[rule.id,input.unit_id,input.min_level]);
  }
 });
 if(demo){
  if(!demoPassword)throw Error('Укажите DEMO_PASSWORD (минимум 12 символов)');
  const hash=await hashPassword(demoPassword);
  await db.transaction(async tx=>{
   await tx.query("INSERT INTO groups VALUES('demo','Демонстрационная группа',1,'Синтетические данные') ON CONFLICT DO NOTHING");
   for(const [code,title]of Object.entries(roles)){
    const uid='demo-'+code;await tx.query('INSERT INTO users(id,login,name,password_hash,force_reset) VALUES($1,$2,$3,$4,false) ON CONFLICT DO NOTHING',[uid,uid,title+' · демонстрация',hash]);await tx.query('INSERT INTO user_roles VALUES($1,$2) ON CONFLICT DO NOTHING',[uid,code]);
    if(code==='student'){await tx.query("INSERT INTO group_members VALUES('demo',$1) ON CONFLICT DO NOTHING",[uid]);for(const c of courses)await tx.query("INSERT INTO enrollments(course_id,user_id,kind) VALUES($1,$2,'study') ON CONFLICT DO NOTHING",[c.id,uid]);}
    else if(['teacher','tutor','expert'].includes(code))for(const c of courses)await tx.query("INSERT INTO staff_scopes VALUES($1,$2,'demo',$3) ON CONFLICT DO NOTHING",[uid,c.id,code]);
   }
  });
 }
 await refreshEnrollments(db);
 return {courses:courses.length,units:units.length,tasks:tasks.length,transitions:programTransitions.length,competencies:registry.competencies.length,indicators:registry.indicators.length};
}
