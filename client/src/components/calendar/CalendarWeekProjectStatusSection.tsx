import { ProjectStatusInfoBadge } from "@/components/ui/project-status-info-badge";

type ProjectStatusLike = {
  id: number;
  title: string;
  color: string;
};

type CalendarWeekProjectStatusSectionProps = {
  statuses: ProjectStatusLike[];
  reservedHeightPx?: number | null;
  containerRef?: React.Ref<HTMLDivElement>;
};

export function CalendarWeekProjectStatusSection({
  statuses,
  reservedHeightPx,
  containerRef,
}: CalendarWeekProjectStatusSectionProps) {
  if (statuses.length === 0 && !(reservedHeightPx && reservedHeightPx > 0)) {
    return null;
  }

  return (
    <div
      className="rounded-md border border-slate-200/90 px-2 py-1.5"
      style={reservedHeightPx && reservedHeightPx > 0 ? { height: `${reservedHeightPx}px` } : undefined}
      ref={containerRef}
      data-testid="week-project-status-section"
    >
      {statuses.length > 0 ? (
        <>
          <div className="mb-1 text-[10px] font-semibold text-slate-500">Projekt Status</div>
          <div className="flex flex-wrap gap-1">
            {statuses.map((status) => (
              <ProjectStatusInfoBadge
                key={status.id}
                status={status}
                size="sm"
                testId={`week-project-status-${status.id}`}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
