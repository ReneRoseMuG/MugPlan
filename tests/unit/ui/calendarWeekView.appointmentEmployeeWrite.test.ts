/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Unit
 *
 * Realitätsgrad:
 * - Reine Logik mit injizierten Fakes (kein React, kein Netzwerk, keine DB). Die echten
 *   Seiteneffekte – Termin frisch lesen und PATCH/DELETE schreiben – werden über
 *   Dependency-Fakes nachgestellt, weil der Beweis allein die Retry-/Merge-Logik betrifft.
 *
 * Mock-Entscheidung:
 * - Unit-Mocks: loadFreshAppointment/write als Fakes an der Netzwerkgrenze. Keine Wunschzustände,
 *   die im echten System nicht entstehen können (409 ist ein realer Serverzustand).
 *
 * Isolation:
 * - keine (reine Funktionen mit injizierten Abhängigkeiten)
 *
 * Abgedeckte Regeln:
 * - Die Menü-Zuweisung nutzt die FRISCH gelesene Version, nicht einen mitgegebenen Cache-Stand.
 * - Neue Mitarbeiter werden additiv auf den aktuellen Serverstand gelegt und dedupliziert.
 * - Bei VERSION_CONFLICT wird genau einmal mit erneut gelesener (frischer) Version wiederholt.
 * - Das Abziehen des letzten Mitarbeiters wird erkannt (Grundlage der "Termin ohne Mitarbeiter"-Warnung im Dialog).
 *
 * Fehlerfälle:
 * - Erster 409 → Refetch → zweiter Versuch erfolgreich (kein 409 nach außen).
 * - Zweiter 409 → Fehler wird durchgereicht (kein endloses Retry).
 * - Nicht-Konflikt-Fehler → sofort durchgereicht, kein Refetch/Retry.
 *
 * Ziel:
 * Den versionsrobusten Menü-Zuweisungs-/Entfernungspfad absichern, der vorher mit veralteter
 * Kalender-Cache-Version einen 409 auslöste, obwohl der Termin nur lokal stale war.
 */
import { describe, expect, it, vi } from "vitest";
import {
  buildAssignAppointmentEmployeesPayload,
  runAppointmentEmployeeWriteWithFreshVersion,
  willAppointmentHaveNoEmployeesAfterRemoval,
  type FreshAppointmentForEmployeeWrite,
} from "../../../client/src/components/calendar/CalendarWeekView";

const baseAppointment: FreshAppointmentForEmployeeWrite = {
  id: 51,
  version: 7,
  projectId: 11,
  customerId: 21,
  tourId: 31,
  startDate: "2026-07-06",
  endDate: null,
  startTime: null,
  employees: [{ id: 9 }],
};

const buildVersionConflict = () => new Error('409: {"code":"VERSION_CONFLICT","message":"Termin wurde zwischenzeitlich geändert"}');
const isVersionConflict = (error: unknown) =>
  error instanceof Error && error.message.includes("VERSION_CONFLICT");

describe("buildAssignAppointmentEmployeesPayload", () => {
  it("legt neue Mitarbeiter additiv auf den frischen Serverstand und nutzt die frische Version", () => {
    const payload = buildAssignAppointmentEmployeesPayload(baseAppointment, [9, 12]);

    // Gegenbeispiel zum Cache-Bug: die Version stammt aus dem frisch gelesenen Termin (7),
    // nicht aus einem potentiell veralteten Aufrufer-Wert.
    expect(payload.version).toBe(7);
    // Bestand (9) bleibt erhalten, der neue (12) kommt hinzu, Duplikate werden entfernt.
    expect(payload.employeeIds).toEqual([9, 12]);
    expect(payload).toMatchObject({
      projectId: 11,
      customerId: 21,
      tourId: 31,
      startDate: "2026-07-06",
      endDate: null,
      startTime: null,
    });
  });

  it("behält die vorhandenen Server-Mitarbeiter, wenn nichts Neues hinzukommt", () => {
    expect(buildAssignAppointmentEmployeesPayload(baseAppointment, []).employeeIds).toEqual([9]);
  });

  it("dedupliziert, wenn ein bereits vorhandener Mitarbeiter erneut ausgewählt wird", () => {
    expect(buildAssignAppointmentEmployeesPayload(baseAppointment, [9]).employeeIds).toEqual([9]);
  });
});

