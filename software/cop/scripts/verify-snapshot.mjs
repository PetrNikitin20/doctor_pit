import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { openDb, migrate } from "../src/db.mjs";
import { snapshotTables } from "./export-snapshot.mjs";
const source = await openDb(),
  restored = await openDb({ memory: true });
const hash = (rows) =>
  createHash("sha256")
    .update(JSON.stringify(rows.map((x) => JSON.stringify(x)).sort()))
    .digest("hex");
try {
  await migrate(restored);
  await restored.exec(
    await readFile(process.argv[2] || "private/snapshot.sql", "utf8"),
  );
  let rows = 0;
  for (const table of snapshotTables) {
    const a = await source.rows("SELECT * FROM " + table),
      b = await restored.rows("SELECT * FROM " + table);
    if (hash(a) !== hash(b)) throw new Error("Snapshot mismatch: " + table);
    rows += a.length;
  }
  console.log(
    JSON.stringify({
      tables: snapshotTables.length,
      rows,
      restoredIdentically: true,
      sessionsRestored: Number(
        (await restored.one("SELECT count(*) n FROM sessions")).n,
      ),
    }),
  );
} finally {
  await source.close();
  await restored.close();
}
