import { config } from "dotenv";

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import postgres from "postgres";

config({ path: ".env.local" });
config();

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required.");
  }

  const sql = postgres(databaseUrl, { max: 1, prepare: false });
  await sql`
    CREATE TABLE IF NOT EXISTS app_migrations (
      name text PRIMARY KEY,
      applied_at timestamp with time zone NOT NULL DEFAULT now()
    )
  `;

  const migrationsDir = path.join(process.cwd(), "drizzle");
  const files = (await readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const [existing] = await sql`SELECT name FROM app_migrations WHERE name = ${file}`;
    if (existing) {
      continue;
    }

    const contents = await readFile(path.join(migrationsDir, file), "utf8");
    await sql.begin(async (tx) => {
      await tx.unsafe(contents);
      await tx`INSERT INTO app_migrations (name) VALUES (${file})`;
    });
    console.log(`Applied ${file}`);
  }

  await sql.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
