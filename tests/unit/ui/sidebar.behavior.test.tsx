/**
 * Test Scope:
 *
 * Feature: FT07/FT26/FT31 - Sidebar
 *
 * Abgedeckte Regeln:
 * - Dispatcher sehen Reports, Journal und Monitoring inklusive triggerweiser Pills direkt unter dem Navigationseintrag.
 * - Die globale Kalendernavigation bietet eine Wochenübersicht und die neue Monatsübersicht als monatliche Hauptansicht.
 * - Reader sehen keine Reports-/Journal-/Monitoring-Navigation, aber den allgemeinen Einstieg in die Benutzereinstellungen.
 * - Backup-Disablement bleibt als sichtbare Seitenmarkierung erhalten.
 *
 * Fehlerfaelle:
 * - Reports, Journal oder Monitoring verschwinden fuer berechtigte Rollen.
 * - Trigger-Pills erscheinen nicht oder an der falschen Stelle oder zeigen falsche Zaehler.
 * - Reader erhalten unberechtigte Navigationseintraege oder verlieren den Zugriff auf eigene Einstellungen.
 *
 * Ziel:
 * Die sichtbare Navigationsrolle der Sidebar ueber gerendertes Verhalten absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

import { Sidebar } from "../../../client/src/components/Sidebar";

describe("FT07/FT26/FT31 UI: Sidebar behavior", () => {
  beforeEach(() => {
    Object.assign(globalThis, { React });
  });

  it("shows reports and monitoring plus trigger pills below the monitoring navigation entry for dispatcher", () => {
    const html = renderToStaticMarkup(
      <Sidebar
        onViewChange={vi.fn()}
        onLogout={vi.fn()}
        currentView="monitoring"
        userRole="DISPATCHER"
        monitoringSummary={[
          { triggerCode: "TR-01", triggerName: "Mindestzahl Mitarbeiter", count: 3, color: "#DC2626" },
          { triggerCode: "TR-02", triggerName: "Geparkt", count: 1, color: "#D4537E" },
        ]}
        backupDisabled
      />,
    );

    expect(html).toContain("Reports");
    expect(html).toContain("Journal");
    expect(html).toContain("Monitoring");
    expect(html).toContain("Wochen");
    expect(html).toContain("Monats");
    expect(html).toContain("Tour PLZ Planung");
    expect(html).toContain("nav-tour-plz-plan");
    expect(html).toContain("nav-tour-plz-plan-open-tab");
    expect(html).toContain("monitoring-trigger-pills");
    expect(html).toContain("monitoring-pill-TR-01");
    expect(html).toContain("TR-01: 3");
    expect(html).toContain("monitoring-pill-TR-02");
    expect(html).toContain("TR-02: 1");
    expect(html.indexOf("nav-monitoring")).toBeLessThan(html.indexOf("monitoring-trigger-pills"));
    expect(html).toContain("nav-monitoring-open-tab");
    expect(html).toContain("border-2 border-red-600");
    expect(html).not.toContain("nav-monitoring-count");
    expect(html).toContain("Meine Einstellungen");
  });

  it("hides reports and monitoring for reader roles", () => {
    const html = renderToStaticMarkup(
      <Sidebar
        onViewChange={vi.fn()}
        onLogout={vi.fn()}
        currentView="appointmentsList"
        userRole="READER"
      />,
    );

    expect(html).toContain("Wochen");
    expect(html).toContain("Monats");
    expect(html).toContain("Tour PLZ Planung");
    expect(html).not.toContain("Reports");
    expect(html).not.toContain("Journal");
    expect(html).not.toContain("Monitoring");
    expect(html).not.toContain("nav-monitoring");
    expect(html).not.toContain("nav-monitoring-open-tab");
    expect(html).not.toContain("monitoring-trigger-pills");
    expect(html).toContain("Meine Einstellungen");
  });
});
