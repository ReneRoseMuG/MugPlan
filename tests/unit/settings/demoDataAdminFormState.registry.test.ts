/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Setting `demoData.adminFormState` ist als USER-String in der Registry hinterlegt.
 * - Nur gueltige JSON-Formzustaende der Demo-Daten-Adminansicht werden akzeptiert.
 *
 * Fehlerfaelle:
 * - Defekte JSON-Strings duerfen nicht validiert werden.
 * - Unvollstaendige oder typfalsche Formzustandsfelder duerfen nicht akzeptiert werden.
 *
 * Ziel:
 * Die serverseitige Validierung fuer persistente Demo-Formulardaten stabil absichern.
 */
import { describe, expect, it } from "vitest";
import { userSettingsRegistry } from "../../../server/settings/registry";

describe("FT20 settings registry: demoData.adminFormState", () => {
  it("defines the demo admin form state as USER string setting", () => {
    const setting = userSettingsRegistry.demoDataAdminFormState;
    expect(setting.key).toBe("demoData.adminFormState");
    expect(setting.type).toBe("string");
    expect(setting.defaultValue).toBe("");
    expect(setting.allowedScopes).toEqual(["USER"]);
  });

  it("accepts only valid serialized demo admin form states", () => {
    const setting = userSettingsRegistry.demoDataAdminFormState;
    const validState = JSON.stringify({
      baseCustomers: 10,
      baseProjects: 30,
      baseGenerateAttachments: true,
      baseRandomSeed: "",
      baseLocale: "de",
      appointmentBaseSeedRunId: "",
      appointmentsPerProject: 1,
      appointmentsRandomSeed: "",
      seedWindowDaysMin: -14,
      seedWindowDaysMax: 90,
      reklDelayDaysMin: 14,
      reklDelayDaysMax: 42,
      reklShare: 0.33,
      appointmentsLocale: "de",
    });

    expect(setting.validate(validState)).toBe(true);
    expect(setting.validate("{")).toBe(false);
    expect(setting.validate(JSON.stringify({ ...JSON.parse(validState), baseCustomers: undefined }))).toBe(false);
    expect(setting.validate(JSON.stringify({ ...JSON.parse(validState), reklShare: "0.33" }))).toBe(false);
  });
});
