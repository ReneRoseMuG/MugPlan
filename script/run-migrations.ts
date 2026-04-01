import fs from "fs";
import path from "path";
import mysql from "mysql2/promise";
import { diffMigrationState, initializeMigrationRuntime, readAppliedMigrations, readRepoMigrations } from "./migrationUtils";

type PendingMigration = ReturnType<typeof readRepoMigrations>[number];

const STATEMENT_BREAKPOINT = "--> statement-breakpoint";

function splitMigrationChunks(sql: string): string[] {
  return sql
    .split(STATEMENT_BREAKPOINT)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0);
}

async function columnExists(
  connection: mysql.Connection,
  tableName: string,
  columnName: string,
) {
  const [rows] = await connection.query(
    `
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = ?
        AND column_name = ?
      LIMIT 1
    `,
    [tableName, columnName],
  );

  return Array.isArray(rows) && rows.length > 0;
}

async function indexExists(
  connection: mysql.Connection,
  tableName: string,
  indexName: string,
) {
  const [rows] = await connection.query(
    `
      SELECT 1
      FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = ?
        AND index_name = ?
      LIMIT 1
    `,
    [tableName, indexName],
  );

  return Array.isArray(rows) && rows.length > 0;
}

async function tableExists(connection: mysql.Connection, tableName: string) {
  const [rows] = await connection.query(
    `
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND table_name = ?
      LIMIT 1
    `,
    [tableName],
  );

  return Array.isArray(rows) && rows.length > 0;
}

async function constraintExists(
  connection: mysql.Connection,
  tableName: string,
  constraintName: string,
) {
  const [rows] = await connection.query(
    `
      SELECT 1
      FROM information_schema.table_constraints
      WHERE table_schema = DATABASE()
        AND table_name = ?
        AND constraint_name = ?
      LIMIT 1
    `,
    [tableName, constraintName],
  );

  return Array.isArray(rows) && rows.length > 0;
}

function parseAddColumnStatement(statement: string) {
  const normalized = statement.trim().replace(/;$/, "");
  const tableMatch = /^ALTER TABLE\s+`([^`]+)`\s+/i.exec(normalized);
  if (!tableMatch || !/\bADD COLUMN\b/i.test(normalized)) {
    return null;
  }

  const tableName = tableMatch[1];
  const body = normalized.slice(tableMatch[0].length);
  const rawDefinitions = body.split(/,\s*(?=ADD COLUMN(?: IF NOT EXISTS)?\s+`)/i);
  const definitions = rawDefinitions.map((definition) => {
    const cleaned = definition.replace(/^ADD COLUMN(?: IF NOT EXISTS)?\s+/i, "").trim();
    const columnMatch = /^`([^`]+)`\s+/i.exec(cleaned);
    if (!columnMatch) {
      throw new Error(`Konnte Spaltendefinition nicht lesen: ${definition}`);
    }

    return {
      columnName: columnMatch[1],
      definition: cleaned,
    };
  });

  return { tableName, definitions };
}

function parseCreateTableStatement(statement: string) {
  const normalized = statement.trim().replace(/;$/, "");
  const match = /^CREATE TABLE(?: IF NOT EXISTS)?\s+`([^`]+)`\s*\(/i.exec(normalized);
  if (!match) {
    return null;
  }

  return { tableName: match[1] };
}

function parseCreateIndexStatement(statement: string) {
  const normalized = statement.trim().replace(/;$/, "");
  const match = /^CREATE INDEX\s+`([^`]+)`\s+ON\s+`([^`]+)`\s*\(/i.exec(normalized);
  if (!match) {
    return null;
  }

  return {
    indexName: match[1],
    tableName: match[2],
  };
}

function parseAlterTableAddKeysAndConstraints(statement: string) {
  const normalized = statement.trim().replace(/;$/, "");
  const tableMatch = /^ALTER TABLE\s+`([^`]+)`\s+/i.exec(normalized);
  if (!tableMatch || !/\bADD (?:KEY|CONSTRAINT)\b/i.test(normalized)) {
    return null;
  }

  const tableName = tableMatch[1];
  const body = normalized.slice(tableMatch[0].length);
  const segments = body.split(/,\s*(?=ADD (?:KEY|CONSTRAINT)\s+`)/i);
  const actions = segments.map((segment) => {
    const keyMatch = /^ADD KEY\s+`([^`]+)`\s+/i.exec(segment.trim());
    if (keyMatch) {
      return { type: "index" as const, name: keyMatch[1], sql: segment.trim() };
    }

    const constraintMatch = /^ADD CONSTRAINT\s+`([^`]+)`\s+/i.exec(segment.trim());
    if (constraintMatch) {
      return { type: "constraint" as const, name: constraintMatch[1], sql: segment.trim() };
    }

    throw new Error(`Konnte ALTER TABLE Aktion nicht lesen: ${segment}`);
  });

  return { tableName, actions };
}

