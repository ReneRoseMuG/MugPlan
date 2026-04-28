/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Wochen-Preview zeigt links Mitarbeitervollname und rechts KW/Jahr.
 * - Alle gewerteten Wocheneinträge werden kompakt mit Datum, Projektname und Summe gerendert.
 * - Optionale Auftragsnummern bleiben als Zusatzinfo sichtbar.
 *
 * Fehlerfälle:
 * - Preview verliert Kopf- oder Badge-Informationen.
 * - Summenformat oder Terminreihenfolge kippen unbemerkt.
 *
 * Ziel:
 * Die sichtbare Informationsdichte der Wochen-Hover-Preview isoliert absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EmployeeRevenueOverviewPreview } from "../../../client/src/components/EmployeeRevenueOverviewPreview";

describe("employee revenue overview preview", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
  });

  it("renders the preview header and all compact appointment badges", () => {
    const markup = renderToStaticMarkup(
      <EmployeeRevenueOverviewPreview
        employeeFullName="Mitarbeiter, Mia"
        week={{
          isoYear: 2026,
          isoWeek: 18,
          weekStartDate: "2026-04-27",
          weekEndDate: "2026-05-03",
          weekLabel: "KW 18 / 2026",
          orderCount: 2,
          revenueAmount: "3500.50",
          appointments: [
            {
              appointmentId: 91,
              startDate: "2026-04-27",
              projectName: "Nord Projekt mit langem Namen",
              orderNumber: "REV-91",
              amount: "1500.00",
            },
            {
              appointmentId: 92,
              startDate: "2026-04-29",
              projectName: "Süd Projekt",
              orderNumber: null,
              amount: "2000.50",
            },
          ],
        }}
      />,
    );

    expect(markup).toContain("Mitarbeiter, Mia");
    expect(markup).toContain("KW 18 / 2026");
    expect(markup).toContain("2 Auftrag");
    expect(markup).toContain("3.500,50");
    expect(markup).toContain("27.04.26");
    expect(markup).toContain("29.04.26");
    expect(markup).toContain("Nord Projekt mit langem Namen");
    expect(markup).toContain("Süd Projekt");
    expect(markup).toContain("A-Nr. REV-91");
    expect(markup).not.toContain("A-Nr. </p>");
  });
});
