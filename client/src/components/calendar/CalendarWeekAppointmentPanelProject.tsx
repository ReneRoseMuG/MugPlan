import { HoverPreview } from "@/components/ui/hover-preview";

export function CalendarWeekAppointmentPanelProject({
  projectName,
  projectOrderNumber,
  projectDescription,
  showSectionTitle = false,
  enableFullDescriptionPreview = false,
}: {
  projectName: string;
  projectOrderNumber: string | null;
  projectDescription: string | null;
  showSectionTitle?: boolean;
  enableFullDescriptionPreview?: boolean;
}) {
  const descriptionClassName =
    "max-h-16 overflow-hidden text-[11px] leading-snug text-slate-600 [&_ol]:list-decimal [&_ol]:pl-4 [&_p]:mb-1 [&_ul]:list-disc [&_ul]:pl-4 [&_li]:mb-0.5";
  const fullDescriptionClassName =
    "max-h-[280px] overflow-y-auto text-[11px] leading-snug text-slate-600 [&_ol]:list-decimal [&_ol]:pl-4 [&_p]:mb-1 [&_ul]:list-disc [&_ul]:pl-4 [&_li]:mb-0.5";
  const resolvedProjectHeader = [projectOrderNumber?.trim() || "-", projectName].join(" - ");

  return (
    <div className="rounded-md border border-slate-200/90 px-2 py-1.5">
      {showSectionTitle && <div className="mb-1 text-[10px] font-semibold text-slate-500">Projekt</div>}
      <div className="text-xs font-semibold text-slate-800" data-testid="week-project-header">{resolvedProjectHeader}</div>
      {projectDescription && !enableFullDescriptionPreview && (
        <div className={descriptionClassName} dangerouslySetInnerHTML={{ __html: projectDescription }} />
      )}
      {projectDescription && enableFullDescriptionPreview && (
        <HoverPreview
          preview={(
            <div className="rounded-lg bg-white p-2">
              <div className="mb-2 text-xs font-semibold text-slate-800">{resolvedProjectHeader}</div>
              <div className={fullDescriptionClassName} dangerouslySetInnerHTML={{ __html: projectDescription }} />
            </div>
          )}
          closeDelay={80}
          side="right"
          align="start"
          maxWidth={420}
          maxHeight={320}
          className="z-[9999] w-[420px]"
        >
          <div
            className={descriptionClassName}
            dangerouslySetInnerHTML={{ __html: projectDescription }}
            data-testid="week-project-description-hover-trigger"
          />
        </HoverPreview>
      )}
    </div>
  );
}
