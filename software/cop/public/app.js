import {createProgramUI} from './program-ui.js';
const $ = (s) => document.querySelector(s),
  esc = (x) =>
    String(x ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
const roleNames = {
  student: "Студент",
  teacher: "Преподаватель",
  tutor: "Тьютор",
  methodist: "Методист",
  program_manager: "Руководитель программы",
  researcher: "Исследователь",
  admin: "Администратор",
  expert: "Внешний эксперт",
};
const assistanceNames = {
  independent: "Самостоятельно",
  reference: "С эталоном",
  llm: "С LLM",
  tutor: "С тьютором",
};
const statusNames = {
  submitted: "Ожидает проверки",
  reviewed: "Проверена",
  passed: "Тесты пройдены",
  failed: "Есть ошибки",
  error: "Ошибка исполнения",
  unavailable: "Не подключён",
  running: "Выполняется",
};
const eventNames = {
  "hypothesis.created": "Гипотеза сохранена",
  "attempt.submitted": "Версия работы сохранена",
  "experiment.saved": "Опыт записан",
  "comparison.saved": "Сравнение сохранено",
  "code.checked": "Код проверен на сервере",
  "code.browser_checked": "Код проверен в браузере",
};
const levels = ["", "Базовый", "Средний", "Продвинутый"];
let programUI=null;
let user,
  home,
  course,
  currentTask,
  hypothesisId,
  lastAttempt,
  page = "home";
async function api(path, body) {
  const r = await fetch("/api/" + path, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error);
  return d;
}
function toast(message, error = false) {
  const el = $("#toast");
  el.textContent = message;
  el.className = "show" + (error ? " error" : "");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (el.className = ""), 6500);
}
const brand = () =>
  '<div class="brand"><div class="brandmark">∑</div><div><strong>ИМО</strong><small>Прикладное машинное обучение</small></div></div>';
function login(reset = false) {
  user = null;
  $("#app").innerHTML =
    `<div class="login"><section class="login-story">${brand()}<div class="eyebrow">Образовательное пространство</div><h1>Ваш путь<br>от гипотезы<br>к результату.</h1><p>Изучайте дисциплины программы, проверяйте решения и собирайте доказательства своего прогресса в едином пространстве.</p><div class="login-points"><span>01 · Индивидуальный маршрут</span><span>02 · Практика и исследование</span></div></section><section class="login-form"><div class="login-box"><div class="eyebrow">Личный кабинет</div><h2>${reset ? "Обновите пароль" : "Добро пожаловать"}</h2><p class="muted">${reset ? "Временный пароль нужно заменить перед началом работы." : "Войдите с учетной записью, выданной администратором."}</p><form id="${reset ? "password-form" : "login-form"}">${reset ? '<label for="current">Текущий пароль</label><input id="current" name="current" type="password" autocomplete="current-password" required>' : '<label for="login">Логин</label><input id="login" name="login" autocomplete="username" required>'}<label for="password">${reset ? "Новый пароль" : "Пароль"}</label><input id="password" name="password" type="password" autocomplete="${reset ? "new-password" : "current-password"}" ${reset ? 'minlength="12"' : ""} required><button>${reset ? "Сохранить новый пароль" : "Войти в пространство"} →</button></form><small>Междисциплинарный пилот · 1–4 курс<br>Доступ к результатам зависит от роли и назначенной учебной группы.</small></div></section></div>`;
}
function navItems() {
  const all = [["home", "Обзор пространства"],["catalog","Каталог 1–4 курса"],["transitions","Междисциплинарные переходы"]];
  if (user.roles.includes("student"))
    all.push(
      ["courses", "Мои дисциплины"],
      ["journal", "Журнал и работы"],
      ["trajectory", "Моя траектория"],
    );
  if (user.roles.some((r) => ["teacher", "tutor", "expert"].includes(r)))
    all.push([
      "staff",
      user.roles.includes("tutor")
        ? "Сопровождение студентов"
        : "Работы и проверка",
    ]);
  if (user.roles.some((r) => ["methodist", "program_manager"].includes(r)))
    all.push(["curriculum", "Модель компетенций"]);
  if (
    user.roles.some((r) =>
      ["researcher", "program_manager", "admin"].includes(r),
    )
  )
    all.push(["analytics", "Аналитика"]);
  if (user.roles.includes("admin"))
    all.push(
      ["admin", "Учетные записи"],
      ["backups", "Резервные копии"],
      ["audit", "Аудит действий"],
    );
  return all;
}
function shell(content) {
  $("#app").innerHTML =
    `<header class="topbar">${brand()}<div class="account"><span class="avatar">${esc(user.name.slice(0, 1))}</span><div class="name">${esc(user.name)}<br><small>${user.roles.map((r) => roleNames[r]).join(" · ")}</small></div><button class="quiet" data-action="logout">Выйти</button></div></header><div class="layout"><aside><div class="eyebrow">Навигация</div><nav>${navItems()
      .map(
        ([id, title]) =>
          `<button data-page="${id}" class="${page === id ? "active" : ""}">${title}</button>`,
      )
      .join(
        "",
      )}</nav><div class="aside-note"><span class="live-dot"></span> Пилот ИМО · 0.2<br>Программа 1–4 курса<br><br>Проверяем гипотезы.<br>Сохраняем ход исследования.</div></aside><main><div class="breadcrumb">ИМО / ${esc(navItems().find((x) => x[0] === page)?.[1] || "Учебная лаборатория")}</div>${user.login.startsWith("demo-") ? '<div class="notice">Демонстрационный контур. Все учетные записи и результаты здесь вымышлены.</div>' : ""}${content}</main></div>`;
  document.querySelectorAll("label:not([for])").forEach((label, index) => {
    const control = label.nextElementSibling;
    if (control && ["INPUT", "SELECT", "TEXTAREA"].includes(control.tagName)) {
      control.id ||= "field-" + page + "-" + index;
      label.htmlFor = control.id;
    }
  });
}
const head = (title, description, badge = "") =>
  `<div class="page-head"><div><h1>${title}</h1><p>${description}</p></div>${badge ? `<span class="badge">${badge}</span>` : ""}</div>`;
