/**
 * Test Scope:
 *
 * Feature: FT02 - Projektverwaltung
 * Use Case: UC FK-Integritaet project -> customer
 *
 * Abgedeckte Regeln:
 * - Die DB erzwingt den FK von project.customer_id auf customer.id.
 * - Ein Insert mit nicht existierendem customer_id muss fehlschlagen.
 *
 * Fehlerfaelle:
 * - Projektinsert mit invalidem customer_id.
 *
 * Ziel:
 * Expliziten Integritaetsnachweis fuer den FK-Constraint auf DB-Ebene liefern.
 */
import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "../../../server/db";
import { projects } from "../../../shared/schema";
import { createCustomerFixture, resetTestDataFactoryState } from "../../helpers/testDataFactory";

describe("FT02 integration: project/customer FK constraint", () => {
  it("rejects project insert when customer_id does not exist", async () => {
    resetTestDataFactoryState();
    const existing = await createCustomerFixture("FK-EXIST");
    const projectName = `FK invalid project ${Date.now()}`;

    let thrown: unknown = null;
    try {
      await db.insert(projects).values({
        customerId: existing.id + 99_999,
        name: projectName,
        descriptionMd: null,
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeTruthy();
    const persisted = await db
      .select()
      .from(projects)
      .where(eq(projects.name, projectName));
    expect(persisted).toHaveLength(0);
  });
});
