/**
 * Test Scope:
 *
 * Feature: FT05/FT05+ - Employee DTO/Contract Validierung
 * Use Case: UC Payload-Validierung fuer Employee Create/Update/Toggle
 *
 * Abgedeckte Regeln:
 * - Employee-Create verlangt Pflichtfelder und korrekte Datentypen.
 * - Employee-Update verlangt eine gueltige Version >= 1.
 * - ToggleActive verlangt isActive + gueltige Version >= 1.
 * - Strukturverletzungen auf Root-Ebene werden abgewiesen.
 *
 * Fehlerfaelle:
 * - Fehlende oder negative Version.
 * - Falsche Datentypen.
 * - Fehlende Pflichtfelder.
 *
 * Ziel:
 * DTO- und Contract-Verhalten als IST fuer FT05/FT05+ reproduzierbar dokumentieren.
 */
import { describe, expect, it } from "vitest";
import { api } from "../../../shared/routes";

describe("FT05 unit: employees dto validation", () => {
  it("create dto accepts valid minimal payload", () => {
    const result = api.employees.create.input.safeParse({
      firstName: "Max",
      lastName: "Muster",
      phone: null,
      email: null,
    });

    expect(result.success).toBe(true);
  });

  it("create dto rejects missing required fields", () => {
    const result = api.employees.create.input.safeParse({
      lastName: "Muster",
    });

    expect(result.success).toBe(false);
  });

  it("create dto rejects invalid datatypes", () => {
    const result = api.employees.create.input.safeParse({
      firstName: 123,
      lastName: "Muster",
      phone: false,
    });

    expect(result.success).toBe(false);
  });

  it("create dto rejects overlong firstName (IST)", () => {
    const result = api.employees.create.input.safeParse({
      firstName: "x".repeat(300),
      lastName: "Lang",
    });

    expect(result.success).toBe(false);
  });

  it("update dto rejects missing version", () => {
    const result = api.employees.update.input.safeParse({
      firstName: "Neu",
    });

    expect(result.success).toBe(false);
  });

  it("update dto rejects version <= 0", () => {
    const result = api.employees.update.input.safeParse({
      firstName: "Neu",
      version: 0,
    });

    expect(result.success).toBe(false);
  });

  it("update dto rejects invalid version datatype", () => {
    const result = api.employees.update.input.safeParse({
      firstName: "Neu",
      version: "1",
    });

    expect(result.success).toBe(false);
  });

  it("update dto rejects invalid payload structure", () => {
    const result = api.employees.update.input.safeParse([
      {
        version: 1,
        firstName: "Neu",
      },
    ]);

    expect(result.success).toBe(false);
  });

  it("update dto currently allows overlong firstName (IST documentation)", () => {
    const result = api.employees.update.input.safeParse({
      version: 1,
      firstName: "x".repeat(300),
    });

    expect(result.success).toBe(true);
  });

  it("toggle dto rejects missing version", () => {
    const result = api.employees.toggleActive.input.safeParse({
      isActive: false,
    });

    expect(result.success).toBe(false);
  });

  it("toggle dto rejects negative version", () => {
    const result = api.employees.toggleActive.input.safeParse({
      isActive: false,
      version: -1,
    });

    expect(result.success).toBe(false);
  });

  it("toggle dto rejects missing isActive or invalid type", () => {
    const missingFlag = api.employees.toggleActive.input.safeParse({ version: 1 });
    const wrongFlagType = api.employees.toggleActive.input.safeParse({ version: 1, isActive: "false" });

    expect(missingFlag.success).toBe(false);
    expect(wrongFlagType.success).toBe(false);
  });
});
