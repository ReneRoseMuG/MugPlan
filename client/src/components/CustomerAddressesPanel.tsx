import { useState } from "react";
import { MapPin, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  resolveBillingTabLabel,
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

export type BillingAddressFields = {
  addressLine1: string;
  addressLine2: string;
  postalCode: string;
  city: string;
  country: string;
};

const BILLING_TAB_ID = "__billing__";

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
  fields: BillingAddressFields;
  onChange: (fields: BillingAddressFields) => void;
  isReadOnly: boolean;
}) {
  const set = (patch: Partial<BillingAddressFields>) => onChange({ ...fields, ...patch });
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
 * Der erste Tab ist die Rechnungsadresse (fest, nicht entfernbar); sie wird über die flachen
 * Kundenfelder gepflegt (billing/onBillingChange). Jede weitere Adresse ist ein eigener Tab
 * mit Kategorie-Auswahl; diese werden als Entwurf gesammelt und gemeinsam mit dem Kunden
 * gespeichert (Variante A). Solange keine separate Lieferadresse existiert, trägt der erste
 * Tab den kombinierten Namen.
 */
export function CustomerAddressesPanel({
  billing,
  onBillingChange,
  extraDrafts,
  onExtraDraftsChange,
  categories,
  isReadOnly,
}: {
  billing: BillingAddressFields;
  onBillingChange: (fields: BillingAddressFields) => void;
  extraDrafts: CustomerAddressDraft[];
  onExtraDraftsChange: (drafts: CustomerAddressDraft[]) => void;
  categories: AddressCategory[];
  isReadOnly: boolean;
}) {
  const [activeTab, setActiveTab] = useState<string>(BILLING_TAB_ID);

  const visibleExtras = extraDrafts.filter((draft) => !draft.pendingDelete);
  // Kategorien für weitere Adressen: aktiv und nicht die Rechnungsadresse (die ist fest).
  const selectableCategories = categories.filter(
    (category) => category.isActive && category.roleKey !== "BILLING",
  );
  const billingLabel = resolveBillingTabLabel(extraDrafts);
  const activeExtra = visibleExtras.find((draft) => draft.localId === activeTab) ?? null;

  const tabClass = (selected: boolean) =>
    `px-3 py-2 text-sm -mb-px border-b-2 ${
      selected ? "border-primary font-semibold text-primary" : "border-transparent text-muted-foreground"
    }`;

  const updateExtra = (localId: string, patch: Partial<CustomerAddressDraft>) => {
    onExtraDraftsChange(
      extraDrafts.map((draft) => (draft.localId === localId ? { ...draft, ...patch, dirty: true } : draft)),
    );
  };

  const addAddress = () => {
    const category = selectableCategories[0] ?? null;
    const localId = makeAddressLocalId();
    onExtraDraftsChange([
      ...extraDrafts,
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
    setActiveTab(localId);
  };

  const removeExtra = (draft: CustomerAddressDraft) => {
    if (draft.id == null) {
      // Noch nicht gespeichert: den Entwurf ganz verwerfen.
      onExtraDraftsChange(extraDrafts.filter((entry) => entry.localId !== draft.localId));
    } else {
      // Bereits gespeichert: zum Entfernen beim Speichern markieren.
      onExtraDraftsChange(
        extraDrafts.map((entry) =>
          entry.localId === draft.localId ? { ...entry, pendingDelete: true } : entry,
        ),
      );
    }
    setActiveTab(BILLING_TAB_ID);
  };

  const changeCategory = (draft: CustomerAddressDraft, categoryId: number) => {
    const category = selectableCategories.find((entry) => entry.id === categoryId) ?? null;
    updateExtra(draft.localId, {
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
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === BILLING_TAB_ID}
          data-testid="address-tab-billing"
          onClick={() => setActiveTab(BILLING_TAB_ID)}
          className={tabClass(activeTab === BILLING_TAB_ID)}
        >
          {billingLabel}
        </button>
        {visibleExtras.map((draft) => (
          <button
            key={draft.localId}
            type="button"
            role="tab"
            aria-selected={activeTab === draft.localId}
            data-testid={`address-tab-${draft.localId}`}
            onClick={() => setActiveTab(draft.localId)}
            className={tabClass(activeTab === draft.localId)}
          >
            {draft.categoryName || "Adresse"}
          </button>
        ))}
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

      {activeTab === BILLING_TAB_ID ? (
        <AddressFieldGrid idPrefix="billing-address" fields={billing} onChange={onBillingChange} isReadOnly={isReadOnly} />
      ) : activeExtra ? (
        <div className="space-y-4" data-testid="customer-address-form">
          <div className="space-y-2">
            <Label htmlFor="extra-address-category">Kategorie</Label>
            <select
              id="extra-address-category"
              data-testid="address-category-select"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              value={activeExtra.categoryId ?? ""}
              disabled={isReadOnly}
              onChange={(event) => changeCategory(activeExtra, Number(event.target.value))}
            >
              {selectableCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <AddressFieldGrid
            idPrefix="extra-address"
            fields={activeExtra}
            onChange={(fields) => updateExtra(activeExtra.localId, fields)}
            isReadOnly={isReadOnly}
          />
          {!isReadOnly ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeExtra(activeExtra)}
              data-testid={`delete-customer-address-${activeExtra.localId}`}
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
