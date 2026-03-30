/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Legacy-Tabellen `component_specifications` und `product_component` existieren im aktiven Testschema nicht mehr.
 * - Die Legacy-Spalte `project_order_items.specification_id` existiert im aktiven Testschema nicht mehr.
 * - Die bereits zuvor entfernten Projektstatus-Tabellen bleiben ebenfalls absent.
 *
 * Fehlerfaelle:
 * - Eine destruktive Migration laesst Alt-Tabellen oder Alt-Spalten im Schema zurueck.
 *
 * Ziel:
 * Den finalen Release-B-Zielzustand des DB-Schemas direkt ueber `INFORMATION_SCHEMA` absichern.
 */
import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { db } from "../../../server/db";

describe("Release B integration: legacy master-data schema removal", () => {
  it("keeps removed legacy tables and columns absent from the active schema", async () => {
    const [legacyTableRows] = await db.execute(sql`
      select table_name
      from information_schema.tables
      where table_schema = database()
        and table_name in (
          'component_specifications',
          'product_component',
          'project_project_status',
          'project_status'
        )
      order by table_name
    `);

    const [legacyColumnRows] = await db.execute(sql`
      select column_name
      from information_schema.columns
      where table_schema = database()
        and table_name = 'project_order_items'
        and column_name = 'specification_id'
    `);

    expect(legacyTableRows).toEqual([]);
    expect(legacyColumnRows).toEqual([]);
  });
});
