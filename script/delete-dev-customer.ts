import mysql, { type Connection, type ResultSetHeader, type RowDataPacket } from "mysql2/promise";
import { getRuntimeConfig, getRuntimeMode, initializeRuntimeEnv } from "../server/config/runtimeEnv";
import { initStoragePathsFromEnv } from "../server/config/storagePaths";
import { deleteAttachmentFile } from "../server/lib/attachmentFiles";
import {
  assertSafeAdminDestructiveOperationTarget,
  assertSqlDatabaseIdentity,
} from "../server/security/dbSafetyGuards";

process.env.NODE_ENV = "development";

type CustomerRow = {
  id: number;
  customerNumber: string;
};

type AttachmentFileRef = {
  filename: string;
  storagePath: string | null;
};

type TargetSnapshot = {
  customer: CustomerRow;
  projectIds: number[];
  appointmentIds: number[];
  candidateNoteIds: number[];
  deletableNoteIds: number[];
  attachmentFileRefs: AttachmentFileRef[];
  counts: DeleteCounts;
};

type DeleteCounts = {
  customers: number;
  projects: number;
  appointments: number;
  projectOrders: number;
  projectOrderItems: number;
  customerNoteLinks: number;
  projectNoteLinks: number;
  appointmentNoteLinks: number;
  notes: number;
  customerTagLinks: number;
  projectTagLinks: number;
  appointmentTagLinks: number;
  customerAttachments: number;
  projectAttachments: number;
  appointmentAttachments: number;
  appointmentEmployees: number;
  calendarSyncLogs: number;
};

type AttachmentCleanupResult = {
  deleted: number;
  missing: number;
  failed: Array<{ filename: string; reason: string }>;
};

const zeroCounts = (): DeleteCounts => ({
  customers: 0,
  projects: 0,
  appointments: 0,
  projectOrders: 0,
  projectOrderItems: 0,
  customerNoteLinks: 0,
  projectNoteLinks: 0,
  appointmentNoteLinks: 0,
  notes: 0,
  customerTagLinks: 0,
  projectTagLinks: 0,
  appointmentTagLinks: 0,
  customerAttachments: 0,
  projectAttachments: 0,
  appointmentAttachments: 0,
  appointmentEmployees: 0,
  calendarSyncLogs: 0,
});

function printUsage(): void {
  console.log("Nutzung: npm run \"lösche Kunde:\" -- <Kundennummer> --confirm");
  console.log("Ohne --confirm wird nur eine Vorschau ausgegeben.");
}

function parseArgs(args: string[]): { customerNumber: string; confirmed: boolean } {
  const confirmed = args.includes("--confirm");
  const positional = args.filter((arg) => arg !== "--confirm" && arg !== "--help" && arg !== "-h");
  const normalized = positional[0] === "Kunde:" ? positional.slice(1) : positional;
  const customerNumber = normalized[0]?.trim() ?? "";

  if (args.includes("--help") || args.includes("-h")) {
    printUsage();
    process.exit(0);
  }

  if (!customerNumber) {
    printUsage();
    throw new Error("Es wurde keine Kundennummer übergeben.");
  }

  if (normalized.length > 1) {
    throw new Error(`Unerwartete Argumente: ${normalized.slice(1).join(" ")}`);
  }

  return { customerNumber, confirmed };
}

function uniqueNumbers(values: number[]): number[] {
  return Array.from(new Set(values.filter((value) => Number.isInteger(value) && value > 0)));
}

function uniqueAttachmentFileRefs(refs: AttachmentFileRef[]): AttachmentFileRef[] {
  return Array.from(
    new Map(
      refs
        .filter((ref) => ref.filename.trim().length > 0)
        .map((ref) => [`${ref.filename}::${ref.storagePath ?? ""}`, ref]),
    ).values(),
  );
}

function buildInCondition(columnName: string, values: number[]): { sql: string; params: number[] } {
  if (values.length === 0) {
    return { sql: "0 = 1", params: [] };
  }
  return {
    sql: `${columnName} in (${values.map(() => "?").join(", ")})`,
    params: values,
  };
}

function addCounts(target: DeleteCounts, source: Partial<DeleteCounts>): void {
  for (const key of Object.keys(source) as Array<keyof DeleteCounts>) {
    target[key] += source[key] ?? 0;
  }
}

