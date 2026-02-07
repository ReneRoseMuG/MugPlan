import { User } from "lucide-react";
import type { InfoBadgePreview } from "@/components/ui/info-badge";

type EmployeeInfoBadgePreviewProps = {
  fullName: string;
  teamName?: string | null;
  tourName?: string | null;
};

export const employeeInfoBadgePreviewOptions = {
  openDelayMs: 380,
  side: "right" as const,
  align: "start" as const,
  maxWidth: 360,
  maxHeight: 260,
};

export function EmployeeInfoBadgePreview({ fullName, teamName, tourName }: EmployeeInfoBadgePreviewProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <User className="h-4 w-4 text-muted-foreground" />
        <span>{fullName}</span>
      </div>
      {(teamName || tourName) && (
        <div className="space-y-1 text-xs text-muted-foreground">
          {teamName && <div>Team: {teamName}</div>}
          {tourName && <div>Tour: {tourName}</div>}
        </div>
      )}
    </div>
  );
}

export function createEmployeeInfoBadgePreview(props: EmployeeInfoBadgePreviewProps): InfoBadgePreview {
  return {
    content: <EmployeeInfoBadgePreview {...props} />,
    options: employeeInfoBadgePreviewOptions,
  };
}
