import { Route } from "lucide-react";
import { CalendarWeekAppointmentPanelEmployee } from "@/components/calendar/CalendarWeekAppointmentPanelEmployee";
import type { InfoBadgePreview } from "@/components/ui/info-badge";

type TourInfoBadgePreviewProps = {
  name: string;
  members?: { id?: number | string; fullName: string }[] | null;
};

export const tourInfoBadgePreviewOptions = {
  openDelayMs: 380,
  side: "right" as const,
  align: "start" as const,
  maxWidth: 360,
  maxHeight: 260,
};

export function TourInfoBadgePreview({ name, members }: TourInfoBadgePreviewProps) {
  const sortedMembers = [...(members ?? [])].sort((a, b) =>
    a.fullName.localeCompare(b.fullName, "de", { sensitivity: "base" }),
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Route className="h-4 w-4 text-muted-foreground" />
        <span>{name}</span>
      </div>
      <div className="space-y-1">
        <div className="text-xs font-semibold tracking-wide text-muted-foreground">Mitarbeiter</div>
        {sortedMembers.length > 0 ? (
          <CalendarWeekAppointmentPanelEmployee
            employees={sortedMembers.map((member) => ({
              id: member.id ?? member.fullName,
              fullName: member.fullName,
            }))}
          />
        ) : (
          <div className="text-xs text-muted-foreground">Keine Mitarbeiter zugewiesen</div>
        )}
      </div>
    </div>
  );
}

export function createTourInfoBadgePreview(props: TourInfoBadgePreviewProps): InfoBadgePreview {
  return {
    content: <TourInfoBadgePreview {...props} />,
    options: tourInfoBadgePreviewOptions,
  };
}
