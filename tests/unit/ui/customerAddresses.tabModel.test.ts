/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Unit (reine Logik des Adress-Tab-Modells, kein DOM, keine DB)
 *
 * Realitätsgrad:
 * - Echte Helfer aus client/src/lib/customer-addresses.ts.
 *
 * Mock-Entscheidung:
 * - Keine Mocks.
 *
 * Isolation:
 * - Keine (reine Funktionen).
 *
 * Abgedeckte Regeln (MS-68, FT 09):
 * - Ohne separate Lieferadresse heißt der erste Tab "Rechnungs- und Lieferadresse";
 *   sobald eine aktive Lieferadresse existiert, nur noch "Rechnungsadresse".
 * - Weitere Tabs tragen den Namen ihrer Kategorie.
 * - Pflichtfelder (Straße/PLZ/Ort/Land) entscheiden über die Vollständigkeit einer Adresse.
 * - Der Speicherplan trennt neu/geändert/entfernt korrekt (Variante A: gemeinsames Speichern).
 *
 * Fehlerfälle / Gegenbeispiele:
 * - Eine zum Löschen markierte Lieferadresse zählt nicht als aktive Lieferadresse.
 * - Eine neue, aber wieder verworfene Adresse wird weder angelegt noch gelöscht.
 *
 * Ziel:
 * - Die vom Anwender geforderte Tab-Benennung und das Speicherverhalten ohne DOM absichern.
 */
import { describe, expect, it } from "vitest";
import {
  BILLING_TAB_LABEL_BILLING_ONLY,
  BILLING_TAB_LABEL_COMBINED,
  buildAddressPersistPlan,
  isAddressDraftComplete,
  resolveAddressTabLabel,
  resolveBillingTabLabel,
  type CustomerAddressDraft,
} from "../../../client/src/lib/customer-addresses";

function draft(overrides: Partial<CustomerAddressDraft>): CustomerAddressDraft {
  return {
    localId: "l1",
    id: null,
    categoryId: 1,
    categoryName: "Privat",
    roleKey: null,
    addressLine1: "Strasse 1",
    addressLine2: "",
    postalCode: "12345",
    city: "Stadt",
    country: "Deutschland",
    version: null,
    pendingDelete: false,
    dirty: false,
    ...overrides,
  };
}

describe("Adress-Tab-Benennung", () => {
  it("nennt den ersten Tab kombiniert, solange es keine separate Lieferadresse gibt", () => {
    const drafts = [draft({ roleKey: "BILLING", categoryName: "Rechnungsadresse" })];
    expect(resolveBillingTabLabel(drafts)).toBe(BILLING_TAB_LABEL_COMBINED);
    expect(resolveAddressTabLabel(drafts[0], drafts)).toBe(BILLING_TAB_LABEL_COMBINED);
  });

  it("nennt den ersten Tab nur Rechnungsadresse, sobald eine Lieferadresse existiert", () => {
    const drafts = [
      draft({ roleKey: "BILLING", categoryName: "Rechnungsadresse" }),
      draft({ localId: "l2", roleKey: "DELIVERY", categoryName: "Lieferadresse" }),
    ];
    expect(resolveBillingTabLabel(drafts)).toBe(BILLING_TAB_LABEL_BILLING_ONLY);
    expect(resolveAddressTabLabel(drafts[0], drafts)).toBe(BILLING_TAB_LABEL_BILLING_ONLY);
    expect(resolveAddressTabLabel(drafts[1], drafts)).toBe("Lieferadresse");
  });

  it("ignoriert eine zum Löschen markierte Lieferadresse bei der Benennung", () => {
    const drafts = [
      draft({ roleKey: "BILLING", categoryName: "Rechnungsadresse" }),
      draft({ localId: "l2", roleKey: "DELIVERY", categoryName: "Lieferadresse", pendingDelete: true }),
    ];
    expect(resolveBillingTabLabel(drafts)).toBe(BILLING_TAB_LABEL_COMBINED);
  });
});

describe("Adress-Vollständigkeit", () => {
  it("erkennt vollständige und unvollständige Adressen", () => {
    expect(isAddressDraftComplete(draft({}))).toBe(true);
    expect(isAddressDraftComplete(draft({ postalCode: "  " }))).toBe(false);
    expect(isAddressDraftComplete(draft({ addressLine1: "", city: "", country: "" }))).toBe(false);
  });
});

describe("Adress-Speicherplan", () => {
  it("trennt neu, geändert und entfernt", () => {
    const drafts = [
      draft({ localId: "n", id: null, roleKey: "DELIVERY" }),
      draft({ localId: "u", id: 10, version: 3, dirty: true }),
      draft({ localId: "d", id: 11, version: 2, pendingDelete: true }),
      draft({ localId: "x", id: 12, version: 1 }),
    ];
    const plan = buildAddressPersistPlan(drafts);
    expect(plan.toCreate.map((d) => d.localId)).toEqual(["n"]);
    expect(plan.toUpdate.map((d) => d.localId)).toEqual(["u"]);
    expect(plan.toDelete).toEqual([{ id: 11, version: 2 }]);
  });

  it("legt eine neue, wieder verworfene Adresse weder an noch loescht sie", () => {
    const plan = buildAddressPersistPlan([draft({ localId: "n", id: null, pendingDelete: true })]);
    expect(plan.toCreate).toEqual([]);
    expect(plan.toDelete).toEqual([]);
    expect(plan.toUpdate).toEqual([]);
  });
});
