import { useState } from "react";
import { StickyNote } from "lucide-react";
import { HoverPreview } from "@/components/ui/hover-preview";
import { CalendarWeekAppointmentNotesPreview } from "./CalendarWeekAppointmentNotesPreview";

export function CalendarWeekAppointmentNotesHover({
  customerId,
  projectId,
  customerNotesCount,
  projectNotesCount,
}: {
  customerId: number;
  projectId: number;
  customerNotesCount: number;
  projectNotesCount: number;
}) {
  const [shouldLoadPreview, setShouldLoadPreview] = useState(false);
  const safeCustomerNotesCount = Number.isFinite(customerNotesCount) ? Math.max(0, customerNotesCount) : 0;
  const safeProjectNotesCount = Number.isFinite(projectNotesCount) ? Math.max(0, projectNotesCount) : 0;
  const totalNotesCount = safeCustomerNotesCount + safeProjectNotesCount;
  if (totalNotesCount <= 0) return null;

  return (
    <HoverPreview
      preview={(
        <CalendarWeekAppointmentNotesPreview
          customerId={customerId}
          projectId={projectId}
          customerNotesCount={safeCustomerNotesCount}
          projectNotesCount={safeProjectNotesCount}
          shouldLoad={shouldLoadPreview}
        />
      )}
      closeDelay={80}
      side="right"
      align="start"
      maxWidth={360}
      maxHeight={340}
      className="z-[9999] w-[360px]"
    >
      <div
        className="mt-1 cursor-pointer rounded-md border border-slate-200/90 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-100"
        data-testid="week-appointment-notes-hover-trigger"
        onMouseEnter={() => setShouldLoadPreview(true)}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1">
            <StickyNote className="h-3 w-3" />
            Notizen
          </span>
          <span>{totalNotesCount}</span>
        </div>
      </div>
    </HoverPreview>
  );
}