async function queryRows<T extends RowDataPacket>(
  connection: Connection,
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const [rows] = await connection.execute<T[]>(sql, params);
  return rows;
}

async function selectIds(connection: Connection, sql: string, params: unknown[] = []): Promise<number[]> {
  const rows = await queryRows<RowDataPacket & { id: number | string }>(connection, sql, params);
  return uniqueNumbers(rows.map((row) => Number(row.id)));
}

async function selectCount(connection: Connection, sql: string, params: unknown[] = []): Promise<number> {
  const rows = await queryRows<RowDataPacket & { count: number | string }>(connection, sql, params);
  return Number(rows[0]?.count ?? 0);
}

async function deleteWhere(
  connection: Connection,
  tableName: string,
  whereSql: string,
  params: unknown[] = [],
): Promise<number> {
  const [result] = await connection.execute<ResultSetHeader>(
    `delete from ${tableName} where ${whereSql}`,
    params,
  );
  return Number(result.affectedRows ?? 0);
}

async function findCustomer(
  connection: Connection,
  customerNumber: string,
  lockRow: boolean,
): Promise<CustomerRow | null> {
  const lockSuffix = lockRow ? " for update" : "";
  const rows = await queryRows<RowDataPacket & { id: number | string; customer_number: string }>(
    connection,
    `select id, customer_number from customer where customer_number = ? limit 1${lockSuffix}`,
    [customerNumber],
  );
  const row = rows[0];
  if (!row) {
    return null;
  }
  return {
    id: Number(row.id),
    customerNumber: row.customer_number,
  };
}

async function findProjectIds(connection: Connection, customerId: number): Promise<number[]> {
  return selectIds(connection, "select id from project where customer_id = ?", [customerId]);
}

async function findAppointmentIds(
  connection: Connection,
  customerId: number,
  projectIds: number[],
): Promise<number[]> {
  const conditions = ["customer_id = ?"];
  const params: number[] = [customerId];
  if (projectIds.length > 0) {
    const projectCondition = buildInCondition("project_id", projectIds);
    conditions.push(projectCondition.sql);
    params.push(...projectCondition.params);
  }

  return selectIds(
    connection,
    `select id from appointments where ${conditions.map((condition) => `(${condition})`).join(" or ")}`,
    params,
  );
}

async function findCandidateNoteIds(
  connection: Connection,
  customerId: number,
  projectIds: number[],
  appointmentIds: number[],
): Promise<number[]> {
  const ids: number[] = [];

  ids.push(
    ...(await selectIds(connection, "select note_id as id from customer_note where customer_id = ?", [customerId])),
  );

  if (projectIds.length > 0) {
    const projectCondition = buildInCondition("project_id", projectIds);
    ids.push(
      ...(await selectIds(
        connection,
        `select note_id as id from project_note where ${projectCondition.sql}`,
        projectCondition.params,
      )),
    );
  }

  if (appointmentIds.length > 0) {
    const appointmentCondition = buildInCondition("appointment_id", appointmentIds);
    ids.push(
      ...(await selectIds(
        connection,
        `select note_id as id from appointment_note where ${appointmentCondition.sql}`,
        appointmentCondition.params,
      )),
    );
  }

  return uniqueNumbers(ids);
}

async function findDeletableNoteIds(
  connection: Connection,
  noteIds: number[],
  customerId: number,
  projectIds: number[],
  appointmentIds: number[],
): Promise<number[]> {
  if (noteIds.length === 0) {
    return [];
  }

  const noteCondition = buildInCondition("n.id", noteIds);
  const projectOutsideSql =
    projectIds.length > 0
      ? `pn.project_id not in (${projectIds.map(() => "?").join(", ")})`
      : "1 = 1";
  const appointmentOutsideSql =
    appointmentIds.length > 0
      ? `an.appointment_id not in (${appointmentIds.map(() => "?").join(", ")})`
      : "1 = 1";

  return selectIds(
    connection,
    `
      select n.id
      from note n
      where ${noteCondition.sql}
        and not exists (
          select 1
          from customer_note cn
          where cn.note_id = n.id
            and cn.customer_id <> ?
        )
        and not exists (
          select 1
          from project_note pn
          where pn.note_id = n.id
            and ${projectOutsideSql}
        )
        and not exists (
          select 1
          from appointment_note an
          where an.note_id = n.id
            and ${appointmentOutsideSql}
        )
        and not exists (
          select 1
          from employee_note en
          where en.note_id = n.id
        )
        and not exists (
          select 1
          from calendar_week_note cwn
          where cwn.note_id = n.id
        )
    `,
    [...noteCondition.params, customerId, ...projectIds, ...appointmentIds],
  );
}

