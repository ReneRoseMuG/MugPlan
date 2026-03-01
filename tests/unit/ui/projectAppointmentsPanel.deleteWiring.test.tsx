/**
 * Test Scope:
 *
 * Feature: FT04 - Terminverwaltung
 * Use Case: UC Termin aus Projektseiten-Panel loeschen
 *
 * Abgedeckte Regeln:
 * - Delete aus ProjectAppointmentsPanel sendet version im DELETE-Body.
 * - VERSION_CONFLICT wird mit fachlicher Meldung statt rohem HTTP-Text behandelt.
 * - LOCK_VIOLATION wird mit gesperrt-Meldung behandelt.
 *
 * Fehlerfaelle:
 * - Delete ohne Version fuehrt zu VALIDATION_ERROR oder VERSION_CONFLICT.
 * - Konflikte werden als generisches "Conflict" angezeigt.
 *
 * Ziel:
 * Sicherstellen, dass der Panel-Loeschpfad den Optimistic-Locking-Contract einhaelt.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT04 project appointments panel delete wiring", () => {
  const filePath = path.resolve(process.cwd(), "client/src/components/ProjectAppointmentsPanel.tsx");
  const source = readFileSync(filePath, "utf8");

  it("sends delete payload with appointment version", () => {
    expect(source).toContain("mutationFn: async ({ appointmentId, version }: { appointmentId: number; version: number }) => {");
    expect(source).toContain("\"Content-Type\": \"application/json\"");
    expect(source).toContain("body: JSON.stringify({ version })");
    expect(source).toContain("deleteAppointmentMutation.mutate({ appointmentId: appointment.id, version: appointment.version })");
  });

  it("maps VERSION_CONFLICT and LOCK_VIOLATION to explicit toasts", () => {
    expect(source).toContain("if (err.code === \"VERSION_CONFLICT\")");
    expect(source).toContain("zwischenzeitlich geaendert");
    expect(source).toContain("if (err.code === \"LOCK_VIOLATION\" || err.status === 403)");
    expect(source).toContain("Termin ist gesperrt.");
  });

  it("sets panel-specific helpKey for project sidebar appointments", () => {
    expect(source).toContain("helpKey=\"projects.sidebar.appointments\"");
  });
});
