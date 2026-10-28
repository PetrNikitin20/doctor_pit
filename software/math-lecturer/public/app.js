/* Local lecture navigation, source viewer, numeric experiments and streaming dialogue. */
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(n,d=5)=>typeof n==='number'?(Math.abs(n)>0&&Math.abs(n)<.00001?n.toExponential(3):n.toLocaleString('ru-RU',{maximumFractionDigits:d})):String(n??'');
let data,lessonId,tab='lesson',labKind='beta',labRun=null,model=null,voices=[],chatController=null,activeChatJob=null,currentQuestion='',dialogues={},completed=new Set(),formulaFilter='all',formulaSearch='',toastTimer,voiceEpoch=0;
try{const saved=JSON.parse(localStorage.getItem('pit-lecturer-v1')||'{}');lessonId=saved.lessonId;dialogues=saved.dialogues||{};completed=new Set(saved.completed||[]);}catch{}
function save(){try{localStorage.setItem('pit-lecturer-v1',JSON.stringify({lessonId,completed:[...completed],dialogues}));}catch{toast('Не удалось сохранить прогресс в браузере. Конспект можно скачать.');}}
function toast(text){clearTimeout(toastTimer);$('#toast').textContent=text;$('#toast').classList.remove('hidden');toastTimer=setTimeout(()=>$('#toast').classList.add('hidden'),6500);}
async function api(path,options={}){const r=await fetch(path,options);let d;try{d=await r.json();}catch{throw Error('Сервер вернул неверный ответ');}if(!r.ok)throw Error(d.error||'Ошибка запроса');return d;}
const post=(url,value)=>api(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)});
function math(root){if(!window.renderMathInElement)return;renderMathInElement(root,{delimiters:[{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false},{left:'\\[',right:'\\]',display:true},{left:'\\(',right:'\\)',display:false}],throwOnError:false,trust:false,strict:false,maxExpand:1000,ignoredTags:['script','noscript','style','textarea','pre','code']});}
function markdown(text){
 const keep=[];const source=String(text).replace(/\$\$[\s\S]*?\$\$|\$[^$\n]+\$/g,t=>{keep.push(t);return `PITMATHPLACEHOLDER${keep.length-1}END`;});
 let html=DOMPurify.sanitize(marked.parse(source,{breaks:true,async:false}));
 html=html.replace(/PITMATHPLACEHOLDER(\d+)END/g,(_,i)=>esc(keep[+i]));return html;
}
function current(){return data.lessons.find(x=>x.id===lessonId)||data.lessons[0];}
function refsFor(ids=[]){return ids.map(id=>data.formulas.find(f=>f.id===id)).filter(Boolean);}
function setTab(value){tab=value;document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x.dataset.tab===tab));renderContent();}
function selectLesson(id,{ask=false}={}){if(chatController){toast('Сначала завершите или остановите текущий ответ.');return;}lessonId=id;labRun=null;labKind=current().lab||'beta';tab='lesson';save();renderAll();$('#sidebar').classList.remove('open');window.scrollTo({top:0,behavior:'smooth'});if(ask)askQuestion('Проведи подробную лекцию по этой части статьи с самого начала: постановка задачи, каждый символ, все переходы вывода, пример и ограничения. Если эксперимент описан в этой части, разбери его шаги.');}
function renderNav(){
 const count=data.lessons.filter(l=>completed.has(l.id)).length;$('#progress-label').textContent=`${count} / ${data.lessons.length}`;$('#progress-bar').style.width=`${count/data.lessons.length*100}%`;
 $('#syllabus').innerHTML=data.groups.map(g=>{const ls=data.lessons.filter(l=>l.group===g.id),open=ls.some(l=>l.id===lessonId);return `<section class="syllabus-group"><button class="group-toggle" data-action="toggle-group" data-group="${esc(g.id)}" aria-expanded="${open}"><span>${esc(g.label)}</span><b>${open?'−':'+'}</b></button><div data-group-list="${esc(g.id)}" ${open?'':'class="hidden"'}>${ls.map(l=>`<button class="lesson-link ${l.id===lessonId?'active':''} ${completed.has(l.id)?'completed':''}" data-action="lesson" data-id="${esc(l.id)}"><span class="lesson-number">${completed.has(l.id)?'✓':String(data.lessons.indexOf(l)+1).padStart(2,'0')}</span><span>${esc(l.title)}</span></button>`).join('')}</div></section>`;}).join('');
 $('#library-count').textContent=4+data.library.length;
}
function formulaCard(f,compact=false){return `<article class="formula-card"><div class="formula-heading"><span>${esc(data.groups.find(g=>g.id===f.paper)?.label||f.paper)} · ${f.number?`формула (${f.number})`:`блок ${f.index}`}</span><button class="text-button" data-action="source" data-id="${esc(f.sourceId)}">В статье ↗</button></div><h3>${esc(f.title)}</h3><div class="formula-display" data-tex="${esc(f.tex)}"></div><div class="formula-explain">${esc(f.explain)}</div><div class="card-actions"><button class="text-button" data-action="ask-formula" data-id="${esc(f.id)}">Объяснить каждый шаг</button>${f.imported?'':`<button class="text-button" data-action="speak-formula" data-id="${esc(f.id)}">▶ Слушать разбор</button>`}</div></article>`;}
function renderFormulaElements(root){for(const el of root.querySelectorAll('[data-tex]')){try{katex.render(el.dataset.tex,el,{displayMode:true,throwOnError:false,trust:false,strict:false,maxExpand:1000});}catch{el.textContent=el.dataset.tex;}}math(root);}
function lessonHTML(l){const index=data.lessons.indexOf(l),group=data.groups.find(g=>g.id===l.group);return `
 <div class="eyebrow">${esc(group?.eyebrow||'Разбор статьи')} · Занятие ${index+1}</div>
 <h1>${esc(l.title)}</h1><p class="lead">${esc(l.lead)}</p>
 <div class="lesson-meta"><span class="pill">${l.minutes}–${l.minutes+5} мин на разбор</span><span class="pill ${completed.has(l.id)?'green':''}">${completed.has(l.id)?'✓ Изучено':'Пошаговая лекция'}</span>${l.custom?'<span class="pill">Новый материал</span>':'<span>Смысл → вывод → проверка</span>'}</div>
 <div class="lesson-actions"><button class="button primary" data-action="speak-lesson">▶ Слушать занятие</button><button class="button" data-action="begin-lecture">Начать диалог с лектором ↗</button>${l.lab?'<button class="button subtle" data-action="open-lab">Открыть эксперимент</button>':''}<button class="text-button" data-action="export-notes">Сохранить конспект</button></div>
 <div class="voice-row"><label for="voice">Голос</label><select id="voice"><option value="">Русский голос по умолчанию</option>${voices.map(v=>`<option value="${esc(v)}">${esc(v.replace('Microsoft ','').replace(' Desktop',''))}</option>`).join('')}</select><span>Озвучить можно и выделенный фрагмент</span></div>
 ${l.steps.map((s,i)=>`<section class="step"><div class="step-head"><small>${String(i+1).padStart(2,'0')}</small><h2>${esc(s.title)}</h2></div><div class="prose">${markdown(s.body)}</div></section>`).join('')}
 ${l.formulaIds.length?`<h2>Формулы этого занятия</h2>${refsFor(l.formulaIds).map(f=>formulaCard(f)).join('')}`:''}
 ${l.custom?`<p><a class="button" href="/api/library-file/${l.libraryId}" target="_blank" rel="noopener">Открыть оригинал статьи ↗</a></p>`:''}
 ${l.quiz?`<section class="quiz"><span class="eyebrow">Проверить понимание</span><p>${esc(l.quiz.q)}</p>${l.quiz.options.map((o,i)=>`<button class="quiz-option" data-action="quiz" data-answer="${i}">${esc(o)}</button>`).join('')}<div class="quiz-feedback" id="quiz-feedback"></div></section>`:''}
 <div class="lesson-bottom">${index?`<button class="button subtle" data-action="lesson" data-id="${esc(data.lessons[index-1].id)}">← Предыдущее</button>`:'<span></span>'}<button class="button" data-action="complete">${completed.has(l.id)?'✓ Изучено':'Отметить изученным'}</button>${index<data.lessons.length-1?`<button class="button primary" data-action="next">Дальше →</button>`:''}</div>`;}