async function findAttachmentFileRefs(
  connection: Connection,
  customerId: number,
  projectIds: number[],
  appointmentIds: number[],
): Promise<AttachmentFileRef[]> {
  const refs: AttachmentFileRef[] = [];
  const customerRows = await queryRows<RowDataPacket & AttachmentFileRef>(
    connection,
    "select filename, storage_path as storagePath from customer_attachment where customer_id = ?",
    [customerId],
  );
  refs.push(...customerRows);

  if (projectIds.length > 0) {
    const condition = buildInCondition("project_id", projectIds);
    const projectRows = await queryRows<RowDataPacket & AttachmentFileRef>(
      connection,
      `select filename, storage_path as storagePath from project_attachment where ${condition.sql}`,
      condition.params,
    );
    refs.push(...projectRows);
  }

  if (appointmentIds.length > 0) {
    const condition = buildInCondition("appointment_id", appointmentIds);
    const appointmentRows = await queryRows<RowDataPacket & AttachmentFileRef>(
      connection,
      `select filename, storage_path as storagePath from appointment_attachment where ${condition.sql}`,
      condition.params,
    );
    refs.push(...appointmentRows);
  }

  return uniqueAttachmentFileRefs(refs);
}

async function countTargetRows(
  connection: Connection,
  customerId: number,
  projectIds: number[],
  appointmentIds: number[],
  deletableNoteIds: number[],
): Promise<DeleteCounts> {
  const counts = zeroCounts();
  counts.customers = 1;
  counts.projects = projectIds.length;
  counts.appointments = appointmentIds.length;
  counts.notes = deletableNoteIds.length;
  counts.customerNoteLinks = await selectCount(
    connection,
    "select count(*) as count from customer_note where customer_id = ?",
    [customerId],
  );
  counts.customerTagLinks = await selectCount(
    connection,
    "select count(*) as count from customer_tags where customer_id = ?",
    [customerId],
  );
  counts.customerAttachments = await selectCount(
    connection,
    "select count(*) as count from customer_attachment where customer_id = ?",
    [customerId],
  );

  if (projectIds.length > 0) {
    const projectCondition = buildInCondition("project_id", projectIds);
    counts.projectNoteLinks = await selectCount(
      connection,
      `select count(*) as count from project_note where ${projectCondition.sql}`,
      projectCondition.params,
    );
    counts.projectTagLinks = await selectCount(
      connection,
      `select count(*) as count from project_tags where ${projectCondition.sql}`,
      projectCondition.params,
    );
    counts.projectAttachments = await selectCount(
      connection,
      `select count(*) as count from project_attachment where ${projectCondition.sql}`,
      projectCondition.params,
    );
    counts.projectOrderItems = await selectCount(
      connection,
      `select count(*) as count from project_order_items where ${projectCondition.sql}`,
      projectCondition.params,
    );
    counts.projectOrders = await selectCount(
      connection,
      `select count(*) as count from project_order where ${projectCondition.sql}`,
      projectCondition.params,
    );
  }

  if (appointmentIds.length > 0) {
    const appointmentCondition = buildInCondition("appointment_id", appointmentIds);
    counts.appointmentNoteLinks = await selectCount(
      connection,
      `select count(*) as count from appointment_note where ${appointmentCondition.sql}`,
      appointmentCondition.params,
    );
    counts.appointmentTagLinks = await selectCount(
      connection,
      `select count(*) as count from appointment_tags where ${appointmentCondition.sql}`,
      appointmentCondition.params,
    );
    counts.appointmentAttachments = await selectCount(
      connection,
      `select count(*) as count from appointment_attachment where ${appointmentCondition.sql}`,
      appointmentCondition.params,
    );
    counts.appointmentEmployees = await selectCount(
      connection,
      `select count(*) as count from appointment_employee where ${appointmentCondition.sql}`,
      appointmentCondition.params,
    );
    counts.calendarSyncLogs = await selectCount(
      connection,
      `select count(*) as count from calendar_sync_log where ${appointmentCondition.sql}`,
      appointmentCondition.params,
    );
  }

  return counts;
}

