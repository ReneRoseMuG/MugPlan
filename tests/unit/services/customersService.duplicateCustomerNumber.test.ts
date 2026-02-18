/**
 * Test Scope:
 *
 * Feature: FT21 - Kundennummer-Duplikatbehandlung
 * Use Case: UC Kundenanlage mit fachlicher Duplicate-Fehlermeldung
 *
 * Abgedeckte Regeln:
 * - createCustomer mappt DB-Duplikat (customer_number) auf CUSTOMER_NUMBER_CONFLICT.
 * - Nicht-Duplicate-Fehler werden unveraendert weitergegeben.
 *
 * Fehlerfaelle:
 * - Generischer 500-Fehler statt fachlichem 409-Code bei Duplikat.
 *
 * Ziel:
 * Robuste Fehlerabbildung fuer eindeutige Kundennummern absichern.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const { createCustomerMock } = vi.hoisted(() => ({
  createCustomerMock: vi.fn(),
}));

vi.mock("../../../server/repositories/customersRepository", () => ({
  createCustomer: createCustomerMock,
}));

import { createCustomer, CustomersError } from "../../../server/services/customersService";

describe("FT21 customers service duplicate customer number mapping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps mysql duplicate entry on customer_number to CUSTOMER_NUMBER_CONFLICT", async () => {
    createCustomerMock.mockRejectedValueOnce({
      code: "ER_DUP_ENTRY",
      errno: 1062,
      sqlMessage: "Duplicate entry '1001' for key 'customer.customer_number'",
    });

    await expect(
      createCustomer({
        customerNumber: "1001",
        firstName: "A",
        lastName: "B",
        company: null,
        email: null,
        phone: "123",
        addressLine1: null,
        addressLine2: null,
        postalCode: null,
        city: null,
        version: 1,
      }),
    ).rejects.toMatchObject<Partial<CustomersError>>({
      status: 409,
      code: "CUSTOMER_NUMBER_CONFLICT",
    });
  });

  it("rethrows non-duplicate errors", async () => {
    const error = new Error("db unavailable");
    createCustomerMock.mockRejectedValueOnce(error);

    await expect(
      createCustomer({
        customerNumber: "1002",
        firstName: "A",
        lastName: "B",
        company: null,
        email: null,
        phone: "123",
        addressLine1: null,
        addressLine2: null,
        postalCode: null,
        city: null,
        version: 1,
      }),
    ).rejects.toBe(error);
  });
});
