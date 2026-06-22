import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { AddressCategory } from "@shared/schema";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialogBase, DialogBaseInlineMessage } from "@/components/ui/dialog-base";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { normalizeServerError, type NormalizedServerError } from "@/lib/error-normalization";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed for ${url}`);
  }
  return response.json() as Promise<T>;
}

async function invalidateCategoryQueries(): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: ["/api/address-categories"] });
}

function roleLabel(category: AddressCategory): string | null {
  if (category.roleKey === "BILLING") return "Rechnungsadresse";
  if (category.roleKey === "DELIVERY") return "Lieferadresse";
  return null;
}

export function AddressCategoryManagementPage() {
  const { toast } = useToast();
  const [newName, setNewName] = useState("");
  const [editCategory, setEditCategory] = useState<AddressCategory | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AddressCategory | null>(null);
  const [mutationError, setMutationError] = useState<NormalizedServerError | null>(null);

  const categoriesQuery = useQuery<AddressCategory[]>({
    queryKey: ["/api/address-categories"],
    queryFn: () => fetchJson("/api/address-categories"),
  });
  const categories = categoriesQuery.data ?? [];

  const handleError = (title: string) => (error: unknown) => {
    const normalized = normalizeServerError(error, { title });
    setMutationError(normalized);
    toast({ title: normalized.title, description: normalized.description, variant: "destructive" });
  };

  const createMutation = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/address-categories", { name: newName.trim() }),
    onSuccess: async () => {
      setNewName("");
      setMutationError(null);
      await invalidateCategoryQueries();
    },
    onError: handleError("Kategorie konnte nicht angelegt werden"),
  });

  const updateMutation = useMutation({
    mutationFn: async (input: { id: number; version: number; name?: string; isActive?: boolean }) =>
      apiRequest("PATCH", `/api/address-categories/${input.id}`, {
        version: input.version,
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      }),
    onSuccess: async () => {
      setEditCategory(null);
      setMutationError(null);
      await invalidateCategoryQueries();
    },
    onError: handleError("Kategorie konnte nicht aktualisiert werden"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (input: { id: number; version: number }) =>
      apiRequest("DELETE", `/api/address-categories/${input.id}`, { version: input.version }),
    onSuccess: async () => {
      setPendingDelete(null);
      setMutationError(null);
      await invalidateCategoryQueries();
    },
    onError: handleError("Kategorie konnte nicht gelöscht werden"),
  });

  const isMutating = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  return (
    <>
      <section className="flex min-h-0 flex-col rounded-md border border-slate-200 bg-white p-4" data-testid="master-data-address-categories">
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-[1fr_auto] lg:items-end">
          <Input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="Neue Adresskategorie"
            data-testid="input-new-address-category"
          />
          <Button
            variant="outline"
            onClick={() => {
              if (!newName.trim()) return;
              setMutationError(null);
              createMutation.mutate();
            }}
            disabled={isMutating}
            data-testid="button-new-address-category"
          >
            Neu
          </Button>
        </div>

        {mutationError ? <DialogBaseInlineMessage className="mt-3" error={mutationError} /> : null}
        {categoriesQuery.error ? (
          <DialogBaseInlineMessage
            className="mt-3"
            error={normalizeServerError(categoriesQuery.error, { title: "Kategorien konnten nicht geladen werden" })}
          />
        ) : null}

        <div className="mt-4 min-h-0 flex-1 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[260px]">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((row) => (
                <TableRow key={row.id} data-testid={`address-category-row-${row.id}`}>
                  <TableCell>
                    {editCategory?.id === row.id ? (
                      <Input
                        value={editCategory.name}
                        onChange={(event) => setEditCategory({ ...editCategory, name: event.target.value })}
                        data-testid={`input-edit-address-category-${row.id}`}
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <span>{row.name}</span>
                        {roleLabel(row) ? (
                          <span className="inline-flex rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                            Pflichtkategorie
                          </span>
                        ) : null}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={row.isActive ? "text-sm text-emerald-700" : "text-sm text-muted-foreground"}>
                      {row.isActive ? "Aktiv" : "Inaktiv"}
                    </span>
                  </TableCell>
                  <TableCell className="space-x-2">
                    {editCategory?.id === row.id ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() => {
                            setMutationError(null);
                            updateMutation.mutate({ id: row.id, version: row.version, name: editCategory.name.trim() });
                          }}
                          disabled={isMutating}
                        >
                          Speichern
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditCategory(null)} disabled={isMutating}>
                          Abbrechen
                        </Button>
                      </>
                    ) : row.isProtected ? (
                      <span className="text-sm text-muted-foreground">Geschützte Pflichtkategorie</span>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setMutationError(null);
                            setEditCategory({ ...row });
                          }}
                          disabled={isMutating}
                        >
                          Umbenennen
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setMutationError(null);
                            updateMutation.mutate({ id: row.id, version: row.version, isActive: !row.isActive });
                          }}
                          disabled={isMutating}
                        >
                          {row.isActive ? "Deaktivieren" : "Aktivieren"}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setPendingDelete(row)}
                          disabled={isMutating}
                          data-testid={`button-delete-address-category-${row.id}`}
                        >
                          Löschen
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
      <ConfirmDialogBase
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        icon={<MapPin className="h-5 w-5" />}
        title="Adresskategorie löschen"
        description={
          pendingDelete
            ? `Soll die Kategorie "${pendingDelete.name}" gelöscht werden? In Verwendung befindliche oder geschützte Kategorien werden serverseitig abgelehnt.`
            : undefined
        }
        confirmLabel="Löschen"
        pendingLabel="Löschen..."
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          if (!pendingDelete) return;
          setMutationError(null);
          deleteMutation.mutate({ id: pendingDelete.id, version: pendingDelete.version });
        }}
        testId="dialog-delete-address-category"
        variant="destructive"
      />
    </>
  );
}
