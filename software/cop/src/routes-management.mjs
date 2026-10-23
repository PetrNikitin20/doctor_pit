import { fail, text, uuid } from "./server.mjs";
import { requireRole, secret, hashPassword } from "./security.mjs";
import { exportSnapshot } from "../scripts/export-snapshot.mjs";
export async function handleManagement(c) {
  const { db, user, path, method, body, json, audit, getAttempt, getTask } = c;
  if (path === "/api/admin/backup" && method === "POST") {
    requireRole(user, "admin");
    await audit(db, user, "backup.export", null);
    const snapshot = await exportSnapshot(db);
    json(200, {
      ...snapshot,
      filename:
        "cop-private-" +
        new Date().toISOString().replace(/[:.]/g, "-") +
        ".sql",
      note: "Закрытая резервная копия. Содержит персональные данные и хеши паролей; активных сессий нет.",
    });
    return true;
  }
  if (path === "/api/staff/journal" && method === "GET") {
    requireRole(user, "teacher", "tutor", "expert");
    if (
      user.roles.includes("expert") &&
      !user.roles.some((r) => ["teacher", "tutor"].includes(r))
    ) {
      const attempts = await db.rows(
        "SELECT a.id,a.user_id,a.task_id,a.status,a.created_at,r.code,r.explanation,r.assistance,r.number,t.title,'Назначенный артефакт' AS student,'' AS group FROM expert_assignments e JOIN attempts a ON a.id=e.attempt_id JOIN artifact_revisions r ON r.id=a.revision_id JOIN tasks t ON t.id=a.task_id WHERE e.user_id=$1 AND e.expires_at>now()",
        [user.id],
      );
      json(200, { students: [], attempts });
      return true;
    }
    const students = await db.rows(
      "SELECT DISTINCT u.id,u.name,g.title AS group_title FROM users u JOIN group_members m ON m.user_id=u.id JOIN groups g ON g.id=m.group_id JOIN staff_scopes s ON s.group_id=g.id WHERE s.user_id=$1 AND s.course_id=$2 ORDER BY g.title,u.name",
      [user.id, "algorithms"],
    );
    const attempts = [];
    for (const s of students) {
      const rows = await db.rows(
        "SELECT a.id,a.user_id,a.task_id,a.status,a.created_at,r.code,r.explanation,r.assistance,r.number,t.title FROM attempts a JOIN artifact_revisions r ON r.id=a.revision_id JOIN tasks t ON t.id=a.task_id JOIN learning_units u ON u.id=t.unit_id WHERE a.user_id=$1 AND u.course_id=$2 ORDER BY a.created_at DESC",
        [s.id, "algorithms"],
      );
      attempts.push(
        ...rows.map((x) => ({ ...x, student: s.name, group: s.group_title })),
      );
    }
    json(200, { students, attempts });
    return true;
  }
  if (path === "/api/reviews" && method === "POST") {
    requireRole(user, "teacher");
    const a = await getAttempt(user, body.attemptId);
    if (user.id === a.user_id)
      fail(403, "Самооценка не является преподавательской проверкой");
    if (!Number.isFinite(body.score) || body.score < 0 || body.score > 100)
      fail(400, "Оценка должна быть от 0 до 100");
    const feedback = text(body.feedback, 20, 6000),
      id = uuid(),
      independent = body.independent === true && a.assistance === "independent";
    await db.transaction(async (tx) => {
      await tx.query(
        "INSERT INTO reviews(id,attempt_id,reviewer_id,score,independent,transfer,feedback) VALUES($1,$2,$3,$4,$5,$6,$7)",
        [
          id,
          a.id,
          user.id,
          body.score,
          independent,
          body.transfer === true,
          feedback,
        ],
      );
      for (const l of await tx.rows(
        "SELECT * FROM task_indicators WHERE task_id=$1",
        [a.task_id],
      ))
        await tx.query(
          "INSERT INTO evidence(id,user_id,indicator_code,review_id,task_id,level,success,independent,transfer,source_status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
          [
            uuid(),
            a.user_id,
            l.indicator_code,
            id,
            a.task_id,
            a.level,
            body.score / 100,
            independent,
            body.transfer === true,
            l.status === "approved" ? "approved_mapping" : "proposed_mapping",
          ],
        );
      await tx.query("UPDATE attempts SET status='reviewed' WHERE id=$1", [
        a.id,
      ]);
      await tx.query(
        "INSERT INTO grade_entries(id,user_id,course_id,review_id,score,author_id,note) VALUES($1,$2,$3,$4,$5,$6,$7)",
        [uuid(), a.user_id, a.course_id, id, body.score, user.id, feedback],
      );
      await tx.query(
        "INSERT INTO notifications(id,user_id,title) VALUES($1,$2,$3)",
        [uuid(), a.user_id, "Работа проверена преподавателем"],
      );
      await audit(tx, user, "review.created", a.id, {
        reviewId: id,
        score: body.score,
      });
    });
    json(201, { id });
    return true;
  }
  if (path === "/api/curriculum" && method === "GET") {
    requireRole(user, "methodist", "program_manager");
    json(200, {
      competencies: await db.rows("SELECT * FROM competencies ORDER BY code"),
      indicators: await db.rows("SELECT * FROM indicators ORDER BY code"),
      mappings: await db.rows("SELECT * FROM task_indicators ORDER BY task_id"),
      coverage: await db.rows(
        "SELECT i.code,i.title,count(t.task_id) FILTER(WHERE t.status='approved') AS approved_tasks FROM indicators i LEFT JOIN task_indicators t ON t.indicator_code=i.code GROUP BY i.code,i.title ORDER BY i.code",
      ),
    });
    return true;
  }
  if (path === "/api/mapping" && method === "POST") {
    requireRole(user, "methodist", "program_manager");
    await getTask(user, body.taskId);
    text(body.reason, 20, 2000);
    if (
      !(await db.one("SELECT code FROM indicators WHERE code=$1", [
        body.indicatorCode,
      ]))
    )
      fail(400, "Индикатор не найден");
    const status =
      user.roles.includes("program_manager") && body.approve === true
        ? "approved"
        : "proposed";
    await db.transaction(async (tx) => {
      await tx.query(
        "INSERT INTO task_indicators VALUES($1,$2,1,$3) ON CONFLICT(task_id,indicator_code) DO UPDATE SET status=$3",
        [body.taskId, body.indicatorCode, status],
      );
      await audit(tx, user, "mapping." + status, body.taskId, {
        indicator: body.indicatorCode,
        reason: body.reason,
      });
    });
    json(200, {
      status,
      note: "Изменение действует на последующие проверки; история свидетельств сохранена.",
    });
    return true;
  }
  if (path === "/api/analytics" && method === "GET") {
    requireRole(user, "program_manager", "researcher", "admin");
    const counts = {};
    for (const table of [
      "users",
      "groups",
      "courses",
      "tasks",
      "attempts",
      "hypotheses",
      "simulator_runs",
      "comparisons",
      "reviews",
      "journal_observations",
    ])
      counts[table] = Number(
        (await db.one("SELECT count(*) n FROM " + table)).n,
      );
    json(200, {
      counts,
      byStatus: await db.rows(
        "SELECT status,count(*) n FROM code_runs GROUP BY status",
      ),
      privacy:
        "Общие количества: без ФИО, логинов, кода и индивидуальных оценок.",
      researchExport:
        "Индивидуальные исследовательские выгрузки в этом пилоте не включены.",
    });
    return true;
  }
  if (path === "/api/admin/users" && method === "GET") {
    requireRole(user, "admin");
    json(200, {
      users: await db.rows(
        "SELECT u.id,u.login,u.name,u.active,u.force_reset,u.version,COALESCE(string_agg(r.role_code,','),'') roles FROM users u LEFT JOIN user_roles r ON r.user_id=u.id GROUP BY u.id ORDER BY u.login LIMIT 500",
      ),
      groups: await db.rows("SELECT * FROM groups ORDER BY title"),
    });
    return true;
  }
  if (path === "/api/admin/scope" && method === "POST") {
    requireRole(user, "admin");
    if (!["teacher", "tutor"].includes(body.role))
      fail(
        400,
        "Учебная область назначается преподавателю и тьютору; эксперт получает отдельный артефакт",
      );
    if (
      !(await db.one(
        "SELECT 1 FROM user_roles WHERE user_id=$1 AND role_code=$2",
        [body.userId, body.role],
      ))
    )
      fail(400, "Сначала назначьте роль");
    await db.transaction(async (tx) => {
      await tx.query(
        "INSERT INTO staff_scopes VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING",
        [body.userId, body.courseId, body.groupId, body.role],
      );
      await audit(tx, user, "scope.granted", body.userId, {
        course: body.courseId,
        group: body.groupId,
        role: body.role,
      });
    });
    json(200, { ok: true });
    return true;
  }
  if (path === "/api/admin/expert-assignment" && method === "POST") {
    requireRole(user, "admin");
    const hours = Number(body.hours);
    if (!Number.isInteger(hours) || hours < 1 || hours > 168)
      fail(400, "Срок: от 1 до 168 часов");
    if (
      !(await db.one(
        "SELECT 1 FROM user_roles WHERE user_id=$1 AND role_code='expert'",
        [body.userId],
      ))
    )
      fail(400, "Эксперт не найден");
    await db.transaction(async (tx) => {
      await tx.query(
        "INSERT INTO expert_assignments VALUES($1,$2,now()+($3*interval '1 hour'),$4) ON CONFLICT(user_id,attempt_id) DO UPDATE SET expires_at=excluded.expires_at,assigned_by=excluded.assigned_by",
        [body.userId, body.attemptId, hours, user.id],
      );
      await audit(tx, user, "expert.assigned", body.attemptId, {
        expert: body.userId,
        hours,
      });
    });
    json(200, { ok: true });
    return true;
  }
  if (path === "/api/admin/activate" && method === "POST") {
    requireRole(user, "admin");
    const name = text(body.name, 5, 160);
    if (!(await db.one("SELECT id FROM users WHERE id=$1", [body.userId])))
      fail(404, "Пользователь не найден");
    await db.transaction(async (tx) => {
      await tx.query(
        "UPDATE users SET name=$2,active=true,version=version+1 WHERE id=$1",
        [body.userId, name],
      );
      await audit(tx, user, "account.activated", body.userId);
    });
    json(200, { ok: true });
    return true;
  }
  if (path === "/api/admin/reset" && method === "POST") {
    requireRole(user, "admin");
    const password = secret(),
      hash = await hashPassword(password);
    if (!(await db.one("SELECT id FROM users WHERE id=$1", [body.userId])))
      fail(404, "Пользователь не найден");
    await db.transaction(async (tx) => {
      await tx.query(
        "UPDATE users SET password_hash=$2,force_reset=true,version=version+1 WHERE id=$1",
        [body.userId, hash],
      );
      await tx.query("DELETE FROM sessions WHERE user_id=$1", [body.userId]);
      await audit(tx, user, "password.reset", body.userId);
    });
    json(200, { temporaryPassword: password });
    return true;
  }
  if (path === "/api/admin/audit" && method === "GET") {
    requireRole(user, "admin");
    json(200, {
      rows: await db.rows(
        "SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 100",
      ),
    });
    return true;
  }
  return false;
}
