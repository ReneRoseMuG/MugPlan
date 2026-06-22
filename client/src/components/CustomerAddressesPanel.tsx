import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MapPin, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { invalidateTagProjectionQueries } from "@/lib/tag-invalidation";
import { useToast } from "@/hooks/use-toast";

export type CustomerAddressItem = {
  id: number;
  customerId: number;
  categoryId: number;
  categoryName: string;
  roleKey: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  postalCode: string | null;
  city: string | null;
  country: string | null;
  isSystemManaged: boolean;
  isEffectiveDelivery: boolean;
  version: number;
};

type AddressCategory = {
  id: number;
  name: string;
  roleKey: string | null;
  isProtected: boolean;
  sortOrder: number;
  isActive: boolean;
  version: number;
};

type DraftState = {
  mode: "create" | "edit";
  addressId: number | null;
  version: number | null;
  categoryId: number | null;
  addressLine1: string;
  addressLine2: string;
  postalCode: string;
  city: string;
  country: string;
};

const emptyDraft = (categoryId: number | null): DraftState => ({
  mode: "create",
  addressId: null,
  version: null,
  categoryId,
  addressLine1: "",
  addressLine2: "",
  postalCode: "",
  city: "",
  country: "",
});

function addressLines(item: CustomerAddressItem): string {
  const locality = [item.postalCode, item.city].filter((value) => value && value.trim()).join(" ");
  return [item.addressLine1, item.addressLine2, locality, item.country]
    .filter((value) => value && value.trim())
    .join(", ");
}

