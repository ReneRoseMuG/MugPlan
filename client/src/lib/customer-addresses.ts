// Reine Logik für den Adress-Tab-Bereich des Kundenformulars (MS-68, FT 09).
// Bewusst in node-testbare Helfer ausgelagert, da für das Projekt kein DOM-Testumfeld
// vorhanden ist: die Tab-Komponente bleibt dünn, die prüfbare Logik liegt hier.

export const ADDRESS_ROLE_BILLING = "BILLING";
export const ADDRESS_ROLE_DELIVERY = "DELIVERY";

// Solange keine separate (aktive) Lieferadresse existiert, ist die Rechnungsadresse zugleich
// die Lieferadresse und wird im Tab entsprechend benannt. Sobald eine Lieferadresse angelegt
// ist, trägt der erste Tab nur noch "Rechnungsadresse".
export const BILLING_TAB_LABEL_COMBINED = "Rechnungs- und Lieferadresse";
export const BILLING_TAB_LABEL_BILLING_ONLY = "Rechnungsadresse";

export type CustomerAddressDraft = {
  // Stabile Kennung im Formular, auch für noch nicht gespeicherte Adressen.
  localId: string;
  // id der persistierten Adresse, oder null für eine im Formular neu angelegte.
  id: number | null;
  categoryId: number | null;
  categoryName: string;
  roleKey: string | null;
  addressLine1: string;
  addressLine2: string;
  postalCode: string;
  city: string;
  country: string;
  version: number | null;
  pendingDelete: boolean;
  dirty: boolean;
};

type RolePart = Pick<CustomerAddressDraft, "roleKey" | "pendingDelete">;

// Eine separate Lieferadresse ist eine nicht zum Löschen markierte Adresse mit DELIVERY-Rolle.
export function hasActiveDeliveryAddress(drafts: RolePart[]): boolean {
  return drafts.some((draft) => draft.roleKey === ADDRESS_ROLE_DELIVERY && !draft.pendingDelete);
}

// Label des Rechnungsadress-Tabs in Abhängigkeit davon, ob eine separate Lieferadresse existiert.
export function resolveBillingTabLabel(drafts: RolePart[]): string {
  return hasActiveDeliveryAddress(drafts) ? BILLING_TAB_LABEL_BILLING_ONLY : BILLING_TAB_LABEL_COMBINED;
}

// Sichtbares Label eines beliebigen Adress-Tabs: die Rechnungsadresse trägt das Rollen-Label,
// jede weitere Adresse den Namen ihrer Kategorie.
export function resolveAddressTabLabel(
  draft: Pick<CustomerAddressDraft, "roleKey" | "categoryName">,
  drafts: RolePart[],
): string {
  if (draft.roleKey === ADDRESS_ROLE_BILLING) return resolveBillingTabLabel(drafts);
  return draft.categoryName;
}

// MS-68: Adressfelder sind nicht mehr Pflicht (eine leere oder teilweise Adresse ist erlaubt).
// Dieser Helfer meldet nur, ob alle vier Felder gefüllt sind — als optionaler UI-Hinweis, nicht
// als Speichersperre.
export function isAddressDraftComplete(
  draft: Pick<CustomerAddressDraft, "addressLine1" | "postalCode" | "city" | "country">,
): boolean {
  return [draft.addressLine1, draft.postalCode, draft.city, draft.country].every(
    (value) => value.trim().length > 0,
  );
}

export type AddressPersistPlan = {
  toCreate: CustomerAddressDraft[];
  toUpdate: CustomerAddressDraft[];
  toDelete: Array<{ id: number; version: number }>;
};

// Leitet aus dem Draft-Stand ab, welche Adressen beim gemeinsamen Speichern angelegt,
// aktualisiert oder entfernt werden müssen (Variante A: alles mit dem großen Speichern).
export function buildAddressPersistPlan(drafts: CustomerAddressDraft[]): AddressPersistPlan {
  const toCreate: CustomerAddressDraft[] = [];
  const toUpdate: CustomerAddressDraft[] = [];
  const toDelete: Array<{ id: number; version: number }> = [];

  for (const draft of drafts) {
    if (draft.id == null) {
      // Im Formular neu angelegte Adresse: nur anlegen, wenn sie nicht wieder verworfen wurde.
      if (!draft.pendingDelete) toCreate.push(draft);
      continue;
    }
    if (draft.pendingDelete) {
      toDelete.push({ id: draft.id, version: draft.version ?? 1 });
      continue;
    }
    if (draft.dirty) toUpdate.push(draft);
  }

  return { toCreate, toUpdate, toDelete };
}
