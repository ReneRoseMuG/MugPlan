/**
 * Test Scope:
 *
 * Feature: FT21 - Dokumentextraktion / Projekt-Duplikatpruefung
 * Use Case: UC Auftragsnummer-Konflikt nur gegen aktive Projekte
 *
 * Abgedeckte Regeln:
 * - Leere oder nur whitespace-basierte Auftragsnummern gelten nicht als Konflikt.
 * - Aktive Projekte werden bei der Auftragsnummer-Duplikatpruefung als Konflikt erkannt.
 * - Inaktive Projekte blockieren eine erneute Verwendung der Auftragsnummer nicht.
 *
 * Fehlerfaelle:
 * - Archivierte Projekte werden irrtuemlich weiter als Duplikat gezaehlt.
 *
 * Ziel:
 * Die fachliche FT21-Duplikatpruefung ueber echte Persistenzwirkung statt ueber Repository-Quelltext absichern.
 */
import { beforeEach, describe, expect, it } from "vitest";

import { createCustomerFixture, resetTestDataFactoryState } from "../../helpers/testDataFactory";
import * as projectsService from "../../../server/services/projectsService";

let sequence = 1;

function nextOrderNumber(prefix: string) {
  const current = sequence;
  sequence += 1;
  return `${prefix}-${String(current).padStart(3, "0")}`;
}

async function createProjectWithOrderNumber(orderNumber: string) {
  const customer = await createCustomerFixture("FT21-ORD");
  return projectsService.createProject({
    customerId: customer.id,
    name: `Projekt ${orderNumber}`,
    orderNumber,
    descriptionMd: null,
    version: 1,
  });
}

describe("FT21 integration: project order number conflict detection", () => {
  beforeEach(() => {
    resetTestDataFactoryState();
    sequence = 1;
  });

  it("returns false for blank order numbers", async () => {
    await expect(projectsService.isOrderNumberAlreadyImported("   ")).resolves.toBe(false);
  });

  it("treats only active projects as order-number conflicts", async () => {
    const activeOrderNumber = nextOrderNumber("ORD-ACTIVE");
    const inactiveOrderNumber = nextOrderNumber("ORD-INACTIVE");

    const activeProject = await createProjectWithOrderNumber(activeOrderNumber);
    const inactiveProject = await createProjectWithOrderNumber(inactiveOrderNumber);

    const deactivatedProject = await projectsService.updateProject(inactiveProject.id, {
      version: inactiveProject.version,
      isActive: false,
    });

    expect(deactivatedProject).not.toBeNull();
    expect(activeProject.isActive).toBe(true);

    await expect(
      projectsService.isOrderNumberAlreadyImported(`  ${activeOrderNumber}  `),
    ).resolves.toBe(true);
    await expect(
      projectsService.isOrderNumberAlreadyImported(`  ${inactiveOrderNumber}  `),
    ).resolves.toBe(false);
  });
});
