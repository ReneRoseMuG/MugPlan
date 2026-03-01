/**
 * Test Scope:
 *
 * Feature: FT04/FT16 - Tourenverwaltung
 * Use Case: UC Tour bearbeiten mit kontextbasierter Terminliste
 *
 * Abgedeckte Regeln:
 * - TourEditForm bindet AppointmentsListPage ueber context={{ type: "tour", tourId }} ein.
 * - Neue Tour (tourId=null) bleibt ueber emptyStateOverride im leeren Zustand.
 * - Individueller helpKey fuer den Tour-Form-Kontext bleibt verdrahtet.
 * - Legacy-Props hideTourFilter/lockedTourId/hideTourColumn/enforceFromToday werden im TourEditForm nicht mehr verwendet.
 *
 * Fehlerfaelle:
 * - TourEditForm nutzt weiterhin Legacy-Props statt context.
 *
 * Ziel:
 * Die UI-Verdrahtung fuer die neue kontextbasierte Terminliste im Tour-Form regressionssicher absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT04 TourEditForm appointments context wiring", () => {
  const tourFormPath = path.resolve(process.cwd(), "client/src/components/TourEditForm.tsx");
  const tourFormSource = readFileSync(tourFormPath, "utf8");

  it("wires AppointmentsListPage in tour form using context", () => {
    expect(tourFormSource).toContain("<AppointmentsListPage");
    expect(tourFormSource).toContain("helpKey=\"appointments.list.tourForm\"");
    expect(tourFormSource).toContain("context={{ type: \"tour\", tourId: tour?.id ?? null }}");
    expect(tourFormSource).toContain("emptyStateOverride={leftEmptyState}");
  });

  it("does not use deprecated appointments list props in tour form", () => {
    expect(tourFormSource).not.toContain("hideTourFilter");
    expect(tourFormSource).not.toContain("lockedTourId");
    expect(tourFormSource).not.toContain("hideTourColumn");
    expect(tourFormSource).not.toContain("enforceFromToday");
  });
});
