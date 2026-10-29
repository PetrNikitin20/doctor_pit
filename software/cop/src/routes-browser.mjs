import { isDeepStrictEqual } from "node:util";
import { fail, uuid } from "./server.mjs";
import { requireRole } from "./security.mjs";
export async function handleBrowser(c) {
  const { db, user, path, method, body, json, event, getAttempt } = c;
  if (path === "/api/browser-run/start" && method === "POST") {
    requireRole(user, "student");
    const a = await getAttempt(user, body.attemptId);
    if (a.user_id !== user.id) fail(403, "Только собственная работа");
    let code = a.code,
      comparisonId = null;
    if (body.comparisonId) {
      const comp = await db.one(
        "SELECT * FROM comparisons WHERE id=$1 AND user_id=$2 AND revision_id=$3",
        [body.comparisonId, user.id, a.revision_id],
      );
      if (!comp) fail(404, "Сравнение не найдено");
      code = comp.generated_code;
      comparisonId = comp.id;
    }
    const id = uuid();
    await db.query(
      "INSERT INTO code_runs(id,attempt_id,status,result) VALUES($1,$2,'running',$3)",
      [
        id,
        a.id,
        JSON.stringify({ source: "browser_unverified", comparisonId }),
      ],
    );
    json(201, {
      id,
      code,
      inputs: a.tests.map((t) => t.input),
      runtime: "Pyodide 314.0.7",
      note: "Предварительная проверка на устройстве студента. Результат не является официальной оценкой.",
    });
    return true;
  }
  if (path === "/api/browser-run/finish" && method === "POST") {
    requireRole(user, "student");
    const run = await db.one("SELECT * FROM code_runs WHERE id=$1", [
      body.runId,
    ]);
    if (!run) fail(404, "Запуск не найден");
    const a = await getAttempt(user, run.attempt_id);
    if (a.user_id !== user.id) fail(403, "Только собственная работа");
    if (run.status !== "running" || run.result.source !== "browser_unverified")
      fail(409, "Запуск уже завершён или имеет другой источник");
    let result = {
        source: "browser_unverified",
        comparisonId: run.result.comparisonId,
        grade: false,
      },
      status = "error";
    if (body.error) {
      result.message = String(body.error).slice(0, 200);
    } else {
      if (
        !Array.isArray(body.outputs) ||
        body.outputs.length !== a.tests.length
      )
        fail(400, "Неверное количество результатов");
      result.cases = body.outputs.map((item, i) => {
        const expected = a.tests[i].expected,
          value = item?.value;
        const equal =
          typeof value === "number" && typeof expected === "number"
            ? Number.isFinite(value) &&
              Math.abs(value - expected) <=
                1e-9 * Math.max(1, Math.abs(expected))
            : isDeepStrictEqual(value, expected);
        return {
          passed: !item?.error && equal,
          error: item?.error ? String(item.error).slice(0, 80) : null,
        };
      });
      status = result.cases.every((x) => x.passed) ? "passed" : "failed";
    }
    await db.transaction(async (tx) => {
      await tx.query(
        "UPDATE code_runs SET status=$2,result=$3,finished_at=now() WHERE id=$1",
        [run.id, status, JSON.stringify(result)],
      );
      await event(tx, user, "code.browser_checked", a.id, {
        runId: run.id,
        status,
        source: result.source,
        comparisonId: result.comparisonId,
      },a.course_id);
    });
    json(200, {
      id: run.id,
      status,
      ...result,
      note: "Проверка в браузере: её можно подделать на клиенте, поэтому она не повышает компетенцию и не выставляет оценку.",
    });
    return true;
  }
  return false;
}
