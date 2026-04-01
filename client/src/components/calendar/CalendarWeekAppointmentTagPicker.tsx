import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Tags } from "lucide-react";
import type { Tag } from "@shared/schema";
import type { TagRelationItem } from "@/components/TagPickerPanel";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { EntityTagFooterRow } from "@/components/ui/entity-tag-footer-row";
import { TagBadge } from "@/components/ui/tag-badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { invalidateTagProjectionQueries } from "@/lib/tag-invalidation";
import { fetchTagCatalog, getTagCatalogQueryKey } from "@/lib/tags";

type CalendarWeekAppointmentTagPickerProps = {
  appointmentId: number;
  tags: Tag[];
  canEdit: boolean;
  testId: string;
};

const fetchAppointmentTagRelations = async (appointmentId: number): Promise<TagRelationItem[]> => {
  const response = await fetch(`/api/appointments/${appointmentId}/tags`, {
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error((await response.text()) || "Termin-Tags konnten nicht geladen werden");
  }
  return response.json() as Promise<TagRelationItem[]>;
};

export function CalendarWeekAppointmentTagPicker({
  appointmentId,
  tags,
  canEdit,
  testId,
}: CalendarWeekAppointmentTagPickerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: availableTags = [] } = useQuery<Tag[]>({
    queryKey: getTagCatalogQueryKey("appointment"),
    queryFn: () => fetchTagCatalog("appointment"),
    enabled: canEdit && open,
    staleTime: 60_000,
  });

  const {
    data: assignedTags = [],
    isLoading,
    error,
  } = useQuery<TagRelationItem[]>({
    queryKey: ["/api/appointments", appointmentId, "tags"],
    queryFn: () => fetchAppointmentTagRelations(appointmentId),
    enabled: canEdit && open,
  });

  const assignedTagIds = useMemo(
    () => new Set(assignedTags.map((item) => item.tag.id)),
    [assignedTags],
  );

  const availableUnassignedTags = useMemo(
    () => availableTags.filter((tag) => !assignedTagIds.has(tag.id)),
    [assignedTagIds, availableTags],
  );

  const invalidateAfterMutation = async () => {
    await queryClient.invalidateQueries({ queryKey: ["/api/appointments", appointmentId, "tags"] });
    await invalidateTagProjectionQueries();
  };

  const addTagMutation = useMutation({
    mutationFn: async (tagId: number) => {
      await apiRequest("POST", `/api/appointments/${appointmentId}/tags`, { tagId });
    },
    onSuccess: async () => {
      await invalidateAfterMutation();
    },
    onError: (mutationError: Error) => {
      toast({
        title: "Tag-Zuweisung fehlgeschlagen",
        description: mutationError.message,
        variant: "destructive",
      });
    },
  });

  const removeTagMutation = useMutation({
    mutationFn: async (item: TagRelationItem) => {
      await apiRequest("DELETE", `/api/appointments/${appointmentId}/tags/${item.tag.id}`, {
        version: item.relationVersion,
      });
    },
    onSuccess: async () => {
      await invalidateAfterMutation();
    },
    onError: (mutationError: Error) => {
      toast({
        title: "Tag-Entfernung fehlgeschlagen",
        description: mutationError.message,
        variant: "destructive",
      });
    },
  });

  const isMutating = addTagMutation.isPending || removeTagMutation.isPending;
  const loadErrorMessage = error instanceof Error ? error.message : null;

  return (
    <div className="flex w-full items-start gap-2" data-testid={testId}>
      <div className="min-w-0 flex-1">
        <EntityTagFooterRow tags={tags} testId={`${testId}-badges`} />
      </div>
      {canEdit ? (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-0.5 h-6 shrink-0 px-2 text-[11px]"
              data-testid={`${testId}-button`}
              aria-label="Tag-Picker öffnen"
            >
              <Tags className="h-3.5 w-3.5" />
              Tags
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-3" align="end" side="top">
            <div className="space-y-3" data-testid={`${testId}-popover`}>
              <div className="flex items-center gap-2">
                <Tags className="h-4 w-4 text-muted-foreground" />
                <div>
                  <h4 className="text-sm font-semibold">Termin-Tags</h4>
                  <p className="text-xs text-muted-foreground">Tags direkt aus dem Wochenkalender verwalten</p>
                </div>
              </div>
              {loadErrorMessage ? (
                <p className="text-xs text-destructive" data-testid={`${testId}-load-error`}>
                  {loadErrorMessage}
                </p>
              ) : null}
              <div className="space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Zugewiesen</div>
                {isLoading ? (
                  <div className="space-y-2">
                    <div className="h-8 rounded-md bg-slate-200/70" />
                    <div className="h-8 rounded-md bg-slate-200/70" />
                  </div>
                ) : assignedTags.length === 0 ? (
                  <p className="text-xs text-slate-400">Keine Termin-Tags zugewiesen.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {assignedTags.map((item) => (
                      <TagBadge
                        key={item.tag.id}
                        tag={item.tag}
                        action="remove"
                        onRemove={() => removeTagMutation.mutate(item)}
                        size="sm"
                        fullWidth
                        testId={`${testId}-remove-${item.tag.id}`}
                      />
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Hinzufügen</div>
                {availableUnassignedTags.length === 0 ? (
                  <p className="text-xs text-slate-400">Keine weiteren Tags verfügbar.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {availableUnassignedTags.map((tag) => (
                      <TagBadge
                        key={tag.id}
                        tag={tag}
                        action="add"
                        onAdd={() => addTagMutation.mutate(tag.id)}
                        size="sm"
                        fullWidth
                        testId={`${testId}-add-${tag.id}`}
                      />
                    ))}
                  </div>
                )}
              </div>
              {isMutating ? (
                <p className="text-xs text-muted-foreground">Änderung wird gespeichert ...</p>
              ) : null}
            </div>
          </PopoverContent>
        </Popover>
      ) : null}
    </div>
  );
}
