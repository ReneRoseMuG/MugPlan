import { Users } from "lucide-react";
import type { InfoBadgePreview } from "@/components/ui/info-badge";

type TeamInfoBadgePreviewProps = {
  name: string;
  members?: { id?: number | string; fullName: string }[] | null;
};

export const teamInfoBadgePreviewOptions = {
  openDelayMs: 380,
  side: "right" as const,
  align: "start" as const,
  maxWidth: 360,
  maxHeight: 260,
};

export function TeamInfoBadgePreview({ name, members }: TeamInfoBadgePreviewProps) {
  const sortedMembers = [...(members ?? [])].sort((a, b) =>
    a.fullName.localeCompare(b.fullName, "de", { sensitivity: "base" }),
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Users className="h-4 w-4 text-muted-foreground" />
        <span>{name}</span>
      </div>
      <div className="space-y-1">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mitarbeiter</div>
        {sortedMembers.length > 0 ? (
          <ul className="space-y-1 text-xs text-muted-foreground">
            {sortedMembers.map((member) => (
              <li key={member.id ?? member.fullName}>{member.fullName}</li>
            ))}
          </ul>
        ) : (
          <div className="text-xs text-muted-foreground">Keine Mitarbeiter zugewiesen</div>
        )}
      </div>
    </div>
  );
}

export function createTeamInfoBadgePreview(props: TeamInfoBadgePreviewProps): InfoBadgePreview {
  return {
    content: <TeamInfoBadgePreview {...props} />,
    options: teamInfoBadgePreviewOptions,
  };
}
