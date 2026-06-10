import React, { useEffect, useRef, useState } from "react";
import { useBulkWeekMove } from "@/hooks/useBulkWeekMove";
import {
  buildExecuteItems,
  getPreselectedItemIds,
  resolveInitialBlockingTagIds,
  toggleItemSelection,
  type BulkWeekMovePreviewItem,
} from "@/lib/calendar-bulk-week-move";
import {
  CalendarBulkWeekMoveDialog,
  type BulkWeekMovePhase,
} from "@/components/CalendarBulkWeekMoveDialog";

interface CalendarBulkWeekMoveDialogContainerProps {
  open: boolean;
  sourceWeekDate: string;
  onClose: () => void;
  /** Wird nach erfolgreichem Verschieben mit einem Zieldatum (yyyy-MM-dd) aufgerufen, um in die Zielwoche zu springen. */
  onMoved?: (targetWeekDate: string) => void;
}

export function CalendarBulkWeekMoveDialogContainer({
  open,
  sourceWeekDate,
  onClose,
  onMoved,
}: CalendarBulkWeekMoveDialogContainerProps) {
  const move = useBulkWeekMove({ open, sourceWeekDate });

  const [phase, setPhase] = useState<BulkWeekMovePhase>("config");
  const [sourceTourIds, setSourceTourIds] = useState<number[]>([]);
  const [shiftWeeks, setShiftWeeks] = useState<number>(1);
  const [blockingTagIds, setBlockingTagIds] = useState<number[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!open) {
      initializedRef.current = false;
      return;
    }
    if (initializedRef.current || move.isCatalogLoading) return;
    initializedRef.current = true;
    setPhase("config");
    setSelectedIds([]);
    setSourceTourIds(move.savedSourceTourIds);
    setShiftWeeks(move.savedShiftWeeks);
    setBlockingTagIds(
      resolveInitialBlockingTagIds(
        move.hasSavedBlockingTagSelection ? move.savedBlockingTagIds : undefined,
        move.tags,
      ),
    );
  }, [
    open,
    move.isCatalogLoading,
    move.savedSourceTourIds,
    move.savedShiftWeeks,
    move.savedBlockingTagIds,
    move.hasSavedBlockingTagSelection,
    move.tags,
  ]);

  const handleClose = () => {
    // Vor dem Reset das Zieldatum sichern, um nach erfolgreichem Verschieben in die Zielwoche zu springen.
    const targetWeekDate = move.executeResult?.moved?.[0]?.targetStartDate ?? null;
    move.resetPreview();
    move.resetExecute();
    if (targetWeekDate) {
      onMoved?.(targetWeekDate);
    }
    onClose();
  };

  const handleToggleTour = (tourId: number) => {
    setSourceTourIds((current) =>
      current.includes(tourId) ? current.filter((id) => id !== tourId) : [...current, tourId],
    );
  };

  const handleToggleBlockingTag = (tagId: number) => {
    setBlockingTagIds((current) =>
      current.includes(tagId) ? current.filter((id) => id !== tagId) : [...current, tagId],
    );
  };

  const handleRunPreview = async () => {
    const config = { sourceTourIds, shiftWeeks, blockingTagIds };
    void move.persistConfig(config);
    const result = await move.runPreview(config);
    setSelectedIds(getPreselectedItemIds(result.items));
    setPhase("report");
  };

  const handleToggleItem = (item: BulkWeekMovePreviewItem) => {
    setSelectedIds((current) => toggleItemSelection(current, item));
  };

  const handleConfirm = async () => {
    if (!move.preview) return;
    const items = buildExecuteItems(move.preview.items, selectedIds);
    await move.runExecute({ shiftWeeks, items });
    setPhase("result");
  };

  const errorMessage = move.previewError?.message ?? move.executeError?.message ?? null;

  return (
    <CalendarBulkWeekMoveDialog
      open={open}
      phase={phase}
      sourceWeekDate={sourceWeekDate}
      tours={move.tours}
      tags={move.tags}
      isCatalogLoading={move.isCatalogLoading}
      sourceTourIds={sourceTourIds}
      onToggleTour={handleToggleTour}
      shiftWeeks={shiftWeeks}
      onShiftWeeksChange={setShiftWeeks}
      blockingTagIds={blockingTagIds}
      onToggleBlockingTag={handleToggleBlockingTag}
      onRunPreview={handleRunPreview}
      isPreviewPending={move.isPreviewPending}
      previewError={errorMessage}
      preview={move.preview}
      selectedIds={selectedIds}
      onToggleItem={handleToggleItem}
      onBackToConfig={() => setPhase("config")}
      onConfirm={handleConfirm}
      isExecutePending={move.isExecutePending}
      executeResult={move.executeResult}
      onClose={handleClose}
    />
  );
}