function parseAlterTableDropColumns(statement: string) {
  const normalized = statement.trim().replace(/;$/, "");
  const tableMatch = /^ALTER TABLE\s+`([^`]+)`\s+/i.exec(normalized);
  if (!tableMatch || !/\bDROP COLUMN\b/i.test(normalized)) {
    return null;
  }

  const tableName = tableMatch[1];
  const body = normalized.slice(tableMatch[0].length);
  const segments = body.split(/,\s*(?=DROP COLUMN\s+`)/i);
  const columns = segments.map((segment) => {
    const match = /^DROP COLUMN\s+`([^`]+)`$/i.exec(segment.trim());
    if (!match) {
      throw new Error(`Konnte DROP COLUMN nicht lesen: ${segment}`);
    }

    return match[1];
  });

  return { tableName, columns };
}

function parseAlterTableDropCheck(statement: string) {
  const normalized = statement.trim().replace(/;$/, "");
  const match = /^ALTER TABLE\s+`([^`]+)`\s+DROP CHECK\s+`([^`]+)`$/i.exec(normalized);
  if (!match) {
    return null;
  }

  return {
    tableName: match[1],
    constraintName: match[2],
  };
}

function parseAlterTableDropForeignKey(statement: string) {
  const normalized = statement.trim().replace(/;$/, "");
  const match = /^ALTER TABLE\s+`([^`]+)`\s+DROP FOREIGN KEY\s+`([^`]+)`$/i.exec(normalized);
  if (!match) {
    return null;
  }

  return {
    tableName: match[1],
    constraintName: match[2],
  };
}

async function executeMigrationChunk(connection: mysql.Connection, chunk: string) {
  const createTable = parseCreateTableStatement(chunk);
  if (createTable) {
    const exists = await tableExists(connection, createTable.tableName);
    if (exists) {
      return;
    }

    await connection.query(chunk);
    return;
  }

  const addColumns = parseAddColumnStatement(chunk);
  if (addColumns) {
    for (const definition of addColumns.definitions) {
      const exists = await columnExists(connection, addColumns.tableName, definition.columnName);
      if (exists) {
        continue;
      }

      await connection.query(
        `ALTER TABLE \`${addColumns.tableName}\` ADD COLUMN ${definition.definition};`,
      );
    }
    return;
  }

  const createIndex = parseCreateIndexStatement(chunk);
  if (createIndex) {
    const exists = await indexExists(connection, createIndex.tableName, createIndex.indexName);
    if (exists) {
      return;
    }

    await connection.query(chunk);
    return;
  }

  const addKeysAndConstraints = parseAlterTableAddKeysAndConstraints(chunk);
  if (addKeysAndConstraints) {
    for (const action of addKeysAndConstraints.actions) {
      const exists = action.type === "index"
        ? await indexExists(connection, addKeysAndConstraints.tableName, action.name)
        : await constraintExists(connection, addKeysAndConstraints.tableName, action.name);

      if (exists) {
        continue;
      }

      await connection.query(
        `ALTER TABLE \`${addKeysAndConstraints.tableName}\` ${action.sql};`,
      );
    }
    return;
  }

  const dropColumns = parseAlterTableDropColumns(chunk);
  if (dropColumns) {
    for (const columnName of dropColumns.columns) {
      const exists = await columnExists(connection, dropColumns.tableName, columnName);
      if (!exists) {
        continue;
      }

      await connection.query(
        `ALTER TABLE \`${dropColumns.tableName}\` DROP COLUMN \`${columnName}\`;`,
      );
    }
    return;
  }

  const dropCheck = parseAlterTableDropCheck(chunk);
  if (dropCheck) {
    const exists = await constraintExists(connection, dropCheck.tableName, dropCheck.constraintName);
    if (!exists) {
      return;
    }
  }

  const dropForeignKey = parseAlterTableDropForeignKey(chunk);
  if (dropForeignKey) {
    const exists = await constraintExists(connection, dropForeignKey.tableName, dropForeignKey.constraintName);
    if (!exists) {
      return;
    }
  }

  await connection.query(chunk);
}

async function applyPendingMigration(
  connection: mysql.Connection,
  migration: PendingMigration,
) {
  const sql = fs.readFileSync(path.resolve(process.cwd(), "migrations", migration.fileName), "utf8");
  const chunks = splitMigrationChunks(sql);

  for (const chunk of chunks) {
    await executeMigrationChunk(connection, chunk);
  }

  await connection.query(
    "INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)",
    [migration.hash, Date.now()],
  );
}

async function runPendingMigrations(pendingMigrations: PendingMigration[]) {
  const target = initializeMigrationRuntime();
  const connection = await mysql.createConnection({
    uri: target.url,
    multipleStatements: true,
  });

  try {
    for (const migration of pendingMigrations) {
      console.log(`Wende Migration an: ${migration.fileName}`);
      await applyPendingMigration(connection, migration);
    }
  } finally {
    await connection.end();
  }
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

  await runPendingMigrations(beforeDiff.pending);

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