describe("runAppointmentEmployeeWriteWithFreshVersion", () => {
  it("liest den Termin einmal frisch und schreibt damit (Happy Path)", async () => {
    const loadFreshAppointment = vi.fn().mockResolvedValue({ ...baseAppointment, version: 7 });
    const write = vi.fn().mockResolvedValue("ok");

    const result = await runAppointmentEmployeeWriteWithFreshVersion({
      loadFreshAppointment,
      write,
      isVersionConflict,
    });

    expect(result).toBe("ok");
    expect(loadFreshAppointment).toHaveBeenCalledTimes(1);
    expect(write).toHaveBeenCalledTimes(1);
    expect(write).toHaveBeenCalledWith(expect.objectContaining({ version: 7 }));
  });

  it("liest bei VERSION_CONFLICT neu und wiederholt genau einmal mit frischer Version", async () => {
    const loadFreshAppointment = vi.fn()
      .mockResolvedValueOnce({ ...baseAppointment, version: 7 })
      .mockResolvedValueOnce({ ...baseAppointment, version: 8 });
    const write = vi.fn()
      .mockRejectedValueOnce(buildVersionConflict())
      .mockResolvedValueOnce("ok-after-retry");

    const result = await runAppointmentEmployeeWriteWithFreshVersion({
      loadFreshAppointment,
      write,
      isVersionConflict,
    });

    expect(result).toBe("ok-after-retry");
    expect(loadFreshAppointment).toHaveBeenCalledTimes(2);
    // Der zweite Schreibversuch nutzt die NEU gelesene Version 8, nicht erneut die alte 7.
    expect(write).toHaveBeenNthCalledWith(1, expect.objectContaining({ version: 7 }));
    expect(write).toHaveBeenNthCalledWith(2, expect.objectContaining({ version: 8 }));
  });

  it("reicht einen zweiten VERSION_CONFLICT durch, statt endlos zu wiederholen", async () => {
    const loadFreshAppointment = vi.fn().mockResolvedValue({ ...baseAppointment });
    const write = vi.fn()
      .mockRejectedValueOnce(buildVersionConflict())
      .mockRejectedValueOnce(buildVersionConflict());

    await expect(runAppointmentEmployeeWriteWithFreshVersion({
      loadFreshAppointment,
      write,
      isVersionConflict,
    })).rejects.toThrow("VERSION_CONFLICT");

    expect(loadFreshAppointment).toHaveBeenCalledTimes(2);
    expect(write).toHaveBeenCalledTimes(2);
  });

  it("wiederholt NICHT bei einem Nicht-Konflikt-Fehler", async () => {
    const loadFreshAppointment = vi.fn().mockResolvedValue({ ...baseAppointment });
    const write = vi.fn().mockRejectedValue(new Error("500: boom"));

    await expect(runAppointmentEmployeeWriteWithFreshVersion({
      loadFreshAppointment,
      write,
      isVersionConflict,
    })).rejects.toThrow("boom");

    expect(loadFreshAppointment).toHaveBeenCalledTimes(1);
    expect(write).toHaveBeenCalledTimes(1);
  });
});

describe("willAppointmentHaveNoEmployeesAfterRemoval", () => {
  it("erkennt das Abziehen des letzten Mitarbeiters (Termin bleibt ohne Mitarbeiter)", () => {
    expect(willAppointmentHaveNoEmployeesAfterRemoval([9], 9)).toBe(true);
  });

  it("meldet keinen leeren Termin, solange weitere Mitarbeiter verbleiben", () => {
    expect(willAppointmentHaveNoEmployeesAfterRemoval([9, 12], 9)).toBe(false);
  });

  it("bleibt false, wenn der zu entfernende Mitarbeiter gar nicht am Termin hängt", () => {
    expect(willAppointmentHaveNoEmployeesAfterRemoval([9, 12], 99)).toBe(false);
  });
});
