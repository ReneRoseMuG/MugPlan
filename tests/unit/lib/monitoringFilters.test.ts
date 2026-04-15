/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Monitoring-Filter wenden Text- und Nummern-Teiltreffer fuer Kunde, Projekt und Auftrag kombiniert an.
 * - Tour- und Trigger-Filter arbeiten exakt und behalten Doppeltrigger-Termine fuer passende Trigger sichtbar.
 * - Die Kundenanzeige formatiert Nachname/Vorname bevorzugt und faellt sonst auf den Legacy-Anzeigenamen zurueck.
 *
 * Fehlerfaelle:
 * - Monitoring-Filter verlieren Treffer bei kombinierten Kriterien oder Doppeltriggern.
 * - Kundenzeilen bleiben ohne Anzeige, obwohl ein Fallbackname vorhanden ist.
 *
 * Ziel:
 * Die clientseitige Monitoring-Filterlogik und Kundenformatierung isoliert absichern.
 */
import { describe, expect, it } from "vitest";
import type { MonitoringListResponse } from "../../../shared/routes";
import {
  applyMonitoringFilters,
  defaultMonitoringFilters,
  formatMonitoringCustomerName,
} from "../../../client/src/lib/monitoring-filters";

function buildMonitoringItem(overrides: Partial<MonitoringListResponse[number]> = {}): MonitoringListResponse[number] {
  return {
    appointmentId: 1,
    startDate: "2099-01-01",
    startTime: "08:00:00",
    tourId: 7,
    tourName: "Tour 7",
    orderNumber: "ORD-1001",
    projectTitle: "Wintergarten Nord",
    projectName: "Wintergarten Nord",
    customerNumber: "1001",
    customerFirstName: "Anna",
    customerLastName: "Albers",
    customerName: "Albers, Anna",
    employeeCount: 0,
    triggerCode: "TR-01",
    triggerCodes: ["TR-01"],
    triggerName: "Mindestzahl Mitarbeiter",
    ...overrides,
  };
}

describe("FT31 unit: monitoring filters", () => {
  it("filters monitoring rows by combined text and number matches", () => {
    const items: MonitoringListResponse = [
      buildMonitoringItem(),
      buildMonitoringItem({
        appointmentId: 2,
        orderNumber: "ORD-2002",
        projectTitle: "Sommergarten Sued",
        projectName: "Sommergarten Sued",
        customerNumber: "2002",
        customerFirstName: "Berta",
        customerLastName: "Becker",
        customerName: "Becker, Berta",
      }),
    ];

    const result = applyMonitoringFilters(items, {
      ...defaultMonitoringFilters,
      customerLastName: "alb",
      customerNumber: "100",
      projectTitle: "winter",
      orderNumber: "ORD-10",
    });

    expect(result.map((item) => item.appointmentId)).toEqual([1]);
  });

  it("filters tours exactly and matches trigger filters against combined trigger rows", () => {
    const items: MonitoringListResponse = [
      buildMonitoringItem({
        appointmentId: 1,
        tourId: 7,
        triggerCode: "TR-01",
        triggerCodes: ["TR-01", "TR-02"],
        triggerName: "Mindestzahl Mitarbeiter + Geparkt",
      }),
      buildMonitoringItem({
        appointmentId: 2,
        tourId: 7,
        triggerCode: "TR-01",
        triggerCodes: ["TR-01"],
      }),
      buildMonitoringItem({
        appointmentId: 3,
        tourId: 8,
        tourName: "Tour 8",
        triggerCode: "TR-02",
        triggerCodes: ["TR-02"],
        triggerName: "Geparkt",
      }),
    ];

    const result = applyMonitoringFilters(items, {
      ...defaultMonitoringFilters,
      tourId: 7,
      triggerCode: "TR-02",
    });

    expect(result.map((item) => item.appointmentId)).toEqual([1]);
  });

  it("formats customer names from explicit parts first and falls back to the legacy name", () => {
    expect(formatMonitoringCustomerName(buildMonitoringItem())).toBe("Albers, Anna");
    expect(formatMonitoringCustomerName(buildMonitoringItem({
      customerFirstName: null,
      customerLastName: null,
      customerName: "Fallback Kunde",
    }))).toBe("Fallback Kunde");
  });
});