async function collectTargetSnapshot(
  connection: Connection,
  customerNumber: string,
  lockCustomer: boolean,
): Promise<TargetSnapshot | null> {
  const customer = await findCustomer(connection, customerNumber, lockCustomer);
  if (!customer) {
    return null;
  }

  const projectIds = await findProjectIds(connection, customer.id);
  const appointmentIds = await findAppointmentIds(connection, customer.id, projectIds);
  const candidateNoteIds = await findCandidateNoteIds(connection, customer.id, projectIds, appointmentIds);
  const deletableNoteIds = await findDeletableNoteIds(
    connection,
    candidateNoteIds,
    customer.id,
    projectIds,
    appointmentIds,
  );
  const attachmentFileRefs = await findAttachmentFileRefs(connection, customer.id, projectIds, appointmentIds);
  const counts = await countTargetRows(connection, customer.id, projectIds, appointmentIds, deletableNoteIds);

  return {
    customer,
    projectIds,
    appointmentIds,
    candidateNoteIds,
    deletableNoteIds,
    attachmentFileRefs,
    counts,
  };
}

async function deleteByIds(
  connection: Connection,
  tableName: string,
  columnName: string,
  ids: number[],
): Promise<number> {
  const condition = buildInCondition(columnName, ids);
  return deleteWhere(connection, tableName, condition.sql, condition.params);
}

async function deleteTargetRows(connection: Connection, target: TargetSnapshot): Promise<DeleteCounts> {
  const deleted = zeroCounts();
  const { customer, projectIds, appointmentIds, deletableNoteIds } = target;

  if (appointmentIds.length > 0) {
    deleted.calendarSyncLogs = await deleteByIds(
      connection,
      "calendar_sync_log",
      "appointment_id",
      appointmentIds,
    );
    deleted.appointmentTagLinks = await deleteByIds(
      connection,
      "appointment_tags",
      "appointment_id",
      appointmentIds,
    );
    deleted.appointmentNoteLinks = await deleteByIds(
      connection,
      "appointment_note",
      "appointment_id",
      appointmentIds,
    );
    deleted.appointmentEmployees = await deleteByIds(
      connection,
      "appointment_employee",
      "appointment_id",
      appointmentIds,
    );
    deleted.appointmentAttachments = await deleteByIds(
      connection,
      "appointment_attachment",
      "appointment_id",
      appointmentIds,
    );
    deleted.appointments = await deleteByIds(connection, "appointments", "id", appointmentIds);
  }

  if (projectIds.length > 0) {
    deleted.projectTagLinks = await deleteByIds(connection, "project_tags", "project_id", projectIds);
    deleted.projectNoteLinks = await deleteByIds(connection, "project_note", "project_id", projectIds);
    deleted.projectAttachments = await deleteByIds(connection, "project_attachment", "project_id", projectIds);
    deleted.projectOrderItems = await deleteByIds(connection, "project_order_items", "project_id", projectIds);
    deleted.projectOrders = await deleteByIds(connection, "project_order", "project_id", projectIds);
    deleted.projects = await deleteByIds(connection, "project", "id", projectIds);
  }

  deleted.customerTagLinks = await deleteWhere(connection, "customer_tags", "customer_id = ?", [customer.id]);
  deleted.customerNoteLinks = await deleteWhere(connection, "customer_note", "customer_id = ?", [customer.id]);
  deleted.customerAttachments = await deleteWhere(connection, "customer_attachment", "customer_id = ?", [
    customer.id,
  ]);

  if (deletableNoteIds.length > 0) {
    const condition = buildInCondition("id", deletableNoteIds);
    deleted.notes = await deleteWhere(
      connection,
      "note",
      `
        ${condition.sql}
          and not exists (select 1 from customer_note cn where cn.note_id = note.id)
          and not exists (select 1 from project_note pn where pn.note_id = note.id)
          and not exists (select 1 from appointment_note an where an.note_id = note.id)
          and not exists (select 1 from employee_note en where en.note_id = note.id)
          and not exists (select 1 from calendar_week_note cwn where cwn.note_id = note.id)
      `,
      condition.params,
    );
  }

  deleted.customers = await deleteWhere(connection, "customer", "id = ?", [customer.id]);
  return deleted;
}

