const control=(label,value,min,max,step=.1)=>({label,value,min,max,step});
export const AI_LABS={
 algorithms:{id:'algorithms',title:'ИИ-поиск: ошибка границы и контрпример',parameter:control('Число элементов',32,2,512,1)},
 gradient:{id:'gradient',title:'ИИ-градиент: проверка конечной разностью',parameter:control('Шаг обучения',.1,.01,1.5,.01)},
 cosine:{id:'cosine',title:'ИИ-близость: нормировка и масштаб',parameter:control('Масштаб первого вектора',2,.1,10,.1)},
 leakage:{id:'leakage',title:'ИИ-анализ данных: утечка между выборками',parameter:control('Доля тестовых семейств, раскрытых модели',.5,0,1,.05)},
 multiple:{id:'multiple',title:'ИИ-гипотезы: множественные проверки',parameter:control('Общий уровень alpha',.05,.001,.2,.001)},
 ranking:{id:'ranking',title:'ИИ-рекомендации: Top-k и просмотренные объекты',parameter:control('Размер списка k',5,1,10,1)},
 retrieval:{id:'retrieval',title:'RAG: проверка опорных ссылок',parameter:control('Число извлечённых документов',2,1,4,1)},
 classification:{id:'classification',title:'ИИ-классификатор: порог и независимая проверка',parameter:control('Порог классификации',.5,0,1,.05)},
 logic:{id:'logic',title:'ИИ-граф: ошибка замены AND на OR',parameter:control('Число принятых входных фактов',1,0,3,1)}
};
function finite(v,min,max,name,integer=false){const n=Number(v);if(!Number.isFinite(n)||n<min||n>max||(integer&&!Number.isInteger(n)))throw Error(`${name}: допустимо ${min}…${max}${integer?', целое число':''}`);return n;}
function random(seed){let state=seed>>>0;return()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};}
const round=x=>Math.round(x*1e6)/1e6;
const metric=(label,value)=>({label,value:typeof value==='number'?round(value):value});
function measures(rows,threshold){let tp=0,fp=0,tn=0,fn=0;for(const r of rows){const pred=r.score>=threshold;if(r.y)pred?tp++:fn++;else pred?fp++:tn++;}const precision=tp+fp?tp/(tp+fp):0,recall=tp+fn?tp/(tp+fn):0;return {tp,fp,tn,fn,precision:round(precision),recall:round(recall),f1:round(precision+recall?2*precision*recall/(precision+recall):0),accuracy:round(rows.length?(tp+tn)/rows.length:0)};}
export function runAiLab(p={}){
 const spec=AI_LABS[p.labId];if(!spec)throw Error('Неизвестный симулятор ИИ');
 const seed=finite(p.seed??42,0,4294967295,'seed',true),n=finite(p.n??32,8,512,'n',true),value=finite(p.parameter??spec.parameter.value,spec.parameter.min,spec.parameter.max,spec.parameter.label,spec.parameter.step===1),rng=random(seed);
 const result={version:'ai-labs-v1',labId:spec.id,title:spec.title,seed,parameters:{labId:spec.id,seed,n,parameter:value},origin:'curated_ai_error_fixture',metrics:[],rows:[],columns:[],explanation:'',note:'Синтетический учебный сценарий. ИИ-вариант подготовлен автором как пример ошибки; внешняя LLM не вызывалась. Результат не является оценкой студента и не подтверждает педагогический эффект.'};
 const rows=result.rows;
 if(spec.id==='algorithms'){
  const size=value;let wrong=0;
  for(let target=0;target<size;target++){let lo=0,hi=size-1,found=-1;while(lo<hi){const mid=(lo+hi)>>1;if(mid===target){found=mid;break;}if(mid<target)lo=mid+1;else hi=mid-1;}const expected=target;if(found!==expected)wrong++;if(rows.length<25)rows.push({target,expected,candidate:found,correct:found===expected});}
  result.metrics=[metric('Проверено значений',size),metric('Ошибки ИИ-варианта',wrong),metric('Эталон: правильные ответы',size)];result.explanation='Условие lo < hi пропускает проверку последней оставшейся позиции. Нужен инвариант и проверка lo <= hi. Это контрпример, а не измерение качества реальной LLM.';
 }
 if(spec.id==='gradient'){
  const target=rng()*2,initial=2+rng()*4,gradient=2*(initial-target),h=1e-5,fd=(((initial+h-target)**2)-((initial-h-target)**2))/(2*h);let good=initial,bad=initial;
  for(let i=0;i<=Math.min(n,60);i++){rows.push({step:i,verifiedLoss:round((good-target)**2),candidateLoss:round((bad-target)**2)});good-=value*2*(good-target);bad-=value*(bad-target);}
  result.metrics=[metric('Градиент по формуле',gradient),metric('Конечная разность',fd),metric('Ошибка ИИ-градиента',Math.abs((initial-target)-fd)),metric('Выполнено шагов',rows.length-1)];result.explanation='Для L=(w−target)² производная равна 2(w−target). Учебный ИИ-вариант потерял множитель 2. Сходимость зависит от шага; один график не заменяет проверки производной. Для устойчивого времени показывается до 60 шагов.';
 }
 if(spec.id==='cosine'){
  for(let i=0;i<Math.min(n,24);i++){const a=Array.from({length:4},()=>1+Math.floor(rng()*5)),b=Array.from({length:4},()=>1+Math.floor(rng()*5)),dot=a.reduce((s,x,j)=>s+x*b[j],0),den=Math.sqrt(a.reduce((s,x)=>s+x*x,0)*b.reduce((s,x)=>s+x*x,0));rows.push({case:i+1,cosine:round(dot/den),scaledCosine:round(value*dot/(value*den)),candidateDot:dot,scaledCandidate:value*dot});}
  result.metrics=[metric('Проверено пар',rows.length),metric('Макс. изменение косинуса',Math.max(...rows.map(r=>Math.abs(r.cosine-r.scaledCosine)))),metric('Масштаб',value)];result.explanation='При положительном масштабировании одного вектора косинус сохраняется, а скалярное произведение умножается на масштаб. Нормировка имеет математический смысл; нулевой вектор требует отдельного контракта.';
 }
 if(spec.id==='leakage'){
  const groups=Array.from({length:n},(_,i)=>({id:'family-'+i,y:rng()<.5?0:1})),cut=Math.floor(.7*n),train=groups.slice(0,cut),test=groups.slice(cut),leaked=Math.floor(value*test.length),memory=new Map([...train,...test.slice(0,leaked)].map(x=>[x.id,x.y]));
  const base=test.reduce((s,x)=>s+(x.y===0),0)/test.length,leaky=test.reduce((s,x)=>s+((memory.get(x.id)??0)===x.y),0)/test.length;
  for(const [i,x]of test.entries())rows.push({family:x.id,truth:x.y,properPrediction:0,leakyPrediction:memory.get(x.id)??0,leaked:i<leaked});
  result.metrics=[metric('Честный тест: accuracy',base),metric('Тест с утечкой: accuracy',leaky),metric('Раскрыто тестовых семейств',leaked),metric('Тестовых семейств',test.length)];result.explanation='Модель здесь – память по идентификаторам семейств с ответом 0 для неизвестного семейства. Раскрытие части тестовых меток улучшает видимую метрику без доказательства обобщения. Разбивать нужно по семействам до обработки и выбора модели.';
 }
 if(spec.id==='multiple'){
  for(let i=0;i<n;i++){const pValue=rng();rows.push({hypothesis:i+1,p:round(pValue),naive:pValue<=value,bonferroni:pValue<=value/n});}
  result.metrics=[metric('Проверок',n),metric('Сигналы без поправки',rows.filter(r=>r.naive).length),metric('Сигналы с поправкой',rows.filter(r=>r.bonferroni).length),metric('alpha / m',value/n)];result.explanation='Все p-значения сгенерированы при нулевой модели Uniform(0,1). Выбранные сигналы не доказывают полезный эффект. В одном запуске показаны числа сигналов; это не эмпирическая оценка вероятности ошибки семейства.';
 }
 if(spec.id==='ranking'){
  const items=Array.from({length:n},(_,i)=>({id:'item-'+String(i).padStart(3,'0'),gain:Math.floor(rng()*3),popularity:rng(),seen:i<Math.floor(n*.3)})),k=value;
  const reference=items.filter(x=>!x.seen).sort((a,b)=>b.gain-a.gain||a.id.localeCompare(b.id)).slice(0,k),candidate=[...items].sort((a,b)=>(b.popularity+(b.seen?2:0))-(a.popularity+(a.seen?2:0))).slice(0,k);
  const dcg=list=>list.reduce((s,x,i)=>s+(x.seen?0:(2**x.gain-1))/Math.log2(i+2),0),ideal=dcg(reference),relevant=items.filter(x=>!x.seen&&x.gain>0).length;
  for(let i=0;i<k;i++)rows.push({rank:i+1,reference:reference[i]?.id||'',candidate:candidate[i]?.id||'',candidateSeen:!!candidate[i]?.seen});
  result.metrics=[metric('Эталон NDCG@k',ideal?1:0),metric('ИИ-вариант NDCG@k',ideal?dcg(candidate)/ideal:0),metric('Просмотренных в ИИ-списке',candidate.filter(x=>x.seen).length),metric('Эталон Recall@k',relevant?reference.filter(x=>x.gain>0).length/relevant:0)];result.explanation='Эталон сортирует заданные сценарием истинные релевантности и является ориентиром, а не обученной рекомендательной моделью. ИИ-вариант ранжирует популярное и не исключает просмотренное. Метрики вычисляются по синтетической разметке.';
 }
 if(spec.id==='retrieval'){
  const documents=[{id:'d1',text:'Тестовые данные не участвуют в обучении и выборе параметров.'},{id:'d2',text:'Разбиение повторов проводится по семействам до обработки данных.'},{id:'d3',text:'Ссылка указывает происхождение, но сама не доказывает истинность утверждения.'},{id:'d4',text:'Версия данных, seed и метрика входят в протокол.'}],selected=documents.slice(0,value),allowed=new Set(selected.map(x=>x.id));
  const claims=[{claim:'Проверять на отложенных данных',source:'d1'},{claim:'Разделять семейства',source:'d2'},{claim:'Неподтверждённая универсальная гарантия ИИ',source:'d99'}];
  for(const c of claims)rows.push({...c,citationPresent:allowed.has(c.source)});
  result.metrics=[metric('Извлечено документов',selected.length),metric('Утверждений с опорной ссылкой',rows.filter(x=>x.citationPresent).length),metric('Неподдержанных ссылок',rows.filter(x=>!x.citationPresent).length)];result.documents=selected;result.explanation='Проверяется принадлежность ссылки реально извлечённому набору. Это необходимая проверка происхождения, но не семантическое доказательство истинности. Неизвестный d99 должен остаться неподтверждённым.';
 }
 if(spec.id==='classification'){
  const all=Array.from({length:n},()=>{const y=rng()<.2?1:0;return {y,score:y?.4+.6*rng():.8*rng()};}),cut=Math.floor(n*.7),train=all.slice(0,cut),test=all.slice(cut);let best=.5,bestF=-1;
  for(let i=0;i<=20;i++){const t=i/20,f=measures(train,t).f1;if(f>bestF){best=t;bestF=f;}}
  const chosen=measures(test,value),defaultAi=measures(test,.5),validated=measures(test,best);result.metrics=[metric('Ваш F1 на тесте',chosen.f1),metric('ИИ-порог 0,5: F1',defaultAi.f1),metric('Порог, выбранный на train',best),metric('Его F1 на тесте',validated.f1)];
  rows.push({policy:'Ваш порог',threshold:value,...chosen},{policy:'Учебный ИИ-порог',threshold:.5,...defaultAi},{policy:'Выбор по train',threshold:best,...validated});result.explanation='Порог оптимизируется только на обучающей части и затем оценивается на отдельной тестовой части. F1 может отличаться от accuracy при дисбалансе. Эти синтетические баллы не являются оценкой вероятностной калибровки модели.';
 }
 if(spec.id==='logic'){
  const facts=['a','b','d'].slice(0,value),rules=[{inputs:['a','b'],output:'c'},{inputs:['c','d'],output:'e'},{inputs:['x'],output:'y'},{inputs:['y'],output:'x'}];
  const close=or=>{const s=new Set(facts);let changed=true;while(changed){changed=false;for(const r of rules)if((or?r.inputs.some(x=>s.has(x)):r.inputs.every(x=>s.has(x)))&&!s.has(r.output)){s.add(r.output);changed=true;}}return [...s].sort();};
  const verified=close(false),candidate=close(true);for(const atom of ['a','b','c','d','e','x','y'])rows.push({atom,verified:verified.includes(atom),candidate:candidate.includes(atom)});
  result.metrics=[metric('Фактов в AND-замыкании',verified.length),metric('Лишних выводов ИИ-OR',candidate.filter(x=>!verified.includes(x)).length),metric('Самоподдержка цикла x↔y',verified.includes('x')?'Ошибка':'Отсутствует')];result.explanation='Входы одного правила соединены AND; разные правила для одного выхода могут задавать альтернативы OR. Цикл без исходной опоры не порождает факты. Это проверка структуры, а не освоения темы студентом.';
 }
 result.columns=Object.keys(rows[0]||{});result.rows=rows.slice(0,100);return result;
}
