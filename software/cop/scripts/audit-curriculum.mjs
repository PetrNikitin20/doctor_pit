import {writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {programCourses as courses,programUnits as units,programTasks as tasks,registry,VERSION,curriculumSource} from '../content/program.mjs';
export function curriculumAudit(){
 const rows=registry.indicators.map(i=>({code:i.code,competency:i.competency,title:i.text,proposedTasks:tasks.filter(t=>t.indicator_codes.includes(i.code)).map(t=>t.id)}));
 const competencies=registry.competencies.map(c=>({code:c.code,title:c.text,documentedCourses:courses.filter(x=>x.metadata.krmCompetencies.includes(c.code)).map(x=>x.id),proposedCourses:courses.filter(x=>x.metadata.proposedCompetencies.includes(c.code)).map(x=>x.id)}));
 return {date:'2026-10-29',version:VERSION,scope:'Author-created content proposals, not an expert-approved coverage certificate or learner attainment.',counts:{courses:courses.length,units:units.length,tasks:tasks.length,competencies:competencies.length,competenciesWithDocumentedCourse:competencies.filter(c=>c.documentedCourses.length).length,indicators:rows.length,indicatorsWithProposedTask:rows.filter(i=>i.proposedTasks.length).length,indicatorsWithoutTask:rows.filter(i=>!i.proposedTasks.length).length},competencies,indicators:rows,sourceHashes:curriculumSource.sources,notes:['All task/indicator assignments in the source bank are proposals pending expert review.','Actual approvals live in the database and cannot be inferred from this source audit.','Course links and task links are different coverage measures.','Repeated attempts within one family do not create independent control samples.']};
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
 const report=curriculumAudit(),output=process.argv[2]||'docs/curriculum-coverage-2026-10-29.json';await writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.counts));
}
