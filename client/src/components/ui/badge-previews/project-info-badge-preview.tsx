import { FolderKanban } from "lucide-react";
import type { InfoBadgePreview } from "@/components/ui/info-badge";

type ProjectInfoBadgePreviewProps = {
  title: string;
  customerName?: string | null;
  appointmentCount?: number | null;
  earliestAppointmentDate?: string | null;
};

export const projectInfoBadgePreviewOptions = {
  openDelayMs: 380,
  side: "right" as const,
  align: "start" as const,
  maxWidth: 360,
  maxHeight: 260,
};

export function ProjectInfoBadgePreview({
  title,
  customerName,
  appointmentCount,
  earliestAppointmentDate,
}: ProjectInfoBadgePreviewProps) {
  const appointmentLine = typeof appointmentCount === "number"
    ? `Termine: ${appointmentCount}${earliestAppointmentDate ? ` · Frühester: ${earliestAppointmentDate}` : ""}`
    : earliestAppointmentDate
      ? `Frühester Termin: ${earliestAppointmentDate}`
      : null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <FolderKanban className="h-4 w-4 text-muted-foreground" />
        <span>{title}</span>
      </div>
      <div className="space-y-1 text-xs text-muted-foreground">
        {customerName && <div>Kunde: {customerName}</div>}
        {appointmentLine && <div>{appointmentLine}</div>}
      </div>
    </div>
  );
}

export function createProjectInfoBadgePreview(props: ProjectInfoBadgePreviewProps): InfoBadgePreview {
  return {
    content: <ProjectInfoBadgePreview {...props} />,
    options: projectInfoBadgePreviewOptions,
  };
}
