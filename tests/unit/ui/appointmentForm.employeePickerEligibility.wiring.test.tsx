/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Unit
 *
 * Realitätsgrad:
 * - Echte Formular-Logik (resolveEmployeePickerConflictReasons inkl. buildEmployeePickerConflictReasons).
 *   Der Tour-spezifische Vorschau-Transport wird als Fake injiziert (Netzwerkgrenze), weil der Beweis
 *   allein die Picker-Verdrahtung betrifft. Kein DOM nötig (es ist auch keine DOM-Umgebung installiert).
 *
 * Mock-Entscheidung:
 * - Unit-Fake für den Vorschau-Loader, der das angefragte Flag aufzeichnet und realistische
 *   Server-Items zurückgibt. Keine Wunschzustände – Konflikt-Items sind reale Serverzustände.
 *
 * Isolation:
 * - keine DB/FS
 *
 * Abgedeckte Regeln:
 * - Der Mitarbeiter-Picker des Terminformulars fordert die Konfliktvorschau verbindlich mit
 *   includeAvailableEmployees an (sonst liefert der Server keine systemweiten Konflikt-MA).
 * - Konflikt-Items werden auf differenzierte Sperrgründe abgebildet; auswählbare bleiben frei.
 *
 * Fehlerfälle:
 * - Ohne das Flag fehlen belegte Mitarbeiter in der Vorschau und erscheinen im Picker
 *   fälschlich als wählbar (der ursprüngliche Bug). Der aufgezeichnete Flag-Wert beweist das Gegenteil.
 *
 * Ziel:
 * Die zuvor ungetestete Formular-Verdrahtung des Mitarbeiter-Pickers regressionssicher absichern –
 * genau die Lücke, durch die der Eignungs-Bug trotz Server- und Komponententests blieb.
 */
import { describe, expect, it } from "vitest";
import { resolveEmployeePickerConflictReasons } from "../../../client/src/components/AppointmentForm";

describe("AppointmentForm: resolveEmployeePickerConflictReasons", () => {
  it("fordert die Vorschau verbindlich mit includeAvailableEmployees an und bildet Konflikte auf differenzierte Sperrgründe ab", async () => {
    const requestedFlags: boolean[] = [];

    const reasons = await resolveEmployeePickerConflictReasons(async (includeAvailableEmployees) => {
      requestedFlags.push(includeAvailableEmployees);
      return {
        isoYear: 2026,
        isoWeek: 28,
        hasWeekPlan: false,
        currentEmployeeIds: [],
        items: [
          { employeeId: 99, employeeName: "Tom Konflikt", status: "conflict", selectable: false, conflictReason: "EMPLOYEE_OVERLAP", source: "available" },
          { employeeId: 14, employeeName: "Uwe Urlaub", status: "conflict", selectable: false, conflictReason: "ON_LEAVE", source: "available" },
          { employeeId: 13, employeeName: "Bea Bestand", status: "already_present", selectable: false, conflictReason: null, source: "week_plan" },
          { employeeId: 11, employeeName: "Mia Frei", status: "will_add", selectable: true, conflictReason: null, source: "available" },
        ],
      };
    });

    // Beweis 1: Genau ein Aufruf, und dieser fordert die systemweite Verfügbarkeit an.
    expect(requestedFlags).toEqual([true]);

    // Beweis 2: Belegte MA sind gesperrt mit differenziertem Grund, auswählbare bleiben frei.
    expect(reasons).toEqual({
      99: "Überschneidung mit bestehendem Termin",
      14: "Im Urlaub / abwesend",
      13: "Bereits diesem Termin zugewiesen",
    });
    // Gegenbeispiel: der auswählbare Mitarbeiter erhält keinen Sperreintrag.
    expect(reasons[11]).toBeUndefined();
  });
});
