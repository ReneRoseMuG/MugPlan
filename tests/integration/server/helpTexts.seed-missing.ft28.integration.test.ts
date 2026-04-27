/**
 * Test Scope:
 *
 * Feature: FT28 - Hilfetext Auto-Seed
 * Use Case: Fehlende Frontend-HelpKeys als Hilfetexte anlegen
 *
 * Abgedeckte Regeln:
 * - Der Seed-Endpunkt legt nur fehlende HelpKeys an.
 * - Bestehende Hilfetexte bleiben in Titel und Body unveraendert.
 * - Ein zweiter identischer Seed-Lauf erzeugt keine Duplikate.
 * - duplicateKeys und warnings werden unveraendert aus dem Scanner weitergereicht.
 *
 * Fehlerfaelle:
 * - Seed erzeugt Duplikate fuer bereits vorhandene Keys.
 * - Bestehende Hilfetexte werden trotz Skip ueberschrieben.
 *
 * Ziel:
 * Den HTTP/Service/Repository/DB-Vertrag des FT28-Seed-Endpunkts mit echten Seed-Ergebnissen,
 * Nicht-Ergebnissen und Idempotenz absichern.
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";
import type express from "express";

const { scanFrontendHelpKeysMock } = vi.hoisted(() => ({
  scanFrontendHelpKeysMock: vi.fn(),
}));

vi.mock("../../../server/services/helpTextFrontendKeyScanService", () => ({
  scanFrontendHelpKeys: scanFrontendHelpKeysMock,
}));

import { db } from "../../../server/db";
import { helpTexts } from "../../../shared/schema";
import { createApiTestApp, loginAdminAgent } from "../../helpers/apiTestHarness";
import { nextDeterministicToken, resetDeterministicTokens } from "../../helpers/deterministic";

let app: express.Express;

beforeAll(async () => {
  app = await createApiTestApp();
});

beforeEach(() => {
  scanFrontendHelpKeysMock.mockReset();
  resetDeterministicTokens("ft28-helptext-seed");
});

function nextHelpKey(label: string): string {
  return `ft28.seed.${label}.${nextDeterministicToken("ft28-helptext-seed")}`;
}

describe("FT28 integration: help text seed missing endpoint", () => {
  it("creates only missing help texts and leaves existing entries unchanged", async () => {
    const admin = await loginAdminAgent(app);
    const existingKey = nextHelpKey("existing");
    const newKeyOne = nextHelpKey("new-one");
    const newKeyTwo = nextHelpKey("new-two");

    await db.insert(helpTexts).values({
      helpKey: existingKey,
      title: "Bestehender Titel",
      body: "bestehender Inhalt",
      isActive: true,
    });

    scanFrontendHelpKeysMock.mockReturnValue({
      scannedKeys: [existingKey, newKeyOne, newKeyTwo],
      duplicateKeys: [{ key: newKeyTwo, occurrences: 2 }],
      warnings: [`Duplicate helpKey usages detected: ${newKeyTwo} (2)`],
    });

    const response = await admin.post("/api/help-texts/seed-missing-from-frontend").expect(200);

    expect(response.body).toEqual({
      scannedKeys: [existingKey, newKeyOne, newKeyTwo],
      createdKeys: [newKeyOne, newKeyTwo],
      skippedExistingKeys: [existingKey],
      duplicateKeys: [{ key: newKeyTwo, occurrences: 2 }],
      warnings: [`Duplicate helpKey usages detected: ${newKeyTwo} (2)`],
    });

    const rows = await db
      .select()
      .from(helpTexts)
      .where(inArray(helpTexts.helpKey, [existingKey, newKeyOne, newKeyTwo]));

    expect(rows).toHaveLength(3);

    const existing = rows.find((row) => row.helpKey === existingKey);
    expect(existing).toMatchObject({
      helpKey: existingKey,
      title: "Bestehender Titel",
      body: "bestehender Inhalt",
      isActive: true,
    });

    const createdOne = rows.find((row) => row.helpKey === newKeyOne);
    expect(createdOne).toMatchObject({
      helpKey: newKeyOne,
      title: newKeyOne,
      body: "",
      isActive: true,
    });

    const createdTwo = rows.find((row) => row.helpKey === newKeyTwo);
    expect(createdTwo).toMatchObject({
      helpKey: newKeyTwo,
      title: newKeyTwo,
      body: "",
      isActive: true,
    });
  });

  it("is idempotent across repeated runs and does not insert duplicates on the second call", async () => {
    const admin = await loginAdminAgent(app);
    const keyOne = nextHelpKey("idempotent-one");
    const keyTwo = nextHelpKey("idempotent-two");

    scanFrontendHelpKeysMock.mockReturnValue({
      scannedKeys: [keyOne, keyTwo],
      duplicateKeys: [],
      warnings: ["scan warning"],
    });

    const firstRun = await admin.post("/api/help-texts/seed-missing-from-frontend").expect(200);
    expect(firstRun.body).toEqual({
      scannedKeys: [keyOne, keyTwo],
      createdKeys: [keyOne, keyTwo],
      skippedExistingKeys: [],
      duplicateKeys: [],
      warnings: ["scan warning"],
    });

    const secondRun = await admin.post("/api/help-texts/seed-missing-from-frontend").expect(200);
    expect(secondRun.body).toEqual({
      scannedKeys: [keyOne, keyTwo],
      createdKeys: [],
      skippedExistingKeys: [keyOne, keyTwo],
      duplicateKeys: [],
      warnings: ["scan warning"],
    });

    const rows = await db
      .select()
      .from(helpTexts)
      .where(inArray(helpTexts.helpKey, [keyOne, keyTwo]));

    expect(rows).toHaveLength(2);

    const [firstCountRow] = await db
      .select({ id: helpTexts.id })
      .from(helpTexts)
      .where(eq(helpTexts.helpKey, keyOne));
    expect(firstCountRow?.id).toBeTruthy();
  });
});