function renderContent(){const root=$('#content'),l=current();
 if(tab==='lesson'){root.innerHTML=lessonHTML(l);renderFormulaElements(root);}
 if(tab==='formulas')renderFormulas();if(tab==='lab')renderLab();if(tab==='library')renderLibrary();
}
function renderFormulas(){const list=data.formulas.filter(f=>(formulaFilter==='all'||f.paper===formulaFilter)&&(`${f.title} ${f.explain} ${f.tex}`).toLowerCase().includes(formulaSearch.toLowerCase()));
 $('#content').innerHTML=`<span class="eyebrow">Справочник с пояснениями</span><h1>Каждая формула – по шагам</h1><p class="lead">${data.formulas.length} формульных блоков подключённых статей: запись, пояснения и ссылка на исходный фрагмент.</p><div class="filter-row"><input id="formula-search" type="search" placeholder="Найти: якобиан, риск, перенос…" value="${esc(formulaSearch)}" aria-label="Поиск формулы"><select id="formula-filter" aria-label="Статья"><option value="all">Все статьи</option>${data.groups.filter(g=>data.formulas.some(f=>f.paper===g.id)).map(g=>`<option value="${g.id}" ${g.id===formulaFilter?'selected':''}>${esc(g.label)}</option>`).join('')}</select></div><div id="formula-results">${list.length?list.map(f=>formulaCard(f)).join(''):'<div class="search-empty">По такому запросу формул не найдено.</div>'}</div>`;renderFormulaElements($('#formula-results'));
}
const field=(label,name,value,{type='number',min,max,step='1',choices=null}={})=>`<label class="field">${label}${choices?`<select name="${name}">${choices.map(([v,t])=>`<option value="${v}" ${String(value)===String(v)?'selected':''}>${t}</option>`).join('')}</select>`:`<input name="${name}" type="${type}" value="${value}" min="${min??0}" max="${max??200}" step="${step}" required>`}</label>`;
function renderLab(){const labs={beta:['Вероятность и нижняя граница','Сравните среднее, нижнюю границу и риск. Меняйте число самостоятельных наблюдений.'],ejce:['Последствия трёх правил','Одна конфигурация – три вероятности решения. Всё считается конечными суммами.'],allocation:['Как распределить диагностики','Учебный запуск исходного Python-алгоритма на небольшом числе заявок.'],ode:['Восстановление девяти параметров','Прямая задача → девять вероятностей → обратная задача → проверка параметров.']};
 const p=labRun?.result.kind===labKind?labRun.result.input:{};let fields='';
 if(labKind==='beta')fields=field('Число наблюдений n','n',p.n??16,{min:0,max:200})+field('Самостоятельных успехов z','successes',p.successes??16,{min:0,max:200})+field('Предпосылок m','m',p.m??2,{min:1,max:8})+field('Порог τ','tau',p.tau??.8,{min:.05,max:.99,step:'.01'})+field('Общий риск δ','delta',p.delta??.05,{min:.001,max:.3,step:'.001'});
 if(labKind==='ejce')fields=field('Записей по предпосылке N','N',p.N??48,{choices:[[24,'24'],[48,'48'],[96,'96']]})+field('Доля помощи r','r',p.r??.5,{choices:[[0,'0%'],[.25,'25%'],[.5,'50%'],[.75,'75%']]})+field('Копий на семейство d','d',p.d??1,{choices:[[1,'1'],[2,'2']]})+field('Синтетический профиль','profile',p.profile??'B',{choices:[['A','A · согласованное освоение'],['B','B · зависимость от помощи'],['C','C · затруднение переноса'],['D','D · пробел в предпосылке']]});
 if(labKind==='allocation')fields=field('Заявок S','n',p.n??6,{min:2,max:12})+field('Seed генератора','seed',p.seed??1,{min:1,max:100})+field('Ресурс преподавателя T','T',p.T??5,{min:0,max:60})+field('Вычислительный ресурс C','C',p.C??8,{min:0,max:100})+field('Шаг округления ε','epsilon',p.epsilon??.0001,{min:.000001,max:.1,step:'.0001'});
 if(labKind==='ode')fields=field('Режим калибровки','mode',p.mode??'M',{choices:[['M','M · без помощи, без помощи, с помощью'],['A','A · все измерения с помощью']]})+field('Интервал h','h',p.h??1,{min:.05,max:4,step:'.05'})+field('Забывание λ₁','lambda1',p.lambda1??.22,{min:.01,max:.8,step:'.01'})+field('Перенос β','beta',p.beta??.9,{min:.05,max:2,step:'.05'})+field('Поддержка η₁','eta1',p.eta1??.45,{min:.05,max:.8,step:'.05'})+field('Поддержка η₂','eta2',p.eta2??.35,{min:.05,max:.8,step:'.05'})+field('Старт X₁','X1',p.X1??.65,{min:.1,max:.9,step:'.05'})+field('Старт X₂','X2',p.X2??.5,{min:.1,max:.9,step:'.05'})+field('Забывание λ₂','lambda2',p.lambda2??.15,{min:.05,max:.8,step:'.01'})+field('Освоение α₁','alpha1',p.alpha1??.7,{min:.1,max:2,step:'.05'})+field('Освоение α₂','alpha2',p.alpha2??.4,{min:.1,max:2,step:'.05'});
 $('#content').innerHTML=`<span class="eyebrow">Сначала предположите, затем проверьте</span><h1>Математическая лаборатория</h1><p class="lead">Измените параметры и попросите лектора объяснить получившийся результат.</p><div class="lab-switch">${Object.entries(labs).map(([id,[name]])=>`<button class="button ${id===labKind?'active':''}" data-action="lab-kind" data-kind="${id}">${esc(id==='beta'?'Beta':id==='ejce'?'Три правила':id==='allocation'?'Два ресурса':'Динамика ОДУ')}</button>`).join('')}</div><h2>${labs[labKind][0]}</h2><p class="lead">${labs[labKind][1]}</p><form class="lab-form" id="lab-form">${fields}<div class="lab-submit"><button class="button primary" type="submit" id="run-lab">Рассчитать</button><span>${['allocation','ode'].includes(labKind)?'Расчёт выполняется локально в Python':'Локальный расчёт в JavaScript'}</span></div></form><div id="lab-result" class="lab-result"></div>`;
 if(labRun?.result.kind===labKind)renderLabResult(labRun.result);
}
function metric(label,value,positive=false){return `<div class="metric ${positive?'positive':''}"><small>${label}</small><strong>${esc(value)}</strong></div>`;}
function table(headers,rows){return `<div class="table-wrap"><table class="data"><thead><tr>${headers.map(x=>`<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(x=>`<td>${esc(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;}
function lineChart(points,series,{xMax=null,yMax=1,verticals=[],caption=''}={}){
 const W=600,H=300,L=45,T=20,R=20,B=45;const max=xMax??Math.max(...points.map(p=>p.x));const X=x=>L+x/max*(W-L-R),Y=y=>H-B-y/yMax*(H-B-T);let svg='';
 for(let i=0;i<=4;i++){const v=yMax*i/4;svg+=`<line x1="${L}" y1="${Y(v)}" x2="${W-R}" y2="${Y(v)}" stroke="#e1e7db"/><text x="${L-8}" y="${Y(v)+4}" text-anchor="end" fill="#74816c" font-size="10">${fmt(v,2)}</text>`;}
 for(let i=0;i<=4;i++){const v=max*i/4;svg+=`<text x="${X(v)}" y="${H-B+20}" text-anchor="middle" fill="#74816c" font-size="10">${fmt(v,2)}</text>`;}
 for(const v of verticals)svg+=`<line x1="${X(v.x)}" y1="${T}" x2="${X(v.x)}" y2="${H-B}" stroke="${v.color||'#bd9e70'}" stroke-dasharray="4 4"/>`;
 for(const s of series){svg+=`<path d="${points.map((p,i)=>`${i?'L':'M'}${X(p.x).toFixed(2)},${Y(p[s.key]).toFixed(2)}`).join(' ')}" stroke="${s.color}" stroke-width="2.1" fill="none" ${s.dash?'stroke-dasharray="5 4"':''}/>`;}
 svg+=series.map((s,i)=>`<rect x="${L+i*150}" y="${H-10}" width="10" height="3" fill="${s.color}"/><text x="${L+16+i*150}" y="${H-6}" fill="#4e6150" font-size="10">${esc(s.label)}</text>`).join('');
 return `<figure class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(caption)}">${svg}</svg><figcaption>${esc(caption)}</figcaption></figure>`;
}
function renderLabResult(r){let html=`<div class="result-label"><span>Новый учебный расчёт · ${new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}</span><button class="text-button" data-action="explain-result">Разобрать с лектором ↗</button></div>`;
 if(r.kind==='beta'){
  html+=`<div class="metrics">${metric('Постериор',`Beta(${r.a}, ${r.b})`)}${metric('Среднее',fmt(r.mean))}${metric('Нижняя граница q',fmt(r.lower),r.passes)}${metric('Риск θ < τ',fmt(r.risk))}${metric('Индивидуальный бюджет',fmt(r.individualBudget))}${metric('Статистический порог',r.passes?'Пройден':'Не пройден',r.passes)}</div>`;
  html+=lineChart(r.curve,[{key:'cdf',color:'#315b43',label:'F(x): вероятность θ < x'}],{xMax:1,verticals:[{x:r.input.tau},{x:r.lower,color:'#426d51'}],caption:`CDF распределения Beta(${r.a},${r.b}). Зелёная вертикаль: q=${fmt(r.lower,3)}; охристая: τ=${r.input.tau}.`});
  html+=`<h3>Проверить гипотезу о следующем наблюдении</h3>${table(['Сценарий','Постериор','Среднее','Нижняя граница'],[['Сейчас',`Beta(${r.a},${r.b})`,fmt(r.mean),fmt(r.lower)],['Ещё один успех',`Beta(${r.sensitivity.afterSuccess.a},${r.sensitivity.afterSuccess.b})`,fmt(r.sensitivity.afterSuccess.mean),fmt(r.sensitivity.afterSuccess.lower)],['Ещё одна неудача',`Beta(${r.sensitivity.afterFailure.a},${r.sensitivity.afterFailure.b})`,fmt(r.sensitivity.afterFailure.mean),fmt(r.sensitivity.afterFailure.lower)]])}<p class="prose">${esc(r.sensitivity.rule)}</p>`;
  html+=`<p class="prose">При безошибочных наблюдениях для выбранных τ, δ и m минимально нужно <strong>${r.minimumPerfect}</strong> успехов. Это не отменяет проверки структуры, переноса и качества свидетельств.</p>`;
  html+=`<h3>Почему деление риска и сумма дают разные решения</h3>${table(['Состояние','Риск ниже выбранного τ'],r.example.map(x=>[`Beta(${x.a},1)`,fmt(x.risk,9)]))}<p class="prose">Сумма рисков: <strong>${fmt(r.example.reduce((s,x)=>s+x.risk,0),9)}</strong>. Для иллюстрации сравните её с общим δ и каждый риск с δ/2.</p>`;
 }
 if(r.kind==='ejce'){
  html+=`<div class="metrics">${metric('Самостоятельных семейств k',r.k)}${metric('Порог успехов R₁',r.meanThreshold)}${metric('Порог успехов R₂',r.critical>r.k?'Недостижим':r.critical)}${metric('R₀ · все завершения',fmt(r.R0,6))}${metric('R₁ · доля + перенос',fmt(r.R1,6))}${metric('R₂ · граница + перенос',fmt(r.R2,6),true)}</div>`;
  html+=table(['Величина','Значение'],[['θ₁',r.theta1],['θ₂',r.theta2],['φ: вероятность переноса',r.phi],['T(φ): не меньше 4 из 5',fmt(r.transfer,8)]]);
  html+=`<p class="prose">Профиль ${r.input.profile}. При увеличении помощи R₀ может выглядеть убедительно, хотя самостоятельные θ не меняются. Для проверки переноса сравните профили A и C при одинаковых N, r, d.</p>`;
 }
 if(r.kind==='allocation'){
  html+=`<div class="metrics">${metric('Точный выигрыш',fmt(r.exact.gain,7))}${metric('Округлённый DP',fmt(r.rounded.gain,7),true)}${metric('Жадный план',fmt(r.greedy.gain,7))}${metric('Потеря округления',fmt(r.gap,9))}${metric('Граница Sε',fmt(r.bound,8))}${metric('Ресурсы T / C',`${r.rounded.teacher} / ${r.rounded.compute}`)}</div>`;
  html+=table(['Заявка','Состояние ℬ','Выбранное действие','t','c','Выигрыш'],r.requests.map(x=>[x.request,JSON.stringify(x.state),x.chosen,x.teacher,x.compute,fmt(x.gain,7)]));
  html+=`<p class="prose">Пиковое число состояний DP: ${r.rounded.peak}; переходов: ${r.rounded.transitions}. <code>defer</code> – отсрочка; <code>advance</code> – переход; <code>d1q3</code> – диагностика первой предпосылки тремя заданиями. q в программном имени соответствует математическому ν.</p>`;
 }
 if(r.kind==='ode'){
  html+=`<div class="metrics">${metric('Ошибка восстановления ψ',fmt(r.maxError),true)}${metric('Контроль DOP853',fmt(r.independentError))}${metric('Минимальное сингулярное число',fmt(r.sigmaMin))}</div>`;
  const pts=r.trace.map(p=>({...p,x:p.t}));html+=lineChart(pts,[{key:'x1',color:'#315b43',label:'x₁: самостоятельно'},{key:'x2',color:'#b97940',label:'x₂: самостоятельно'},{key:'p2',color:'#778e94',label:'p₂: с поддержкой',dash:true}],{verticals:r.boundaries.map(x=>({x})),caption:'Три участка протокола. Вертикали – смена режима практики. Высокое p₂ не тождественно высокому x₂.'});
  html+=`<h3>Параметры: задано и восстановлено</h3>${table(['Параметр','Истинное','Восстановлено','Абс. ошибка'],r.parameters.map(x=>[x.name,fmt(x.truth),fmt(x.recovered,10),fmt(x.error)]))}`;
  html+=`<h3>Девять наблюдаемых вероятностей</h3>${table(['Наблюдение','Вероятность'],r.observations.map(x=>[x.name,fmt(x.value,10)]))}<p class="prose">Локальный множитель 2/σₘᵢₙ: ${fmt(r.localFactor,2)}. При почти постоянной предпосылке или коротких интервалах ошибка данных сильнее влияет на обратное восстановление. Это характеристика выбранного масштаба параметров.</p>`;
 }
 html+=`<div class="notice info">${esc(r.scope)}</div><button class="button" data-action="explain-result">Объяснить результат по шагам</button><button class="button subtle" data-action="export-lab">Скачать расчёт JSON</button>`;
 $('#lab-result').innerHTML=html;
}
function renderLibrary(){
 const base=data.papers.map(p=>`<article class="library-card"><span class="eyebrow">${esc(p.label)} · исходная рукопись</span><h3>${esc(p.label==='ПСТА'?'Динамическая модель':p.label==='INJOIT'?'Численный метод':p.label==='EJCE'?'Три оценочных правила':'Модель перехода')}</h3><p>${esc(p.title)}</p><div class="card-actions"><button class="text-button" data-action="paper-lesson" data-id="${p.id}">Пройти занятия →</button><button class="text-button" data-action="results" data-id="${p.id}">Результаты опыта</button><a class="text-button" href="/api/research-file?path=${encodeURIComponent(p.code)}" target="_blank" rel="noopener">Код ↗</a></div></article>`).join('');
 const uploaded=data.library.map(p=>`<article class="library-card"><span class="eyebrow">${esc(p.ext.slice(1).toUpperCase())} · локальный материал</span><h3>${esc(p.title)}</h3><p>Фрагментов: ${p.fragments} · ${p.characters?.toLocaleString('ru-RU')} символов</p>${p.warnings?.map(w=>`<p>${esc(w)}</p>`).join('')||''}<div class="card-actions">${!p.needsOcr?`<button class="text-button" data-action="custom-lesson" data-id="${p.id}">Открыть разбор →</button>`:''}<a class="text-button" href="/api/library-file/${p.id}" target="_blank" rel="noopener">Оригинал ↗</a></div></article>`).join('');
 $('#content').innerHTML=`<span class="eyebrow">Источники, которые знает лектор</span><h1>Библиотека исследований</h1><p class="lead">Четыре работы уже подключены. Добавляйте свои статьи – лектор сможет искать в них, разбирать формулы и отвечать с указанием фрагмента.</p><section class="upload-card"><h2>Добавить статью или материал</h2><p>PDF с текстовым слоем, DOCX с формулами, TXT, Markdown, TeX. Для разбора эксперимента можно отдельно добавить CSV, JSON или текст кода. Файлы сохраняются локально и не попадают в GitHub автоматически.</p><form id="upload-form"><input type="text" name="title" maxlength="180" placeholder="Название статьи (необязательно)" aria-label="Название статьи"><input type="file" name="file" required accept=".pdf,.docx,.txt,.md,.tex,.json,.csv,.py,.mjs" aria-label="Файл статьи"><div class="upload-row"><button class="button primary" id="upload-button" type="submit">+ Добавить в библиотеку</button><span class="upload-note">До 20 МБ · без перезапуска</span></div><div id="upload-status" class="upload-note" role="status"></div></form></section><h2>Подключённые исследования</h2><div class="library-grid">${base}${uploaded}</div>`;
}
function renderChat(){const l=current();$('#chat-context').textContent=l.title;$('#chat-messages').innerHTML='';
 const history=dialogues[l.id]||[];
 if(!history.length)$('#chat-messages').innerHTML='<div class="chat-welcome"><b>Можно остановиться на любом шаге.</b>Попросите объяснить символ, вывести формулу с нуля или разобрать результат лаборатории. Лектор видит выбранное занятие и ищет фрагменты в статьях.<br><br>Ответ можно прослушать и сохранить в конспект.</div>';
 for(const m of history)addMessage(m.role,m.content,m.references||[],false);
 $('#chat-prompts').innerHTML=['Объясни проще','Каждый символ','Вывод по шагам','Численный пример'].map((p,i)=>`<button data-prompt="${i}">${p}</button>`).join('');scrollChat();
}
function addMessage(role,text,references=[],animate=false){const div=document.createElement('article');div.className='message '+role;
 if(role==='user')div.textContent=text;
 else{div.innerHTML=`<div class="message-role"><span>Лектор · по материалам</span><button class="text-button speak-message">▶ Слушать</button></div><div class="prose answer">${markdown(text)}</div>${referenceHTML(references)}`;div.querySelector('.speak-message').onclick=()=>speak(toSpeech(text),'Ответ лектора');renderFormulaElements(div);}
 $('#chat-messages').append(div);return div;
}
function referenceHTML(refs){return refs.length?`<div class="message-sources">${refs.map(r=>`<button class="source-chip" data-action="source" data-id="${esc(r.id)}" title="${esc(r.title)}">${esc(r.alias||'Источник')} · ${esc(r.title)}</button>`).join('')}</div>`:'';}
function scrollChat(){$('#chat-messages').scrollTop=$('#chat-messages').scrollHeight;}
function renderAll(){renderNav();document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x.dataset.tab===tab));renderContent();renderChat();}
async function refreshModel(){try{const h=await api('/api/health');model=h.model;const node=$('#model-status');node.classList.toggle('ready',model.available);node.querySelector('span').textContent=model.available?`${model.local?'Локальная модель':'Подключённая модель'} · ${model.model}`:`Модель пока недоступна · ${model.model}`;node.title=model.available?'Проверить подключение':'Лекции, формулы и лаборатории доступны. Для диалога запустите модель.';}catch{$('#model-status span').textContent='Нет соединения с сервером';}}
async function askQuestion(question){
 if(chatController)return;question=question.trim();if(question.length<2)return;
 const l=current(),history=(dialogues[l.id]||[]).map(({role,content})=>({role,content}));currentQuestion=question;
 $('#chat-panel').classList.add('open');if(!history.length)$('#chat-messages').innerHTML='';
 addMessage('user',question);const div=addMessage('assistant','');const answer=div.querySelector('.answer');answer.className='streaming';
 $('#question').value='';$('#send-question').classList.add('hidden');$('#stop-answer').classList.remove('hidden');$('#chat-state').textContent='Лектор готовит разбор';
 chatController=new AbortController();let text='',references=[],notice='',jobId=null,finished=false;
 chatController.signal.addEventListener('abort',()=>{if(jobId)post('/api/chat-jobs/'+jobId+'/cancel',{}).catch(()=>{});},{once:true});
 try{
  const job=await api('/api/chat-jobs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({lessonId:l.id,question,history,labId:labRun?.id,detail:$('#answer-detail').value}),signal:chatController.signal});
  jobId=job.id;activeChatJob=jobId;try{sessionStorage.setItem('pit-lecturer-pending-job',jobId);}catch{}
  const event=({type:name,data:d})=>{
   if(name==='sources')references=d.references;
   if(name==='token'){text+=d.text;answer.textContent=text;scrollChat();}
   if(name==='tool'){const t=document.createElement('div');t.className='message-tools';t.textContent=d.result.error?'Калькулятор: '+d.result.error:d.name==='calculate_beta'?`Вычислено: Beta(${d.result.a},${d.result.b}), q=${fmt(d.result.lower)}`:'Вероятности правил рассчитаны по конечным суммам';div.append(t);}
   if(name==='notice')notice=d.text;
   if(name==='error')throw Error(d.error);
  };
  let cursor=0,retries=0;
  while(!finished){
   if(chatController.signal.aborted)throw new DOMException('Stopped','AbortError');
   let chunk;try{chunk=await api('/api/chat-jobs/'+jobId+'?after='+cursor,{signal:chatController.signal});retries=0;}
   catch(error){if(error.name==='AbortError')throw error;if(++retries>8||!(error.name==='TypeError'||/network|fetch/i.test(error.message)))throw error;$('#chat-state').textContent='Восстанавливаем соединение…';await new Promise(r=>setTimeout(r,1200));continue;}
   finished=chunk.finished;cursor=chunk.cursor;for(const item of chunk.events)event(item);
   $('#chat-state').textContent=text?'Лектор продолжает объяснение':'Лектор готовит разбор';
   if(!finished)await new Promise(r=>setTimeout(r,1000));
  }
  if(!text.trim())throw Error('Модель не вернула текст. Проверьте подключение и повторите вопрос.');
 }catch(error){if(error.name==='AbortError'){notice='Генерация остановлена.';}else{notice=error.message;toast(error.message);}if(!text)text='Ответ не получен. Подготовленные занятия и лаборатории доступны независимо от подключения модели.';}
 finally{
  if(jobId&&!finished)post('/api/chat-jobs/'+jobId+'/cancel',{}).catch(()=>{});activeChatJob=null;try{sessionStorage.removeItem('pit-lecturer-pending-job');}catch{}
  answer.className='prose answer';answer.innerHTML=markdown(text);renderFormulaElements(answer);div.insertAdjacentHTML('beforeend',referenceHTML(references));if(notice){const n=document.createElement('div');n.className='notice';n.textContent=notice;div.append(n);}
  div.querySelector('.speak-message').onclick=()=>speak(toSpeech(text),'Ответ лектора');
  dialogues[l.id]=[...(dialogues[l.id]||[]),{role:'user',content:question},{role:'assistant',content:text+(notice?'\n\n> '+notice:''),references}].slice(-30);save();
  chatController=null;$('#send-question').classList.remove('hidden');$('#stop-answer').classList.add('hidden');$('#chat-state').textContent='Ответы опираются на материалы';scrollChat();
 }
}
function toSpeech(input){const greek={alpha:'альфа',beta:'бета',lambda:'лямбда',eta:'эта',theta:'тета',psi:'пси',kappa:'каппа',delta:'дельта',varepsilon:'эпсилон',epsilon:'эпсилон',tau:'тау',sigma:'сигма',rho:'ро',phi:'фи',varphi:'фи',chi:'хи',zeta:'дзета',omega:'омега',Theta:'тета'};
 let text=String(input).replace(/```[\s\S]*?```/g,' Код приведён на экране. ').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/\[S\d+\]/g,'').replace(/https?:\/\/\S+/g,'').replace(/F\^\{?[-−]1\}?/g,' обратная функция распределения ');
 for(let i=0;i<3;i++)text=text.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g,' дробь: $1 делить на $2 ');
 text=text.replace(/\\dot\s*\{?x\}?_?\{?(\d)\}?/g,'производная икс $1 по времени').replace(/\\(?:widehat|widetilde|hat|bar)\{([^{}]+)\}/g,'оценка $1');
 text=text.replace(/\\([A-Za-z]+)/g,(_,w)=>greek[w]||({ge:'не меньше',geq:'не меньше',le:'не больше',leq:'не больше',ne:'не равно',in:'принадлежит',sum:'сумма',prod:'произведение',int:'интеграл',ln:'натуральный логарифм',exp:'экспонента',sqrt:'квадратный корень',forall:'для всех',land:'и',times:'умножить',cdot:'умножить',partial:'производная',min:'минимум',max:'максимум',det:'определитель',Pr:'вероятность',infty:'бесконечность',to:'стремится к',mid:'при условии'})[w]||' ');
 return text.replace(/[αβλθηψκδτεσρφχωζ]/g,c=>({'α':'альфа','β':'бета','λ':'лямбда','θ':'тета','η':'эта','ψ':'пси','κ':'каппа','δ':'дельта','τ':'тау','ε':'эпсилон','σ':'сигма','ρ':'ро','φ':'фи','χ':'хи','ω':'омега','ζ':'дзета'}[c])).replace(/\^/g,' в степени ').replace(/_/g,' индекс ').replace(/≥/g,' не меньше ').replace(/≤/g,' не больше ').replace(/≠/g,' не равно ').replace(/=/g,' равно ').replace(/[#$*`{}\\]/g,' ').replace(/\s+/g,' ').trim();
}
async function speak(text,title){const selected=window.getSelection()?.toString().trim();if(selected&&selected.length>20)text=toSpeech(selected);if(!text)return;
 const run=++voiceEpoch;$('#audio').pause();window.speechSynthesis?.cancel();$('#browser-voice-controls').classList.add('hidden');
 $('#audio-title').textContent='Готовим озвучку…';$('#audio-dock').classList.remove('hidden');const voice=$('#voice')?.value||voices[0]||'';
 const parts=[];let rest=text;
 while(rest.length>9000){let cut=rest.lastIndexOf(' ',9000);if(cut<4000)cut=9000;parts.push(rest.slice(0,cut));rest=rest.slice(cut).trim();}if(rest)parts.push(rest);
 const playPart=async index=>{
  if(run!==voiceEpoch)return;
  try{
   const d=await post('/api/speech',{text:parts[index],voice});if(run!==voiceEpoch)return;
   $('#audio-title').textContent=title+(parts.length>1?` · часть ${index+1}/${parts.length}`:'');$('#audio').src=d.url;$('#audio').playbackRate=Number($('#audio-speed').value);
   $('#audio').onended=()=>{if(index+1<parts.length&&run===voiceEpoch)playPart(index+1);};
   try{await $('#audio').play();}catch{toast('Нажмите воспроизведение в панели озвучки.');}
  }catch(error){
   if(run!==voiceEpoch)return;
   const localVoice=window.speechSynthesis?.getVoices().find(v=>v.lang.startsWith('ru')&&v.localService);
   if(localVoice){const u=new SpeechSynthesisUtterance(parts.slice(index).join(' '));u.lang='ru-RU';u.voice=localVoice;u.rate=Number($('#audio-speed').value);speechSynthesis.cancel();speechSynthesis.speak(u);$('#audio-title').textContent=title+' · локальный голос браузера';$('#browser-voice-controls').classList.remove('hidden');}else toast(error.message+' Не найден локальный русский голос браузера.');
  }
 };await playPart(0);
}
async function openSource(id){try{const s=await api('/api/source?id='+encodeURIComponent(id));$('#source-dialog h2').textContent=s.title;$('#source-content').innerHTML=`<div class="source-meta">${esc(s.path)} · ${s.kind==='code'?'строка':'фрагмент'} ${s.line}<br>SHA-256: ${esc(s.sha256?.slice(0,20)||'')}…</div>${s.kind==='code'?`<pre class="source-code">${esc(s.text)}</pre>`:`<div class="source-original">${esc(s.text)}</div>`}${s.libraryId?`<p><a class="button" href="/api/library-file/${s.libraryId}" target="_blank" rel="noopener">Открыть оригинал</a></p>`:`<p><a class="button" href="/api/research-file?path=${encodeURIComponent(s.path)}" target="_blank" rel="noopener">Открыть исходный файл</a></p>`}`;$('#source-dialog').showModal();}catch(e){toast(e.message);}}
function download(name,text,type='text/plain;charset=utf-8'){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),5000);}
async function showResults(id){const p=data.papers.find(x=>x.id===id),r=await api('/api/results?paper='+id);$('#source-dialog h2').textContent=p.label+' · сохранённый эксперимент';$('#source-content').innerHTML=`<p class="prose">Это архивные результаты статьи. Учебные запуски лаборатории хранятся отдельно.</p><div class="card-actions"><a class="button" href="/api/research-file?path=${encodeURIComponent(p.result)}&download">Скачать JSON</a><a class="button" href="/api/research-file?path=${encodeURIComponent(p.data)}&download">Скачать CSV</a></div><pre class="result-json">${esc(JSON.stringify(r,null,2))}</pre>`;$('#source-dialog').showModal();}
document.addEventListener('click',async event=>{
 const button=event.target.closest('[data-action]');if(!button)return;const a=button.dataset.action,id=button.dataset.id;
 if(a==='lesson')selectLesson(id);
 if(a==='toggle-group'){const list=[...document.querySelectorAll('[data-group-list]')].find(x=>x.dataset.groupList===button.dataset.group);list.classList.toggle('hidden');button.setAttribute('aria-expanded',String(!list.classList.contains('hidden')));button.querySelector('b').textContent=list.classList.contains('hidden')?'+':'−';}
 if(a==='next'){completed.add(lessonId);selectLesson(data.lessons[data.lessons.indexOf(current())+1].id);}
 if(a==='complete'){completed.add(lessonId);save();renderNav();button.textContent='✓ Изучено';}
 if(a==='open-lab'){labKind=current().lab||'beta';setTab('lab');}
 if(a==='begin-lecture')askQuestion('Проведи лекцию по этому занятию с самого начала. Объясни каждое обозначение и каждый шаг вывода, затем численный пример и ограничения. Не пропускай промежуточные преобразования.');
 if(a==='speak-lesson'){const l=current();speak(toSpeech(l.title+'. '+l.lead+'. '+l.steps.map(s=>s.title+'. '+s.body).join('\n')+'\n'+refsFor(l.formulaIds).filter(f=>!f.imported).map(f=>f.title+'. '+f.read).join('\n')),l.title);}
 if(a==='speak-formula'){const f=data.formulas.find(x=>x.id===id);speak(toSpeech(f.title+'. '+f.read),f.title);}
 if(a==='ask-formula'){const f=data.formulas.find(x=>x.id===id),l=data.lessons.find(x=>x.formulaIds.includes(id));if(l&&l.id!==lessonId)selectLesson(l.id);askQuestion(`Разбери формулу «${f.title}» подробно: $$${f.tex}$$. Объясни каждый символ, откуда берётся каждый член, все преобразования и допущения. Покажи маленький пример, если он уместен.`);}
 if(a==='source')openSource(id);
 if(a==='quiz'){const q=current().quiz;$('#quiz-feedback').textContent=(Number(button.dataset.answer)===q.answer?'Верно. ':'Нужно уточнить. ')+q.why;}
 if(a==='lab-kind'){labKind=button.dataset.kind;renderLab();}
 if(a==='explain-result'){if(labRun){const related={beta:'sitito-beta',ejce:'ejce-model',allocation:'injoit-dp',ode:'ode-protocol'}[labRun.result.kind];if(related!==lessonId&&!chatController){lessonId=related;save();renderNav();renderChat();}askQuestion(($('#answer-detail').value==='brief'?'Кратко, не больше пяти предложений. ':'Подробно. ')+'Объясни мой последний результат лаборатории. Разбери значения, выпиши соответствующие формулы, покажи промежуточные шаги и объясни, что изменится при изменении одного параметра. Отдели этот учебный запуск от архивного эксперимента статьи.');}}
 if(a==='export-lab'&&labRun)download('учебный-расчёт-'+labRun.result.kind+'.json',JSON.stringify(labRun.result,null,2),'application/json');
 if(a==='export-notes'){const l=current(),notes='# '+l.title+'\n\n'+l.lead+'\n\n'+l.steps.map(s=>'## '+s.title+'\n\n'+s.body).join('\n\n')+'\n\n'+refsFor(l.formulaIds).map(f=>'## '+f.title+'\n\n$$'+f.tex+'$$\n\n'+f.explain).join('\n\n')+'\n\n## Диалог\n\n'+(dialogues[l.id]||[]).map(m=>(m.role==='user'?'**Вопрос:** ':'**Лектор:** ')+m.content).join('\n\n');download('Конспект-'+l.id.replaceAll(':','-')+'.md',notes);}
 if(a==='paper-lesson')selectLesson(data.lessons.find(x=>x.group===id).id);
 if(a==='custom-lesson')selectLesson(data.lessons.find(x=>x.libraryId===id).id);
 if(a==='results')try{await showResults(id);}catch(e){toast(e.message);}
});
document.addEventListener('submit',async event=>{
 if(event.target.id==='lab-form'){event.preventDefault();const b=$('#run-lab');b.disabled=true;b.textContent='Вычисляем…';const params=Object.fromEntries(new FormData(event.target));try{labRun=await post('/api/lab',{kind:labKind,params});renderLabResult(labRun.result);save();}catch(e){toast(e.message);$('#lab-result').innerHTML=`<div class="notice">${esc(e.message)}</div>`;}finally{b.disabled=false;b.textContent='Рассчитать';}}
 if(event.target.id==='upload-form'){event.preventDefault();const form=event.target,file=form.elements.file.files[0],b=$('#upload-button');if(!file)return;if(file.size>20_000_000)return toast('Файл превышает 20 МБ.');b.disabled=true;$('#upload-status').textContent='Читаем файл и извлекаем текст…';try{const result=await api('/api/library',{method:'POST',headers:{'Content-Type':'application/octet-stream','X-Filename':encodeURIComponent(file.name),'X-Title':encodeURIComponent(form.elements.title.value)},body:file});data=await api('/api/course');renderNav();renderLibrary();toast(result.duplicate?'Этот файл уже есть в библиотеке.':result.needsOcr?'Материал сохранён; для диалога нужен текстовый слой или OCR.':'Статья добавлена. Откройте её разбор в библиотеке.');}catch(e){$('#upload-status').textContent=e.message;}finally{if(document.contains(b))b.disabled=false;}}
});
document.addEventListener('input',event=>{if(event.target.id==='formula-search'){formulaSearch=event.target.value;const pos=event.target.selectionStart;renderFormulas();$('#formula-search').focus();$('#formula-search').setSelectionRange(pos,pos);}});
document.addEventListener('change',event=>{if(event.target.id==='formula-filter'){formulaFilter=event.target.value;renderFormulas();}});
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));
$('#chat-form').onsubmit=e=>{e.preventDefault();askQuestion($('#question').value);};
$('#question').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();askQuestion(e.target.value);}};
$('#chat-prompts').onclick=e=>{const b=e.target.closest('[data-prompt]');if(b)askQuestion(data.questions[[0,1,2,3][Number(b.dataset.prompt)]]);};
$('#stop-answer').onclick=()=>chatController?.abort();
$('#clear-chat').onclick=()=>{if(chatController)return;delete dialogues[lessonId];save();renderChat();};
$('#model-status').onclick=async()=>{await refreshModel();toast(model?.available?'Локальная модель готова к диалогу.':'Диалогу нужен работающий сервер модели. Подготовленные занятия и эксперименты доступны.');};
$('#close-source').onclick=()=>$('#source-dialog').close();
$('#source-dialog').onclick=e=>{if(e.target===$('#source-dialog'))$('#source-dialog').close();};
$('#nav-toggle').onclick=()=>$('#sidebar').classList.toggle('open');
$('#chat-toggle').onclick=()=>$('#chat-panel').classList.toggle('open');
$('#home-link').onclick=e=>{e.preventDefault();selectLesson(data.lessons[0].id);};
$('#audio-speed').onchange=e=>$('#audio').playbackRate=Number(e.target.value);
$('#close-audio').onclick=()=>{voiceEpoch++;$('#audio').pause();$('#audio-dock').classList.add('hidden');window.speechSynthesis?.cancel();};
$('#pause-voice').onclick=()=>window.speechSynthesis?.pause();
$('#resume-voice').onclick=()=>window.speechSynthesis?.resume();
window.addEventListener('pagehide',()=>{if(activeChatJob)navigator.sendBeacon('/api/chat-jobs/'+activeChatJob+'/cancel','{}');});
async function start(){try{let pending=null;try{pending=sessionStorage.getItem('pit-lecturer-pending-job');sessionStorage.removeItem('pit-lecturer-pending-job');}catch{}if(pending)await post('/api/chat-jobs/'+pending+'/cancel',{}).catch(()=>{});data=await api('/api/course');if(!data.lessons.some(x=>x.id===lessonId))lessonId=data.lessons[0].id;labKind=current().lab||'beta';try{voices=(await api('/api/voices')).voices||[];}catch{}renderAll();await refreshModel();}catch(e){$('#content').innerHTML=`<div class="notice">${esc(e.message)}</div>`;}}
start();
