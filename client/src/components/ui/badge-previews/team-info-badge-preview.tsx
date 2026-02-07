import { Users } from "lucide-react";
import type { InfoBadgePreview } from "@/components/ui/info-badge";

type TeamInfoBadgePreviewProps = {
  name: string;
  memberCount?: number | null;
};

export const teamInfoBadgePreviewOptions = {
  openDelayMs: 380,
  side: "right" as const,
  align: "start" as const,
  maxWidth: 360,
  maxHeight: 260,
};

export function TeamInfoBadgePreview({ name, memberCount }: TeamInfoBadgePreviewProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Users className="h-4 w-4 text-muted-foreground" />
        <span>{name}</span>
      </div>
      {memberCount != null && (
        <div className="text-xs text-muted-foreground">
          Mitglieder: {memberCount}
        </div>
      )}
    </div>
  );
}

export function createTeamInfoBadgePreview(props: TeamInfoBadgePreviewProps): InfoBadgePreview {
  return {
    content: <TeamInfoBadgePreview {...props} />,
    options: teamInfoBadgePreviewOptions,
  };
}
