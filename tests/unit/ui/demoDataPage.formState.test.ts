/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Persistierte Demo-Formzustandsdaten werden beim Oeffnen wiederhergestellt.
 * - Fehlende oder ungueltige Persistenzwerte fallen auf den definierten Defaultzustand zurueck.
 *
 * Fehlerfaelle:
 * - Defektes JSON darf keinen ungueltigen Formularzustand erzeugen.
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
      appointmentBaseSeedRunId: "seed-1",
      appointmentsPerProject: 4,
      appointmentsRandomSeed: "555",
      seedWindowDaysMin: -10,
      seedWindowDaysMax: 15,
      reklDelayDaysMin: 3,
      reklDelayDaysMax: 5,
      reklShare: 0.5,
      appointmentsLocale: "en",
    }));

    expect(parsed.baseCustomers).toBe(11);
    expect(parsed.baseProjects).toBe(8);
    expect(parsed.baseGenerateAttachments).toBe(false);
    expect(parsed.appointmentBaseSeedRunId).toBe("seed-1");
    expect(parsed.seedWindowDaysMin).toBe(-10);
    expect(parsed.reklShare).toBe(0.5);
  });

  it("falls back to defaults for invalid persisted payloads", () => {
    const parsed = parseDemoDataFormState("{invalid");
    expect(parsed.baseCustomers).toBe(10);
    expect(parsed.baseProjects).toBe(30);
    expect(parsed.appointmentsLocale).toBe("de");
  });
});
