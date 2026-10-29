// Authored educational contracts, not official RPD. Expected values are explicit.
// The second and third levels audit a curated AI-error fixture and unseen cases.
const R=String.raw;
export const patterns={
 dot:{title:'Скалярное произведение',contract:'Даны два равных по длине списка a и b. Верните сумму попарных произведений. Для пустых векторов верните 0.',code:R`return sum(x*y for x,y in zip(data['a'],data['b']))`,cases:[[{a:[1,2],b:[3,4]},11],[{a:[],b:[]},0],[{a:[-1,2],b:[3,-4]},-11]]},
 cosine:{title:'Косинусная близость',contract:'Для равных по длине векторов a,b верните косинусную близость, округлённую до 6 знаков; если хотя бы один вектор нулевой, верните 0. Нельзя заменять косинус скалярным произведением.',code:R`import math
    a,b=data['a'],data['b']
    den=math.sqrt(sum(x*x for x in a)*sum(x*x for x in b))
    return round(sum(x*y for x,y in zip(a,b))/den,6) if den else 0`,cases:[[{a:[1,0],b:[5,0]},1],[{a:[0,0],b:[2,3]},0],[{a:[1,0],b:[-1,0]},-1],[{a:[1,0],b:[0,1]},0]]},
 matrix:{title:'Умножение матрицы на вектор',contract:'Даны прямоугольная matrix и vector согласованных размеров. Верните список скалярных произведений строк с вектором. Пустая матрица даёт [].',code:R`return [sum(x*y for x,y in zip(row,data['vector'])) for row in data['matrix']]`,cases:[[{matrix:[[1,2],[3,4]],vector:[2,1]},[4,10]],[{matrix:[],vector:[]},[]],[{matrix:[[0,-2,1]],vector:[3,2,4]},[-0+0-4+4]]] },
 rank:{title:'Ранг матрицы 2×2',contract:'Для целочисленной матрицы 2×2 верните её ранг 0,1 или 2. Проверки используют точные целые числа без численной неоднозначности.',code:R`a,b=data[0];c,d=data[1]
    return 2 if a*d-b*c else (1 if any([a,b,c,d]) else 0)`,cases:[[[[1,2],[2,4]],1],[[[1,0],[0,1]],2],[[[0,0],[0,0]],0]]},
 bayes:{title:'Байесовское обновление',contract:'prior, sensitivity и fpr заданы от 0 до 1. Верните P(H|+) = prior*sensitivity / (prior*sensitivity+(1-prior)*fpr), округлённую до 6 знаков. При нулевом знаменателе верните None.',code:R`p,s,f=data['prior'],data['sensitivity'],data['fpr']
    den=p*s+(1-p)*f
    return round(p*s/den,6) if den else None`,cases:[[{prior:.5,sensitivity:.8,fpr:.2},.8],[{prior:.1,sensitivity:.9,fpr:.1},.5],[{prior:0,sensitivity:0,fpr:0},null]]},
 gradient:{title:'Шаг градиентного спуска',contract:'Для L(w)=(w-target)^2 выполните один шаг w_new=w-rate*2*(w-target). Верните результат с округлением до 6 знаков. Не теряйте множитель 2.',code:R`return round(data['w']-data['rate']*2*(data['w']-data['target']),6)`,cases:[[{w:4,target:0,rate:.1},3.2],[{w:0,target:2,rate:.25},1],[{w:2,target:2,rate:.5},2]]},
 clean:{title:'Очистка данных с сохранением происхождения',contract:'Дан список строк и None. Пропустите None и пустые строки после strip, приведите оставшееся к casefold и удалите дубликаты, сохранив порядок первого появления.',code:R`out=[];seen=set()
    for x in data:
        if x is None: continue
        v=x.strip().casefold()
        if v and v not in seen: seen.add(v);out.append(v)
    return out`,cases:[[[' A ','a',null,' b ',''],['a','b']],[[],[]],[['ИИ',' ии ','Данные'],['ии','данные']]]},
 aggregate:{title:'Групповая агрегация',contract:'Даны записи {group,value} с целыми value. Сложите значения по group; верните словарь. Нельзя усреднять средние без учёта размеров групп.',code:R`out={}
    for row in data: out[row['group']]=out.get(row['group'],0)+row['value']
    return out`,cases:[[[{group:'a',value:2},{group:'b',value:3},{group:'a',value:-1}],{a:1,b:3}],[[],{}],[[{group:'x',value:0}],{x:0}]]},
 split:{title:'Контроль утечки между выборками',contract:'Даны train и test – списки идентификаторов семейств наблюдений. Верните отсортированный список семейств, попавших в обе части. Повторы не увеличивают число найденных утечек.',code:R`return sorted(set(data['train']) & set(data['test']))`,cases:[[{train:['a','a','b'],test:['b','c']},['b']],[{train:[],test:['x']},[]],[{train:['z','a'],test:['a','z','a']},['a','z']]]},
 metrics:{title:'Метрики бинарной классификации',contract:'Даны y и pred одинаковой длины, элементы 0/1. Верните {precision,recall,f1}, округляя до 6 знаков. Нулевые знаменатели дают 0.',code:R`tp=sum(a==1 and b==1 for a,b in zip(data['y'],data['pred']))
    fp=sum(a==0 and b==1 for a,b in zip(data['y'],data['pred']))
    fn=sum(a==1 and b==0 for a,b in zip(data['y'],data['pred']))
    p=tp/(tp+fp) if tp+fp else 0;r=tp/(tp+fn) if tp+fn else 0
    return {'precision':round(p,6),'recall':round(r,6),'f1':round(2*p*r/(p+r),6) if p+r else 0}`,cases:[[{y:[1,1,0,0],pred:[1,0,1,0]},{precision:.5,recall:.5,f1:.5}],[{y:[],pred:[]},{precision:0,recall:0,f1:0}],[{y:[1,0],pred:[1,0]},{precision:1,recall:1,f1:1}]]},
 ranking:{title:'Top-k без повторов и просмотренных объектов',contract:'Даны scores=[[id,score],...], seen и k. Удалите просмотренные id; при дублях оставьте максимальный score; отсортируйте по убыванию score, затем по id. Верните первые k id; k=0 даёт [].',code:R`best={}
    for item,score in data['scores']:
        if item not in data['seen']: best[item]=max(score,best.get(item,score))
    return [x for x,_ in sorted(best.items(),key=lambda p:(-p[1],p[0]))[:data['k']]]`,cases:[[{scores:[['a',2],['b',3],['a',4],['c',3]],seen:['a'],k:2},['b','c']],[{scores:[['a',1]],seen:[],k:0},[]],[{scores:[['z',1],['a',1]],seen:[],k:5},['a','z']]]},
 neighbors:{title:'Ближайшие соседи без совпадения с запросом',contract:'Даны query={id,value}, items=[{id,value},...],k. Исключите query.id и верните k id по абсолютному расстоянию value, при равенстве – по id.',code:R`q=data['query']
    rows=[x for x in data['items'] if x['id']!=q['id']]
    return [x['id'] for x in sorted(rows,key=lambda x:(abs(x['value']-q['value']),x['id']))[:data['k']]]`,cases:[[{query:{id:'x',value:5},items:[{id:'x',value:5},{id:'a',value:4},{id:'b',value:6}],k:2},['a','b']],[{query:{id:'x',value:0},items:[],k:2},[]]]},
 tokens:{title:'Токенизация Unicode',contract:'Из строки выделите последовательности Unicode-букв и цифр, используя re.findall(r"[^\\W_]+", text.casefold()). Подчёркивание является разделителем. Верните список токенов.',code:R`import re
    return re.findall(r'[^\W_]+',data.casefold())`,cases:[['ИИ, Python_3!',['ии','python','3']],['',[]],['Привет—МИР',['привет','мир']]]},
 tfidf:{title:'Сглаженный IDF',contract:'Даны n>0 – число документов и df – число документов, содержащих термин, 0<=df<=n. Верните ln((1+n)/(1+df))+1 с округлением до 6 знаков.',code:R`import math
    return round(math.log((1+data['n'])/(1+data['df']))+1,6)`,cases:[[{n:3,df:3},1],[{n:3,df:1},1.693147],[{n:1,df:0},1.693147]]},
 retrieve:{title:'Проверка опорных цитат RAG',contract:'Даны claims=[{id,sources:[...]},...] и allowed – ID реально извлечённых документов. Верните id утверждений без источников либо с хотя бы одним неразрешённым источником. Порядок сохраните.',code:R`allowed=set(data['allowed'])
    return [c['id'] for c in data['claims'] if not c['sources'] or not set(c['sources'])<=allowed]`,cases:[[{allowed:['d1'],claims:[{id:'c1',sources:['d1']},{id:'c2',sources:['d2']},{id:'c3',sources:[]}]},['c2','c3']],[{allowed:[],claims:[]},[]]]},
 multiple:{title:'Множественная проверка гипотез',contract:'Даны p_values и alpha. Примените поправку Бонферрони alpha/m. Верните индексы p<=alpha/m; для пустого списка верните []. Это контроль семейства проверок, а не доказательство прикладного эффекта.',code:R`p=data['p_values']
    return [i for i,x in enumerate(p) if x<=data['alpha']/len(p)] if p else []`,cases:[[{p_values:[.01,.04,.2],alpha:.05},[0]],[{p_values:[],alpha:.05},[]],[{p_values:[.025,.026],alpha:.05},[0]]]},
 protocol:{title:'Полнота воспроизводимого протокола',contract:'Дан словарь протокола. Обязательные поля question,hypothesis,split,metric,seed,data_hash. Верните в алфавитном порядке отсутствующие поля. seed=0 допустим; None и пустая строка недопустимы.',code:R`keys=['question','hypothesis','split','metric','seed','data_hash']
    return sorted(k for k in keys if k not in data or data[k] is None or data[k]=='')`,cases:[[{question:'q',hypothesis:'h',split:'group',metric:'F1',seed:0,data_hash:'abc'},[]],[{seed:0},['data_hash','hypothesis','metric','question','split']],[{},['data_hash','hypothesis','metric','question','seed','split']]]},
 provenance:{title:'Происхождение артефакта',contract:'Даны записи {id,source,hash,verified}. Верните id записей, у которых отсутствует source/hash или verified не является именно True. Наличие файла само по себе не подтверждает качество.',code:R`return [x['id'] for x in data if not x.get('source') or not x.get('hash') or x.get('verified') is not True]`,cases:[[[{id:'a',source:'local',hash:'ab',verified:true},{id:'b',source:'AI',hash:'ab',verified:false}],['b']],[[],[]],[[{id:'x',source:'',hash:'a',verified:true}],['x']]]},
 join:{title:'Левое соединение с кратностью строк',contract:'Даны left и right – списки [key,value]. Выполните LEFT JOIN: для каждого left выдайте [key,left_value,right_value] для всех совпадений right в исходном порядке, а при отсутствии – None. Дубли не теряйте.',code:R`out=[]
    for key,value in data['left']:
        matches=[v for k,v in data['right'] if k==key]
        out.extend([[key,value,v] for v in matches] if matches else [[key,value,None]])
    return out`,cases:[[{left:[['a',1],['b',2]],right:[['a',3],['a',4]]},[['a',1,3],['a',1,4],['b',2,null]]],[{left:[],right:[['a',1]]},[]]]},
 closure:{title:'Замыкание конъюнктивных правил',contract:'Даны facts и rules=[{inputs:[...],output:...}]. Вычислите наименьшее замыкание и верните отсортированные факты. Все входы одного правила обязательны; цикл без исходной опоры не создаёт факты.',code:R`known=set(data['facts'])
    while True:
        new=known | {r['output'] for r in data['rules'] if set(r['inputs'])<=known}
        if new==known: return sorted(known)
        known=new`,cases:[[{facts:['a'],rules:[{inputs:['a','b'],output:'c'}]},['a']],[{facts:[],rules:[{inputs:['a'],output:'b'},{inputs:['b'],output:'a'}]},[]],[{facts:['a','b'],rules:[{inputs:['a','b'],output:'c'}]},['a','b','c']]]},
 softmax:{title:'Устойчивый softmax',contract:'Для списка logits верните вероятности softmax, округлённые до 6 знаков. Перед exp вычтите максимум. Пустой список даёт [].',code:R`import math
    if not data: return []
    values=[math.exp(x-max(data)) for x in data];total=sum(values)
    return [round(x/total,6) for x in values]`,cases:[[[0,0],[.5,.5]],[[1000,1000],[.5,.5]],[[],[]],[[2],[1]]]},
 image:{title:'Пороговая маска изображения',contract:'Даны pixels – матрица значений 0..255 и threshold. Верните матрицу 1 для x>=threshold, иначе 0. Не меняйте форму изображения.',code:R`return [[int(x>=data['threshold']) for x in row] for row in data['pixels']]`,cases:[[{pixels:[[0,128],[255,127]],threshold:128},[[0,1],[1,0]]],[{pixels:[],threshold:10},[]]]},
 histogram:{title:'Гистограмма с правой замкнутой последней корзиной',contract:'Даны values в [0,1] и bins>0. Верните числа значений в равных корзинах; 1 относится к последней корзине. Значения вне [0,1] пропустите.',code:R`out=[0]*data['bins']
    for x in data['values']:
        if 0<=x<=1: out[min(int(x*data['bins']),data['bins']-1)]+=1
    return out`,cases:[[{values:[0,.25,.5,.75,1],bins:2},[2,3]],[{values:[],bins:3},[0,0,0]],[{values:[-1,2,.1],bins:1},[1]]]},
 bits:{title:'Маска разрешений',contract:'Даны целые mask и required>=0. Верните True, если mask содержит все установленные биты required: (mask & required)==required. Побитовое OR не проверяет это условие.',code:R`return (data['mask'] & data['required']) == data['required']`,cases:[[{mask:5,required:4},true],[{mask:5,required:2},false],[{mask:0,required:0},true]]},
 idempotency:{title:'Идемпотентность потока событий',contract:'Даны события {id,delta}. Один id учитывается лишь при первом появлении. Верните сумму delta первых появлений. Не удаляйте различные события с одинаковой delta.',code:R`seen=set();total=0
    for row in data:
        if row['id'] not in seen: seen.add(row['id']);total+=row['delta']
    return total`,cases:[[[{id:'a',delta:2},{id:'a',delta:2},{id:'b',delta:2}],4],[[],0],[[{id:'a',delta:-1},{id:'b',delta:3}],2]]},
 contract:{title:'Контракт входных данных',contract:'Дан список объектов. Верните индексы объектов без непустого строкового id либо с value, который не является конечным int/float. Булевы value не считаются числами.',code:R`import math
    return [i for i,x in enumerate(data) if not isinstance(x.get('id'),str) or not x['id'].strip() or isinstance(x.get('value'),bool) or not isinstance(x.get('value'),(int,float)) or not math.isfinite(x['value'])]`,cases:[[[{id:'a',value:1},{id:'',value:2},{id:'b',value:true}], [1,2]],[[],[]],[[{id:'c',value:-2.5}],[]]]},
 timeseries:{title:'Скользящее среднее без будущих данных',contract:'Даны values и window>=1. Для каждой позиции верните среднее только текущего и не более window-1 предыдущих значений, округлённое до 6 знаков. Нельзя использовать будущие отсчёты.',code:R`v=data['values'];w=data['window']
    return [round(sum(v[max(0,i-w+1):i+1])/len(v[max(0,i-w+1):i+1]),6) for i in range(len(v))]`,cases:[[{values:[1,3,5],window:2},[1,2,4]],[{values:[],window:2},[]],[{values:[2,4],window:10},[2,3]]]},
 qlearning:{title:'Один шаг Q-learning',contract:'Даны q,reward,gamma,alpha,next_values,terminal. Вычислите q+alpha*(reward+gamma*max(next_values)-q); для terminal будущая награда равна 0. Пустой next_values также даёт 0. Округлите до 6 знаков.',code:R`future=0 if data['terminal'] else max(data['next_values'],default=0)
    return round(data['q']+data['alpha']*(data['reward']+data['gamma']*future-data['q']),6)`,cases:[[{q:0,reward:1,gamma:.9,alpha:.5,next_values:[2,3],terminal:false},1.85],[{q:2,reward:1,gamma:.9,alpha:.5,next_values:[100],terminal:true},1.5]]}
};

