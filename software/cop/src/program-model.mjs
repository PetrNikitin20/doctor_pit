import {betaCdf,betaQuantile} from './model.mjs';
export function hornClosure(facts,rules){
 const known=new Set(facts),proof=new Map();let changed=true;
 while(changed){changed=false;for(const rule of rules)if(!known.has(rule.output)&&rule.inputs.every(x=>known.has(x))){known.add(rule.output);proof.set(rule.output,{rule:rule.id,inputs:rule.inputs});changed=true;}}
 return {facts:[...known].sort(),proof:Object.fromEntries(proof)};
}
export function structuralBounds(facts,rules,targets){
 const active=rules.filter(x=>x.status!=='retired'),lower=hornClosure(facts,active.filter(x=>x.status==='approved')),upper=hornClosure(facts,active);
 const lo=new Set(lower.facts),hi=new Set(upper.facts);
 return {lower,upper,targets:targets.map(id=>({id,status:lo.has(id)?'ensured':hi.has(id)?'undetermined':'not_ensured'})),scope:'Точное решение только для явно заданного конечного каталога независимых кандидатных правил; состав элективов должен быть зафиксирован отдельно.'};
}
export function binaryInputState(controls,unitId,level,{delta=.05,m=1,tau=.8,now=Date.now()}={}){
 const first=new Map();
 for(const c of [...controls].sort((a,b)=>new Date(a.created_at)-new Date(b.created_at))){
  const age=now-new Date(c.created_at).getTime();
  if(c.unit_id!==unitId||Number(c.level)!==level||c.independent!==true||c.approved_mapping!==true||typeof c.passed!=='boolean'||!c.family_id||age<0||age>180*86400000)continue;
  // Never replace a failed control with a successful retry from the same family.
  if(!first.has(c.family_id))first.set(c.family_id,c);
 }
 const rows=[...first.values()],n=rows.length,successes=rows.filter(x=>x.passed).length,a=1+successes,b=1+n-successes,budget=delta/m,lower=betaQuantile(budget,a,b),risk=betaCdf(tau,a,b),transfer=rows.some(x=>x.transfer&&x.passed);
 return {unitId,level,n,successes,a,b,mean:a/(a+b),lower,risk,budget,transfer,ready:lower>=tau&&transfer,assumptions:'Сопоставимый класс заранее назначенного самостоятельного бинарного контроля; первый допустимый исход семейства в окне ≤180 дней, без замены успешным повтором. Независимость, постоянство параметра и отсутствие отбора по результату требуют отдельного протокола. Уровни считаются отдельно.'};
}
export function evaluateTransitions(rules,controls,{now=Date.now()}={}){
 return rules.map(rule=>{
  const m=rule.inputs.length,delta=Number(rule.metadata?.delta??.05),tau=Number(rule.metadata?.tau??.8);
  if(!m||!Number.isFinite(delta)||delta<=0||delta>=1||!Number.isFinite(tau)||tau<=0||tau>=1)throw Error('Некорректная конфигурация перехода');
  const states=rule.inputs.map(i=>binaryInputState(controls,i.unit_id,Number(i.min_level),{delta,m,tau,now}));
  const calendar=rule.metadata?.kind!=='interdisciplinary'||rule.metadata?.calendarStatus==='approved';
  return {...rule,m,delta,tau,inputs:states,jointRiskUpper:Math.min(1,states.reduce((s,x)=>s+x.risk,0)),ready:rule.status==='approved'&&calendar&&states.every(x=>x.ready),decision:rule.status!=='approved'?'requires_rule_review':!calendar?'requires_calendar_review':states.every(x=>x.ready)?'recommended':'requires_independent_control',note:'Бюджет δ относится к одному этому решению, а не ко всей четырёхлетней траектории. Произведение вероятностей не используется; независимость предпосылок не нужна для объединённой границы.'};
 });
}
export function compileCurriculum(courses,units,tasks,rules,selectedModules,requiredModules=2,additionalCourses=[]){
 const chosen=new Set(selectedModules),selectionResolved=chosen.size===requiredModules;
 const additional=new Set(additionalCourses);
 const included=courses.filter(c=>(!c.catalog_meta.facultative||additional.has(c.id))&&(!c.catalog_meta.electiveModule||chosen.has(c.catalog_meta.electiveModule)));
 const ids=new Set(included.map(x=>x.id)),activeUnits=units.filter(u=>ids.has(u.course_id)),unitIds=new Set(activeUnits.map(u=>u.id));
 const facts=included.map(c=>'included:'+c.id),compiled=[],targets=[];
 const atom=(kind,id,level)=>`${kind}:${id}:L${level}`;
 for(const u of activeUnits){
  const entry=rules.filter(r=>r.target_unit_id===u.id&&r.target_level===1);
  if(!entry.length)compiled.push({id:'teaching:'+u.id,inputs:['included:'+u.course_id],output:atom('teach',u.id,1),status:u.metadata?.status==='approved'?'approved':'candidate'});
  for(const t of tasks.filter(t=>t.unit_id===u.id)){
   const output=atom('assess',u.id,t.level);compiled.push({id:'assessment:'+t.id,inputs:[atom('teach',u.id,t.level)],output,status:'candidate'});targets.push(output);
  }
 }
 for(const r of rules.filter(r=>unitIds.has(r.target_unit_id))){
  compiled.push({id:r.id,inputs:['included:'+units.find(u=>u.id===r.target_unit_id).course_id,...r.inputs.map(i=>atom('assess',i.unit_id,i.min_level))],output:atom('teach',r.target_unit_id,r.target_level),status:r.status});
 }
 const unmodeledModules=[...chosen].filter(id=>!courses.some(c=>c.catalog_meta.electiveModule===id));
 return {selectionResolved,requiredModules,selectedModules:[...chosen],additionalCourses:[...additional],unmodeledModules,includedCourseIds:[...ids],bounds:structuralBounds(facts,compiled,targets),model:'unit-level-structural-v1',note:selectionResolved?'Проверяется выбранная программа в пределах размеченного каталога. Факультативы включены только как назначенные дополнительные курсы. Полная компиляция индикаторов, сроков и версий требует экспертной разметки.':'Обязательная часть показана отдельно; итог по программе не сертифицируется до выбора двух элективных модулей. Все элективы одновременно не считаются независимыми дополнениями.'};
}