const stat = (label, value, note) =>
  `<div class="stat"><small>${label}</small><strong>${esc(value)}</strong><small>${note}</small></div>`;
function courseCards(courses) {
  return `<div class="grid">${courses.map((c, i) => `<article class="card course"><div class="course-icon">${String(i + 1).padStart(2, "0")} / ${c.year} КУРС</div><h3>${esc(c.title)}</h3><p>${c.status === "pilot" ? "16 тем · 3 уровня · Python · исследовательская практика" : "Карточка дисциплины. Учебные материалы готовятся."}</p><footer><span class="badge ${c.status === "pilot" ? "" : "gray"}">${c.status === "pilot" ? "Пилот доступен" : "План наполнения"}</span><button class="secondary" data-course="${esc(c.id)}">Открыть →</button></footer></article>`).join("")}</div>`;
}
function landing() {
  if (user.roles.includes("student")) return "home";
  if (user.roles.includes("admin")) return "admin";
  if (user.roles.some((r) => ["teacher", "tutor", "expert"].includes(r)))
    return "staff";
  if (user.roles.includes("methodist")) return "curriculum";
  return "analytics";
}
async function show(next = landing()) {
  page = next;
  try {
    if(programUI && await programUI.show(next)) return;
    if (next === "home") {
      home = await api("home");
      const student = user.roles.includes("student");
      shell(
        head(
          student
            ? "Моё образовательное пространство"
            : roleNames[user.roles[0]],
          student
            ? "Практика, исследование и ваш прогресс — в одном месте. Начните с ближайшей учебной задачи."
            : "Ваши инструменты и назначенные области работы в ЦОП.",
          "2026 / 2027",
        ) +
          `<section class="hero"><div><div class="eyebrow">${student ? "Учебная лаборатория" : "Пилот программы"}</div><h2>Алгоритмы и структуры данных</h2><p>${student ? "Сначала сформулируйте гипотезу, затем проверьте её экспериментом и объясните результат. Каждый шаг останется в вашем журнале." : "Единый цикл: гипотеза → код → эксперимент → обратная связь. Области доступа и история изменений проверяются сервером."}</p><button data-${student ? 'course="algorithms"' : 'page="' + (navItems()[1]?.[0] || "home") + '"'}>${student ? "Перейти к практике" : "Открыть рабочие инструменты"} →</button></div><div class="hero-meta"><div><strong>16</strong><span>тем по рабочей программе</span></div><div><strong>3</strong><span>уровня задач</span></div><div><strong>48</strong><span>практических заданий</span></div><div><strong>116</strong><span>индикаторов в реестре</span></div></div></section><div class="stats">${stat("Дисциплины", home.counts.courses, "в доступном каталоге")}${stat("Мои работы", home.counts.attempts, "сохранённых версий")}${stat("События", home.counts.events, "в личном журнале")}</div><div class="section-title"><h2>${student ? "Мои дисциплины" : "Каталог пилота"}</h2><span class="muted">1–2 курс</span></div>${home.courses.length ? courseCards(home.courses.slice(0, 6)) : '<div class="empty"><h3>Учебная область ещё не назначена</h3>Администратор назначает дисциплину и группу для вашей роли.</div>'}`,
      );
    } else if (next === "courses") {
      home = await api("home");
      shell(
        head(
          "Мои дисциплины",
          "Материалы алгоритмов доступны в пилоте. Остальные дисциплины включены в каталог и ожидают наполнения.",
        ) + courseCards(home.courses),
      );
    } else if (next === "journal") {
      await showJournal();
    } else if (next === "trajectory") {
      const d = await api("trajectory");
      shell(
        head(
          "Моя траектория",
          "Прогресс подтверждается самостоятельными работами и переносом знания в новые задачи.",
        ) +
          `<div class="notice">${esc(d.message)}</div><div class="stats">${stat("Индикаторы", d.states.length, "полный реестр программы")}${stat("Подтверждено", d.states.filter((s) => s.ready).length, "по математическому критерию")}${stat("Порог", "0,80", "нижняя 95% граница")}</div><div class="notice warn">Связи заданий с индикаторами пилота ещё требуют утверждения. Отсутствие свидетельств означает «недостаточно данных», а не нулевую способность студента.</div><div class="table-wrap"><table><thead><tr><th>Индикатор</th><th>Результат</th><th>Нижняя граница</th><th>Свидетельства</th></tr></thead><tbody>${d.states.map((s) => `<tr><td>${esc(s.code)}</td><td>${esc(s.title)}</td><td>${s.lower95.toFixed(3)}</td><td>${s.independentTasks} · ${s.ready ? "готов" : "нужны данные"}</td></tr>`).join("")}</tbody></table></div>`,
      );
    } else await showManagement(next);
  } catch (e) {
    toast(e.message, true);
  }
}
async function openCourse(id){return programUI.openCourse(id);}
function openTask(id) {
  currentTask = course.tasks.find((t) => t.id === id);
  hypothesisId = null;
  lastAttempt = course.attempts.find((a) => a.task_id === id);
  const t = currentTask;
  page = "courses";
  if(course.preview||!user.roles.includes("student"))return programUI.previewTask(t);
  shell(
    head(esc(t.title), esc(t.statement), levels[t.level]) +
      `<div class="workspace"><div class="stack"><section class="card"><div class="step"><span>1</span>Гипотеза перед решением</div><form id="hypothesis"><label for="prediction">Что вы ожидаете получить?</label><textarea id="prediction" name="prediction" minlength="12" required placeholder="Например: изменение параметра сохраняет инвариант или выявляет ошибку ИИ-варианта."></textarea><label for="rationale">Почему вы так считаете?</label><textarea id="rationale" name="rationale" minlength="12" required placeholder="Обоснуйте прогноз и назовите условие, при котором он может не подтвердиться."></textarea><div class="row"><button>Зафиксировать гипотезу</button><small id="hypothesis-state">Нужна до отправки кода</small></div></form></section><section class="card"><div class="step"><span>2</span>Моё решение · Python</div><form id="attempt"><label for="code">Функция solve(data)</label><textarea id="code" name="code" class="code" spellcheck="false" required>${esc(lastAttempt?.code || t.starter)}</textarea><label for="explanation">Объяснение, сложность и граничные случаи</label><textarea id="explanation" name="explanation" minlength="20" required>${esc(lastAttempt?.explanation || "")}</textarea><label for="assistance">Как вы работали?</label><select id="assistance" name="assistance"><option value="independent">Самостоятельно</option><option value="reference">С методическим эталоном</option><option value="llm">С помощью LLM</option><option value="tutor">С тьютором</option></select><div class="row"><button>Сохранить версию</button><button type="button" class="secondary" data-action="run">Проверить код</button></div><p id="attempt-state" class="form-help">${lastAttempt ? "Последняя версия: " + lastAttempt.number : "Работа ещё не отправлена"}. Оценку выставляет преподаватель.</p></form><div id="run-result"></div></section></div><div class="stack">${programUI.simulatorHTML()}<section class="card"><div class="step"><span>3</span>Сравнение решений</div><p class="muted">Сначала сохраните свой код. Эталон и ответ LLM имеют отдельные отметки происхождения.</p><form id="compare"><label for="compare-source">Источник</label><select id="compare-source" name="source"><option value="reference">Методический эталон</option>${t.has_fixture?'<option value="fixture">Учебный ИИ-сценарий · без LLM</option>':""}<option value="llm">LLM – если подключена</option></select><label for="compare-note">Что вы сравниваете и как проверите различия?</label><textarea id="compare-note" name="conclusion" minlength="20" required></textarea><label class="check"><input name="consent" type="checkbox">Для LLM: разрешаю передать только публичное условие задачи</label><div class="row"><button class="secondary">Получить вариант и записать сравнение</button></div></form><div id="compare-result"></div></section>${programUI.artifactForm()}<section class="card"><h3>Критерии работы</h3><p class="form-help">Корректность — 50%<br>Объяснение — 20%<br>Анализ сложности — 15%<br>Исследование — 15%</p><p class="form-help">${esc(t.rubric.note)}</p></section></div></div>`,
  );
}
async function showJournal(target){return programUI.showJournal(target);}
async function showManagement(next) {
  if (next === "backups") {
    shell(
      head(
        "Резервные копии",
        "Сохраните согласованный SQL-снимок работающей БД для восстановления или переноса в облако.",
      ) +
        '<section class="card"><h3>Экспорт текущей базы</h3><p class="muted">Копия включает пользователей, роли, содержание, версии работ и журналы. Активные сессии исключены. Для восстановления сначала применяются миграции в пустой PostgreSQL, затем этот SQL.</p><div class="notice warn">В файле будут персональные данные и хеши паролей. Храните его в закрытой папке. Не добавляйте в публичный GitHub и не передавайте LLM.</div><button data-action="backup">Скачать закрытый SQL-снимок</button></section>',
    );
    return;
  }
  if (next === "staff") {
    const d = await api("staff/journal");
    shell(
      head(
        user.roles.includes("tutor")
          ? "Сопровождение студентов"
          : "Работы и проверка",
        "Показаны только назначенные вам группы и работы.",
      ) +
        `<div class="stats">${stat("Студенты", d.students.length, "в вашей области доступа")}${stat("Работы", d.attempts.length, "сохранённые версии")}${stat("Ожидают проверки", d.attempts.filter((a) => a.status === "submitted").length, "в очереди")}</div>${d.attempts.length ? d.attempts.map((a) => `<section class="card"><div class="page-head"><div><h3>${esc(a.title)} · v${a.number}</h3><small>${esc(a.student)} / ${esc(a.group)} · ${esc(assistanceNames[a.assistance] || a.assistance)}</small></div><span class="badge gray">${esc(statusNames[a.status] || a.status)}</span></div><details><summary>Решение и объяснение</summary><pre>${esc(a.code)}\n\n${esc(a.explanation)}</pre></details>${user.roles.includes("teacher") ? `<form class="review" data-id="${a.id}"><div class="two"><div><label>Балл (0–100)</label><input name="score" type="number" min="0" max="100" required></div><div><label>Обратная связь</label><textarea name="feedback" minlength="20" required></textarea></div></div><label class="check"><input name="independent" type="checkbox">Самостоятельность проверена</label><label class="check"><input name="transfer" type="checkbox">Проверен перенос на новую задачу</label><div class="row"><button>Сохранить проверку</button></div></form>` : `<div class="row">${user.roles.includes("tutor") ? `<button class="secondary" data-student-journal="${a.user_id}">Открыть журнал</button>` : ""}</div>`}</section>`).join("<br>") : '<div class="empty"><h3>Очередь пуста</h3>Отправленные студентами работы появятся здесь после назначения учебной области.</div>'}<div class="section-title"><h2>Назначенные студенты</h2></div><div class="table-wrap"><table><thead><tr><th>Студент</th><th>Группа</th></tr></thead><tbody>${d.students.map((s) => `<tr><td>${esc(s.name)}</td><td>${esc(s.group_title)}</td></tr>`).join("") || '<tr><td colspan="2">Назначений нет</td></tr>'}</tbody></table></div>`,
    );
  } else if (next === "curriculum") {
    const d = await api("curriculum");
    shell(
      head(
        "Компетентностная модель",
        "Проверьте соответствие задания индикатору. Утверждение доступно руководителю программы.",
      ) +
        `<div class="stats">${stat("Компетенции", d.competencies.length, "целевая модель")}${stat("Индикаторы", d.indicators.length, "уникальные коды")}${stat("Индикаторы с предложениями", new Set(d.mappings.map(m=>m.indicator_code)).size, "предварительная разметка банка")}${stat("Утверждённые связи", d.mappings.filter((m) => m.status === "approved").length, "задание → индикатор")}</div><div class="notice warn">Коды дисциплин и компетенций сверены с учебным планом и КРМ. Связи конкретных заданий с индикаторами остаются методическими предложениями до утверждения.</div><section class="card"><h3>Связать задание и индикатор</h3><form id="mapping"><div class="two"><div><label>Код задания</label><input name="taskId" value="alg-01-l1" required></div><div><label>Индикатор</label><select name="indicatorCode">${d.indicators.map((i) => `<option>${esc(i.code)}</option>`).join("")}</select></div></div><label>Педагогическое обоснование</label><textarea name="reason" minlength="20" required></textarea>${user.roles.includes("program_manager") ? '<label class="check"><input type="checkbox" name="approve">Утвердить связь для последующих проверок</label>' : ""}<div class="row"><button>Сохранить связь</button></div></form></section><div class="section-title"><h2>Покрытие индикаторов</h2></div><div class="table-wrap"><table><thead><tr><th>Код</th><th>Индикатор</th><th>Утверждённые задания</th></tr></thead><tbody>${d.coverage.map((i) => `<tr><td>${esc(i.code)}</td><td>${esc(i.title)}</td><td>${i.approved_tasks}</td></tr>`).join("")}</tbody></table></div>`,
    );
  } else if (next === "analytics") {
    const d = await api("analytics");
    shell(
      head(
        user.roles.includes("researcher")
          ? "Исследовательский контур"
          : "Аналитика пилота",
        "Количество действий и состояние рабочего цикла. Эти показатели не доказывают педагогическую эффективность.",
      ) +
        `<div class="notice">${esc(d.privacy)} ${esc(d.researchExport)}</div><div class="grid">${Object.entries(
          d.counts,
        )
          .map(([k, v]) =>
            stat(
              {
                users: "Учетные записи",
                groups: "Группы",
                courses: "Дисциплины",
                tasks: "Задания",
                attempts: "Версии работ",
                hypotheses: "Гипотезы",
                simulator_runs: "Эксперименты",
                comparisons: "Сравнения",
                reviews: "Отзывы",
                journal_observations: "Исходные отметки",
              }[k],
              v,
              "в текущем контуре",
            ),
          )
          .join(
            "",
          )}</div><div class="section-title"><h2>Проверки кода</h2></div><div class="table-wrap"><table><thead><tr><th>Статус</th><th>Количество</th></tr></thead><tbody>${d.byStatus.map((x) => `<tr><td>${esc(x.status)}</td><td>${x.n}</td></tr>`).join("") || '<tr><td colspan="2">Проверок пока нет</td></tr>'}</tbody></table></div>`,
    );
  } else if (next === "admin") {
    const d = await api("admin/users");
    shell(
      head(
        "Учетные записи",
        "Назначайте владельцев служебных учетных записей и учебные области. Все изменения попадают в аудит.",
      ) +
        `<section class="card"><h3>Назначить учебную область</h3><form id="scope"><div class="two"><div><label>Сотрудник</label><select name="userId">${d.users
          .filter((u) => /teacher|tutor|expert/.test(u.roles))
          .map(
            (u) =>
              `<option value="${u.id}">${esc(u.name)} (${esc(u.login)})</option>`,
          )
          .join(
            "",
          )}</select></div><div><label>Группа</label><select name="groupId">${d.groups.map((g) => `<option value="${esc(g.id)}">${esc(g.title)}</option>`).join("")}</select></div></div><div class="two"><div><label>Роль</label><select name="role"><option value="teacher">Преподаватель</option><option value="tutor">Тьютор</option></select></div><div><label>Дисциплина</label><select name="courseId">${d.courses.map(c=>`<option value="${esc(c.id)}">${esc(c.title)}</option>`).join("")}</select></div></div><div class="row"><button>Назначить</button></div></form></section><div class="section-title"><h2>Пользователи · ${d.users.length}</h2></div><div class="table-wrap"><table><thead><tr><th>Имя и логин</th><th>Роль</th><th>Состояние</th><th>Управление</th></tr></thead><tbody>${d.users.map((u) => `<tr><td>${esc(u.name)}<br><small>${esc(u.login)}</small></td><td>${esc(u.roles)}</td><td>${u.active ? "Активна" : "Требует назначения"}${u.force_reset ? "<br><small>Смена пароля обязательна</small>" : ""}</td><td>${!u.active ? `<button class="secondary" data-activate="${esc(u.id)}">Назначить владельца</button> ` : ""}<button class="secondary" data-reset="${esc(u.id)}">Сброс пароля</button></td></tr>`).join("")}</tbody></table></div><div id="admin-result"></div>`,
    );
  } else if (next === "audit") {
    const d = await api("admin/audit");
    shell(
      head(
        "Аудит действий",
        "Последние изменения учетных записей, полномочий и преподавательских решений.",
      ) +
        `<div class="table-wrap"><table><thead><tr><th>Время</th><th>Действие</th><th>Автор</th><th>Объект</th></tr></thead><tbody>${d.rows.map((a) => `<tr><td>${esc(new Date(a.created_at).toLocaleString("ru"))}</td><td>${esc(a.action)}</td><td>${esc(a.actor_id || "Импорт")}</td><td>${esc(a.object_id)}</td></tr>`).join("")}</tbody></table></div>`,
    );
  }
}
document.addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target,
    values = Object.fromEntries(new FormData(f)),
    button = f.querySelector("button[type=submit],button:not([type])");
  if (button) button.disabled = true;
  try {
    if (f.id === "login-form") {
      const d = await api("login", values);
      user = d.user;
      if (user.forceReset) login(true);
      else await show();
    } else if (f.id === "password-form") {
      await api("password", values);
      login();
      toast("Пароль обновлён. Войдите с новым паролем.");
    } else if (f.id === "hypothesis") {
      const d = await api("hypotheses", { taskId: currentTask.id, ...values });
      hypothesisId = d.id;
      $("#hypothesis-state").textContent = "Гипотеза сохранена ✓";
      toast("Гипотеза зафиксирована");
    } else if (f.id === "attempt") {
      if (!hypothesisId) throw new Error("Сначала зафиксируйте гипотезу");
      lastAttempt = await api("attempts", {
        taskId: currentTask.id,
        hypothesisId,
        ...values,
        baseVersion: lastAttempt?.number || 0,
      });
      $("#attempt-state").textContent =
        "Версия " +
        lastAttempt.number +
        " сохранена. Можно проверить код и сравнить решения.";
      course.attempts.unshift({
        ...lastAttempt,
        task_id: currentTask.id,
        code: values.code,
        explanation: values.explanation,
      });
      toast("Версия работы сохранена в журнале");
    } else if (f.id === "simulator") {
      if (!hypothesisId) throw new Error("Сначала зафиксируйте гипотезу");
      const d = await api("simulate", {
        hypothesisId,
        parameters:values.labId.startsWith("complexity:")?{algorithm:values.labId.split(":")[1],n:Number(values.n),target:Number(values.parameter),seed:Number(values.seed)}:{labId:values.labId,n:Number(values.n),seed:Number(values.seed),parameter:Number(values.parameter)},
        conclusion: values.conclusion,
      });
      $("#sim-result").innerHTML = programUI.renderSimulation(d);
    } else if (f.id === "compare") {
      if (!lastAttempt)
        throw new Error("Сначала сохраните свою версию решения");
      const d = await api("compare", {
        attemptId: lastAttempt.id,
        ...values,
        consent: values.consent === "on",
      });
      $("#compare-result").innerHTML =
        `<div class="result">${d.disabled ? esc(d.message) : `<small>${esc(d.note)}</small><pre>${esc(d.code)}</pre><div class="row"><button type="button" class="secondary" data-check-comparison="${d.id}">Проверить этот вариант в браузере</button></div>`}</div>`;
    } else if (f.classList.contains("review")) {
      await api("reviews", {
        attemptId: f.dataset.id,
        score: Number(values.score),
        feedback: values.feedback,
        independent: values.independent === "on",
        transfer: values.transfer === "on",
        ...(values.controlOutcome&&values.controlOutcome!=="none"?{controlOutcome:values.controlOutcome==="passed",controlCriterion:values.controlCriterion}:{}),
      });
      toast("Проверка и запись журнала сохранены");
      await show("staff");
    } else if (f.id === "mapping") {
      await api("mapping", { ...values, approve: values.approve === "on" });
      toast("Связь сохранена с записью обоснования");
      await show("curriculum");
    } else if (f.id === "scope") {
      await api("admin/scope", values);
      toast("Учебная область назначена");
    }
  } catch (err) {
    toast(err.message, true);
  } finally {
    if (button) button.disabled = false;
  }
});
document.addEventListener("click", async (e) => {
  const el = e.target.closest("button");
  if (!el) return;
  try {
    if (el.dataset.page) await show(el.dataset.page);
    if (el.dataset.course) await openCourse(el.dataset.course);
    if (el.dataset.task) openTask(el.dataset.task);
    if (el.dataset.action === "logout") {
      await api("logout", {});
      login();
    }
    if (el.dataset.action === "backup") {
      el.disabled = true;
      try {
        const d = await api("admin/backup", {});
        const link = document.createElement("a");
        const blobUrl = URL.createObjectURL(
          new Blob([d.sql], { type: "application/sql" }),
        );
        link.href = blobUrl;
        link.download = d.filename;
        link.click();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
        toast("Закрытая резервная копия подготовлена");
      } finally {
        el.disabled = false;
      }
    }
    if (el.dataset.action === "run") {
      if (!lastAttempt) throw new Error("Сначала сохраните версию кода");
      el.disabled = true;
      let d;
      try {
        d = home?.runner
          ? await api("run", { attemptId: lastAttempt.id })
          : await browserRun(lastAttempt.id);
      } finally {
        el.disabled = false;
      }
      $("#run-result").innerHTML =
        `<div class="result"><strong>${esc({ passed: "Тесты пройдены", failed: "Есть ошибки", unavailable: "Исполнитель не подключён", error: "Ошибка исполнения" }[d.status] || d.status)}</strong><p>${d.status === "unavailable" ? "Работа сохранена. Изолированный серверный исполнитель не подключён." : d.status === "error" ? esc(d.message || "Повторите позже. Код сохранён.") : (d.cases || []).map((x, i) => `Тест ${i + 1}: ${x.passed ? "✓" : "ошибка " + esc(x.error || "")}`).join("<br>")}</p><small>${d.source === "browser_unverified" ? "Предварительная проверка в браузере. " : ""}Результат записан в журнал и не заменяет преподавательскую оценку.</small></div>`;
    }
    if (el.dataset.checkComparison) {
      el.disabled = true;
      try {
        const d = await browserRun(lastAttempt.id, el.dataset.checkComparison);
        toast(
          d.status === "passed"
            ? "Вариант прошёл тесты в браузере; результат записан"
            : "Вариант содержит ошибки или превысил лимит",
        );
      } finally {
        el.disabled = false;
      }
    }
    if (el.dataset.studentJournal) await showJournal(el.dataset.studentJournal);
    if (el.dataset.appeal) {
      const message = prompt("Опишите основание апелляции (от 20 символов)");
      if (message) {
        await api("appeals", { attemptId: el.dataset.appeal, message });
        toast("Апелляция сохранена");
      }
    }
    if (el.dataset.activate) {
      const name = prompt("Укажите ФИО владельца служебной учетной записи");
      if (name) {
        await api("admin/activate", { userId: el.dataset.activate, name });
        await show("admin");
        toast("Владелец назначен. Учебная область назначается отдельно.");
      }
    }
    if (el.dataset.reset) {
      if (
        confirm(
          "Создать новый временный пароль и завершить все сеансы этой учетной записи?",
        )
      ) {
        const d = await api("admin/reset", { userId: el.dataset.reset });
        $("#admin-result").innerHTML =
          '<div class="notice warn">Новый временный пароль показан один раз: <strong>' +
          esc(d.temporaryPassword) +
          "</strong>. Передайте владельцу по закрытому каналу.</div>";
        $("#admin-result").scrollIntoView({ behavior: "smooth" });
      }
    }
  } catch (err) {
    toast(err.message, true);
  }
});
async function browserRun(attemptId, comparisonId) {
  const job = await api("browser-run/start", { attemptId, comparisonId });
  toast("Запускается локальный Python в браузере…");
  const result = await new Promise((resolve) => {
    const worker = new Worker("/python-worker.js", {
      type: "module",
      name: "cop-python",
    });
    let timer = setTimeout(
        () => finish({ error: "Превышено время загрузки Python (45 с)" }),
        45000,
      ),
      done = false;
    function finish(value) {
      if (done) return;
      done = true;
      clearTimeout(timer);
      worker.terminate();
      resolve(value);
    }
    worker.onerror = () =>
      finish({ error: "Не удалось запустить Python в браузере" });
    worker.onmessage = ({ data }) => {
      if (data.type === "ready") {
        clearTimeout(timer);
        timer = setTimeout(
          () => finish({ error: "Превышен лимит исполнения Python (4 с)" }),
          4000,
        );
        worker.postMessage({ code: job.code, inputs: job.inputs });
      }
      if (data.type === "done") finish({ outputs: data.outputs });
      if (data.type === "error") finish({ error: data.message });
    };
  });
  return api("browser-run/finish", { runId: job.id, ...result });
}
programUI=createProgramUI({api,esc,shell,head,stat,toast,getUser:()=>user,getHome:()=>home,setHome:v=>home=v,getCourse:()=>course,setCourse:v=>course=v,getLastAttempt:()=>lastAttempt,getPage:()=>page,setPage:v=>page=v});
try {
  const d = await api("me");
  user = d.user;
  if (user.forceReset) login(true);
  else await show();
} catch {
  login();
}

