import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { Tag } from "@shared/schema";
import { Tags as TagsIcon } from "lucide-react";
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

async function invalidateTagQueries(): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: ["/api/admin/master-data/tags"] });
  await queryClient.invalidateQueries({
    predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === "/api/tags",
  });
  await queryClient.invalidateQueries({ queryKey: ["calendarAppointments"] });
}

function isProtectedSystemTag(tag: Pick<Tag, "isDefault">): boolean {
  return Boolean(tag.isDefault);
}

export function TagManagementPage() {
  const { toast } = useToast();
  const [newTag, setNewTag] = useState({ name: "", color: "#2563eb" });
  const [editTag, setEditTag] = useState<Tag | null>(null);
  const [pendingDeleteTag, setPendingDeleteTag] = useState<Tag | null>(null);
  const [mutationError, setMutationError] = useState<NormalizedServerError | null>(null);

  const tagsQuery = useQuery<Tag[]>({
    queryKey: ["/api/admin/master-data/tags"],
    queryFn: () => fetchJson("/api/admin/master-data/tags"),
  });

  const tags = tagsQuery.data ?? [];

  const createTagMutation = useMutation({
    mutationFn: async () =>
      apiRequest("POST", "/api/admin/master-data/tags", {
        name: newTag.name.trim(),
        color: newTag.color,
      }),
    onSuccess: async () => {
      setNewTag({ name: "", color: "#2563eb" });
      setMutationError(null);
      await invalidateTagQueries();
    },
    onError: (error) => {
      const normalized = normalizeServerError(error, {
        title: "Tag konnte nicht angelegt werden",
      });
      setMutationError(normalized);
      toast({
        title: normalized.title,
        description: normalized.description,
        variant: "destructive",
      });
    },
  });

  const updateTagMutation = useMutation({
    mutationFn: async (input: { id: number; version: number; name?: string; color?: string }) =>
      apiRequest("PUT", `/api/admin/master-data/tags/${input.id}`, {
        version: input.version,
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.color !== undefined ? { color: input.color } : {}),
      }),
    onSuccess: async () => {
      setEditTag(null);
      setMutationError(null);
      await invalidateTagQueries();
    },
    onError: (error) => {
      const normalized = normalizeServerError(error, {
        title: "Tag konnte nicht aktualisiert werden",
      });
      setMutationError(normalized);
      toast({
        title: normalized.title,
        description: normalized.description,
        variant: "destructive",
      });
    },
  });

  const deleteTagMutation = useMutation({
    mutationFn: async (input: { id: number; version: number }) =>
      apiRequest("DELETE", `/api/admin/master-data/tags/${input.id}`, { version: input.version }),
    onSuccess: async () => {
      setPendingDeleteTag(null);
      setMutationError(null);
      await invalidateTagQueries();
    },
    onError: (error) => {
      const normalized = normalizeServerError(error, {
        title: "Tag konnte nicht gelöscht werden",
      });
      setMutationError(normalized);
      toast({
        title: normalized.title,
        description: normalized.description,
        variant: "destructive",
      });
    },
  });

  const isMutating = createTagMutation.isPending || updateTagMutation.isPending || deleteTagMutation.isPending;

  return (
    <>
    <section className="flex min-h-0 flex-col rounded-md border border-slate-200 bg-white p-4" data-testid="master-data-tags">
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-[1fr_120px_auto] lg:items-end">
        <Input
          value={newTag.name}
          onChange={(event) => setNewTag((current) => ({ ...current, name: event.target.value }))}
          placeholder="Neuer Tag"
        />
        <Input
          type="color"
          value={newTag.color}
          onChange={(event) => setNewTag((current) => ({ ...current, color: event.target.value }))}
          className="h-10 w-full p-1"
        />
        <Button
          variant="outline"
          onClick={() => {
            if (!newTag.name.trim()) return;
            setMutationError(null);
            createTagMutation.mutate();
          }}
          disabled={isMutating}
        >
          Neu
        </Button>
      </div>

      {mutationError ? (
        <DialogBaseInlineMessage className="mt-3" error={mutationError} />
      ) : null}

      {tagsQuery.error ? (
        <DialogBaseInlineMessage
          className="mt-3"
          error={normalizeServerError(tagsQuery.error, { title: "Tags konnten nicht geladen werden" })}
        />
      ) : null}

      <div className="mt-4 min-h-0 flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Farbe</TableHead>
              <TableHead className="w-[220px]">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tags.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  {editTag?.id === row.id ? (
                    <Input
                      value={editTag.name}
                      onChange={(event) => setEditTag({ ...editTag, name: event.target.value })}
                      data-testid={`input-edit-tag-name-${row.id}`}
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <span>{row.name}</span>
                      {isProtectedSystemTag(row) ? (
                        <span className="inline-flex rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                          System
                        </span>
                      ) : null}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {editTag?.id === row.id ? (
                    <Input
                      type="color"
                      value={editTag.color}
                      onChange={(event) => setEditTag({ ...editTag, color: event.target.value })}
                      className="h-9 w-14 p-1"
                      data-testid={`input-edit-tag-color-${row.id}`}
                    />
                  ) : (
                    <div className="h-6 w-8 rounded border border-slate-300" style={{ backgroundColor: row.color }} title={row.color} />
                  )}
                </TableCell>
                <TableCell className="space-x-2">
                  {editTag?.id === row.id ? (
                    <>
                      <Button
                        size="sm"
                        onClick={() => {
                          setMutationError(null);
                          updateTagMutation.mutate({
                            id: row.id,
                            version: row.version,
                            name: editTag.name.trim(),
                            color: editTag.color,
                          });
                        }}
                        disabled={isMutating}
                      >
                        Speichern
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditTag(null)} disabled={isMutating}>
                        Abbrechen
                      </Button>
                    </>
                  ) : (
                    isProtectedSystemTag(row) ? (
                      <span className="text-sm text-muted-foreground">Geschützter System-Tag</span>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setMutationError(null);
                            setEditTag({ ...row });
                          }}
                          disabled={isMutating}
                        >
                          Bearbeiten
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setPendingDeleteTag(row)}
                          disabled={isMutating}
                          data-testid={`button-delete-tag-${row.id}`}
                        >
                          Löschen
                        </Button>
                      </>
                    )
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
    <ConfirmDialogBase
      open={pendingDeleteTag !== null}
      onOpenChange={(open) => {
        if (!open) setPendingDeleteTag(null);
      }}
      icon={<TagsIcon className="h-5 w-5" />}
      title="Tag löschen"
      description={
        pendingDeleteTag
          ? `Soll der Tag "${pendingDeleteTag.name}" gelöscht werden? Zugewiesene oder geschützte Tags werden serverseitig abgelehnt.`
          : undefined
      }
      confirmLabel="Löschen"
      pendingLabel="Löschen..."
      isPending={deleteTagMutation.isPending}
      onConfirm={() => {
        if (!pendingDeleteTag) return;
        setMutationError(null);
        deleteTagMutation.mutate({ id: pendingDeleteTag.id, version: pendingDeleteTag.version });
      }}
      testId="dialog-delete-tag"
      variant="destructive"
    />
    </>
  );
}
