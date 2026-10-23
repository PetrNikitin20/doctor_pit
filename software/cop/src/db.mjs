import { mkdir, readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

// A single SQL contract: PostgreSQL on the server, embedded PostgreSQL for local work.
export async function openDb(options = {}) {
  let raw;
  if (options.url || process.env.DATABASE_URL) {
    const { Pool } = await import("pg");
    raw = new Pool({
      connectionString: options.url || process.env.DATABASE_URL,
      max: 8,
    });
  } else {
    const { PGlite } = await import("@electric-sql/pglite");
    const dir = options.memory
      ? undefined
      : resolve(process.env.DATA_DIR || "data/postgres");
    if (dir) await mkdir(dir, { recursive: true });
    raw = new PGlite(dir);
    await raw.waitReady;
  }
  let tail = Promise.resolve();
  // Serialize full transactions locally; Pool uses a dedicated connection in production.
  const exclusive = (fn) => {
    const p = tail.then(fn, fn);
    tail = p.catch(() => {});
    return p;
  };
  const query = (sql, params = []) => exclusive(() => raw.query(sql, params));
  const db = {
    query,
    exec: (s) => exclusive(() => (raw.exec ? raw.exec(s) : raw.query(s))),
    rows: async (s, p) => (await query(s, p)).rows,
    one: async (s, p) => (await query(s, p)).rows[0],
    transaction: (fn) =>
      exclusive(async () => {
        const client = raw.connect ? await raw.connect() : raw;
        const tx = {
          exec: (s) => (client.exec ? client.exec(s) : client.query(s)),
          query: (s, p = []) => client.query(s, p),
          rows: async (s, p) => (await client.query(s, p)).rows,
          one: async (s, p) => (await client.query(s, p)).rows[0],
        };
        try {
          await client.query("BEGIN");
          const value = await fn(tx);
          await client.query("COMMIT");
          return value;
        } catch (e) {
          await client.query("ROLLBACK");
          throw e;
        } finally {
          client.release?.();
        }
      }),
    close: async () => (raw.end ? raw.end() : raw.close()),
  };
  return db;
}
export async function migrate(db) {
  await db.query(
    "CREATE TABLE IF NOT EXISTS schema_migrations(version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())",
  );
  for (const file of (await readdir(new URL("../migrations/", import.meta.url)))
    .filter((x) => x.endsWith(".sql"))
    .sort()) {
    if (
      await db.one("SELECT version FROM schema_migrations WHERE version=$1", [
        file,
      ])
    )
      continue;
    await db.transaction(async (tx) => {
      await tx.exec(
        await readFile(
          new URL("../migrations/" + file, import.meta.url),
          "utf8",
        ),
      );
      await tx.query("INSERT INTO schema_migrations(version) VALUES($1)", [
        file,
      ]);
    });
  }
}
