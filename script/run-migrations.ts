import { spawn } from "child_process";
import { diffMigrationState, initializeMigrationRuntime, readAppliedMigrations, readRepoMigrations } from "./migrationUtils";

async function runDrizzleMigrate() {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ["./node_modules/drizzle-kit/bin.cjs", "migrate"],
      {
        cwd: process.cwd(),
        stdio: "inherit",
        env: process.env,
      },
    );

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`drizzle-kit migrate exited with code ${code ?? "unknown"}`));
    });
  });
}

async function main() {
  const target = initializeMigrationRuntime();
  const repoMigrations = readRepoMigrations();
  const before = await readAppliedMigrations(target);
  const beforeDiff = diffMigrationState(repoMigrations, before);

  console.log(`Mode: ${target.mode}`);
  console.log(`DB: ${target.dbName} (${target.host}:${target.port})`);

  if (beforeDiff.pending.length === 0 && beforeDiff.unexpected.length === 0) {
    console.log("Keine Migration noetig. DB ist bereits synchron.");
    return;
  }

  if (beforeDiff.unexpected.length > 0) {
    console.error("Abbruch: Die DB-Historie enthaelt Eintraege, die nicht zum Repository passen.");
    for (const migration of beforeDiff.unexpected) {
      console.error(`- id=${migration.id} hash=${migration.hash}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("Ausstehende Migrationen:");
  for (const migration of beforeDiff.pending) {
    console.log(`- ${migration.fileName}`);
  }

  await runDrizzleMigrate();

  const after = await readAppliedMigrations(target);
  const afterDiff = diffMigrationState(repoMigrations, after);
  if (afterDiff.pending.length > 0 || afterDiff.unexpected.length > 0) {
    console.error("Migration unvollstaendig. Bitte Migrationshistorie pruefen.");
    process.exitCode = 1;
    return;
  }

  console.log("Migration erfolgreich. DB und Repository sind synchron.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
