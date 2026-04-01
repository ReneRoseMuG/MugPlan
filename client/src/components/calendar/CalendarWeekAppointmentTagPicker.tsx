import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ListChecks } from "lucide-react";
import type { Tag } from "@shared/schema";
import { EntityEditDialog } from "@/components/ui/entity-edit-dialog";
import { EntityTagFooterRow } from "@/components/ui/entity-tag-footer-row";
import { PlusActionButton } from "@/components/ui/plus-action-button";
import { TagBadge } from "@/components/ui/tag-badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { invalidateTagProjectionQueries } from "@/lib/tag-invalidation";
import { fetchTagCatalog, getTagCatalogQueryKey } from "@/lib/tags";

type CalendarWeekAppointmentTagPickerProps = {
  appointmentId: number;
  tags: Tag[];
  appointmentTags: Tag[];
  projectTags: Tag[];
  canEdit: boolean;
  testId: string;
};

export function CalendarWeekAppointmentTagPicker({
  appointmentId,
  tags,
  appointmentTags,
  projectTags,
  canEdit,
  testId,
}: CalendarWeekAppointmentTagPickerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: availableTags = [] } = useQuery<Tag[]>({
    queryKey: getTagCatalogQueryKey("appointment"),
    queryFn: () => fetchTagCatalog("appointment"),
    enabled: dialogOpen,
    staleTime: 60_000,
  });

  const excludedTagIds = useMemo(() => {
    const result = new Set<number>();
    appointmentTags.forEach((tag) => result.add(tag.id));
    projectTags.forEach((tag) => result.add(tag.id));
    return result;
  }, [appointmentTags, projectTags]);

  const addableTags = useMemo(
    () => availableTags.filter((tag) => !excludedTagIds.has(tag.id)),
    [availableTags, excludedTagIds],
  );

  const invalidateAfterMutation = async () => {
    await invalidateTagProjectionQueries();
    await queryClient.invalidateQueries({ queryKey: ["/api/appointments", appointmentId, "tags"] });
  };

  const addTagMutation = useMutation({
    mutationFn: async (tagId: number) => {
      await apiRequest("POST", `/api/appointments/${appointmentId}/tags`, { tagId });
    },
    onSuccess: async () => {
      await invalidateAfterMutation();
      setDialogOpen(false);
    },
    onError: (mutationError: Error) => {
      toast({
        title: "Tag-Zuweisung fehlgeschlagen",
        description: mutationError.message,
        variant: "destructive",
      });
    },
  });

  const handleOpenDialogClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!canEdit) return;
    setDialogOpen(true);
  };

  return (
    <>
      <div className="flex w-full items-start gap-2" data-testid={testId}>
        <div className="min-w-0 flex-1">
          <EntityTagFooterRow tags={tags} testId={`${testId}-badges`} />
        </div>
        {canEdit ? (
          <PlusActionButton
            className="mt-0.5 shrink-0"
            onClick={handleOpenDialogClick}
            onMouseDown={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
            onDoubleClick={(event) => event.stopPropagation()}
            data-testid={`${testId}-button`}
            aria-label="Tag-Picker öffnen"
            title="Tag hinzufügen"
          />
        ) : null}
      </div>

      <EntityEditDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCancel={() => setDialogOpen(false)}
        title="Tag zu Termin hinzufügen"
        icon={ListChecks}
        maxWidth="max-w-4xl"
        hideActions
      >
        <div className="space-y-3" data-testid={`${testId}-dialog`}>
          {addableTags.length === 0 ? (
            <p className="text-sm text-slate-400">Keine weiteren Tags verfügbar.</p>
          ) : (
            addableTags.map((tag) => (
              <TagBadge
                key={tag.id}
                tag={tag}
                action="add"
                onAdd={() => addTagMutation.mutate(tag.id)}
                fullWidth
                testId={`${testId}-add-${tag.id}`}
              />
            ))
          )}
          {addTagMutation.isPending ? (
            <p className="text-xs text-muted-foreground">Änderung wird gespeichert ...</p>
          ) : null}
        </div>
      </EntityEditDialog>
    </>
  );
}
