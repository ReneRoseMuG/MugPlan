import { diffMigrationState, initializeMigrationRuntime, readAppliedMigrations, readRepoMigrations } from "./migrationUtils";

async function main() {
  const target = initializeMigrationRuntime();
  const repoMigrations = readRepoMigrations();
  const appliedMigrations = await readAppliedMigrations(target);
  const { pending, unexpected } = diffMigrationState(repoMigrations, appliedMigrations);

  console.log(`Mode: ${target.mode}`);
  console.log(`DB: ${target.dbName} (${target.host}:${target.port})`);
  console.log(`Repository-Migrationen: ${repoMigrations.length}`);
  console.log(`Angewendete Migrationen: ${appliedMigrations.length}`);

  if (pending.length === 0 && unexpected.length === 0) {
    console.log("Status: synchron");
    return;
  }

  if (pending.length > 0) {
    console.log("Fehlende Migrationen:");
    for (const migration of pending) {
      console.log(`- ${migration.fileName}`);
    }
  }

  if (unexpected.length > 0) {
    console.log("Unerwartete DB-Eintraege:");
    for (const migration of unexpected) {
      console.log(`- id=${migration.id} hash=${migration.hash}`);
    }
  }

  process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