export function CustomerAddressesPanel({
  customerId,
  isReadOnly,
}: {
  customerId: number;
  isReadOnly: boolean;
}) {
  const { toast } = useToast();
  const addressesKey = ["/api/customers", customerId, "addresses"] as const;
  const [draft, setDraft] = useState<DraftState | null>(null);

  const { data: addresses = [] } = useQuery<CustomerAddressItem[]>({
    queryKey: addressesKey,
    queryFn: async () => (await apiRequest("GET", `/api/customers/${customerId}/addresses`)).json(),
  });

  const { data: categories = [] } = useQuery<AddressCategory[]>({
    queryKey: ["/api/address-categories"],
    queryFn: async () => (await apiRequest("GET", "/api/address-categories")).json(),
  });

  // Kategorien, die im Adress-CRUD zur Auswahl stehen: aktiv und nicht die Rechnungsadresse
  // (diese wird oben im Kundenformular gepflegt).
  const selectableCategories = useMemo(
    () => categories.filter((category) => category.isActive && category.roleKey !== "BILLING"),
    [categories],
  );
  const deliveryCategory = useMemo(
    () => categories.find((category) => category.roleKey === "DELIVERY") ?? null,
    [categories],
  );

  const invalidateAll = async () => {
    await queryClient.invalidateQueries({ queryKey: addressesKey });
    await queryClient.invalidateQueries({ queryKey: ["/api/customers", customerId] });
    await queryClient.invalidateQueries({ queryKey: ["/api/customers/list"] });
    // Reaktivität: alle Konsumenten (Terminkarten, Hover, Reports, Board) neu laden.
    await invalidateTagProjectionQueries();
  };

  const saveMutation = useMutation({
    mutationFn: async (state: DraftState) => {
      const body = {
        categoryId: state.categoryId,
        addressLine1: state.addressLine1,
        addressLine2: state.addressLine2 || null,
        postalCode: state.postalCode,
        city: state.city,
        country: state.country,
      };
      if (state.mode === "edit" && state.addressId != null) {
        return (
          await apiRequest("PATCH", `/api/customers/${customerId}/addresses/${state.addressId}`, {
            ...body,
            version: state.version,
          })
        ).json();
      }
      return (await apiRequest("POST", `/api/customers/${customerId}/addresses`, body)).json();
    },
    onSuccess: async () => {
      setDraft(null);
      await invalidateAll();
    },
    onError: (error: Error) => {
      toast({ title: "Adresse konnte nicht gespeichert werden", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (item: CustomerAddressItem) => {
      await apiRequest("DELETE", `/api/customers/${customerId}/addresses/${item.id}`, { version: item.version });
    },
    onSuccess: async () => {
      await invalidateAll();
    },
    onError: (error: Error) => {
      toast({ title: "Adresse konnte nicht entfernt werden", description: error.message, variant: "destructive" });
    },
  });

  const startAddDelivery = () => {
    setDraft(emptyDraft(deliveryCategory?.id ?? selectableCategories[0]?.id ?? null));
  };

  const startEdit = (item: CustomerAddressItem) => {
    setDraft({
      mode: "edit",
      addressId: item.id,
      version: item.version,
      categoryId: item.categoryId,
      addressLine1: item.addressLine1 ?? "",
      addressLine2: item.addressLine2 ?? "",
      postalCode: item.postalCode ?? "",
      city: item.city ?? "",
      country: item.country ?? "",
    });
  };

  const managedAddresses = addresses.filter((item) => !item.isSystemManaged);

  return (
    <div className="sub-panel space-y-4" data-testid="customer-addresses-panel">
      <h3 className="text-sm font-bold tracking-wider text-primary flex items-center gap-2">
        <MapPin className="w-4 h-4" />
        Lieferadresse &amp; weitere Adressen
      </h3>

      {addresses.length === 0 ? (
        <p className="text-sm text-muted-foreground">Es ist nur die Rechnungsadresse hinterlegt; sie gilt als wirksame Lieferadresse.</p>
      ) : (
        <ul className="space-y-2">
          {addresses.map((item) => (
            <li
              key={item.id}
              data-testid={`customer-address-row-${item.id}`}
              data-role={item.roleKey ?? "CUSTOM"}
              data-effective={item.isEffectiveDelivery ? "1" : "0"}
              className="flex items-start justify-between gap-3 rounded border border-border p-2"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold">{item.categoryName}</span>
                  {item.isEffectiveDelivery ? (
                    <span
                      className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary"
                      data-testid="customer-address-effective-badge"
                    >
                      wirksame Lieferadresse
                    </span>
                  ) : null}
                  {item.isSystemManaged ? (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      oben im Formular pflegen
                    </span>
                  ) : null}
                </div>
                <div className="text-sm" data-testid={`customer-address-text-${item.id}`}>
                  {addressLines(item) || "—"}
                </div>
              </div>
              {!isReadOnly && !item.isSystemManaged ? (
                <div className="flex shrink-0 gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => startEdit(item)}
                    data-testid={`edit-customer-address-${item.id}`}
                    aria-label="Adresse bearbeiten"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(item)}
                    data-testid={`delete-customer-address-${item.id}`}
                    aria-label="Adresse entfernen"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {!isReadOnly && draft === null && managedAddresses.every((item) => item.roleKey !== "DELIVERY") ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={startAddDelivery}
          data-testid="add-customer-address-button"
          disabled={selectableCategories.length === 0}
        >
          <Plus className="mr-1 h-4 w-4" />
          Abweichende Lieferadresse hinzufügen
        </Button>
      ) : null}

      {draft !== null ? (
        <div className="space-y-3 rounded border border-border p-3" data-testid="customer-address-form">
          <div className="space-y-1">
            <Label htmlFor="address-category">Kategorie</Label>
            <select
              id="address-category"
              data-testid="address-category-select"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              value={draft.categoryId ?? ""}
              onChange={(event) => setDraft({ ...draft, categoryId: Number(event.target.value) })}
            >
              {selectableCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="address-line1">Straße</Label>
            <Input
              id="address-line1"
              data-testid="address-line1-input"
              value={draft.addressLine1}
              onChange={(event) => setDraft({ ...draft, addressLine1: event.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="address-line2">Adresszusatz</Label>
            <Input
              id="address-line2"
              data-testid="address-line2-input"
              value={draft.addressLine2}
              onChange={(event) => setDraft({ ...draft, addressLine2: event.target.value })}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label htmlFor="address-postalcode">PLZ</Label>
              <Input
                id="address-postalcode"
                data-testid="address-postalcode-input"
                value={draft.postalCode}
                onChange={(event) => setDraft({ ...draft, postalCode: event.target.value })}
              />
            </div>
            <div className="col-span-2 space-y-1">
              <Label htmlFor="address-city">Ort</Label>
              <Input
                id="address-city"
                data-testid="address-city-input"
                value={draft.city}
                onChange={(event) => setDraft({ ...draft, city: event.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="address-country">Land</Label>
            <Input
              id="address-country"
              data-testid="address-country-input"
              value={draft.country}
              onChange={(event) => setDraft({ ...draft, country: event.target.value })}
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => saveMutation.mutate(draft)}
              disabled={saveMutation.isPending || draft.categoryId == null}
              data-testid="save-customer-address-button"
            >
              Speichern
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setDraft(null)} data-testid="cancel-customer-address-button">
              Abbrechen
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
