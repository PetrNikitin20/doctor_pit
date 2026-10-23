import http from "node:http";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { openDb, migrate } from "./db.mjs";
import {
  digest,
  secret,
  hashPassword,
  verifyPassword,
  validPassword,
  cookieToken,
  publicUser,
  requireRole,
} from "./security.mjs";
import { mastery, simulate } from "./model.mjs";
import { generateCode } from "./llm.mjs";
import { handleLearning } from "./routes-learning.mjs";
import { handleManagement } from "./routes-management.mjs";
import { handleBrowser } from "./routes-browser.mjs";
export const fail = (status, message) => {
  throw Object.assign(new Error(message), { status });
};
export const text = (v, min = 1, max = 12000) => {
  if (typeof v !== "string" || v.trim().length < min || v.length > max)
    fail(400, `Поле должно содержать от ${min} до ${max} символов`);
  return v.trim();
};
export const uuid = () => randomUUID();
export function createApp(
  db,
  {
    origin = process.env.APP_ORIGIN || "http://127.0.0.1:3000",
    production = process.env.NODE_ENV === "production",
    runnerUrl = process.env.RUNNER_URL,
    runnerToken = process.env.RUNNER_TOKEN,
  } = {},
) {
  const cookieName = production
    ? "cop_session"
    : "cop_session_" + (new URL(origin).port || "80");
  const json = (res, status, value, headers = {}) => {
    res.writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers,
    });
    res.end(JSON.stringify(value));
  };
  const event = async (tx, user, kind, object, payload = {}) =>
    tx.query(
      "INSERT INTO learning_events(id,user_id,course_id,kind,object_id,payload) VALUES($1,$2,$3,$4,$5,$6)",
      [uuid(), user.id, "algorithms", kind, object, JSON.stringify(payload)],
    );
  const audit = async (tx, user, action, object, detail = {}) =>
    tx.query(
      "INSERT INTO audit_log(id,actor_id,action,object_id,detail) VALUES($1,$2,$3,$4,$5)",
      [uuid(), user.id, action, object, JSON.stringify(detail)],
    );
  const courseAccess = async (user, course) => {
    if (
      user.roles.some((x) =>
        ["admin", "methodist", "program_manager"].includes(x),
      )
    )
      return true;
    if (
      user.roles.includes("student") &&
      (await db.one(
        "SELECT 1 FROM enrollments WHERE user_id=$1 AND course_id=$2",
        [user.id, course],
      ))
    )
      return true;
    return !!(await db.one(
      "SELECT 1 FROM staff_scopes WHERE user_id=$1 AND course_id=$2",
      [user.id, course],
    ));
  };
  const studentAccess = async (user, target, course) => {
    if (user.id === target && (await courseAccess(user, course))) return true;
    return !!(await db.one(
      "SELECT 1 FROM staff_scopes s JOIN group_members g ON s.group_id=g.group_id WHERE s.user_id=$1 AND g.user_id=$2 AND s.course_id=$3 AND s.role_code IN ('teacher','tutor')",
      [user.id, target, course],
    ));
  };
  const getTask = async (user, id) => {
    const task = await db.one(
      "SELECT t.*,u.course_id FROM tasks t JOIN learning_units u ON u.id=t.unit_id WHERE t.id=$1 AND t.published=true",
      [id],
    );
    if (!task) fail(404, "Задание не найдено");
    if (!(await courseAccess(user, task.course_id)))
      fail(403, "Нет доступа к дисциплине");
    return task;
  };
  const getAttempt = async (user, id) => {
    const a = await db.one(
      "SELECT a.*,r.code,r.explanation,r.assistance,v.tests,v.reference_code,t.unit_id,t.level,u.course_id FROM attempts a JOIN artifact_revisions r ON r.id=a.revision_id JOIN tasks t ON t.id=a.task_id JOIN task_versions v ON v.task_id=a.task_id AND v.version=a.task_version JOIN learning_units u ON u.id=t.unit_id WHERE a.id=$1",
      [id],
    );
    if (!a) fail(404, "Работа не найдена");
    const assigned =
      user.roles.includes("expert") &&
      (await db.one(
        "SELECT 1 FROM expert_assignments WHERE user_id=$1 AND attempt_id=$2 AND expires_at>now()",
        [user.id, id],
      ));
    if (!assigned && !(await studentAccess(user, a.user_id, a.course_id)))
      fail(403, "Нет доступа к работе");
    return a;
  };
  async function runAttempt(user, a) {
    if (a.user_id !== user.id) requireRole(user, "teacher");
    const id = uuid();
    await db.query(
      "INSERT INTO code_runs(id,attempt_id,status) VALUES($1,$2,'queued')",
      [id, a.id],
    );
    if (!runnerUrl) {
      await db.query(
        "UPDATE code_runs SET status='unavailable',result=$2,finished_at=now() WHERE id=$1",
        [
          id,
          JSON.stringify({
            message:
              "Изолированный Python-исполнитель не подключён. Работа сохранена и доступна преподавателю.",
          }),
        ],
      );
      return { id, status: "unavailable" };
    }
    await db.query("UPDATE code_runs SET status='running' WHERE id=$1", [id]);
    try {
      const response = await fetch(runnerUrl + "/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + runnerToken,
        },
        body: JSON.stringify({ code: a.code, tests: a.tests }),
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error("Исполнитель отклонил запрос");
      const result = await response.json();
      if (
        !Array.isArray(result.cases) ||
        result.cases.length !== a.tests.length
      )
        throw new Error("Неверный ответ исполнителя");
      const status = result.cases.every((x) => x.passed) ? "passed" : "failed";
      await db.query(
        "UPDATE code_runs SET status=$2,result=$3,finished_at=now() WHERE id=$1",
        [id, status, JSON.stringify(result)],
      );
      await event(db, user, "code.checked", a.id, { runId: id, status });
      return { id, status, ...result };
    } catch {
      await db.query(
        "UPDATE code_runs SET status='error',result=$2,finished_at=now() WHERE id=$1",
        [
          id,
          JSON.stringify({
            message:
              "Исполнитель недоступен или превысил лимит. Повторите проверку позднее.",
          }),
        ],
      );
      return { id, status: "error" };
    }
  }
  return http.createServer(async (req, res) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "same-origin");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; worker-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
    );
    if (production)
      res.setHeader("Strict-Transport-Security", "max-age=31536000");
    try {
      const url = new URL(req.url, origin),
        path = url.pathname,
        method = req.method;
      if (path === "/healthz") {
        await db.query("SELECT 1");
        return json(res, 200, { ok: true });
      }
      if (!path.startsWith("/api/")) {
        if (method !== "GET") fail(405, "Метод не поддерживается");
        const vendorFiles = [
          "pyodide.mjs",
          "pyodide.asm.mjs",
          "pyodide.asm.wasm",
          "python_stdlib.zip",
          "pyodide-lock.json",
        ];
        if (path.startsWith("/vendor/pyodide/")) {
          const name = path.slice("/vendor/pyodide/".length);
          if (!vendorFiles.includes(name)) fail(404, "Ресурс не найден");
          res.writeHead(200, {
            "Content-Type": name.endsWith(".mjs")
              ? "text/javascript"
              : name.endsWith(".wasm")
                ? "application/wasm"
                : name.endsWith(".json")
                  ? "application/json"
                  : "application/zip",
            "Cache-Control": "public, max-age=3600",
          });
          return res.end(
            await readFile(
              new URL("../node_modules/pyodide/" + name, import.meta.url),
            ),
          );
        }
        const files = {
          "/": "index.html",
          "/app.js": "app.js",
          "/style.css": "style.css",
          "/python-worker.js": "python-worker.js",
        };
        const file = files[path];
        if (!file) fail(404, "Страница не найдена");
        if (file === "python-worker.js")
          res.setHeader(
            "Content-Security-Policy",
            `default-src 'none'; script-src ${origin}/vendor/pyodide/ 'wasm-unsafe-eval'; connect-src ${origin}/vendor/pyodide/; worker-src 'none'; object-src 'none'`,
          );
        res.writeHead(200, {
          "Content-Type": file.endsWith(".js")
            ? "text/javascript; charset=utf-8"
            : file.endsWith(".css")
              ? "text/css; charset=utf-8"
              : "text/html; charset=utf-8",
          "Cache-Control": "no-cache",
        });
        return res.end(
          await readFile(new URL("../public/" + file, import.meta.url)),
        );
      }
      if (!["GET", "POST"].includes(method))
        fail(405, "Метод не поддерживается");
      let body = {};
      if (method === "POST") {
        if (req.headers.origin !== origin)
          fail(403, "Недопустимый источник запроса");
        if (!String(req.headers["content-type"]).startsWith("application/json"))
          fail(415, "Требуется JSON");
        let size = 0,
          chunks = [];
        for await (const chunk of req) {
          size += chunk.length;
          if (size > 65536) fail(413, "Слишком большой запрос");
          chunks.push(chunk);
        }
        try {
          body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
        } catch {
          fail(400, "Неверный JSON");
        }
      }
      if (path === "/api/login" && method === "POST") {
        const login = text(body.login, 1, 120).toLowerCase(),
          password = text(body.password, 1, 200);
        const key = digest(login + ":" + req.socket.remoteAddress),
          limit = await db.one("SELECT * FROM login_limits WHERE key_hash=$1", [
            key,
          ]);
        if (
          limit &&
          limit.failures >= 8 &&
          new Date(limit.until_at) > new Date()
        )
          fail(429, "Слишком много попыток. Повторите через 15 минут.");
        const found = await db.one(
          "SELECT * FROM users WHERE login=$1 AND active=true",
          [login],
        );
        if (!found || !(await verifyPassword(password, found.password_hash))) {
          await db.query(
            "INSERT INTO login_limits VALUES($1,1,now()+interval '15 minutes') ON CONFLICT(key_hash) DO UPDATE SET failures=CASE WHEN login_limits.until_at<now() THEN 1 ELSE login_limits.failures+1 END,until_at=now()+interval '15 minutes'",
            [key],
          );
          fail(401, "Неверный логин или пароль");
        }
        const token = secret();
        await db.transaction(async (tx) => {
          await tx.query("DELETE FROM login_limits WHERE key_hash=$1", [key]);
          await tx.query(
            "INSERT INTO sessions VALUES($1,$2,now()+interval '8 hours')",
            [digest(token), found.id],
          );
          await audit(tx, found, "session.login", found.id);
        });
        found.roles = (
          await db.rows("SELECT role_code FROM user_roles WHERE user_id=$1", [
            found.id,
          ])
        ).map((x) => x.role_code);
        return json(
          res,
          200,
          { user: publicUser(found) },
          {
            "Set-Cookie": `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800${production ? "; Secure" : ""}`,
          },
        );
      }
      const token = cookieToken(req, cookieName);
      const user =
        token &&
        (await db.one(
          "SELECT u.* FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token_hash=$1 AND s.expires_at>now() AND u.active=true",
          [digest(token)],
        ));
      if (!user) fail(401, "Войдите в систему");
      user.roles = (
        await db.rows("SELECT role_code FROM user_roles WHERE user_id=$1", [
          user.id,
        ])
      ).map((x) => x.role_code);
      if (path === "/api/logout" && method === "POST") {
        await db.query("DELETE FROM sessions WHERE token_hash=$1", [
          digest(token),
        ]);
        return json(
          res,
          200,
          { ok: true },
          {
            "Set-Cookie":
              cookieName +
              "=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0" +
              (production ? "; Secure" : ""),
          },
        );
      }
      if (path === "/api/me" && method === "GET")
        return json(res, 200, { user: publicUser(user) });
      if (path === "/api/password" && method === "POST") {
        if (!validPassword(body.password))
          fail(400, "Новый пароль: от 12 до 200 символов");
        if (
          !(await verifyPassword(
            text(body.current, 1, 200),
            user.password_hash,
          ))
        )
          fail(400, "Текущий пароль неверен");
        if (await verifyPassword(body.password, user.password_hash))
          fail(400, "Выберите новый пароль");
        const hash = await hashPassword(body.password);
        await db.transaction(async (tx) => {
          await tx.query(
            "UPDATE users SET password_hash=$2,force_reset=false,version=version+1 WHERE id=$1",
            [user.id, hash],
          );
          await tx.query("DELETE FROM sessions WHERE user_id=$1", [user.id]);
          await audit(tx, user, "password.changed", user.id);
        });
        return json(
          res,
          200,
          { ok: true, loginRequired: true },
          {
            "Set-Cookie":
              cookieName +
              "=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0" +
              (production ? "; Secure" : ""),
          },
        );
      }
      if (user.force_reset) fail(428, "Сначала смените временный пароль");
      const ctx = {
        db,
        user,
        url,
        path,
        method,
        body,
        json: (status, value) => json(res, status, value),
        event,
        audit,
        courseAccess,
        studentAccess,
        getTask,
        getAttempt,
        runAttempt,
      };
      if (await handleLearning(ctx)) return;
      if (await handleBrowser(ctx)) return;
      if (await handleManagement(ctx)) return;
      fail(404, "Метод API не найден");
    } catch (e) {
      const status = e.status || 500;
      if (status === 500) console.error("Request failed", e.code || e.name);
      if (!res.headersSent)
        json(res, status, {
          error:
            status === 500
              ? "Ошибка сервера. Проверьте состояние операции в журнале."
              : e.message,
        });
      else res.end();
    }
  });
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const db = await openDb();
  await migrate(db);
  const server = createApp(db);
  const port = Number(process.env.PORT || 3000),
    host = process.env.HOST || "127.0.0.1";
  server.listen(port, host, () => console.log(`ЦОП: http://${host}:${port}`));
  const stop = () =>
    server.close(async () => {
      await db.close();
      process.exit(0);
    });
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
}
