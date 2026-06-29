/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Integration
 *
 * Realitätsgrad:
 * - Echte mugplan_test-DB, echter Endpunkt /api/reports/produktionsplanung ueber createApiTestApp(),
 *   echter Admin-Login, echte Services/Repositories. Keine gemockten Repositories oder Auth.
 *
 * Mock-Entscheidung:
 * - Keine Mocks. Soll-Mengen werden unabhaengig aus der Test-Datenspezifikation berechnet
 *   und nicht hartkodiert, damit ein systematischer Aggregationsfehler nicht durch einen
 *   angepassten Erwartungswert gruen bleiben kann.
 *
 * Isolation:
 * - Klasse B, Baseline core, Storage none. Eindeutiger Lauf-Token in allen Namen, im Test
 *   frisch angelegte Kategorien und ein dedizierter Zeitraum (April 2101), damit Restbestand,
 *   Seed- oder Fremddaten die Summen nicht verfaelschen koennen. Vergleich erfolgt strikt
 *   gegen die im Test erzeugten Kategorie-IDs bzw. Projekt-IDs.
 *
 * Abgedeckte Regeln:
 * - Kategorie-/Typ-Summen der Produktionsplanung entsprechen bei realistischer Datenmenge
 *   (~39 Projekte ueber Saunen, mehrere Ofen-Typen und Fenster) exakt der unabhaengig
 *   berechneten Soll-Menge, sowohl mit useShortCodes=true (Merge je Shortcode) als auch
 *   mit useShortCodes=false (getrennt je Artikel).
 * - Mehrere Termine eines Projekts im Zeitraum erhoehen die Menge nicht (Projekt zaehlt einmal).
 * - Ein Projekt traegt je Kategorie hoechstens einen Artikel bei (Slot-Modell der Artikelliste);
 *   Mengen gleicher Shortcodes verdichten sich kategorieweise ueber Projekte hinweg.
 * - Reklamations- und Storno-Projekte werden vollstaendig aus den Mengen-Summen ausgeschlossen.
 * - Projekte ohne Sondermaß gehen in die Mengen-Summen ein, erscheinen aber nicht in projectRows.
 *
 * Fehlerfälle:
 * - Aggregation multipliziert Mengen faelschlich mit der Terminanzahl.
 * - Ausgeschlossene Projekte (Reklamation/Storno/ausserhalb Zeitraum) fliessen in die Summen.
 * - Mehrfach-Order-Items werden nicht oder doppelt gezaehlt.
 * - Nicht-Sondermaß-Projekte verschwinden aus den Counts oder tauchen faelschlich als Karte auf.
 *
 * Ziel:
 * Die Mengen-/Typ-Counts der Produktionsplanung gegen eine unabhaengig berechnete Referenz
 * mit groesserer, gemischter Datenmenge regressionssicher absichern.
 */
import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";

import { db } from "../../../server/db";
import { createApiTestApp, loginAdminAgent } from "../../helpers/apiTestHarness";
import {
  attachAppointmentTagFixture,
  attachProjectTagFixture,
  createAppointmentFixture,
  createComponentFixture,
  createCustomerFixtureWithOverrides,
  createExactTagFixture,
  createProductFixture,
  createProjectFixture,
  createProjectOrderItemFixture,
} from "../../helpers/testDataFactory";
import {
  MANAGED_COMPLAINT_TAG_NAME,
  MANAGED_SPECIAL_MEASURE_TAG_COLOR,
  MANAGED_SPECIAL_MEASURE_TAG_NAME,
  RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME,
} from "../../../shared/appointmentCancellation";
import { tags } from "../../../shared/schema";

const FROM_DATE = "2101-04-01";
const TO_DATE = "2101-04-30";

type ItemCategory = "sauna" | "ofen" | "fenster";

type ItemSpec = {
  cat: ItemCategory;
  name: string;
  shortCode: string;
  quantity: number;
};

type ProjectSpec = {
  key: string;
  items: ItemSpec[];
  appointmentDates: string[];
  exclusion?: "reklamation" | "storno";
  sondermass: boolean;
};

let app: Awaited<ReturnType<typeof createApiTestApp>>;

beforeAll(async () => {
  app = await createApiTestApp();
});

