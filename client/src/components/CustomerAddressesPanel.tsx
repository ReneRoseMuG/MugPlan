import { useState } from "react";
import { MapPin, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  ADDRESS_ROLE_BILLING,
  resolveAddressTabLabel,
  type CustomerAddressDraft,
} from "@/lib/customer-addresses";

export type AddressCategory = {
  id: number;
  name: string;
  roleKey: string | null;
  isProtected: boolean;
  sortOrder: number;
  isActive: boolean;
  version: number;
};

export type AddressFieldValues = {
  addressLine1: string;
  addressLine2: string;
  postalCode: string;
  city: string;
  country: string;
};

export function makeAddressLocalId(): string {
  return `addr-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function AddressFieldGrid({
  idPrefix,
  fields,
  onChange,
  isReadOnly,
}: {
  idPrefix: string;
  fields: AddressFieldValues;
  onChange: (fields: AddressFieldValues) => void;
  isReadOnly: boolean;
}) {
  const set = (patch: Partial<AddressFieldValues>) => onChange({ ...fields, ...patch });
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-line1`}>Straße</Label>
        <Input
          id={`${idPrefix}-line1`}
          value={fields.addressLine1}
          onChange={(e) => set({ addressLine1: e.target.value })}
          readOnly={isReadOnly}
          data-testid={`${idPrefix}-line1`}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-line2`}>Adresszusatz</Label>
        <Input
          id={`${idPrefix}-line2`}
          value={fields.addressLine2}
          onChange={(e) => set({ addressLine2: e.target.value })}
          readOnly={isReadOnly}
          data-testid={`${idPrefix}-line2`}
        />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-postalcode`}>PLZ</Label>
          <Input
            id={`${idPrefix}-postalcode`}
            value={fields.postalCode}
            onChange={(e) => set({ postalCode: e.target.value })}
            readOnly={isReadOnly}
            data-testid={`${idPrefix}-postalcode`}
          />
        </div>
        <div className="col-span-2 space-y-2">
          <Label htmlFor={`${idPrefix}-city`}>Ort</Label>
          <Input
            id={`${idPrefix}-city`}
            value={fields.city}
            onChange={(e) => set({ city: e.target.value })}
            readOnly={isReadOnly}
            data-testid={`${idPrefix}-city`}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-country`}>Land</Label>
        <Input
          id={`${idPrefix}-country`}
          value={fields.country}
          onChange={(e) => set({ country: e.target.value })}
          readOnly={isReadOnly}
          data-testid={`${idPrefix}-country`}
        />
      </div>
    </div>
  );
}

/**
 * Adressbereich des Kundenformulars als Tab-Leiste (MS-68, FT 09).
 * Jeder Tab ist an ein Adress-Objekt (eine customer_address-Zeile) gebunden — auch die
 * Rechnungsadresse. Es gibt keinen Sonderweg über die flachen Kundenfelder mehr. Der erste
 * Tab ist die Rechnungsadresse (fest, nicht entfernbar); solange keine separate Lieferadresse
 * existiert, trägt er den kombinierten Namen. Jede weitere Adresse ist ein eigener Tab mit
 * Kategorie-Auswahl. Alle Adressen werden als Entwurf gesammelt und gemeinsam mit dem Kunden
 * gespeichert (Variante A).
 */
export function CustomerAddressesPanel({
  drafts,
  onChange,
  categories,
  isReadOnly,
}: {
  drafts: CustomerAddressDraft[];
  onChange: (drafts: CustomerAddressDraft[]) => void;
  categories: AddressCategory[];
  isReadOnly: boolean;
}) {
  const [activeLocalId, setActiveLocalId] = useState<string | null>(null);

  const visible = drafts.filter((draft) => !draft.pendingDelete);
  // Die Rechnungsadresse steht immer zuerst, danach die weiteren Adressen.
  const ordered = [
    ...visible.filter((draft) => draft.roleKey === ADDRESS_ROLE_BILLING),
    ...visible.filter((draft) => draft.roleKey !== ADDRESS_ROLE_BILLING),
  ];
  const activeDraft = ordered.find((draft) => draft.localId === activeLocalId) ?? ordered[0] ?? null;
  const isBillingActive = activeDraft?.roleKey === ADDRESS_ROLE_BILLING;

  // Kategorien für weitere Adressen: aktiv und nicht die Rechnungsadresse (die ist fest).
  const selectableCategories = categories.filter(
    (category) => category.isActive && category.roleKey !== ADDRESS_ROLE_BILLING,
  );

  const tabClass = (selected: boolean) =>
    `px-3 py-2 text-sm -mb-px border-b-2 ${
      selected ? "border-primary font-semibold text-primary" : "border-transparent text-muted-foreground"
    }`;

  const updateDraft = (localId: string, patch: Partial<CustomerAddressDraft>) => {
    onChange(drafts.map((draft) => (draft.localId === localId ? { ...draft, ...patch, dirty: true } : draft)));
  };

  const addAddress = () => {
    const category = selectableCategories[0] ?? null;
    const localId = makeAddressLocalId();
    onChange([
      ...drafts,
      {
        localId,
        id: null,
        categoryId: category ? category.id : null,
        categoryName: category ? category.name : "",
        roleKey: category ? category.roleKey : null,
        addressLine1: "",
        addressLine2: "",
        postalCode: "",
        city: "",
        country: "",
        version: null,
        pendingDelete: false,
        dirty: true,
      },
    ]);
    setActiveLocalId(localId);
  };

  const removeDraft = (draft: CustomerAddressDraft) => {
    if (draft.id == null) {
      // Noch nicht gespeichert: den Entwurf ganz verwerfen.
      onChange(drafts.filter((entry) => entry.localId !== draft.localId));
    } else {
      // Bereits gespeichert: zum Entfernen beim Speichern markieren.
      onChange(drafts.map((entry) => (entry.localId === draft.localId ? { ...entry, pendingDelete: true } : entry)));
    }
    setActiveLocalId(null);
  };

  const changeCategory = (draft: CustomerAddressDraft, categoryId: number) => {
    const category = selectableCategories.find((entry) => entry.id === categoryId) ?? null;
    updateDraft(draft.localId, {
      categoryId,
      categoryName: category?.name ?? draft.categoryName,
      roleKey: category?.roleKey ?? null,
    });
  };

  return (
    <div className="sub-panel space-y-4" data-testid="customer-addresses-panel">
      <h3 className="text-sm font-bold tracking-wider text-primary flex items-center gap-2">
        <MapPin className="w-4 h-4" />
        Adressen
      </h3>

      <div className="flex flex-wrap gap-1 border-b border-border" role="tablist">
        {ordered.map((draft) => {
          const isBilling = draft.roleKey === ADDRESS_ROLE_BILLING;
          return (
            <button
              key={draft.localId}
              type="button"
              role="tab"
              aria-selected={activeDraft?.localId === draft.localId}
              data-testid={isBilling ? "address-tab-billing" : `address-tab-${draft.localId}`}
              onClick={() => setActiveLocalId(draft.localId)}
              className={tabClass(activeDraft?.localId === draft.localId)}
            >
              {resolveAddressTabLabel(draft, drafts) || "Adresse"}
            </button>
          );
        })}
        {!isReadOnly && selectableCategories.length > 0 ? (
          <button
            type="button"
            data-testid="add-customer-address-button"
            onClick={addAddress}
            className={tabClass(false)}
          >
            <Plus className="inline w-4 h-4 mr-1" />
            Adresse
          </button>
        ) : null}
      </div>

      {activeDraft ? (
        <div className="space-y-4" data-testid="customer-address-form">
          {!isBillingActive ? (
            <div className="space-y-2">
              <Label htmlFor="extra-address-category">Kategorie</Label>
              <select
                id="extra-address-category"
                data-testid="address-category-select"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={activeDraft.categoryId ?? ""}
                disabled={isReadOnly}
                onChange={(event) => changeCategory(activeDraft, Number(event.target.value))}
              >
                {selectableCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <AddressFieldGrid
            idPrefix={isBillingActive ? "billing-address" : "extra-address"}
            fields={activeDraft}
            onChange={(fields) => updateDraft(activeDraft.localId, fields)}
            isReadOnly={isReadOnly}
          />
          {!isReadOnly && !isBillingActive ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeDraft(activeDraft)}
              data-testid={`delete-customer-address-${activeDraft.localId}`}
            >
              <Trash2 className="mr-1 h-4 w-4" />
              Adresse entfernen
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
