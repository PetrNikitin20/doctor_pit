import { readFile, writeFile, mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";
import { openDb } from "../src/db.mjs";
import { seed, roles, refreshEnrollments } from "./seed.mjs";
import { hashPassword, secret } from "../src/security.mjs";
export async function importPrivate(db, payload) {
  await seed(db);
  const credentials = [];
  const staff = [
    {
      id: "nikitin-admin",
      login: "nikitin-admin",
      name: "Никитин Пётр Владимирович",
      roles: ["admin"],
      active: true,
    },
    ...Object.keys(roles)
      .filter((x) => !["student", "admin"].includes(x))
      .map((role) => ({
        id: "staff-" + role,
        login: "cop-" + role,
        name: roles[role] + " — требуется назначение владельца",
        roles: [role],
        active: false,
      })),
  ];
  for (const u of [...payload.users, ...staff]) {
    if (
      await db.one("SELECT id FROM users WHERE id=$1 OR login=$2", [
        u.id,
        u.login,
      ])
    )
      continue;
    const password = secret(),
      hash = await hashPassword(password);
    await db.transaction(async (tx) => {
      await tx.query(
        "INSERT INTO users(id,login,name,password_hash,active) VALUES($1,$2,$3,$4,$5)",
        [u.id, u.login, u.name, hash, u.active ?? true],
      );
      for (const r of u.roles)
        await tx.query("INSERT INTO user_roles VALUES($1,$2)", [u.id, r]);
      await tx.query(
        "INSERT INTO audit_log(id,action,object_id,detail) VALUES($1,'account.provision',$2,$3)",
        [
          randomUUID(),
          u.id,
          JSON.stringify({
            source: "private import",
            cohort: u.cohort ?? null,
          }),
        ],
      );
    });
    credentials.push({
      name: u.name,
      login: u.login,
      password,
      group: u.group_id ?? "",
      active: u.active ?? true,
      roles: u.roles.join(","),
    });
  }
  await db.transaction(async (tx) => {
    for (const g of payload.groups)
      await tx.query(
        "INSERT INTO groups VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING",
        [g.id, g.title, g.year, g.source],
      );
    const courses = await tx.rows("SELECT id,year,catalog_meta FROM courses");
    for (const u of payload.users) {
      await tx.query(
        "INSERT INTO group_members VALUES($1,$2) ON CONFLICT DO NOTHING",
        [u.group_id, u.id],
      );
      const studyYear=payload.groups.find(g=>g.id===u.group_id)?.year;
      if(!Number.isInteger(studyYear)||studyYear<1||studyYear>4)throw Error('Для студента отсутствует подтверждённый курс группы');
      for (const c of courses.filter(
        (c) => (c.catalog_meta.years||[c.year]).includes(studyYear),
      ))
        await tx.query(
          "INSERT INTO enrollments VALUES($1,$2) ON CONFLICT DO NOTHING",
          [c.id, u.id],
        );
      // Second-year students may take the pilot as a diagnostic/bridging discipline.
      await tx.query(
        "INSERT INTO enrollments VALUES('algorithms',$1) ON CONFLICT DO NOTHING",
        [u.id],
      );
    }
    for (const s of payload.sources)
      await tx.query(
        "INSERT INTO journal_sources(id,file_name,sha256) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
        [s.id, s.file_name, s.sha256],
      );
    for (const o of payload.observations)
      await tx.query(
        "INSERT INTO journal_observations(id,source_id,user_id,group_id,course_id,sheet,cell,raw_value,meaning) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT DO NOTHING",
        [
          o.id,
          o.source_id,
          o.user_id,
          o.group_id,
          o.course_id,
          o.sheet,
          o.cell,
          o.raw_value,
          o.meaning,
        ],
      );
  });
  await refreshEnrollments(db);
  return credentials;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const db = await openDb();
  try {
    const payload = JSON.parse(
      await readFile(process.argv[2] || "private/import.json", "utf8"),
    );
    const credentials = await importPrivate(db, payload);
    await mkdir("private", { recursive: true });
    if (credentials.length)
      await writeFile(
        "private/credentials-" + Date.now() + ".json",
        JSON.stringify(credentials, null, 2),
        { mode: 0o600 },
      );
    console.log({
      created: credentials.length,
      students: payload.users.length,
      observations: payload.observations.length,
      credentials: "private/ (закрытый каталог)",
    });
  } finally {
    await db.close();
  }
}