async function verifyNoRemainingTargetRows(
  connection: Connection,
  target: TargetSnapshot,
): Promise<Array<{ tableName: string; count: number }>> {
  const remaining: Array<{ tableName: string; count: number }> = [];
  const addIfRemaining = async (tableName: string, countSql: string, params: unknown[] = []) => {
    const count = await selectCount(connection, countSql, params);
    if (count > 0) {
      remaining.push({ tableName, count });
    }
  };

  await addIfRemaining("customer", "select count(*) as count from customer where id = ?", [target.customer.id]);
  await addIfRemaining("project", "select count(*) as count from project where customer_id = ?", [target.customer.id]);
  await addIfRemaining("customer_note", "select count(*) as count from customer_note where customer_id = ?", [
    target.customer.id,
  ]);
  await addIfRemaining("customer_tags", "select count(*) as count from customer_tags where customer_id = ?", [
    target.customer.id,
  ]);
  await addIfRemaining(
    "customer_attachment",
    "select count(*) as count from customer_attachment where customer_id = ?",
    [target.customer.id],
  );

  if (target.projectIds.length > 0) {
    const projectCondition = buildInCondition("project_id", target.projectIds);
    await addIfRemaining(
      "project_note",
      `select count(*) as count from project_note where ${projectCondition.sql}`,
      projectCondition.params,
    );
    await addIfRemaining(
      "project_tags",
      `select count(*) as count from project_tags where ${projectCondition.sql}`,
      projectCondition.params,
    );
    await addIfRemaining(
      "project_attachment",
      `select count(*) as count from project_attachment where ${projectCondition.sql}`,
      projectCondition.params,
    );
    await addIfRemaining(
      "project_order",
      `select count(*) as count from project_order where ${projectCondition.sql}`,
      projectCondition.params,
    );
    await addIfRemaining(
      "project_order_items",
      `select count(*) as count from project_order_items where ${projectCondition.sql}`,
      projectCondition.params,
    );
  }

  if (target.appointmentIds.length > 0) {
    const appointmentCondition = buildInCondition("appointment_id", target.appointmentIds);
    await addIfRemaining(
      "appointment_note",
      `select count(*) as count from appointment_note where ${appointmentCondition.sql}`,
      appointmentCondition.params,
    );
    await addIfRemaining(
      "appointment_tags",
      `select count(*) as count from appointment_tags where ${appointmentCondition.sql}`,
      appointmentCondition.params,
    );
    await addIfRemaining(
      "appointment_attachment",
      `select count(*) as count from appointment_attachment where ${appointmentCondition.sql}`,
      appointmentCondition.params,
    );
    await addIfRemaining(
      "appointment_employee",
      `select count(*) as count from appointment_employee where ${appointmentCondition.sql}`,
      appointmentCondition.params,
    );
    await addIfRemaining(
      "calendar_sync_log",
      `select count(*) as count from calendar_sync_log where ${appointmentCondition.sql}`,
      appointmentCondition.params,
    );

    const appointmentIdCondition = buildInCondition("id", target.appointmentIds);
    await addIfRemaining(
      "appointments",
      `select count(*) as count from appointments where ${appointmentIdCondition.sql}`,
      appointmentIdCondition.params,
    );
  }

  return remaining;
}

