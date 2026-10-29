import { fail, text, uuid } from "./server.mjs";
import { requireRole, digest } from "./security.mjs";
import { mastery, simulate } from "./model.mjs";
import { generateCode } from "./llm.mjs";
import { AI_LABS,runAiLab } from "./ai-simulators.mjs";
export async function handleLearning(c) {
  const {
    db,
    user,
    url,
    path,
    method,
    body,
    json,
    event,
    courseAccess,
    studentAccess,
    getTask,
    getAttempt,
    runAttempt,
  } = c;
  if (path === "/api/home" && method === "GET") {
    const courses = [];
    for (const course of await db.rows(
      "SELECT * FROM courses ORDER BY year,title",
    ))
      if (await courseAccess(user, course.id)) courses.push(course);
    const counts = {
      courses: courses.length,
      attempts: Number(
        (
          await db.one("SELECT count(*) n FROM attempts WHERE user_id=$1", [
            user.id,
          ])
        ).n,
      ),
      events: Number(
        (
          await db.one(
            "SELECT count(*) n FROM learning_events WHERE user_id=$1",
            [user.id],
          )
        ).n,
      ),
    };
    json(200, {
      user: (({ id, login, name, roles }) => ({ id, login, name, roles }))(
        user,
      ),
      courses,
      counts,
      llm: process.env.LLM_PROVIDER || "disabled",
      runner: !!process.env.RUNNER_URL,
    });
    return true;
  }
  if (path === "/api/course" && method === "GET") {
    const id = url.searchParams.get("id") || "algorithms";
    const metadata=await db.one('SELECT * FROM courses WHERE id=$1',[id]);if(!metadata)fail(404,'Дисциплина не найдена');
    // Published teaching material is readable in preview; submissions require enrollment/scope.
    const preview=!(await courseAccess(user,id,true));
    const units = await db.rows(
      "SELECT * FROM learning_units WHERE course_id=$1 ORDER BY position",
      [id],
    );
    const tasks = await db.rows(
      "SELECT t.id,t.unit_id,t.title,t.level,t.kind,t.statement,t.starter,t.rubric,t.version,(t.ai_fixture IS NOT NULL) has_fixture FROM tasks t JOIN learning_units u ON u.id=t.unit_id WHERE u.course_id=$1 AND t.published=true ORDER BY u.position,t.level",
      [id],
    );
    const attempts = await db.rows(
      "SELECT a.*,r.number,r.code,r.explanation,r.assistance FROM attempts a JOIN artifact_revisions r ON r.id=a.revision_id JOIN tasks t ON t.id=a.task_id JOIN learning_units u ON u.id=t.unit_id WHERE a.user_id=$1 AND u.course_id=$2 ORDER BY a.created_at DESC",
      [user.id, id],
    );
    json(200, {
      course:metadata,preview,
      competencies:await db.rows('SELECT l.*,c.title FROM course_competencies l JOIN competencies c ON c.code=l.competency_code WHERE l.course_id=$1',[id]),
      simulators:[AI_LABS[metadata.catalog_meta.lab]].filter(Boolean),
      units,
      tasks,
      attempts,
      prerequisites: await db.rows(
        "SELECT p.* FROM prerequisites p JOIN learning_units u ON u.id=p.unit_id WHERE u.course_id=$1",
        [id],
      ),
    });
    return true;
  }
  if (path === "/api/hypotheses" && method === "POST") {
    requireRole(user, "student");
    const t = await getTask(user, body.taskId),
      id = uuid();
    await db.transaction(async (tx) => {
      await tx.query(
        "INSERT INTO hypotheses(id,user_id,task_id,prediction,rationale) VALUES($1,$2,$3,$4,$5)",
        [
          id,
          user.id,
          t.id,
          text(body.prediction, 12, 2000),
          text(body.rationale, 12, 3000),
        ],
      );
      await event(tx, user, "hypothesis.created", id, { taskId: t.id },t.course_id);
    });
    json(201, { id });
    return true;
  }
  if (path === "/api/simulate" && method === "POST") {
    requireRole(user, "student");
    const h = await db.one(
      "SELECT * FROM hypotheses WHERE id=$1 AND user_id=$2",
      [body.hypothesisId, user.id],
    );
    if (!h) fail(400, "Сначала сохраните свою гипотезу");
    const task=await getTask(user, h.task_id);
    let result;
    try {
      if(body.parameters?.labId){
        const course=await db.one('SELECT catalog_meta FROM courses WHERE id=$1',[task.course_id]);
        if(body.parameters.labId!==course.catalog_meta.lab)fail(400,'Симулятор не относится к этой дисциплине');
        result=runAiLab(body.parameters);
      }else{
        if(task.course_id!=='algorithms')fail(400,'Выберите симулятор своей дисциплины');
        result = simulate(body.parameters);
      }
    } catch (e) {
      fail(400, e.message);
    }
    const id = uuid();
    await db.transaction(async (tx) => {
      await tx.query(
        "INSERT INTO simulator_runs(id,hypothesis_id,user_id,parameters,measurements,conclusion) VALUES($1,$2,$3,$4,$5,$6)",
        [
          id,
          h.id,
          user.id,
          JSON.stringify(result.parameters||body.parameters),
          JSON.stringify(result),
          text(body.conclusion, 12, 3000),
        ],
      );
      await event(tx, user, "experiment.saved", id, {
        hypothesisId: h.id,
        version: result.version,
      },task.course_id);
    });
    json(201, { id, ...result });
    return true;
  }
  if (path === "/api/attempts" && method === "POST") {
    requireRole(user, "student");
    const t = await getTask(user, body.taskId),
      h = await db.one(
        "SELECT * FROM hypotheses WHERE id=$1 AND user_id=$2 AND task_id=$3",
        [body.hypothesisId, user.id, t.id],
      );
    if (!h) fail(400, "Гипотеза должна быть сохранена до отправки кода");
    const code = text(body.code, 8, 16000),
      explanation = text(body.explanation, 20, 6000),
      assistance = body.assistance;
    if (!["independent", "reference", "llm", "tutor"].includes(assistance))
      fail(400, "Укажите режим помощи");
    const id = uuid(),
      rid = uuid();
    let number;
    await db.transaction(async (tx) => {
      let artifact = await tx.one(
        "SELECT * FROM artifacts WHERE owner_id=$1 AND task_id=$2 FOR UPDATE",
        [user.id, t.id],
      );
      if (!artifact) {
        artifact = { id: uuid() };
        await tx.query(
          "INSERT INTO artifacts(id,owner_id,task_id) VALUES($1,$2,$3)",
          [artifact.id, user.id, t.id],
        );
      }
      const last = await tx.one(
        "SELECT COALESCE(max(number),0) n FROM artifact_revisions WHERE artifact_id=$1",
        [artifact.id],
      );
      if (Number(body.baseVersion ?? 0) !== Number(last.n))
        fail(
          409,
          "Работа уже изменилась. Обновите страницу, чтобы сохранить следующую версию.",
        );
      number = Number(last.n) + 1;
      await tx.query(
        "INSERT INTO artifact_revisions(id,artifact_id,number,code,explanation,assistance,content_hash) VALUES($1,$2,$3,$4,$5,$6,$7)",
        [
          rid,
          artifact.id,
          number,
          code,
          explanation,
          assistance,
          digest(code + "\n" + explanation),
        ],
      );
      await tx.query(
        "INSERT INTO attempts(id,user_id,task_id,revision_id,hypothesis_id,task_version) VALUES($1,$2,$3,$4,$5,$6)",
        [id, user.id, t.id, rid, h.id, t.version],
      );
      await event(tx, user, "attempt.submitted", id, {
        revisionId: rid,
        taskVersion: t.version,
        assistance,
      },t.course_id);
    });
    json(201, { id, revisionId: rid, number, status: "submitted" });
    return true;
  }
  if (path === "/api/run" && method === "POST") {
    const a = await getAttempt(user, body.attemptId);
    json(200, await runAttempt(user, a));
    return true;
  }
  if (path === "/api/compare" && method === "POST") {
    requireRole(user, "student");
    const a = await getAttempt(user, body.attemptId);
    if (a.user_id !== user.id) fail(403, "Только собственная работа");
    const source = body.source || "reference";
    let code = a.reference_code;
    if (source === "llm") {
      const task = await getTask(user, a.task_id),
        generated = await generateCode({
          statement: task.statement,
          consent: body.consent === true,
        });
      if (generated.disabled) {
        json(200, generated);
        return true;
      }
      code = generated.code;
      await db.query(
        "INSERT INTO llm_interactions(id,user_id,task_id,provider,model,purpose,prompt_hash,response,consent) VALUES($1,$2,$3,$4,$5,$6,$7,$8,true)",
        [
          uuid(),
          user.id,
          a.task_id,
          generated.provider,
          generated.model,
          "comparison",
          digest(generated.prompt),
          code,
        ],
      );
    } else if(source==='fixture'){
      if(!a.ai_fixture)fail(400,'Для этой версии задания нет учебного ИИ-сценария');
      code=a.ai_fixture;
    } else if (source !== "reference")
      fail(400, "Неизвестный источник сравнения");
    const id = uuid();
    await db.transaction(async (tx) => {
      await tx.query(
        "INSERT INTO comparisons(id,user_id,revision_id,source,generated_code,conclusion) VALUES($1,$2,$3,$4,$5,$6)",
        [
          id,
          user.id,
          a.revision_id,
          source,
          code,
          text(body.conclusion, 20, 4000),
        ],
      );
      await event(tx, user, "comparison.saved", id, {
        revisionId: a.revision_id,
        source,
      },a.course_id);
    });
    json(201, {
      id,
      code,
      source,
      note:
        source === "reference"
          ? "Методический эталон. LLM не вызывалась."
          : source==='fixture'?'Авторский сценарий ошибки ИИ. Модель не вызывалась; код нужно проверить на тех же тестах.':"Ответ LLM требует проверки; оценка не выставлялась.",
    });
    return true;
  }
  if (path === "/api/journal" && method === "GET") {
    const target = url.searchParams.get("userId") || user.id,
      course = url.searchParams.get("courseId") || "algorithms";
    if (!(await studentAccess(user, target, course)))
      fail(403, "Нет доступа к журналу");
    json(200, {
      attempts: await db.rows(
        "SELECT a.*,t.title,r.number,r.code,r.explanation,r.assistance FROM attempts a JOIN tasks t ON t.id=a.task_id JOIN learning_units u ON u.id=t.unit_id JOIN artifact_revisions r ON r.id=a.revision_id WHERE a.user_id=$1 AND u.course_id=$2 ORDER BY a.created_at DESC",
        [target, course],
      ),
      runs: await db.rows(
        "SELECT c.* FROM code_runs c JOIN attempts a ON a.id=c.attempt_id JOIN tasks t ON t.id=a.task_id JOIN learning_units u ON u.id=t.unit_id WHERE a.user_id=$1 AND u.course_id=$2 ORDER BY c.created_at DESC",
        [target, course],
      ),
      reviews: await db.rows(
        "SELECT r.* FROM reviews r JOIN attempts a ON a.id=r.attempt_id JOIN tasks t ON t.id=a.task_id JOIN learning_units u ON u.id=t.unit_id WHERE a.user_id=$1 AND u.course_id=$2 ORDER BY r.created_at DESC",
        [target, course],
      ),
      grades: await db.rows(
        "SELECT * FROM grade_entries WHERE user_id=$1 AND course_id=$2 ORDER BY created_at DESC",
        [target, course],
      ),
      imported: await db.rows(
        "SELECT o.sheet,o.cell,o.raw_value,o.meaning,s.file_name FROM journal_observations o JOIN journal_sources s ON s.id=o.source_id WHERE o.user_id=$1 AND o.course_id=$2 ORDER BY o.sheet,o.cell",
        [target, course],
      ),
      hypotheses: await db.rows(
        "SELECT h.*,t.title FROM hypotheses h JOIN tasks t ON t.id=h.task_id JOIN learning_units u ON u.id=t.unit_id WHERE h.user_id=$1 AND u.course_id=$2 ORDER BY h.created_at DESC",
        [target, course],
      ),
      experiments: await db.rows(
        "SELECT s.* FROM simulator_runs s JOIN hypotheses h ON h.id=s.hypothesis_id JOIN tasks t ON t.id=h.task_id JOIN learning_units u ON u.id=t.unit_id WHERE s.user_id=$1 AND u.course_id=$2 ORDER BY s.created_at DESC",
        [target, course],
      ),
      comparisons: await db.rows(
        "SELECT c.*,r.number FROM comparisons c JOIN artifact_revisions r ON r.id=c.revision_id JOIN artifacts a ON a.id=r.artifact_id JOIN tasks t ON t.id=a.task_id JOIN learning_units u ON u.id=t.unit_id WHERE c.user_id=$1 AND u.course_id=$2 ORDER BY c.created_at DESC",
        [target, course],
      ),
      events: await db.rows(
        "SELECT kind,object_id,payload,created_at FROM learning_events WHERE user_id=$1 AND course_id=$2 ORDER BY created_at DESC LIMIT 100",
        [target, course],
      ),
      artifacts:await db.rows('SELECT r.* FROM research_artifacts r JOIN tasks t ON t.id=r.task_id JOIN learning_units u ON u.id=t.unit_id WHERE r.owner_id=$1 AND u.course_id=$2 ORDER BY r.created_at DESC',[target,course]),
      controls:await db.rows('SELECT o.* FROM control_outcomes o JOIN learning_units u ON u.id=o.unit_id WHERE o.user_id=$1 AND u.course_id=$2 ORDER BY o.created_at DESC',[target,course]),
    });
    return true;
  }
  if (path === "/api/trajectory" && method === "GET") {
    const target = url.searchParams.get("userId") || user.id;
    if (!(await studentAccess(user, target, "algorithms")))
      fail(403, "Нет доступа к траектории");
    const indicators = await db.rows(
        "SELECT code,title,target_level FROM indicators ORDER BY code",
      ),
      evidence = await db.rows("SELECT * FROM evidence WHERE user_id=$1", [
        target,
      ]);
    const states = indicators.map((i) => ({
      ...i,
      ...mastery(
        evidence.filter((e) => e.indicator_code === i.code),
        Date.now(),
        i.target_level,
      ),
    }));
    const id = uuid();
    await db.query(
      "INSERT INTO trajectory_decisions(id,user_id,model_version,recommendation,reason) VALUES($1,$2,$3,$4,$5)",
      [
        id,
        target,
        "beta-independent-v1",
        JSON.stringify(
          states.map((s) => ({
            code: s.code,
            ready: s.ready,
            lower95: s.lower95,
          })),
        ),
        "Порог нижней границы 0.8, независимые задачи, перенос и свежесть. Связи пилота находятся на методической проверке.",
      ],
    );
    json(200, {
      id,
      states,
      graphStatus: "draft",
      message:
        "Маршрут рекомендательный. Посещение и помощь LLM не подтверждают самостоятельное освоение. Перевод на курс и итоговые оценки утверждает преподаватель.",
    });
    return true;
  }
  if (path === "/api/appeals" && method === "POST") {
    requireRole(user, "student");
    const a = await getAttempt(user, body.attemptId);
    if (a.user_id !== user.id) fail(403, "Только собственная работа");
    const id = uuid();
    await db.query(
      "INSERT INTO appeals(id,user_id,attempt_id,message) VALUES($1,$2,$3,$4)",
      [id, user.id, a.id, text(body.message, 20, 4000)],
    );
    json(201, { id });
    return true;
  }
  return false;
}
