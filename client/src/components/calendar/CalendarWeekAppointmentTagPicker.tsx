import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Tag } from "@shared/schema";
import { TagSelectionMenuContent } from "@/components/tags/tag-selection-menu-content";
import { EntityTagFooterRow } from "@/components/ui/entity-tag-footer-row";
import { PlusActionButton } from "@/components/ui/plus-action-button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  const [pickerOpen, setPickerOpen] = useState(false);

  const { data: availableTags = [] } = useQuery<Tag[]>({
    queryKey: getTagCatalogQueryKey("appointment"),
    queryFn: () => fetchTagCatalog("appointment"),
    enabled: pickerOpen,
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
      setPickerOpen(false);
    },
    onError: (mutationError: Error) => {
      toast({
        title: "Tag-Zuweisung fehlgeschlagen",
        description: mutationError.message,
        variant: "destructive",
      });
    },
  });

  const stopPropagation = (event: React.SyntheticEvent) => {
    event.stopPropagation();
  };

  return (
    <div className="flex w-full items-start gap-2" data-testid={testId}>
      <div className="min-w-0 flex-1">
        <EntityTagFooterRow tags={tags} testId={`${testId}-badges`} />
      </div>
      {canEdit ? (
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild>
            <PlusActionButton
              className="mt-0.5 shrink-0"
              onClick={stopPropagation}
              onMouseDown={stopPropagation}
              onPointerDown={stopPropagation}
              onDoubleClick={stopPropagation}
              data-testid={`${testId}-button`}
              aria-label="Tag-Picker öffnen"
              title="Tag hinzufügen"
            />
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3" align="end">
            <div data-testid={`${testId}-dialog`}>
              <TagSelectionMenuContent
                tags={addableTags}
                onAddTag={(tagId) => addTagMutation.mutate(tagId)}
                emptyText="Keine weiteren Tags verfügbar."
                testIdPrefix={`${testId}-add`}
                showVerboseLabels
                pendingText={addTagMutation.isPending ? "Änderung wird gespeichert ..." : null}
                title="Tag hinzufügen"
              />
            </div>
          </PopoverContent>
        </Popover>
      ) : null}
    </div>
  );
}
