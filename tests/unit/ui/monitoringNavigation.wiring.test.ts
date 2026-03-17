/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Home und Sidebar binden FT31 als eigene Hauptansicht fuer ADMIN/DISPONENT ein.
 * - Der Sidebar-Counter nutzt denselben Monitoring-Query-Pfad wie die Seite.
 * - Monitoring-Refresh und Hinweislogik laufen ueber den zentralen Frontend-Helper statt ueber den Auth-Flow.
 *
 * Fehlerfaelle:
 * - Monitoring erscheint nicht in Home oder Sidebar.
 * - Counter oder Monitoring-Hinweis bauen parallele Pfade ausserhalb des Monitoring-Endpunkts.
 *
 * Ziel:
 * Die zentrale FT31-Frontend-Verdrahtung regressionssicher absichern.
 */

import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT31 unit: monitoring navigation wiring", () => {
  const appSource = readFileSync(path.resolve(process.cwd(), "client/src/App.tsx"), "utf8");
  const loginSource = readFileSync(path.resolve(process.cwd(), "client/src/pages/Login.tsx"), "utf8");
  const homeSource = readFileSync(path.resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");
  const sidebarSource = readFileSync(path.resolve(process.cwd(), "client/src/components/Sidebar.tsx"), "utf8");
  const pageSource = readFileSync(path.resolve(process.cwd(), "client/src/components/MonitoringPage.tsx"), "utf8");

  it("registers monitoring view and sidebar navigation for dispatcher/admin", () => {
    expect(homeSource).toContain('| "monitoring"');
    expect(homeSource).toContain('view === "monitoring" && canAccessMonitoring');
    expect(homeSource).toContain("const canAccessMonitoring = canAccessReports;");
    expect(sidebarSource).toContain('label="Monitoring"');
    expect(sidebarSource).toContain('currentView === "monitoring"');
  });

  it("uses the shared monitoring GET endpoint for page and sidebar counter", () => {
    expect(homeSource).toContain("queryKey: [api.monitoring.list.path]");
    expect(homeSource).toContain("monitoringCount={canAccessMonitoring ? monitoringItems?.length ?? 0 : undefined}");
    expect(pageSource).toContain("queryKey: [api.monitoring.list.path]");
    expect(pageSource).toContain('testId="table-monitoring"');
    expect(pageSource).toContain("onRowDoubleClick={(row) => onOpenAppointment?.(row.appointmentId)}");
    expect(pageSource).toContain("api.monitoring.adminConfigSet.path");
  });

  it("removes the login summary path and uses the shared helper for monitoring notifications", () => {
    expect(loginSource).not.toContain("monitoringSummary");
    expect(appSource).not.toContain("initialMonitoringSummary");
    expect(homeSource).not.toContain("problematische Termine im Monitoring");
    expect(readFileSync(path.resolve(process.cwd(), "client/src/lib/monitoring.ts"), "utf8")).toContain("refreshMonitoringWithNotification");
  });
});
