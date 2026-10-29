import {readFileSync} from 'node:fs';
import {tasks as algorithmTasks} from './tasks.mjs';
import {makeTasks} from './task-patterns.mjs';
const read=name=>JSON.parse(readFileSync(new URL(name,import.meta.url),'utf8'));
export const curriculumSource=read('./curriculum-source.json'),registry=read('./competencies.json');
export const VERSION='pmo-program-2026-10-29';
// Each row identifies a real plan row; authors' teaching/scheduling proposals are separate.
const specs=[
 ['calculus',35,'gradient','Производная и проверка градиента','gradient'],
 ['discrete',36,'closure','Логические правила и AND-предпосылки','logic'],
 ['probability',37,'bayes','Вероятность и байесовское обновление','multiple'],
 ['algebra',38,'dot','Векторы и скалярные произведения','cosine'],
 ['specialty',44,'provenance','Роли ИИ и проверяемое происхождение результатов','retrieval'],
 ['algorithms',45,null,null,'algorithms'],
 ['programming',46,'aggregate','Проверяемые преобразования структур данных','leakage'],
 ['dbms',48,'join','Соединения, ключи и кратность строк','leakage'],
 ['data-processing',53,'clean','Очистка и происхождение данных','leakage'],
 ['ml',54,'metrics','Качество моделей и независимая проверка','classification'],
 ['big-data',58,'aggregate','Агрегация и разбиение больших данных','leakage'],
 ['deep-learning',61,'softmax','Численная устойчивость нейросетевых операций','gradient'],
 ['optimization',62,'gradient','Оптимизация и проверка производных','gradient'],
 ['nlp',63,'tokens','Токенизация и нормализация','retrieval'],
 ['vision',64,'image','Обработка изображений и граничные условия','classification'],
 ['recommenders',65,'ranking','Ранжирование и исключение просмотренного','ranking'],
 ['visualization',66,'histogram','Агрегация для честной визуализации','classification'],
 ['semantics',67,'closure','Семантические связи и проверяемые выводы','logic'],
 ['applied-ml',68,'metrics','Метрики и ограничения прикладной модели','classification'],
 ['open-data',69,'provenance','Проверяемое происхождение открытых данных','leakage'],
 ['web',72,'contract','Контракты веб-сервисов','retrieval'],
 ['oop',73,'idempotency','Состояние объекта и повторы операций','logic'],
 ['mobile',74,'idempotency','Повтор доставки и согласованность состояния','logic'],
 ['efficient-algorithms',80,'aggregate','Эффективные редукции и корректность','gradient'],
 ['low-level',81,'bits','Побитовые операции и инварианты','logic'],
 ['embedded',82,'timeseries','Обработка потока без будущих данных','leakage'],
 ['is-design',84,'contract','Спецификация информационной системы','logic'],
 ['software-architecture',85,'idempotency','Контракты и повторяемость операций','logic'],
 ['software-testing',86,'contract','Граничные случаи и проверка ИИ-тестов','logic'],
 ['graph-theory',88,'closure','Графы зависимостей и наименьшее замыкание','logic'],
 ['network-models',89,'neighbors','Близость и локальные сетевые модели','ranking'],
 ['semantic-ml',90,'retrieve','Семантический анализ и проверка опорных документов','retrieval'],
 ['hpc',92,'aggregate','Корректность параллельной редукции','gradient'],
 ['iot',93,'timeseries','Временные ряды датчиков и утечка будущего','leakage'],
 ['microservices',94,'idempotency','Идемпотентность и повторная доставка','logic'],
 ['business-llm',96,'retrieve','Обоснованность ответов языковой модели','retrieval'],
 ['fintech-ds',97,'metrics','Дисбаланс классов и качество финансовых моделей','classification'],
 ['rag-agents',98,'retrieve','Проверяемые ссылки в RAG-агенте','retrieval'],
 ['seminar',107,'protocol','Воспроизводимый исследовательский протокол','multiple'],
 ['intro-ai',115,'provenance','Режимы помощи ИИ и проверка результата','retrieval'],
 ['ai-math',119,'dot','Векторные представления и операции','gradient'],
 ['foundation-models',120,'softmax','Распределения и устойчивость генеративной модели','retrieval'],
 ['reinforcement',121,'qlearning','Обновление ценности и терминальные состояния','classification']
];
const additions={
 'algebra':[['matrix','Матрицы и линейные преобразования'],['rank','Линейная независимость и ранг']],
 'data-processing':[['aggregate','Агрегация и контроль качества'],['split','Разбиение данных без утечки']],
 'seminar':[['multiple','Гипотезы и множественные проверки'],['provenance','Протокол, артефакты и источники']],
 'ai-math':[['bayes','Вероятностные модели и Байес'],['gradient','Оптимизация и градиент']],
 'recommenders':[['cosine','Близость объектов и нормировка'],['neighbors','Соседство и проверка рекомендаций']],
 'nlp':[['tfidf','Частоты, документы и IDF'],['retrieve','Опорные документы и RAG']],
 'applied-ml':[['split','Перенос и контроль утечки'],['protocol','Протокол прикладного эксперимента']]
};
const proposedSemesters={'intro-ai':[1],'ai-math':[3,4],'foundation-models':[7,8],'reinforcement':[7,8]};
const authorCompetencies={algebra:['MF-1'],seminar:['LC-2','SS-2']};
const topicFamily={dot:'MF-1',matrix:'MF-1',rank:'MF-1',bayes:'MF-2',gradient:'MF-3',clean:'BD-1',aggregate:'BD-1',split:'BD-2',metrics:'ML-2',ranking:'DL-2',neighbors:'FC-1',tokens:'DL-4',tfidf:'DL-4',retrieve:'LLM-1',multiple:'MF-4',protocol:'LC-2',provenance:'SS-2',join:'BD-3',closure:'MF-1',softmax:'DL-2',image:'DL-3',histogram:'BD-1',bits:'PL-4',idempotency:'LC-3',contract:'LC-5',timeseries:'BD-4',qlearning:'ML-6'};
export const electiveModules=curriculumSource.electiveModules;
export const programCourses=specs.map(([id,row,pattern,topic,lab])=>{
 const source=curriculumSource.courses.find(c=>c.row===row);if(!source)throw Error('Missing plan row '+row);
 const semesters=source.semesters.length?source.semesters:proposedSemesters[id];
 const years=[...new Set(semesters.map(s=>Math.ceil(s/2)))];
 const module=source.planCode.match(/^Б\.1\.2\.2\.2\.(\d+)\./)?.[1]||null;
 return {id,title:source.title,year:years[0],semesters,status:id==='algorithms'?'pilot':'curriculum_draft',source:`Учебный план: Дисциплины!B${row},${source.competencyCell}; ${source.semesters.length?'распределение по часам':'семестры предложены автором, требуют сверки'}`,metadata:{version:VERSION,years,planRow:row,planCode:source.planCode,facultative:source.planCode.startsWith('Б.5.'),scheduling:source.semesters.length?'documented':'proposed',electiveModule:module,krmCompetencies:source.krmCompetencies,proposedCompetencies:authorCompetencies[id]||[],unresolvedPlanCodes:source.unresolvedPlanCodes,lab,pattern,topic,contentStatus:id==='algorithms'?'rpd_pilot':'authored_start_module',independentControl:'Только отдельно подтверждённые бинарные исходы; обычные оценки и помощь ИИ не повышают статистический допуск.'}};
});
export const programUnits=read('./units.json').map(u=>({...u,course_id:'algorithms',metadata:{pattern:null,lab:'algorithms',indicatorCodes:registry.indicators.filter(x=>x.competency==='PL-1').slice(0,1).map(x=>x.code),status:'rpd_pilot'}}));
for(const c of programCourses.filter(c=>c.id!=='algorithms')){
 const topics=[[c.metadata.pattern,c.metadata.topic],...(additions[c.id]||[])];
 topics.forEach(([pattern,title],i)=>{
  const allowed=[...c.metadata.krmCompetencies,...c.metadata.proposedCompetencies];
  const preferred=allowed.includes(topicFamily[pattern])?topicFamily[pattern]:allowed[0];
  const indicators=registry.indicators.filter(x=>x.competency===preferred).slice(0,1).map(x=>x.code);
  programUnits.push({id:`${c.id}-u${String(i+1).padStart(2,'0')}`,course_id:c.id,title,position:i+1,semester:c.semesters[Math.min(i,c.semesters.length-1)],description:`Авторский стартовый модуль дисциплины «${c.title}». Три уровня: предметный результат, аудит учебного ИИ-варианта, исследование и перенос. Требует методической экспертизы; не заменяет полную РПД.`,metadata:{pattern,lab:c.metadata.lab,indicatorCodes:indicators,status:'proposed',version:VERSION}});
 });
}
export const programTasks=[...algorithmTasks.map(t=>({...t,assessment_family:t.unit_id+'-assessment',indicator_codes:registry.indicators.filter(x=>x.competency==='PL-1').slice(0,1).map(x=>x.code)})),...programUnits.filter(u=>u.course_id!=='algorithms').flatMap(u=>makeTasks(u,programCourses.find(c=>c.id===u.course_id)))];
// These are candidate methodological annotations, not official plan prerequisites.
const prerequisites={
 'data-processing':['programming','algorithms'],'dbms':['programming','data-processing'],'ai-math':['algebra','calculus','probability'],
 'ml':['ai-math','data-processing'],'big-data':['dbms','data-processing'],'deep-learning':['ml','algebra'],'optimization':['calculus','algebra'],
 'recommenders':['ml','algebra'],'nlp':['ml','data-processing'],'applied-ml':['ml','data-processing','seminar'],
 'vision':['deep-learning'],'visualization':['data-processing'],'semantics':['discrete','dbms'],'open-data':['data-processing'],
 'web':['programming'],'oop':['programming'],'mobile':['oop'],'efficient-algorithms':['algorithms','discrete'],
 'low-level':['algorithms'],'embedded':['low-level'],'is-design':['dbms','seminar'],'software-architecture':['oop','is-design'],
 'software-testing':['programming'],'graph-theory':['discrete','algorithms'],'network-models':['graph-theory'],
 'semantic-ml':['semantics','ml'],'hpc':['efficient-algorithms','algebra'],'iot':['programming','probability'],
 'microservices':['web','software-architecture'],'business-llm':['nlp'],'fintech-ds':['ml','seminar'],'rag-agents':['business-llm','dbms'],
 'foundation-models':['deep-learning','nlp'],'reinforcement':['ml','probability']
};
const unitsFor=id=>programUnits.filter(u=>u.course_id===id).sort((a,b)=>a.position-b.position);
export const programTransitions=[];
for(const c of programCourses){
 const units=unitsFor(c.id);
 for(const u of units)for(const level of [2,3])programTransitions.push({id:`${u.id}-to-l${level}`,title:`${u.title}: уровень ${level-1} → ${level}`,target_unit_id:u.id,target_level:level,status:'candidate',inputs:[{unit_id:u.id,min_level:level-1}],metadata:{kind:'level',source:'Авторская явная связь уровней, не автоматическое включение',version:VERSION}});
 for(let i=1;i<units.length;i++)programTransitions.push({id:`${units[i].id}-entry`,title:`Переход к теме «${units[i].title}»`,target_unit_id:units[i].id,target_level:1,status:'candidate',inputs:[{unit_id:units[i-1].id,min_level:1}],metadata:{kind:'unit',source:'Авторское предложение',version:VERSION}});
 if(prerequisites[c.id])programTransitions.push({id:`${c.id}-interdisciplinary`,title:`Междисциплинарный вход: ${c.title}`,target_unit_id:units[0].id,target_level:1,status:'candidate',inputs:prerequisites[c.id].map(id=>({unit_id:unitsFor(id).at(-1).id,min_level:2})),metadata:{kind:'interdisciplinary',source:'Авторское предложение; входы одного правила соединены AND',version:VERSION,tau:.8,delta:.05,calendarStatus:'requires_module_schedule'}});
}
// An optional AI-mathematics course is one support path, not a compulsory barrier to core ML.
programTransitions.push({id:'ml-core-interdisciplinary',title:'Основной вход в машинное обучение: анализ, вероятность и данные',target_unit_id:unitsFor('ml')[0].id,target_level:1,status:'candidate',inputs:['calculus','probability','data-processing'].map(id=>({unit_id:unitsFor(id).at(-1).id,min_level:2})),metadata:{kind:'interdisciplinary',source:'Авторская альтернативная поддержка из основных дисциплин; факультатив не становится обязательным',version:VERSION,tau:.8,delta:.05,calendarStatus:'requires_module_schedule'}});