async function cleanupAttachmentFiles(refs: AttachmentFileRef[]): Promise<AttachmentCleanupResult> {
  const result: AttachmentCleanupResult = {
    deleted: 0,
    missing: 0,
    failed: [],
  };

  for (const ref of refs) {
    try {
      const deleted = await deleteAttachmentFile(ref.filename, ref.storagePath);
      if (deleted) {
        result.deleted += 1;
      } else {
        result.missing += 1;
      }
    } catch (error) {
      result.failed.push({
        filename: ref.filename,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return result;
}

function printCounts(title: string, counts: DeleteCounts): void {
  console.log(title);
  console.table({
    Kunde: counts.customers,
    Projekte: counts.projects,
    Termine: counts.appointments,
    "Projekt-Auftrag": counts.projectOrders,
    Auftragspositionen: counts.projectOrderItems,
    Kundennotizen: counts.customerNoteLinks,
    Projektnotizen: counts.projectNoteLinks,
    Terminnotizen: counts.appointmentNoteLinks,
    "gelöschte Notiz-Stammdaten": counts.notes,
    Kundentags: counts.customerTagLinks,
    Projekttags: counts.projectTagLinks,
    Termintags: counts.appointmentTagLinks,
    Kundenanhänge: counts.customerAttachments,
    Projektanhänge: counts.projectAttachments,
    Terminanhänge: counts.appointmentAttachments,
    Terminmitarbeiter: counts.appointmentEmployees,
    "Kalender-Sync-Logs": counts.calendarSyncLogs,
  });
}

async function main(): Promise<void> {
  const { customerNumber, confirmed } = parseArgs(process.argv.slice(2));

  initializeRuntimeEnv();
  const runtimeMode = getRuntimeMode();
  const runtimeConfig = getRuntimeConfig();

  if (runtimeMode !== "development") {
    throw new Error(`Dieses Script darf nur im development-Modus laufen. Aktueller Modus: ${runtimeMode}`);
  }

  const target = assertSafeAdminDestructiveOperationTarget({
    mode: runtimeMode,
    databaseUrl: runtimeConfig.mysqlDatabaseUrl,
    allowedDatabases: runtimeConfig.allowedDatabases,
    allowedHosts: runtimeConfig.allowedHosts,
  });

  const connection = await mysql.createConnection(runtimeConfig.mysqlDatabaseUrl);
  try {
    await assertSqlDatabaseIdentity(connection, target.dbName);

    if (!confirmed) {
      const snapshot = await collectTargetSnapshot(connection, customerNumber, false);
      if (!snapshot) {
        console.log(`Kein Kunde mit Kundennummer '${customerNumber}' gefunden.`);
        return;
      }

      console.log(`Vorschau für Kunde ${snapshot.customer.customerNumber} (ID ${snapshot.customer.id})`);
      console.log(`Datenbank: ${target.dbName}`);
      printCounts("Diese Datensätze würden gelöscht:", snapshot.counts);
      console.log(`Dateianhänge auf Platte: ${snapshot.attachmentFileRefs.length}`);
      console.log("Zum Ausführen erneut mit --confirm starten.");
      return;
    }

    await initStoragePathsFromEnv();
    await connection.beginTransaction();
    let snapshot: TargetSnapshot | null = null;
    try {
      snapshot = await collectTargetSnapshot(connection, customerNumber, true);
      if (!snapshot) {
        await connection.rollback();
        console.log(`Kein Kunde mit Kundennummer '${customerNumber}' gefunden.`);
        return;
      }

      const deleted = await deleteTargetRows(connection, snapshot);
      const remaining = await verifyNoRemainingTargetRows(connection, snapshot);
      if (remaining.length > 0) {
        throw new Error(
          `Nach dem Löschlauf bleiben Zielzeilen übrig: ${remaining
            .map((row) => `${row.tableName}=${row.count}`)
            .join(", ")}`,
        );
      }

      await connection.commit();
      const fileCleanup = await cleanupAttachmentFiles(snapshot.attachmentFileRefs);

      console.log(`Kunde ${snapshot.customer.customerNumber} (ID ${snapshot.customer.id}) wurde gelöscht.`);
      console.log(`Datenbank: ${target.dbName}`);
      printCounts("Gelöschte Datensätze:", deleted);
      console.log(
        `Dateianhänge auf Platte: gelöscht=${fileCleanup.deleted}, bereits fehlend=${fileCleanup.missing}, fehlgeschlagen=${fileCleanup.failed.length}`,
      );

      if (fileCleanup.failed.length > 0) {
        for (const failure of fileCleanup.failed) {
          console.error(`Datei konnte nicht gelöscht werden: ${failure.filename} (${failure.reason})`);
        }
        process.exitCode = 1;
      }
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
