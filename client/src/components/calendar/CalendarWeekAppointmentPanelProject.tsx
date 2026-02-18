import { ProjectStatusInfoBadge } from "@/components/ui/project-status-info-badge";

type AppointmentStatus = {
  id: number;
  title: string;
  color: string;
};

export function CalendarWeekAppointmentPanelProject({
  projectName,
  projectOrderNumber,
  projectDescription,
  projectStatuses,
  showSectionTitle = false,
}: {
  projectName: string;
  projectOrderNumber: string | null;
  projectDescription: string | null;
  projectStatuses: AppointmentStatus[];
  showSectionTitle?: boolean;
}) {
  return (
    <div className="rounded-md border border-slate-200/90 px-2 py-1.5">
      {showSectionTitle && <div className="mb-1 text-[10px] font-semibold uppercase text-slate-500">Projekt</div>}
      {projectStatuses.length > 0 && (
        <div className="mb-1 flex flex-wrap gap-1">
          {projectStatuses.map((status) => (
            <ProjectStatusInfoBadge
              key={status.id}
              status={status}
              size="sm"
              testId={`week-project-status-${status.id}`}
            />
          ))}
        </div>
      )}
      <div className="text-xs font-semibold text-slate-800">{projectName}</div>
      {projectOrderNumber && (
        <div className="text-[11px] text-slate-600">Auftragsnr.: {projectOrderNumber}</div>
      )}
      {projectDescription && (
        <div
          className="max-h-16 overflow-hidden text-[11px] leading-snug text-slate-600 [&_ol]:list-decimal [&_ol]:pl-4 [&_p]:mb-1 [&_ul]:list-disc [&_ul]:pl-4 [&_li]:mb-0.5"
          dangerouslySetInnerHTML={{ __html: projectDescription }}
        />
      )}
    </div>
  );
}
