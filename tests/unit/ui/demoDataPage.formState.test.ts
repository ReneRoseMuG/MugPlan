/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Persistierte Demo-Formzustandsdaten werden beim Oeffnen wiederhergestellt.
 * - Fehlende oder ungueltige Persistenzwerte fallen auf den definierten Defaultzustand zurueck.
 *
 * Fehlerfaelle:
 * - Defektes JSON darf keinen ungueltigen Formularzustand erzeugen.
 * - Leere Statuslisten muessen auf die Standard-Statuswerte zurueckfallen.
 *
 * Ziel:
 * Die Frontend-Wiederherstellung des Demo-Daten-Adminformulars regressionssicher absichern.
 */
import { describe, expect, it } from "vitest";
import { parseDemoDataFormState } from "../../../client/src/components/DemoDataPage";

describe("FT20 DemoDataPage form state parsing", () => {
  it("restores persisted demo form values", () => {
    const parsed = parseDemoDataFormState(JSON.stringify({
      baseCustomers: 11,
      baseProjects: 8,
      baseGenerateAttachments: false,
      baseRandomSeed: "123",
      baseLocale: "en",
      baseProjectStatuses: [{ title: "Test", color: "#000000", description: "ok" }],
      appointmentBaseSeedRunId: "seed-1",
      appointmentsPerProject: 4,
      appointmentsRandomSeed: "555",
      seedWindowDaysMin: 10,
      seedWindowDaysMax: 15,
      reklDelayDaysMin: 3,
      reklDelayDaysMax: 5,
      reklShare: 0.5,
      appointmentsLocale: "en",
    }));

    expect(parsed.baseCustomers).toBe(11);
    expect(parsed.baseProjects).toBe(8);
    expect(parsed.baseGenerateAttachments).toBe(false);
    expect(parsed.baseProjectStatuses).toEqual([{ title: "Test", color: "#000000", description: "ok" }]);
    expect(parsed.appointmentBaseSeedRunId).toBe("seed-1");
    expect(parsed.reklShare).toBe(0.5);
  });

  it("falls back to defaults for invalid persisted payloads", () => {
    const parsed = parseDemoDataFormState("{invalid");
    expect(parsed.baseCustomers).toBe(10);
    expect(parsed.baseProjects).toBe(30);
    expect(parsed.baseProjectStatuses).toHaveLength(3);
    expect(parsed.appointmentsLocale).toBe("de");
  });

  it("falls back to default statuses when persisted statuses are empty", () => {
    const parsed = parseDemoDataFormState(JSON.stringify({
      baseCustomers: 10,
      baseProjects: 30,
      baseGenerateAttachments: true,
      baseRandomSeed: "",
      baseLocale: "de",
      baseProjectStatuses: [],
      appointmentBaseSeedRunId: "",
      appointmentsPerProject: 1,
      appointmentsRandomSeed: "",
      seedWindowDaysMin: 60,
      seedWindowDaysMax: 90,
      reklDelayDaysMin: 14,
      reklDelayDaysMax: 42,
      reklShare: 0.33,
      appointmentsLocale: "de",
    }));

    expect(parsed.baseProjectStatuses).toHaveLength(3);
    expect(parsed.baseProjectStatuses[0]?.title).toBe("Neu");
  });
});
