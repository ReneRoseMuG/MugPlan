/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - applySystemSeed benennt bestehenden Tag "Vakant" in "Geparkt" um (End-to-End gegen echte DB).
 * - applySystemSeed benennt bestehende Tour "Vakant" in "Parkplatz" um (End-to-End gegen echte DB).
 * - applySystemSeed ist idempotent: zweiter Aufruf nach Migration aendert nichts mehr.
 * - Nach Migration existiert kein Tag/Tour mit Namen "Vakant" mehr in der DB.
 *
 * Fehlerfaelle:
 * - Migration schlaegt nicht fehl wenn weder Tag noch Tour "Vakant" existieren.
 *
 * Ziel:
 * Die Vakant->Geparkt/Parkplatz-Migration end-to-end gegen die echte Testdatenbank absichern.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "../../../server/db";
import { tags, tours } from "../../../shared/schema";
import { eq } from "drizzle-orm";
import { applySystemSeed } from "../../../server/services/systemSeedService";
import { createApiTestApp } from "../../helpers/apiTestHarness";

let _app: Awaited<ReturnType<typeof createApiTestApp>>;

beforeAll(async () => {
  _app = await createApiTestApp();
});

async function insertTagDirectly(name: string): Promise<number> {
  const result = await db.insert(tags).values({ name, color: "#D4537E", isDefault: true, version: 1 });
  return Number((result as any)?.[0]?.insertId ?? (result as any)?.insertId ?? 0);
}

async function insertTourDirectly(name: string): Promise<number> {
  const result = await db.insert(tours).values({ name, color: "#D4537E", version: 1 });
  return Number((result as any)?.[0]?.insertId ?? (result as any)?.insertId ?? 0);
}

async function findTagByName(name: string) {
  const [row] = await db.select().from(tags).where(eq(tags.name, name)).limit(1);
  return row ?? null;
}

async function findTourByName(name: string) {
  const [row] = await db.select().from(tours).where(eq(tours.name, name)).limit(1);
  return row ?? null;
}

describe("FT06 integration: systemSeed Vakant-Migration", () => {
  it("benennt bestehenden Tag Vakant in Geparkt um", async () => {
    await db.delete(tags).where(eq(tags.name, "Vakant"));
    await db.delete(tags).where(eq(tags.name, "Geparkt"));
    await insertTagDirectly("Vakant");

    const result = await applySystemSeed();

    expect(result.logLines).toContain("Tag migriert: Vakant → Geparkt");
    expect(await findTagByName("Vakant")).toBeNull();
    expect(await findTagByName("Geparkt")).not.toBeNull();
  });

  it("benennt bestehende Tour Vakant in Parkplatz um", async () => {
    await db.delete(tours).where(eq(tours.name, "Vakant"));
    await db.delete(tours).where(eq(tours.name, "Parkplatz"));
    await insertTourDirectly("Vakant");

    const result = await applySystemSeed();

    expect(result.logLines).toContain("Tour migriert: Vakant → Parkplatz");
    expect(await findTourByName("Vakant")).toBeNull();
    expect(await findTourByName("Parkplatz")).not.toBeNull();
  });

  it("ist idempotent: zweiter Aufruf nach Migration aendert nichts", async () => {
    await applySystemSeed();
    const firstResult = await applySystemSeed();

    const migrateLogs = firstResult.logLines.filter((line) => line.includes("migriert"));
    expect(migrateLogs).toHaveLength(0);
  });

  it("schlaegt nicht fehl wenn kein Vakant-Tag existiert", async () => {
    await db.delete(tags).where(eq(tags.name, "Vakant"));

    await expect(applySystemSeed()).resolves.not.toThrow();
  });

  it("schlaegt nicht fehl wenn keine Vakant-Tour existiert", async () => {
    await db.delete(tours).where(eq(tours.name, "Vakant"));

    await expect(applySystemSeed()).resolves.not.toThrow();
  });
});
