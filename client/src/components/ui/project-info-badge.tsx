import { InfoBadge } from "@/components/ui/info-badge";
import { createProjectInfoBadgePreview } from "@/components/ui/badge-previews/project-info-badge-preview";
import { FolderKanban } from "lucide-react";
import type { ReactNode } from "react";

interface ProjectInfoBadgeProps {
  id?: number | string | null;
  title: string;
  customerFullName?: string | null;
  appointmentCount?: number | null;
  earliestAppointmentDate?: string | null;
  icon?: ReactNode;
  borderColor?: string;
  testId?: string;
  size?: "default" | "sm";
  fullWidth?: boolean;
  action?: "add" | "remove" | "none";
  onAdd?: () => void;
  onRemove?: () => void;
}

export function ProjectInfoBadge({
  id: _id,
  title,
  customerFullName,
  appointmentCount,
  earliestAppointmentDate,
  icon,
  borderColor,
  testId,
  size = "default",
  fullWidth = false,
  action,
  onAdd,
  onRemove,
}: ProjectInfoBadgeProps) {
  const hasAppointments = typeof appointmentCount === "number";
  const appointmentLine = hasAppointments
    ? `Termine: ${appointmentCount}${earliestAppointmentDate ? ` · Frühester: ${earliestAppointmentDate}` : ""}`
    : earliestAppointmentDate
      ? `Frühester Termin: ${earliestAppointmentDate}`
      : null;

  const detailLines = [
    customerFullName ? `Kunde: ${customerFullName}` : null,
    appointmentLine,
  ].filter(Boolean) as string[];

  return (
    <InfoBadge
      icon={icon ?? <FolderKanban className="w-4 h-4" />}
      label={(
        <div className="flex flex-col leading-tight">
          <span className={size === "sm" ? "text-xs" : "text-sm"}>{title}</span>
          {detailLines.map((line, index) => (
            <span key={`${line}-${index}`} className="text-xs text-muted-foreground">
              {line}
            </span>
          ))}
        </div>
      )}
      borderColor={borderColor}
      action={action}
      onAdd={onAdd}
      onRemove={onRemove}
      testId={testId}
      size={size}
      fullWidth={fullWidth}
      preview={createProjectInfoBadgePreview({
        title,
        customerName: customerFullName ?? null,
        appointmentCount: typeof appointmentCount === "number" ? appointmentCount : null,
        earliestAppointmentDate: earliestAppointmentDate ?? null,
      })}
    />
  );
}
