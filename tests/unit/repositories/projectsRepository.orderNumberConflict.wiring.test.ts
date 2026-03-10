/**
 * Test Scope:
 *
 * Feature: FT21 - Dokumentextraktion
 * Use Case: UC Auftragsnummer-Duplikatpruefung bei Projektimport
 *
 * Abgedeckte Regeln:
 * - Duplikatpruefung fuer Auftragsnummern beruecksichtigt nur aktive Projekte.
 * - Query-Bedingung bleibt trim-basiert fuer exakte Auftragsnummernvergleiche.
 *
 * Fehlerfaelle:
 * - Inaktive/archivierte Projekte blockieren irrtuemlich neue Imports.
 *
 * Ziel:
 * Sicherstellen, dass die FT21-Duplikatpruefung geloeschte/archivierte Projekte nicht als Konflikt wertet.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT21 projects repository order-number conflict wiring", () => {
  const filePath = path.resolve(process.cwd(), "server/repositories/projectsRepository.ts");
  const source = readFileSync(filePath, "utf8");

 it("checks duplicate order numbers only against active projects", () => {
    expect(source).toContain("export async function existsProjectByOrderNumber(orderNumber: string)");
    expect(source).toContain("trim(${projectOrder.orderNumber}) = ${normalizedOrderNumber}");
    expect(source).toContain("and ${projects.isActive} = true");
  });
});
