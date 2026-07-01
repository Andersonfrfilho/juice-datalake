#!/usr/bin/env node
/**
 * Migration runner para Juice Data Lake.
 * Executa migrations SQL numeradas sequencialmente.
 *
 * Uso:
 *   node scripts/migrate.js                    # Executa migrations pendentes
 *   node scripts/migrate.js --status           # Lista status das migrations
 *   DATABASE_URL=postgres://... node scripts/migrate.js
 */

const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const MIGRATIONS_DIR = path.join(__dirname, "..", "migrations");
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://jadmin:juice123@localhost:5432/juicedb",
});

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

async function getExecutedMigrations() {
  const { rows } = await pool.query("SELECT name FROM _migrations ORDER BY id");
  return new Set(rows.map((r) => r.name));
}

async function getPendingMigrations(executed) {
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  return files.filter((f) => !executed.has(f));
}

async function runMigration(filename) {
  const filepath = path.join(MIGRATIONS_DIR, filename);
  const sql = fs.readFileSync(filepath, "utf-8");

  console.log(`  ▶ ${filename}`);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("INSERT INTO _migrations (name) VALUES ($1)", [filename]);
    await client.query("COMMIT");
    console.log(`    ✅ OK`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(`    ❌ ${err.message}`);
    throw err;
  } finally {
    client.release();
  }
}

async function status() {
  await ensureMigrationsTable();
  const executed = await getExecutedMigrations();
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  console.log("\nMigration Status:\n");
  for (const f of files) {
    const done = executed.has(f);
    console.log(`  ${done ? "✅" : "⬜"} ${f}`);
  }
  console.log(`\n  ${executed.size}/${files.length} executadas\n`);
}

async function migrate() {
  console.log("\n🔄 Running migrations...\n");
  await ensureMigrationsTable();
  const executed = await getExecutedMigrations();
  const pending = await getPendingMigrations(executed);

  if (pending.length === 0) {
    console.log("  ✅ All migrations up to date.\n");
    return;
  }

  console.log(`  ${pending.length} pending migration(s):\n`);
  for (const filename of pending) {
    await runMigration(filename);
  }
  console.log(`\n✅ Done. ${pending.length} migration(s) executed.\n`);
}

async function main() {
  const args = process.argv.slice(2);

  try {
    if (args.includes("--status")) {
      await status();
    } else {
      await migrate();
    }
  } catch (err) {
    console.error("\n❌ Migration failed:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
