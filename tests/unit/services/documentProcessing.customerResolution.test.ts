/**
 * Test Scope:
 *
 * Feature: FT20 - Dokumentextraktion
 * Use Case: UC Kundennummer-Auflösung und Duplikatprüfung
 *
 * Abgedeckte Regeln:
 * - resolveCustomerByNumber liefert none/single/multiple konsistent.
 * - checkCustomerDuplicate spiegelt count korrekt in duplicate wider.
 *
 * Fehlerfaelle:
 * - Leer-/Trim-Eingaben werden normalisiert an den Service übergeben.
 *
 * Ziel:
 * Stabilität der Kundennummer-Auflösung im Extraktionsprozess absichern.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCustomersByCustomerNumberMock } = vi.hoisted(() => ({
  getCustomersByCustomerNumberMock: vi.fn(),
}));

vi.mock("../../../server/services/customersService", () => ({
  getCustomersByCustomerNumber: getCustomersByCustomerNumberMock,
  createCustomer: vi.fn(),
}));

vi.mock("../../../server/services/aiExtractionService", () => ({
  createExtractionProvider: () => ({
    extractStructuredData: vi.fn(),
  }),
}));

import { checkCustomerDuplicate, resolveCustomerByNumber } from "../../../server/services/documentProcessingService";

describe("FT20 document processing customer resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns none when no customer exists", async () => {
    getCustomersByCustomerNumberMock.mockResolvedValueOnce([]);
    const result = await resolveCustomerByNumber(" 404 ");

    expect(getCustomersByCustomerNumberMock).toHaveBeenCalledWith("404");
    expect(result).toEqual({
      resolution: "none",
      count: 0,
      customer: null,
    });
  });

  it("returns single when exactly one customer exists", async () => {
    const customer = { id: 7, customerNumber: "1001" };
    getCustomersByCustomerNumberMock.mockResolvedValueOnce([customer]);
    const result = await resolveCustomerByNumber("1001");

    expect(result.resolution).toBe("single");
    expect(result.count).toBe(1);
    expect(result.customer).toEqual(customer);
  });

  it("returns multiple when more than one customer exists", async () => {
    getCustomersByCustomerNumberMock.mockResolvedValueOnce([{ id: 1 }, { id: 2 }]);
    const result = await resolveCustomerByNumber("1001");

    expect(result).toEqual({
      resolution: "multiple",
      count: 2,
      customer: null,
    });
  });

  it("maps duplicate flag from resolution count", async () => {
    getCustomersByCustomerNumberMock.mockResolvedValueOnce([{ id: 1 }]);
    const duplicate = await checkCustomerDuplicate("1001");
    expect(duplicate).toEqual({ duplicate: true, count: 1 });

    getCustomersByCustomerNumberMock.mockResolvedValueOnce([]);
    const noDuplicate = await checkCustomerDuplicate("1002");
    expect(noDuplicate).toEqual({ duplicate: false, count: 0 });
  });
});
