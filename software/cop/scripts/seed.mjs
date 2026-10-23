import { readFile, mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { openDb, migrate } from "../src/db.mjs";
import { hashPassword, secret } from "../src/security.mjs";
import { tasks } from "../content/tasks.mjs";
export const roles = {
  student: "Студент",
  teacher: "Преподаватель",
  tutor: "Тьютор",
  methodist: "Методист",
  program_manager: "Руководитель программы",
  researcher: "Исследователь",
  admin: "Администратор",
  expert: "Внешний эксперт",
};
const read = async (file) =>
  JSON.parse(
    await readFile(new URL("../content/" + file, import.meta.url), "utf8"),
  );
export async function seed(db, { demo = false, demoPassword } = {}) {
  await migrate(db);
  const registry = await read("competencies.json"),
    courses = await read("courses.json"),
    units = await read("units.json");
  await db.transaction(async (tx) => {
    await tx.query(
      "INSERT INTO programs VALUES('pmo','Прикладное машинное обучение','ТЗ 1.0 / пилот 0.1','draft') ON CONFLICT DO NOTHING",
    );
    for (const [code, title] of Object.entries(roles))
      await tx.query("INSERT INTO roles VALUES($1,$2) ON CONFLICT DO NOTHING", [
        code,
        title,
      ]);
    for (const c of registry.competencies)
      await tx.query(
        "INSERT INTO competencies VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
        [c.code, "pmo", c.text],
      );
    for (const i of registry.indicators)
      await tx.query(
        "INSERT INTO indicators VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING",
        [
          i.code,
          i.competency,
          i.text,
          /продвинут/i.test(i.levels) ? 3 : /средн/i.test(i.levels) ? 2 : 1,
          JSON.stringify(i),
        ],
      );
    for (const c of courses)
      await tx.query(
        "INSERT INTO courses VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING",
        [
          c.id,
          "pmo",
          c.title,
          c.year,
          JSON.stringify(c.semesters),
          c.status,
          c.source,
        ],
      );
    for (const u of units)
      await tx.query(
        "INSERT INTO learning_units(id,course_id,title,position,semester,description) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING",
        [u.id, "algorithms", u.title, u.position, u.semester, u.description],
      );
    // Recommendations are not approved administrative gates. No fabricated course prerequisites.
    for (const u of units.slice(1))
      await tx.query(
        "INSERT INTO prerequisites VALUES($1,$2,'recommended',1) ON CONFLICT DO NOTHING",
        [u.id, units[u.position - 2].id],
      );
    for (const t of tasks) {
      await tx.query(
        "INSERT INTO tasks(id,unit_id,title,level,kind,statement,starter,rubric,tests,reference_code) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT DO NOTHING",
        [
          t.id,
          t.unit_id,
          t.title,
          t.level,
          t.kind,
          t.statement,
          t.starter,
          JSON.stringify(t.rubric),
          JSON.stringify(t.tests),
          t.reference_code,
        ],
      );
      await tx.query(
        "INSERT INTO task_versions(task_id,version,title,statement,tests,reference_code) SELECT id,version,title,statement,tests,reference_code FROM tasks WHERE id=$1 ON CONFLICT DO NOTHING",
        [t.id],
      );
      await tx.query(
        "UPDATE tasks SET title=$2,statement=$3,tests=$4,reference_code=$5,version=version+1 WHERE id=$1 AND (title<>$2 OR statement<>$3 OR tests<>$4::jsonb OR reference_code<>$5)",
        [t.id, t.title, t.statement, JSON.stringify(t.tests), t.reference_code],
      );
      await tx.query(
        "INSERT INTO task_versions(task_id,version,title,statement,tests,reference_code) SELECT id,version,title,statement,tests,reference_code FROM tasks WHERE id=$1 ON CONFLICT DO NOTHING",
        [t.id],
      );
      // RPD uses ПKN-4, target model uses CS-family: semantic mapping must be approved.
      for (const code of ["SS-1.1"])
        if (registry.indicators.some((x) => x.code === code))
          await tx.query(
            "INSERT INTO task_indicators VALUES($1,$2,1,$3) ON CONFLICT DO NOTHING",
            [t.id, code, "proposed"],
          );
    }
  });
  if (demo) {
    if (!demoPassword)
      throw new Error("Укажите DEMO_PASSWORD (минимум 12 символов)");
    const hash = await hashPassword(demoPassword);
    await db.transaction(async (tx) => {
      await tx.query(
        "INSERT INTO groups VALUES('demo','Демонстрационная группа',1,'Синтетические данные') ON CONFLICT DO NOTHING",
      );
      for (const [code, title] of Object.entries(roles)) {
        const uid = "demo-" + code;
        await tx.query(
          "INSERT INTO users(id,login,name,password_hash,force_reset) VALUES($1,$2,$3,$4,false) ON CONFLICT DO NOTHING",
          [uid, uid, title + " · демонстрация", hash],
        );
        await tx.query(
          "INSERT INTO user_roles VALUES($1,$2) ON CONFLICT DO NOTHING",
          [uid, code],
        );
        if (code === "student") {
          await tx.query(
            "INSERT INTO group_members VALUES('demo',$1) ON CONFLICT DO NOTHING",
            [uid],
          );
          for (const c of courses)
            await tx.query(
              "INSERT INTO enrollments VALUES($1,$2) ON CONFLICT DO NOTHING",
              [c.id, uid],
            );
        } else if (["teacher", "tutor", "expert"].includes(code)) {
          await tx.query(
            "INSERT INTO staff_scopes VALUES($1,'algorithms','demo',$2) ON CONFLICT DO NOTHING",
            [uid, code],
          );
        }
      }
    });
  }
  return {
    courses: courses.length,
    units: units.length,
    tasks: tasks.length,
    competencies: registry.competencies.length,
    indicators: registry.indicators.length,
  };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const db = await openDb();
  try {
    console.log(
      await seed(db, {
        demo: process.argv.includes("--demo"),
        demoPassword: process.env.DEMO_PASSWORD,
      }),
    );
  } finally {
    await db.close();
  }
}
