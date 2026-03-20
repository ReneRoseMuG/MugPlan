/**
 * Test Scope:
 *
 * Feature: FT07/FT26/FT31 - Sidebar
 *
 * Abgedeckte Regeln:
 * - Dispatcher sehen Reports und Monitoring inkl. Zaehlbadge.
 * - Reader sehen keine Reports-/Monitoring-Navigation.
 * - Backup-Disablement bleibt als sichtbare Seitenmarkierung erhalten.
 *
 * Fehlerfaelle:
 * - Reports oder Monitoring verschwinden fuer berechtigte Rollen.
 * - Reader erhalten unberechtigte Navigationseintraege.
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

  it("shows reports and monitoring with count for dispatcher and marks disabled backups visibly", () => {
    const html = renderToStaticMarkup(
      <Sidebar
        onViewChange={vi.fn()}
        onLogout={vi.fn()}
        currentView="monitoring"
        userRole="DISPATCHER"
        monitoringCount={3}
        backupDisabled
      />,
    );

    expect(html).toContain("Reports");
    expect(html).toContain("Monitoring");
    expect(html).toContain("nav-monitoring-count");
    expect(html).toContain(">3<");
    expect(html).toContain("border-2 border-red-600");
    expect(html).not.toContain("Einstellungen");
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

    expect(html).not.toContain("Reports");
    expect(html).not.toContain("Monitoring");
    expect(html).not.toContain("nav-monitoring");
  });
});
