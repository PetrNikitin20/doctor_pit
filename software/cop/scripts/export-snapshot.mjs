import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { openDb } from "../src/db.mjs";
export const snapshotTables = [
  "programs",
  "competencies",
  "indicators",
  "users",
  "roles",
  "user_roles",
  "groups",
  "group_members",
  "courses",
  "enrollments",
  "staff_scopes",
  "learning_units",
  "prerequisites",
  "tasks",
  "task_versions",
  "task_indicators",
  "hypotheses",
  "artifacts",
  "artifact_revisions",
  "attempts",
  "code_runs",
  "simulator_runs",
  "comparisons",
  "reviews",
  "evidence",
  "mastery_snapshots",
  "trajectory_decisions",
  "journal_sources",
  "journal_observations",
  "grade_entries",
  "learning_events",
  "llm_interactions",
  "audit_log",
  "appeals",
  "notifications",
  "research_consents",
  "research_experiments",
  "expert_assignments",
];
const literal = (v) =>
  v === null
    ? "NULL"
    : typeof v === "boolean"
      ? v
        ? "TRUE"
        : "FALSE"
      : typeof v === "number"
        ? String(v)
        : "'" +
          (v instanceof Date
            ? v.toISOString()
            : typeof v === "object"
              ? JSON.stringify(v)
              : String(v)
          ).replaceAll("'", "''") +
          "'";
export async function exportSnapshot(db) {
  const lines = [
    "-- PRIVATE: identities, source marks and password hashes. Never commit.",
    "BEGIN;",
    "SET standard_conforming_strings = on;",
  ];
  const counts = {};
  await db.transaction(async (tx) => {
    await tx.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
    for (const table of snapshotTables) {
      const rows = await tx.rows("SELECT * FROM " + table);
      counts[table] = rows.length;
      for (const row of rows) {
        const columns = Object.keys(row);
        lines.push(
          `INSERT INTO ${table} (${columns.map((c) => '"' + c + '"').join(",")}) VALUES (${columns.map((c) => literal(row[c])).join(",")});`,
        );
      }
    }
  });
  lines.push("COMMIT;");
  return { sql: lines.join("\n") + "\n", counts };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const db = await openDb();
  try {
    const { sql, counts } = await exportSnapshot(db);
    const file = process.argv[2] || "private/snapshot.sql";
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, sql, { mode: 0o600 });
    console.log({ file, counts });
  } finally {
    await db.close();
  }
}
