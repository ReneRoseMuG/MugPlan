/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der `core`-Fingerprint erkennt den erwarteten Reset-Zustand mit Rollen, `test-admin`, Default-Kategorie und leeren Fachtabellen.
 * - Der `seeded`-Fingerprint erkennt den explizit gesetzten System-Seed.
 * - Storage-Fingerprints verlangen leere Upload- und Backup-Pfade.
 *
 * Fehlerfaelle:
 * - Ein unerwarteter Fachdatensatz bleibt nach dem Reset unbemerkt.
 * - Seed-Zustaende werden als `core` akzeptiert oder umgekehrt.
 * - Storage-Reste bleiben im Fingerprint unbemerkt.
 *
 * Ziel:
 * Die neue Fingerprint-Infrastruktur fuer den spaeteren Test-Isolationsumbau gegen die echte Testumgebung absichern.
 */
import fs from "fs/promises";
import path from "path";
import { describe, expect, it } from "vitest";

import {
  assertCombinedTestFingerprint,
  assertDatabaseFingerprint,
  assertStorageFingerprint,
} from "../../helpers/testIsolationFingerprint";
import { applyTestSystemSeed } from "../../helpers/resetDatabase";
import { buildCustomerPayload } from "../../helpers/testDataFactory";
import * as customersService from "../../../server/services/customersService";

describe("test isolation fingerprint integration", () => {
  it("accepts the reset baseline as core with empty storage", async () => {
    await expect(assertCombinedTestFingerprint("core", "none")).resolves.toBeUndefined();
  });

  it("accepts the explicit system seed as seeded fingerprint", async () => {
    await applyTestSystemSeed();
    await expect(assertDatabaseFingerprint("seeded")).resolves.toBeUndefined();
    await expect(assertStorageFingerprint("none")).resolves.toBeUndefined();
  });

  it("rejects unexpected business rows in the core fingerprint", async () => {
    await customersService.createCustomer(buildCustomerPayload("FPRINT"));

    await expect(assertDatabaseFingerprint("core")).rejects.toThrow("customers");
  });

  it("rejects leftover files in the storage fingerprint", async () => {
    const uploadsPath = process.env.ATTACHMENT_STORAGE_PATH;
    expect(typeof uploadsPath).toBe("string");
    if (typeof uploadsPath !== "string") {
      throw new Error("ATTACHMENT_STORAGE_PATH missing");
    }

    const filePath = path.join(uploadsPath, "leftover.txt");
    await fs.writeFile(filePath, "leftover", "utf8");

    await expect(assertStorageFingerprint("none")).rejects.toThrow("uploads");
  });
});