function journalResearch(d) {
  const hypotheses = d.hypotheses || [],
    experiments = d.experiments || [],
    comparisons = d.comparisons || [];
  return `<div class="section-title"><h2>Гипотезы и опыты</h2><small>${hypotheses.length} гипотез · ${experiments.length} опытов</small></div>${
    hypotheses
      .map(
        (h) =>
          `<details class="card"><summary>${esc(h.title)} · ${esc(h.prediction)}</summary><p>${esc(h.rationale)}</p>${experiments
            .filter((x) => x.hypothesis_id === h.id)
            .map(
              (x) =>
                `<div class="result"><strong>${esc(x.measurements.algorithm)} · n=${x.parameters.n} · seed=${x.parameters.seed}</strong><p>${x.measurements.comparisons} сравнений ключей</p><small>${esc(x.conclusion)}</small></div>`,
            )
            .join("")}</details>`,
      )
      .join("") || '<div class="empty">Гипотез пока нет</div>'
  }<div class="section-title"><h2>Сравнения решений</h2><small>${comparisons.length} записей</small></div>${
    comparisons
      .map(
        (c) =>
          `<details class="card"><summary>Версия ${c.number} · ${c.source === "reference" ? "Методический эталон" : "Ответ LLM"}</summary><p>${esc(c.conclusion)}</p><pre>${esc(c.generated_code)}</pre><p class="form-help">${
            d.runs
              .filter((r) => r.result?.comparisonId === c.id)
              .map(
                (r) =>
                  esc(statusNames[r.status] || r.status) +
                  " · проверка варианта в браузере",
              )
              .join("<br>") || "Проверка этого варианта не запускалась"
          }</p></details>`,
      )
      .join("") || '<div class="empty">Сравнений пока нет</div>'
  }`;
}
