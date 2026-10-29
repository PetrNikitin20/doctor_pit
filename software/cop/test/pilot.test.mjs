import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { openDb, migrate } from "../src/db.mjs";
import { seed } from "../scripts/seed.mjs";
import { createApp } from "../src/server.mjs";
import { mastery, betaQuantile, simulate } from "../src/model.mjs";
import { hashPassword } from "../src/security.mjs";
import { importPrivate } from "../scripts/import-private.mjs";
let db, server, origin, attemptId, hypothesisId;
const cookies = {};
const password = "Test-Only-Strong-2026!";
async function call(role, path, body, extra = {}) {
  const r = await fetch(origin + "/api/" + path, {
    method: body ? "POST" : "GET",
    headers: {
      ...(body ? { "Content-Type": "application/json", Origin: origin } : {}),
      ...(cookies[role] ? { Cookie: cookies[role] } : {}),
      ...extra,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let d = await r.json();
  return { status: r.status, data: d, headers: r.headers };
}
async function login(role) {
  const r = await call("", "login", { login: "demo-" + role, password });
  assert.equal(r.status, 200);
  cookies[role] = r.headers.get("set-cookie").split(";")[0];
  return r;
}
before(async () => {
  db = await openDb({ memory: true });
  await seed(db, { demo: true, demoPassword: password });
  server = createApp(db, { origin: "http://127.0.0.1:39147" });
  await new Promise((r) => server.listen(39147, "127.0.0.1", r));
  origin = "http://127.0.0.1:39147";
});
after(async () => {
  await new Promise((r) => server.close(r));
  await db.close();
});
test("migrations and versioned content are idempotent", async () => {
  await seed(db);
  assert.equal(Number((await db.one("SELECT count(*) n FROM tasks")).n), 216);
  assert.equal(
    Number((await db.one("SELECT count(*) n FROM indicators")).n),
    116,
  );
});
test("anonymous access is rejected", async () =>
  assert.equal((await call("", "course")).status, 401));
test("login cookies are HttpOnly and SameSite; no password hash response", async () => {
  const r = await login("student");
  assert.match(r.headers.get("set-cookie"), /HttpOnly; SameSite=Strict/);
  assert(!JSON.stringify(r.data).includes("password_hash"));
});
test("role separation and server-side CSRF check", async () => {
  assert.equal((await call("student", "admin/users")).status, 403);
  assert.equal((await call("student", "analytics")).status, 403);
  assert.equal(
    (
      await call(
        "student",
        "hypotheses",
        {
          taskId: "alg-01-l1",
          prediction: "test prediction",
          rationale: "test rationale",
        },
        { Origin: "https://evil.invalid" },
      )
    ).status,
    403,
  );
});
test("course catalog hides expected results and reference code", async () => {
  const r = await call("student", "course?id=algorithms");
  assert.equal(r.status, 200);
  assert.equal(r.data.tasks.length, 48);
  assert(!JSON.stringify(r.data).includes("reference_code"));
  assert(!JSON.stringify(r.data).includes("expected"));
});
test("a hypothesis must precede submission", async () => {
  assert.equal(
    (
      await call("student", "attempts", {
        taskId: "alg-01-l1",
        hypothesisId: "missing",
        code: "def solve(data): return 0",
        explanation: "This is a sufficiently long explanation",
        assistance: "independent",
      })
    ).status,
    400,
  );
  const r = await call("student", "hypotheses", {
    taskId: "alg-01-l1",
    prediction: "The sum of an empty list is zero.",
    rationale: "The neutral element of addition is zero.",
  });
  assert.equal(r.status, 201);
  hypothesisId = r.data.id;
});
test("simulation records reproducible measured operations", async () => {
  const r = await call("student", "simulate", {
    hypothesisId,
    parameters: { algorithm: "binary", n: 32, target: 31, seed: 42 },
    conclusion: "Compare the operation count against logarithmic growth.",
  });
  assert.equal(r.status, 201);
  assert(r.data.comparisons <= 6);
  assert.deepEqual(
    simulate({ n: 32, target: 31, seed: 42 }),
    simulate({ n: 32, target: 31, seed: 42 }),
  );
  assert.equal(
    (
      await call("student", "simulate", {
        hypothesisId,
        parameters: { n: 999999 },
        conclusion: "Invalid size must be rejected.",
      })
    ).status,
    400,
  );
});
test("submission saves immutable code and conflict rolls back", async () => {
  const payload = {
    taskId: "alg-01-l1",
    hypothesisId,
    code: "def solve(data):\n    return sum(data)",
    explanation: "A loop or sum performs linear work; the empty sum is zero.",
    assistance: "independent",
    baseVersion: 0,
  };
  let r = await call("student", "attempts", payload);
  assert.equal(r.status, 201);
  attemptId = r.data.id;
  assert.equal(r.data.number, 1);
  r = await call("student", "attempts", payload);
  assert.equal(r.status, 409);
  assert.equal(
    Number((await db.one("SELECT count(*) n FROM artifact_revisions")).n),
    1,
  );
});
test("unconfigured runner gives unavailable, never a fabricated success", async () => {
  const r = await call("student", "run", { attemptId });
  assert.equal(r.data.status, "unavailable");
  assert.equal(
    (await db.one("SELECT status FROM code_runs")).status,
    "unavailable",
  );
});
test("reference comparison has provenance; disabled LLM calls no provider", async () => {
  const r = await call("student", "compare", {
    attemptId,
    source: "reference",
    conclusion: "Compare the handling of empty input and complexity.",
  });
  assert.equal(r.status, 201);
  assert.equal(r.data.source, "reference");
  assert.match(r.data.code, /sum/);
  const llm = await call("student", "compare", {
    attemptId,
    source: "llm",
    consent: false,
    conclusion: "Request a generated solution for comparison.",
  });
  assert.equal(llm.data.disabled, true);
  assert.equal(
    Number((await db.one("SELECT count(*) n FROM llm_interactions")).n),
    0,
  );
});
test("students cannot read another student journal or assign own grade", async () => {
  assert.equal(
    (await call("student", "journal?userId=demo-teacher")).status,
    403,
  );
  assert.equal(
    (
      await call("student", "reviews", {
        attemptId,
        score: 100,
        feedback: "A forged review must not be accepted.",
      })
    ).status,
    403,
  );
});
test("teacher sees assigned group; tutor cannot grade", async () => {
  await login("teacher");
  await login("tutor");
  const queue = await call("teacher", "staff/journal");
  assert.equal(queue.data.attempts.length, 1);
  assert.equal(
    (
      await call("tutor", "reviews", {
        attemptId,
        score: 100,
        feedback: "A tutor is not an examiner in this pilot.",
      })
    ).status,
    403,
  );
});
test("teacher review atomically writes feedback, grade, evidence and audit", async () => {
  const r = await call("teacher", "reviews", {
    attemptId,
    score: 90,
    feedback:
      "Correct linear solution; explain overflow assumptions for other languages.",
    independent: true,
    transfer: true,
  });
  assert.equal(r.status, 201);
  assert.equal(
    Number((await db.one("SELECT count(*) n FROM grade_entries")).n),
    1,
  );
  assert.equal(
    (await db.one("SELECT source_status FROM evidence")).source_status,
    "proposed_mapping",
  );
  const journal = await call("student", "journal");
  assert.equal(journal.data.reviews.length, 1);
  assert.equal(journal.data.attempts.length, 1);
  assert(journal.data.events.length >= 4);
  assert.equal(journal.data.hypotheses.length, 1);
  assert.equal(journal.data.experiments.length, 1);
  assert.equal(journal.data.comparisons.length, 1);
});
test("unscoped teacher cannot inspect the pilot group", async () => {
  await db.query("DELETE FROM staff_scopes WHERE user_id='demo-teacher'");
  assert.equal(
    (await call("teacher", "journal?userId=demo-student")).status,
    403,
  );
  assert.equal(
    (await call("teacher", "staff/journal")).data.students.length,
    0,
  );
});
test("methodist proposes; program manager approves; old evidence stays unchanged", async () => {
  await login("methodist");
  await login("program_manager");
  let r = await call("methodist", "mapping", {
    taskId: "alg-01-l1",
    indicatorCode: "SS-1.1",
    reason: "Pedagogical review of this task and indicator.",
    approve: true,
  });
  assert.equal(r.data.status, "proposed");
  r = await call("program_manager", "mapping", {
    taskId: "alg-01-l1",
    indicatorCode: "SS-1.1",
    reason: "Approved for future reviews after content inspection.",
    approve: true,
  });
  assert.equal(r.data.status, "approved");
  assert.equal(
    (await db.one("SELECT source_status FROM evidence")).source_status,
    "proposed_mapping",
  );
});
test("Bayesian criterion requires independent approved fresh transfer evidence", () => {
  assert(Math.abs(betaQuantile(0.05, 1, 1) - 0.05) < 1e-9);
  assert.equal(mastery([]).ready, false);
  const item = {
    task_id: "a",
    independent: true,
    transfer: true,
    success: 1,
    source_status: "approved_mapping",
    created_at: new Date().toISOString(),
  };
  assert.equal(mastery(Array(40).fill(item)).independentTasks, 1);
  const many = Array.from({ length: 20 }, (_, i) => ({
    ...item,
    task_id: "t" + i,
  }));
  assert.equal(mastery(many).ready, true);
  assert.equal(
    mastery(many.map((x) => ({ ...x, transfer: false }))).ready,
    false,
  );
  assert.equal(
    mastery(many.map((x) => ({ ...x, created_at: "2020-01-01" }))).ready,
    false,
  );
});
test("a basic task cannot certify an advanced target", () => {
  const items = Array.from({ length: 30 }, (_, i) => ({
    task_id: "t" + i,
    level: 1,
    independent: true,
    transfer: true,
    success: 1,
    source_status: "approved_mapping",
    created_at: new Date().toISOString(),
  }));
  assert.equal(mastery(items, Date.now(), 3).independentTasks, 0);
});
test("expert has only an explicitly assigned expiring artifact", async () => {
  await login("expert");
  assert.equal((await call("expert", "staff/journal")).data.attempts.length, 0);
  assert.equal(
    (await call("expert", "journal?userId=demo-student")).status,
    403,
  );
  await db.query(
    "INSERT INTO expert_assignments VALUES('demo-expert',$1,now()+interval '1 hour','demo-admin')",
    [attemptId],
  );
  assert.equal((await call("expert", "staff/journal")).data.attempts.length, 1);
  await db.query(
    "UPDATE expert_assignments SET expires_at=now()-interval '1 hour'",
  );
  assert.equal((await call("expert", "staff/journal")).data.attempts.length, 0);
});
test("an older attempt retains its original task tests after content update", async () => {
  const before = await db.one(
    "SELECT v.tests FROM attempts a JOIN task_versions v ON v.task_id=a.task_id AND v.version=a.task_version WHERE a.id=$1",
    [attemptId],
  );
  await db.query(
    "UPDATE tasks SET tests='[]',version=version+1 WHERE id='alg-01-l1'",
  );
  const after = await db.one(
    "SELECT v.tests FROM attempts a JOIN task_versions v ON v.task_id=a.task_id AND v.version=a.task_version WHERE a.id=$1",
    [attemptId],
  );
  assert.deepEqual(after.tests, before.tests);
  await seed(db);
});
test("research response excludes identity, source marks and code", async () => {
  await login("researcher");
  const r = await call("researcher", "analytics");
  assert.equal(r.status, 200);
  assert(!JSON.stringify(r.data).includes("demo-student"));
  assert(!JSON.stringify(r.data).includes("return sum"));
  assert.equal(
    (await call("researcher", "journal?userId=demo-student")).status,
    403,
  );
});
test("forced password reset restricts access and revokes prior sessions", async () => {
  const h = await hashPassword(password);
  await db.query(
    "INSERT INTO users(id,login,name,password_hash) VALUES('reset-user','reset-user','Synthetic reset user',$1)",
    [h],
  );
  await db.query("INSERT INTO user_roles VALUES('reset-user','student')");
  const r = await call("", "login", { login: "reset-user", password });
  cookies.reset = r.headers.get("set-cookie").split(";")[0];
  assert.equal((await call("reset", "home")).status, 428);
  assert.equal(
    (
      await call("reset", "password", {
        current: password,
        password: "New-Strong-Password-2026!",
      })
    ).status,
    200,
  );
  assert.equal((await call("reset", "me")).status, 401);
});
test("private import is repeatable and preserves raw source provenance", async () => {
  const p = {
    groups: [
      {
        id: "test-pm26",
        title: "Synthetic PM26",
        year: 1,
        source: "test.xlsx",
      },
    ],
    users: [
      {
        id: "synthetic-import",
        login: "synthetic-import",
        name: "Synthetic import student",
        roles: ["student"],
        group_id: "test-pm26",
        cohort: 2026,
      },
    ],
    sources: [
      { id: "src-test", file_name: "test.xlsx", sha256: "synthetic-sha" },
    ],
    observations: [
      {
        id: "obs-test",
        source_id: "src-test",
        user_id: "synthetic-import",
        group_id: "test-pm26",
        course_id: "intro-ai",
        sheet: "Sheet",
        cell: "E6",
        raw_value: "н",
        meaning: "unclassified",
      },
    ],
  };
  const first = await importPrivate(db, p),
    second = await importPrivate(db, p);
  assert(first.length >= 1);
  assert.equal(second.length, 0);
  assert.equal(
    Number((await db.one("SELECT count(*) n FROM journal_observations")).n),
    1,
  );
  assert.equal(
    (
      await db.one(
        "SELECT course_id FROM journal_observations WHERE id='obs-test'",
      )
    ).course_id,
    "intro-ai",
  );
});
test("browser Python jobs compare outputs on server without automatic grades", async () => {
  const r = await call("student", "browser-run/start", { attemptId });
  assert.equal(r.status, 201);
  assert(!JSON.stringify(r.data).includes("expected"));
  const result = await call("student", "browser-run/finish", {
    runId: r.data.id,
    outputs: r.data.inputs.map((input) => ({
      value: input.reduce((a, b) => a + b, 0),
      error: null,
    })),
  });
  assert.equal(result.data.status, "passed");
  assert.equal(result.data.source, "browser_unverified");
  assert.equal(result.data.grade, false);
  assert.equal(
    (
      await call("student", "browser-run/finish", {
        runId: r.data.id,
        outputs: [],
      })
    ).status,
    409,
  );
});
test("Python worker has a separate CSP restricted to local runtime assets", async () => {
  const response = await fetch(origin + "/python-worker.js");
  assert.equal(response.status, 200);
  const policy = response.headers.get("content-security-policy");
  assert(policy.includes("connect-src " + origin + "/vendor/pyodide/"));
  assert(policy.includes("worker-src 'none'"));
  assert(!policy.includes("'unsafe-eval'"));
  assert.equal((await fetch(origin + "/vendor/pyodide/unknown")).status, 404);
});
test("only admin can export a consistent private backup without sessions", async () => {
  assert.equal((await call("student", "admin/backup", {})).status, 403);
  await login("admin");
  const result = await call("admin", "admin/backup", {});
  assert.equal(result.status, 200);
  assert(result.data.sql.includes("INSERT INTO users"));
  assert(!result.data.sql.includes("INSERT INTO sessions"));
  assert.equal(Object.keys(result.data.counts).length, 44);
});