export function makeTasks(unit,course){
 const p=patterns[unit.metadata.pattern];if(!p)throw Error('Unknown teaching pattern '+unit.metadata.pattern);
 const core='def compute(data):\n    '+p.code+'\n';
 const bad={gradient:"return data['w']-data['rate']*(data['w']-data['target'])",cosine:"return sum(x*y for x,y in zip(data['a'],data['b']))",dot:"return sum(data['a'])*sum(data['b'])",bayes:"return data['prior']*data['sensitivity']",ranking:"return [x[0] for x in sorted(data['scores'],key=lambda x:-x[1])[:data['k']]]",clean:'return list(set(data))',split:"return []",retrieve:'return []',multiple:"return [i for i,p in enumerate(data['p_values']) if p<=data['alpha']]",softmax:'import math\n    values=[math.exp(x) for x in data]\n    return [x/sum(values) for x in values]',idempotency:"return sum(x['delta'] for x in data)",bits:"return bool(data['mask'] | data['required'])"}[unit.metadata.pattern]||'return data';
 const wrong=x=>typeof x==='number'?x+7:typeof x==='boolean'?!x:Array.isArray(x)?{wrong:true}:['incorrect'];
 const teaching=p.cases.slice(0,Math.max(1,p.cases.length-1)),transferCases=p.cases.slice(teaching.length);
 const input=teaching.map(x=>x[0]),answers=teaching.map(x=>x[1]);
 const auditInput={cases:input,ai_outputs:answers.map((x,i)=>i===1?x:wrong(x))};
 const failed=answers.map((_,i)=>i).filter(i=>i!==1);
 return [1,2,3].map(level=>{
  const title=[p.title,'Аудит ИИ-варианта: '+p.title,'Перенос и воспроизводимое исследование: '+p.title][level-1];
  let reference,tests;
  if(level===1){reference=core+'\ndef solve(data):\n    return compute(data)\n';tests=teaching.map(([input,expected])=>({input,expected}));}
  if(level===2){reference=core+'\ndef solve(data):\n    return [i for i,x in enumerate(data["cases"]) if compute(x)!=data["ai_outputs"][i]]\n';tests=[{input:auditInput,expected:failed},{input:{cases:input,ai_outputs:answers},expected:[]},{input:{cases:[],ai_outputs:[]},expected:[]}];}
  if(level===3){reference=core+'\ndef solve(data):\n    return {"failed":[i for i,x in enumerate(data["cases"]) if compute(x)!=data["ai_outputs"][i]],"repaired":[compute(x) for x in data["cases"]],"transfer":[compute(x) for x in data["new_cases"]]}\n';tests=[{input:{...auditInput,new_cases:transferCases.map(x=>x[0])},expected:{failed,repaired:answers,transfer:transferCases.map(x=>x[1])}},{input:{cases:[],ai_outputs:[],new_cases:[input[0]]},expected:{failed:[],repaired:[],transfer:[answers[0]]}}];}
  const extra=level===1?'Реализуйте solve(data) для этого контракта.':level===2?'В solve(data) поступают cases и ai_outputs. Верните индексы ошибочных ответов учебного ИИ-варианта. Проверяйте по контракту, а не по внешнему сходству. Это заранее подготовленный сценарий ошибок, не вызов LLM.':'В solve(data) поступают cases, ai_outputs и new_cases. Верните {failed: индексы ошибок, repaired: исправленные ответы cases, transfer: результаты new_cases}. Дополнительно приложите исследовательский протокол: гипотеза, контрпример ИИ-решению, не менее двух новых граничных случаев, инвариант, сложность и пределы применимости. Один успешный тест не доказывает перенос компетенции.';
  const fixture=level===1?'def compute(data):\n    '+bad+'\n\ndef solve(data):\n    return compute(data)\n':level===2?'def solve(data):\n    return []\n':'def solve(data):\n    return {"failed":[],"repaired":data["ai_outputs"],"transfer":[]}\n';
  return {id:`${unit.id}-l${level}`,unit_id:unit.id,title,level,kind:'python',statement:`${course.title}. Модуль «${unit.title}».\n\nКонтракт предметной операции: ${p.contract}\n\n${extra}`,starter:'def solve(data):\n    # Реализуйте контракт. Объясните решение и проверку ИИ-варианта.\n    pass\n',reference_code:reference,ai_fixture:fixture,tests,rubric:{correctness:50,explanation:20,complexity:15,experiment:15,note:'Авторский стартовый модуль. Уровень 2 требует аудита ИИ, уровень 3 – протокола и новых контрпримеров. Преподаватель отдельно проверяет самостоятельность, доказательство и перенос.'},assessment_family:unit.id+'-assessment',indicator_codes:unit.metadata.indicatorCodes};
 });
}
