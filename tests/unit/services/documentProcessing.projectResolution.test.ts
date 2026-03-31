/**
 * Test Scope:
 *
 * Feature: FT21 - Deterministische Dokumentextraktion
 * Use Case: UC Auftragsnummer-Aufloesung fuer bestehende Projekte
 *
 * Abgedeckte Regeln:
 * - resolveProjectByOrderNumber liefert none/single/multiple konsistent.
 * - Einzeltreffer enthalten den aktuellsten Termin oder null bei fehlender Terminplanung.
 * - Leer-/Trim-Eingaben werden normalisiert an den Projektservice uebergeben.
 *
 * Fehlerfaelle:
 * - Mehrfachtreffer werden defensiv als multiple ohne Projekt-Payload gemeldet.
 * - Ohne Terminplanung wird kein Terminobjekt konstruiert.
 *
 * Ziel:
 * Stabilitaet der projektbezogenen Auftragsnummer-Aufloesung im Extraktionsprozess absichern.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getProjectsByOrderNumberMock, getLatestAppointmentSummaryByProjectIdMock } = vi.hoisted(() => ({
  getProjectsByOrderNumberMock: vi.fn(),
  getLatestAppointmentSummaryByProjectIdMock: vi.fn(),
}));

vi.mock("../../../server/services/projectsService", async () => {
  const actual = await vi.importActual<typeof import("../../../server/services/projectsService")>("../../../server/services/projectsService");
  return {
    ...actual,
    getProjectsByOrderNumber: getProjectsByOrderNumberMock,
  };
});

vi.mock("../../../server/repositories/appointmentsRepository", async () => {
  const actual = await vi.importActual<typeof import("../../../server/repositories/appointmentsRepository")>("../../../server/repositories/appointmentsRepository");
  return {
    ...actual,
    getLatestAppointmentSummaryByProjectId: getLatestAppointmentSummaryByProjectIdMock,
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
      latestAppointment: null,
    });
  });

  it("returns single with the latest appointment when exactly one project exists", async () => {
    const project = { id: 7, orderNumber: "ORD-1001" };
    getProjectsByOrderNumberMock.mockResolvedValueOnce([project]);
    getLatestAppointmentSummaryByProjectIdMock.mockResolvedValueOnce({
      id: 12,
      startDate: "2099-05-03",
      endDate: null,
      startTime: "14:00:00",
      tourName: "Tour Nord",
      customerName: "Kunde Beispiel",
    });

    const result = await resolveProjectByOrderNumber("ORD-1001");

    expect(getLatestAppointmentSummaryByProjectIdMock).toHaveBeenCalledWith(7);
    expect(result).toEqual({
      resolution: "single",
      count: 1,
      project,
      latestAppointment: {
        id: 12,
        startDate: "2099-05-03",
        endDate: null,
        startTime: "14:00:00",
        startTimeHour: 14,
        tourName: "Tour Nord",
        customerName: "Kunde Beispiel",
      },
    });
  });

  it("returns single with null latestAppointment when the project has no appointments", async () => {
    const project = { id: 8, orderNumber: "ORD-1002" };
    getProjectsByOrderNumberMock.mockResolvedValueOnce([project]);
    getLatestAppointmentSummaryByProjectIdMock.mockResolvedValueOnce(null);

    const result = await resolveProjectByOrderNumber("ORD-1002");

    expect(result).toEqual({
      resolution: "single",
      count: 1,
      project,
      latestAppointment: null,
    });
  });

  it("returns multiple when more than one project exists", async () => {
    getProjectsByOrderNumberMock.mockResolvedValueOnce([{ id: 1 }, { id: 2 }]);

    const result = await resolveProjectByOrderNumber("ORD-2002");

    expect(result).toEqual({
      resolution: "multiple",
      count: 2,
      project: null,
      latestAppointment: null,
    });
  });
});
