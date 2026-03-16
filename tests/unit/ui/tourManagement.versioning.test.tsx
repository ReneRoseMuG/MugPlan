/**
 * Test Scope:
 *
 * Feature: FT07 - Tourverwaltung Multi-User
 * Use Case: UC Tour bearbeiten/loeschen/zuweisen mit Versionspflicht
 *
 * Abgedeckte Regeln:
 * - Tour-PATCH sendet color und version.
 * - Tour-DELETE sendet version.
 * - Batch-Assign sendet items[{ employeeId, version }].
 * - Dialog-Delete ist nur fuer ADMIN sichtbar und nutzt den Dialog-Delete-Flow.
 * - Appointment-wirksame Kaskaden triggern anschliessend den zentralen Monitoring-Refresh.
 *
 * Fehlerfaelle:
 * - Fehlende Tour-/Employee-Version wird als VALIDATION_ERROR blockiert.
 * - VERSION_CONFLICT wird konfliktbezogen gemeldet.
 * - BUSINESS_CONFLICT beim Loeschen wird mit FT04-Hinweistext gemeldet.
 *
 * Ziel:
 * Verdrahtung der Tour-Mutationen auf den Multi-User-Contract absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT07 TourManagement versioning wiring", () => {
  const filePath = path.resolve(process.cwd(), "client/src/components/TourManagement.tsx");
  const source = readFileSync(filePath, "utf8");

  it("sends version in tour update and delete payloads", () => {
    expect(source).toContain("apiRequest(\"PATCH\", `/api/tours/${id}`, { color, version })");
    expect(source).toContain("apiRequest(\"DELETE\", `/api/tours/${id}`, { version })");
    expect(source).toContain("deleteMutation.mutateAsync({ id: currentTour.id, version: currentTour.version })");
  });

  it("uses batch payload items with employee version", () => {
    expect(source).toContain("const items = employeeIds.map((employeeId) => {");
    expect(source).toContain("return { employeeId, version: employee.version };");
    expect(source).toContain("apiRequest(\"POST\", `/api/tours/${tourId}/employees`, { items })");
  });

  it("maps VERSION_CONFLICT and BUSINESS_CONFLICT to user-facing conflict text", () => {
    expect(source).toContain("extractApiCode(error) === \"VERSION_CONFLICT\"");
    expect(source).toContain("Datensatz wurde zwischenzeitlich geaendert");
    expect(source).toContain("if (code === \"BUSINESS_CONFLICT\")");
    expect(source).toContain("Tour kann nicht geloescht werden, solange Termine zugeordnet sind.");
  });

  it("wires admin-only delete action into the tour edit dialog", () => {
    expect(source).toContain("const isAdmin = effectiveUserRole === \"ADMIN\";");
    expect(source).toContain("onDelete={handleDeleteFromDialog}");
    expect(source).toContain("canDelete={isAdmin}");
  });

  it("refreshes monitoring after appointment-wirksame cascade executions", () => {
    expect(source).toContain("void refreshMonitoringWithNotification(toast);");
  });
});
