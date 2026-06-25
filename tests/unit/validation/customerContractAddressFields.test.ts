/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - insertCustomerSchema entfernt die flachen Adressfelder (addressLine1, addressLine2,
 *   postalCode, city, country) aus dem geparsten Kunden-Create-Contract (MS-68).
 * - updateCustomerSchema entfernt dieselben Adressfelder aus dem Kunden-Update-Contract.
 *
 * Fehlerfaelle:
 * - Ein flaches Adressfeld ueberlebt die Contract-Validierung und gelangt in den Schreibpfad.
 *
 * Ziel:
 * Absichern, dass Kundenadressen ausschliesslich ueber das Adressobjekt (customer_address)
 * laufen und der flache Kunden-Schreibpfad keine Adresse mehr als Quelle annimmt.
 */
import { describe, expect, it } from "vitest";
import { insertCustomerSchema, updateCustomerSchema } from "@shared/schema";

const ADDRESS_KEYS = ["addressLine1", "addressLine2", "postalCode", "city", "country"] as const;

describe("MS-68 Kunden-Contract entfernt flache Adressfelder", () => {
  it("entfernt Adressfelder aus dem insertCustomerSchema-Ergebnis", () => {
    const parsed = insertCustomerSchema.parse({
      customerNumber: "K-1001",
      firstName: "Tom",
      lastName: "Voosen",
      company: null,
      email: null,
      phone: null,
      addressLine1: "1 Tommesknapp",
      addressLine2: "Hinterhaus",
      postalCode: "7419",
      city: "Brouch",
      country: "Luxemburg",
    });

    for (const key of ADDRESS_KEYS) {
      expect(parsed).not.toHaveProperty(key);
    }
    expect(parsed.customerNumber).toBe("K-1001");
    expect(parsed.firstName).toBe("Tom");
  });

  it("entfernt Adressfelder aus dem updateCustomerSchema-Ergebnis", () => {
    const parsed = updateCustomerSchema.parse({
      customerNumber: "K-1001",
      addressLine1: "1 Tommesknapp",
      addressLine2: "Hinterhaus",
      postalCode: "7419",
      city: "Brouch",
      country: "Luxemburg",
      isActive: true,
    });

    for (const key of ADDRESS_KEYS) {
      expect(parsed).not.toHaveProperty(key);
    }
    expect(parsed.customerNumber).toBe("K-1001");
    expect(parsed.isActive).toBe(true);
  });
});
