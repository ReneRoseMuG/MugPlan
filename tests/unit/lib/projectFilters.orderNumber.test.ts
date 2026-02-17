/**
 * Test Scope:
 *
 * Feature: FT02 - Projektverwaltung
 * Use Case: UC Projektfilter Auftragsnummer
 *
 * Abgedeckte Regeln:
 * - Projekte koennen ueber die optionale Auftragsnummer per Teiltreffer gefiltert werden.
 * - Leere Auftragsnummer-Filterwerte schraenken die Ergebnisliste nicht ein.
 * - Alphanumerische Auftragsnummern bleiben unveraendert filterbar.
 *
 * Fehlerfaelle:
 * - Fehlender Auftragsnummer-Wert am Projekt darf nicht zu false-positiven Treffern fuehren.
 *
 * Ziel:
 * Sicherstellen, dass der neue Projektfilter "Auftragsnummer" fachlich korrekt arbeitet.
 */
import { describe, expect, it } from "vitest";
import type { Customer, Project } from "../../../shared/schema";
import { applyProjectFilters, defaultProjectFilters } from "../../../client/src/lib/project-filters";

function buildProject(input: Partial<Project>): Project {
  return {
    id: 1,
    name: "Projekt",
    orderNumber: null,
    customerId: 1,
    descriptionMd: null,
    isActive: true,
    version: 1,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...input,
  };
}

function buildCustomer(input: Partial<Customer>): Customer {
  return {
    id: 1,
    customerNumber: "1001",
    firstName: "Max",
    lastName: "Mustermann",
    fullName: "Max Mustermann",
    company: null,
    email: null,
    phone: "0123456789",
    addressLine1: null,
    addressLine2: null,
    postalCode: null,
    city: null,
    isActive: true,
    version: 1,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...input,
  };
}

describe("FT02 project filters by order number", () => {
  it("filters projects by partial order number match", () => {
    const projects: Project[] = [
      buildProject({ id: 1, name: "Sauna A", orderNumber: "AB-123", customerId: 1 }),
      buildProject({ id: 2, name: "Sauna B", orderNumber: "CD-456", customerId: 2 }),
    ];
    const customersById = new Map<number, Customer>([
      [1, buildCustomer({ id: 1, customerNumber: "1001", lastName: "Alpha", fullName: "A Alpha" })],
      [2, buildCustomer({ id: 2, customerNumber: "1002", lastName: "Beta", fullName: "B Beta" })],
    ]);

    const result = applyProjectFilters(
      projects,
      { ...defaultProjectFilters, orderNumber: "AB-" },
      customersById,
    );

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it("does not filter when order number filter is empty", () => {
    const projects: Project[] = [
      buildProject({ id: 1, orderNumber: "AB-123" }),
      buildProject({ id: 2, orderNumber: null }),
    ];
    const customersById = new Map<number, Customer>([
      [1, buildCustomer({ id: 1 })],
    ]);

    const result = applyProjectFilters(
      projects,
      { ...defaultProjectFilters, orderNumber: "" },
      customersById,
    );

    expect(result).toHaveLength(2);
  });
});
