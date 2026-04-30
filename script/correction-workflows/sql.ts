import type { Connection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { normalizeDatabaseValue } from "./json";
import type { JsonValue, WorkflowRowKey, WorkflowSnapshotRow } from "./types";

const IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

function escapeIdentifier(identifier: string): string {
  if (!IDENTIFIER_PATTERN.test(identifier)) {
    throw new Error(`Unsupported SQL identifier '${identifier}'.`);
  }
  return `\`${identifier}\``;
}

function buildWhereClause(key: WorkflowRowKey, params: Array<string | number | boolean>): string {
  return Object.entries(key)
    .map(([field, value]) => {
      const escapedField = escapeIdentifier(field);
      if (value === null) {
        return `${escapedField} IS NULL`;
      }
      params.push(value);
      return `${escapedField} = ?`;
    })
    .join(" AND ");
}

function buildSetClause(
  set: Record<string, JsonValue>,
  params: Array<string | number | boolean | null>,
): string {
  return Object.entries(set)
    .map(([field, value]) => {
      const escapedField = escapeIdentifier(field);
      params.push(value as string | number | boolean | null);
      return `${escapedField} = ?`;
    })
    .join(", ");
}

export function buildRowReference(table: string, key: WorkflowRowKey): string {
  const parts = Object.entries(key)
    .map(([field, value]) => `${field}=${value === null ? "null" : String(value)}`)
    .join(", ");
  return `${table}[${parts}]`;
}

export async function selectRowByKey(
  connection: Connection,
  table: string,
  key: WorkflowRowKey,
  options?: { forUpdate?: boolean },
): Promise<Record<string, JsonValue> | null> {
  const params: Array<string | number | boolean> = [];
  const whereClause = buildWhereClause(key, params);
  const lockClause = options?.forUpdate === true ? " FOR UPDATE" : "";
  const query = `SELECT * FROM ${escapeIdentifier(table)} WHERE ${whereClause} LIMIT 1${lockClause}`;
  const [rows] = await connection.execute<RowDataPacket[]>(query, params);
  const row = rows[0];
  if (!row) {
    return null;
  }
  return normalizeDatabaseValue(row) as Record<string, JsonValue>;
}

export async function updateRowByKey(
  connection: Connection,
  table: string,
  key: WorkflowRowKey,
  set: Record<string, JsonValue>,
): Promise<number> {
  const params: Array<string | number | boolean | null> = [];
  const setClause = buildSetClause(set, params);
  const whereClause = buildWhereClause(key, params);
  const query = `UPDATE ${escapeIdentifier(table)} SET ${setClause} WHERE ${whereClause}`;
  const [result] = await connection.execute<ResultSetHeader>(query, params);
  return Number(result.affectedRows ?? 0);
}

export function sameRowIdentity(left: WorkflowSnapshotRow, rightTable: string, rightKey: WorkflowRowKey): boolean {
  if (left.table !== rightTable) {
    return false;
  }
  const leftEntries = Object.entries(left.key);
  const rightEntries = Object.entries(rightKey);
  if (leftEntries.length !== rightEntries.length) {
    return false;
  }
  return leftEntries.every(([field, value]) => rightKey[field] === value);
}