async function ensureExactTag(name: string, color: string) {
  const [existing] = await db
    .select({
      id: tags.id,
      name: tags.name,
      color: tags.color,
      isDefault: tags.isDefault,
      version: tags.version,
    })
    .from(tags)
    .where(eq(tags.name, name))
    .limit(1);

  if (existing) {
    return existing;
  }

  return createExactTagFixture(name, color);
}

function dayStr(day: number): string {
  return `2101-04-${String(day).padStart(2, "0")}`;
}

function isInRange(date: string): boolean {
  return date >= FROM_DATE && date <= TO_DATE;
}

describe("integration: produktionsplanung counts volume", () => {
  it(
    "summiert Saunen-, Ofen- und Fenster-Mengen bei ~39 Projekten exakt zur unabhaengig berechneten Soll-Menge",
    async () => {
      const admin = await loginAdminAgent(app);
      const runToken = `PPCNT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      const sondermassTag = await ensureExactTag(MANAGED_SPECIAL_MEASURE_TAG_NAME, MANAGED_SPECIAL_MEASURE_TAG_COLOR);
      const reklamationTag = await ensureExactTag(MANAGED_COMPLAINT_TAG_NAME, "#FF011B");
      const stornoTag = await ensureExactTag(RESERVED_APPOINTMENT_CANCELLATION_TAG_NAME, "#ef4444");

      const saunaCatName = `Fass Saunen ${runToken}`;
      const ofenCatName = `Öfen ${runToken}`;
      const fensterCatName = `Fenster ${runToken}`;

      // Lookup-Anlagen ohne Order-Items, nur um die frischen Kategorie-IDs zu erhalten.
      const saunaCategoryId = (await createProductFixture({ categoryName: saunaCatName, name: `${runToken}-LOOKUP-SAUNA` })).categoryId;
      const ofenCategoryId = (await createProductFixture({ categoryName: ofenCatName, name: `${runToken}-LOOKUP-OFEN` })).categoryId;
      const fensterCategoryId = (await createComponentFixture({ categoryName: fensterCatName, name: `${runToken}-LOOKUP-FENSTER` })).categoryId;

      const categoryIdFor = (cat: ItemCategory): number =>
        cat === "sauna" ? saunaCategoryId : cat === "ofen" ? ofenCategoryId : fensterCategoryId;
      const isComponentCategory = (categoryId: number): boolean => categoryId === fensterCategoryId;

      // --- Datenspezifikation aufbauen (Quelle der Wahrheit fuer die Soll-Berechnung) ---
      const specs: ProjectSpec[] = [];
      let itemSeq = 0;
      const nextItemName = (): string => {
        itemSeq += 1;
        return `${runToken}-IT${String(itemSeq).padStart(3, "0")}`;
      };

      // Gruppe 1: Saunen, 10 Projekte, Shortcodes SA/SB, erste drei mit Mehrfachterminen.
      for (let i = 1; i <= 10; i += 1) {
        const base = 2 + i;
        const dates = i <= 3 ? [dayStr(base), dayStr(base + 1)] : [dayStr(base)];
        specs.push({
          key: `S${i}`,
          items: [{ cat: "sauna", name: nextItemName(), shortCode: i % 2 === 0 ? "SA" : "SB", quantity: (i % 3) + 1 }],
          appointmentDates: dates,
          sondermass: i % 2 === 0,
        });
      }

      // Gruppe 2: Oefen, 12 Projekte, drei Ofen-Typen O1/O2/O3, teils mit Mehrfachterminen.
      for (let i = 1; i <= 12; i += 1) {
        const base = 2 + (i % 20);
        const dates = i % 4 === 0 ? [dayStr(base), dayStr(base + 1), dayStr(base + 2)] : [dayStr(base)];
        specs.push({
          key: `O${i}`,
          items: [{
            cat: "ofen",
            name: nextItemName(),
            shortCode: ["O1", "O2", "O3"][i % 3],
            quantity: (i % 4) + 1,
          }],
          appointmentDates: dates,
          sondermass: i % 3 === 0,
        });
      }

      // Gruppe 3: Fenster (Komponenten), 8 Projekte, Shortcodes F1/F2.
      for (let i = 1; i <= 8; i += 1) {
        const base = 2 + i;
        const dates = i % 3 === 0 ? [dayStr(base), dayStr(base + 1)] : [dayStr(base)];
        specs.push({
          key: `F${i}`,
          items: [{ cat: "fenster", name: nextItemName(), shortCode: i % 2 === 0 ? "F1" : "F2", quantity: (i % 5) + 1 }],
          appointmentDates: dates,
          sondermass: i % 2 === 0,
        });
      }

      // Gruppe 4: Gemischte Projekte mit Sauna + Ofen + Fenster, Mehrfachtermine, Sondermaß.
      for (let i = 1; i <= 3; i += 1) {
        const base = 10 + i;
        specs.push({
          key: `M${i}`,
          items: [
            { cat: "sauna", name: nextItemName(), shortCode: "SA", quantity: 2 },
            { cat: "ofen", name: nextItemName(), shortCode: "O1", quantity: 3 },
            { cat: "fenster", name: nextItemName(), shortCode: "F1", quantity: 4 },
          ],
          appointmentDates: [dayStr(base), dayStr(base + 1)],
          sondermass: true,
        });
      }

      // Gegenbeispiele.
      specs.push({
        key: "EXCL-REKL",
        items: [{ cat: "sauna", name: nextItemName(), shortCode: "SA", quantity: 7 }],
        appointmentDates: [dayStr(15)],
        exclusion: "reklamation",
        sondermass: true,
      });
      specs.push({
        key: "EXCL-STORNO",
        items: [{ cat: "ofen", name: nextItemName(), shortCode: "O1", quantity: 9 }],
        appointmentDates: [dayStr(16)],
        exclusion: "storno",
        sondermass: true,
      });
      specs.push({
        key: "EXCL-BEFORE",
        items: [{ cat: "sauna", name: nextItemName(), shortCode: "SA", quantity: 5 }],
        appointmentDates: ["2101-03-30"],
        sondermass: true,
      });
      specs.push({
        key: "EXCL-AFTER",
        items: [{ cat: "ofen", name: nextItemName(), shortCode: "O2", quantity: 6 }],
        appointmentDates: ["2101-05-02"],
        sondermass: true,
      });
      specs.push({
        key: "NOREASON-1",
        items: [{ cat: "sauna", name: nextItemName(), shortCode: "SB", quantity: 4 }],
        appointmentDates: [dayStr(18)],
        sondermass: false,
      });
      specs.push({
        key: "NOREASON-2",
        items: [{ cat: "fenster", name: nextItemName(), shortCode: "F2", quantity: 3 }],
        appointmentDates: [dayStr(19)],
        sondermass: false,
      });

      // --- Daten in der Test-DB anlegen ---
      const projectIdByKey = new Map<string, number>();
      for (const spec of specs) {
        const customer = await createCustomerFixtureWithOverrides({
          prefix: `${runToken}-${spec.key}-C`,
          fullName: `${runToken} ${spec.key} Kunde`,
        });
        const project = await createProjectFixture({
          prefix: `${runToken}-${spec.key}-P`,
          customerId: customer.id,
          name: `${runToken} ${spec.key} Projekt`,
        });
        const orderNumber = project.orderNumber ?? `ORD-${runToken}-${spec.key}`;

        const createdAppointments = [];
        for (const date of spec.appointmentDates) {
          createdAppointments.push(await createAppointmentFixture({ projectId: project.id, startDate: date }));
        }

        for (const item of spec.items) {
          let productId: number | null = null;
          let componentId: number | null = null;
          if (item.cat === "fenster") {
            const component = await createComponentFixture({ categoryName: fensterCatName, name: item.name, shortCode: item.shortCode });
            componentId = component.id;
          } else {
            const categoryName = item.cat === "sauna" ? saunaCatName : ofenCatName;
            const product = await createProductFixture({ categoryName, name: item.name, shortCode: item.shortCode });
            productId = product.id;
          }
          await createProjectOrderItemFixture({ projectId: project.id, orderNumber, productId, componentId, quantity: item.quantity });
        }

        if (spec.sondermass) {
          await attachProjectTagFixture(project.id, sondermassTag.id);
        }
        if (spec.exclusion === "reklamation") {
          await attachProjectTagFixture(project.id, reklamationTag.id);
        }
        if (spec.exclusion === "storno" && createdAppointments[0]) {
          await attachAppointmentTagFixture(createdAppointments[0].id, stornoTag.id);
        }

        projectIdByKey.set(spec.key, project.id);
      }

      // --- Unabhaengige Soll-Berechnung ---
      function computeExpectedTotals(useShortCodes: boolean): Map<number, Map<string, number>> {
        const totals = new Map<number, Map<string, number>>();
        for (const spec of specs) {
          if (spec.exclusion === "reklamation" || spec.exclusion === "storno") continue;
          if (!spec.appointmentDates.some(isInRange)) continue;
          for (const item of spec.items) {
            const categoryId = categoryIdFor(item.cat);
            const groupKey = useShortCodes && item.shortCode ? item.shortCode : item.name;
            const quantity = item.quantity;
            const byKey = totals.get(categoryId) ?? new Map<string, number>();
            byKey.set(groupKey, (byKey.get(groupKey) ?? 0) + quantity);
            totals.set(categoryId, byKey);
          }
        }
        return totals;
      }

      type CategoryGroup = {
        categoryId: number;
        items: Array<{ itemName: string; totalQuantity: number }>;
      };
      const byItemName = (
        left: { itemName: string },
        right: { itemName: string },
      ): number => left.itemName.localeCompare(right.itemName, "de");

      function assertTotals(
        productGroups: CategoryGroup[],
        componentGroups: CategoryGroup[],
        useShortCodes: boolean,
      ): void {
        const expected = computeExpectedTotals(useShortCodes);
        for (const [categoryId, byKey] of expected) {
          const expectedItems = Array.from(byKey.entries())
            .map(([itemName, totalQuantity]) => ({ itemName, totalQuantity }))
            .sort(byItemName);
          const groups = isComponentCategory(categoryId) ? componentGroups : productGroups;
          const group = groups.find((entry) => entry.categoryId === categoryId);
          const actualItems = (group?.items ?? [])
            .map((item) => ({ itemName: item.itemName, totalQuantity: item.totalQuantity }))
            .sort(byItemName);
          expect(actualItems, `Kategorie ${categoryId}, useShortCodes=${useShortCodes}`).toEqual(expectedItems);
        }
        // Keine fremden Kategorien in der Antwort.
        expect(productGroups.map((group) => group.categoryId).sort((a, b) => a - b))
          .toEqual([saunaCategoryId, ofenCategoryId].sort((a, b) => a - b));
        expect(componentGroups.map((group) => group.categoryId)).toEqual([fensterCategoryId]);
      }

      const query = [
        `fromDate=${FROM_DATE}`,
        `toDate=${TO_DATE}`,
        `productCategoryIds=${saunaCategoryId}`,
        `productCategoryIds=${ofenCategoryId}`,
        `componentCategoryIds=${fensterCategoryId}`,
      ].join("&");

      const responseShortCodes = await admin
        .get(`/api/reports/produktionsplanung?${query}&useShortCodes=true`)
        .expect(200);
      assertTotals(responseShortCodes.body.productCategoryGroups, responseShortCodes.body.componentCategoryGroups, true);

      const responseNoShortCodes = await admin
        .get(`/api/reports/produktionsplanung?${query}&useShortCodes=false`)
        .expect(200);
      assertTotals(responseNoShortCodes.body.productCategoryGroups, responseNoShortCodes.body.componentCategoryGroups, false);

      // --- projectRows: nur Sondermaß-faehige, im Zeitraum liegende, nicht ausgeschlossene Projekte ---
      const myProjectIds = new Set(projectIdByKey.values());
      const expectedRowIds = new Set(
        specs
          .filter((spec) => spec.sondermass && !spec.exclusion && spec.appointmentDates.some(isInRange))
          .map((spec) => projectIdByKey.get(spec.key)!)
          .filter((projectId): projectId is number => typeof projectId === "number"),
      );
      const actualRowIds = new Set(
        (responseShortCodes.body.projectRows as Array<{ projectId: number }>)
          .map((row) => row.projectId)
          .filter((projectId) => myProjectIds.has(projectId)),
      );
      expect(actualRowIds).toEqual(expectedRowIds);

      // Nicht-Sondermaß-Projekte gehen in die Counts ein, erscheinen aber nicht als Karte.
      expect(actualRowIds.has(projectIdByKey.get("NOREASON-1")!)).toBe(false);
      expect(actualRowIds.has(projectIdByKey.get("NOREASON-2")!)).toBe(false);
    },
    180_000,
  );
});
