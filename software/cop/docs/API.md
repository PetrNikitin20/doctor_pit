# API v0.2

Префикс `/api`, JSON, cookie `cop_session` в production; локально имя включает порт для разделения контуров. Все POST требуют заголовок Origin, точно равный APP_ORIGIN, и Content-Type application/json. Размер тела ≤64 КБ. Ответ с ошибкой: `{error: string}`. Временный пароль ограничивает доступ кодом 428 до его смены.

| Метод | Путь | Назначение / роль |
|---|---|---|
| POST | /login | `{login,password}`; лимит неудачных входов |
| GET | /me | Текущий пользователь без секретов |
| POST | /password | `{current,password}`; смена и отзыв всех сеансов |
| POST | /logout | Выход |
| GET | /home | Дисциплины и данные стартовой страницы своей роли |
| GET | /course?id=algorithms | Темы, условия, свои версии; без тестовых ответов и эталона |
| POST | /hypotheses | Студент: `{taskId,prediction,rationale}` |
| POST | /attempts | Студент: `{taskId,hypothesisId,code,explanation,assistance,baseVersion}` |
| POST | /browser-run/start | Студент: `{attemptId,comparisonId?}`; код и входы без ожидаемых ответов |
| POST | /browser-run/finish | `{runId,outputs:[{value,error}],error?}`; предварительный источник browser_unverified |
| POST | /admin/backup | Администратор: согласованный закрытый SQL-снимок без сессий |
| POST | /run | `{attemptId}`; свой код либо назначенный преподавателю |
| POST | /simulate | `{hypothesisId,parameters:{algorithm,n,target,seed},conclusion}` |
| POST | /compare | Своя работа: `{attemptId,source:reference/llm/fixture,conclusion,consent}` |
| GET | /journal?userId=…&courseId=… | Свой журнал; преподаватель/тьютор только в учебной области |
| GET | /trajectory?userId=… | Объяснимая оценка индикаторов; те же ограничения |
| POST | /appeals | `{attemptId,message}`; своя попытка |
| GET | /staff/journal?courseId=… | Преподаватель/тьютор: свои группы; эксперт: назначенные артефакты |
| POST | /reviews | Преподаватель: `{attemptId,score,independent,transfer,feedback}` |
| GET | /curriculum | Методист/руководитель: реестр и покрытие |
| POST | /mapping | `{taskId,indicatorCode,reason,approve}`; утверждает руководитель |
| GET | /analytics | Руководитель/исследователь/администратор; только общие количества |
| GET | /admin/users | Администратор; учетные записи без хешей |
| POST | /admin/activate | `{userId,name}`; назначить владельца служебной записи |
| POST | /admin/scope | `{userId,courseId,groupId,role}`; teacher/tutor |
| POST | /admin/expert-assignment | `{userId,attemptId,hours}`; 1–168 часов |
| POST | /admin/reset | `{userId}`; новый временный пароль показан один раз, отзыв сеансов |
| GET | /admin/audit | Последние 100 технических изменений |

Режим помощи: independent, reference, llm, tutor. Преподаватель не может подтвердить самостоятельность попытки, в которой указана помощь. Код не становится зачтённым при одном успешном автоматическом запуске.

`/healthz` проверяет соединение БД. Неподдерживаемые методы возвращают 405. Неизвестные пути — 404. В этой версии нет файлового upload, публичной регистрации, почтовой рассылки или API внешней официальной ведомости. Это предотвращает неявное назначение доступа и публикацию студенческих артефактов.

Запись `conclusion` у симуляции и сравнения сейчас фиксирует план проверки вместе с опытом. Отдельный экран последующего вывода и произвольные серии опытов относятся к следующей итерации.

## Расширение программы 1–4 курса

| Метод | Путь | Поля и назначение |
|---|---|---|
| GET | /program | Каталог 43 дисциплин, годы, семестры, источники связей, назначения study/bridging/preview, симуляторы |
| GET | /course?id=… | Любая опубликованная дисциплина; при отсутствии назначения только ознакомление. Ответы и код эталона скрыты |
| POST | /program/choices | Студент: {modules:["1","7"]}, ровно два различных модуля. Предпочтение не создаёт зачисление |
| GET/POST | /program/trajectory | Бинарная готовность и структурный прототип. POST записывает версионный снимок. Для чужого студента только преподаватель/тьютор в своей области; все предпосылки правила должны быть доступны |
| GET | /program/transitions | Служебные роли: реестр правил |
| POST | /program/transitions | Методист/руководитель: {id,reason,approve,calendarConfirmed}. Утверждает только руководитель; для междисциплинарного правила нужен календарь |
| POST | /artifacts | Студент, собственная попытка: {attemptId,kind,title,content}. Текст ≤16000 символов; protocol/report/dataset/prompt/ai_response/verification |
| POST | /simulate | Для новых сценариев: {hypothesisId,parameters:{labId,n,seed,parameter},conclusion}. labId должен принадлежать дисциплине |
| POST | /reviews | Дополнительно controlOutcome: true/false и controlCriterion (≥20 символов). Только отдельный самостоятельный контроль с утверждёнными на момент проверки связями попадает в control_outcomes |

Просмотр preview не разрешает отправку работы. События, опыты, артефакты и отзывы относятся к фактической дисциплине. Учебный источник сравнения fixture – авторский пример ошибки ИИ; модель не вызывалась. Чужие личные предпочтения элективов преподавателю не возвращаются; структурный отчёт для него содержит общую обязательную часть. Старый /trajectory оставлен как beta-independent-v1; новый бинарный маршрут имеет отдельную версию binary-transition-v1.
