/**
 * Test Scope:
 *
 * Feature: FT21 - Deterministische Dokumentextraktion
 * Use Case: UC Auftragsnummer-Aufloesung fuer bestehende Projekte
 *
 * Abgedeckte Regeln:
 * - resolveProjectByOrderNumber liefert none/single/multiple konsistent.
 * - Leer-/Trim-Eingaben werden normalisiert an den Projektservice uebergeben.
 *
 * Fehlerfaelle:
 * - Mehrfachtreffer werden defensiv als multiple ohne Projekt-Payload gemeldet.
 *
 * Ziel:
 * Stabilitaet der projektbezogenen Auftragsnummer-Aufloesung im Extraktionsprozess absichern.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getProjectsByOrderNumberMock } = vi.hoisted(() => ({
  getProjectsByOrderNumberMock: vi.fn(),
}));

vi.mock("../../../server/services/projectsService", async () => {
  const actual = await vi.importActual<typeof import("../../../server/services/projectsService")>("../../../server/services/projectsService");
  return {
    ...actual,
    getProjectsByOrderNumber: getProjectsByOrderNumberMock,
  };
});

import { resolveProjectByOrderNumber } from "../../../server/services/documentProcessingService";

describe("FT21 document processing project resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns none when no project exists", async () => {
    getProjectsByOrderNumberMock.mockResolvedValueOnce([]);

    const result = await resolveProjectByOrderNumber("  ORD-404  ");

    expect(getProjectsByOrderNumberMock).toHaveBeenCalledWith("ORD-404");
    expect(result).toEqual({
      resolution: "none",
      count: 0,
      project: null,
    });
  });

  it("returns single when exactly one project exists", async () => {
    const project = { id: 7, orderNumber: "ORD-1001" };
    getProjectsByOrderNumberMock.mockResolvedValueOnce([project]);

    const result = await resolveProjectByOrderNumber("ORD-1001");

    expect(result).toEqual({
      resolution: "single",
      count: 1,
      project,
    });
  });

  it("returns multiple when more than one project exists", async () => {
    getProjectsByOrderNumberMock.mockResolvedValueOnce([{ id: 1 }, { id: 2 }]);

    const result = await resolveProjectByOrderNumber("ORD-2002");

    expect(result).toEqual({
      resolution: "multiple",
      count: 2,
      project: null,
    });
  });
});
