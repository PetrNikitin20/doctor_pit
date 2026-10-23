import { openDb, migrate } from "../src/db.mjs";
const db = await openDb();
try {
  await migrate(db);
  console.log("Миграции применены");
} finally {
  await db.close();
}
