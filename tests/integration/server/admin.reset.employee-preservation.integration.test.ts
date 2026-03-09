/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Admin-Reset loescht keine Mitarbeitenden aus dem Bestand.
 * - Admin-Reset entfernt weiterhin fachliche Demo-Daten wie Kunden.
 *
 * Fehlerfaelle:
 * - Reset entfernt Mitarbeitende trotz Ausschlussregel.
 * - Reset laesst Kunden trotz Domain-Reset bestehen.
 *
 * Ziel:
 * Nachweisen, dass der zentrale Reset-Pfad Mitarbeitende ausnimmt und dennoch die restlichen Demo-Domaenendaten leert.
 */
import { eq, sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { db } from "../../../server/db";
import { resetDatabase } from "../../../server/services/adminService";
import * as customersService from "../../../server/services/customersService";
import * as employeesService from "../../../server/services/employeesService";
import { customers, employees } from "../../../shared/schema";

describe("PKG-02 integration: admin reset preserves employees", () => {
  it("keeps employees but removes customers", async () => {
    const employee = await employeesService.createEmployee({
      firstName: "Reset",
      lastName: "Mitarbeiter",
      phone: null,
      email: null,
    });
    const customer = await customersService.createCustomer({
      customerNumber: "900001",
      firstName: "Reset",
      lastName: "Kunde",
      company: null,
      email: null,
      phone: null,
      addressLine1: null,
      addressLine2: null,
      postalCode: null,
      city: null,
    });

    const result = await resetDatabase();

    expect("employees" in result.deleted).toBe(false);
    expect(result.deleted.customers).toBeGreaterThanOrEqual(1);

    const [employeeAfterRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(employees)
      .where(eq(employees.id, employee.id));
    const [customerAfterRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(customers)
      .where(eq(customers.id, customer.id));

    expect(Number(employeeAfterRow?.count ?? 0)).toBe(1);
    expect(Number(customerAfterRow?.count ?? 0)).toBe(0);
  });
});
