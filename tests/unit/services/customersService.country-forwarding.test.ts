/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - updateCustomer normalisiert `country` als optionales Textfeld und reicht es an das Repository weiter.
 * - createCustomer normalisiert `country` ebenfalls vor dem Repository-Aufruf.
 *
 * Fehlerfaelle:
 * - `country` bleibt ungetrimmt oder geht im Service-Pfad verloren.
 * - Leere `country`-Werte werden nicht zu `null` normalisiert.
 *
 * Ziel:
 * Das neue Kundenfeld `country` im Service-Pfad fuer Create und Update regressionssicher absichern.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createCustomerMock,
  getCustomerMock,
  updateCustomerWithVersionMock,
} = vi.hoisted(() => ({
  createCustomerMock: vi.fn(),
  getCustomerMock: vi.fn(),
  updateCustomerWithVersionMock: vi.fn(),
}));

vi.mock("../../../server/repositories/customersRepository", () => ({
  createCustomer: createCustomerMock,
  getCustomer: getCustomerMock,
  updateCustomerWithVersion: updateCustomerWithVersionMock,
}));

import { createCustomer, updateCustomer } from "../../../server/services/customersService";

describe("FT05+ customers service country forwarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("trims and forwards country during create", async () => {
    createCustomerMock.mockResolvedValueOnce({ id: 1, country: "Luxemburg" });

    await createCustomer({
      customerNumber: "1001",
      firstName: "Tom",
      lastName: "Voosen",
      company: null,
      email: null,
      phone: null,
      addressLine1: "1 Tommesknapp",
      addressLine2: null,
      postalCode: "7419",
      city: "Brouch",
      country: " Luxemburg ",
    });

    expect(createCustomerMock).toHaveBeenCalledWith(expect.objectContaining({
      country: "Luxemburg",
    }));
  });

  it("normalizes blank country to null and forwards it during update", async () => {
    getCustomerMock.mockResolvedValueOnce({
      id: 7,
      version: 3,
      isActive: true,
      firstName: "Tom",
      lastName: "Voosen",
      company: null,
      country: "Deutschland",
    });
    updateCustomerWithVersionMock.mockResolvedValueOnce({
      kind: "updated",
      customer: { id: 7, country: null },
    });

    await updateCustomer(7, {
      version: 3,
      country: "   ",
    }, "ADMIN");

    expect(updateCustomerWithVersionMock).toHaveBeenCalledWith(
      7,
      3,
      expect.objectContaining({
        country: null,
      }),
    );
  });
});
