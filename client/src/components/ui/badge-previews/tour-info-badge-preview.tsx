import { Route } from "lucide-react";
import type { InfoBadgePreview } from "@/components/ui/info-badge";

type TourInfoBadgePreviewProps = {
  name: string;
  memberCount?: number | null;
};

export const tourInfoBadgePreviewOptions = {
  openDelayMs: 380,
  side: "right" as const,
  align: "start" as const,
  maxWidth: 360,
  maxHeight: 260,
};

export function TourInfoBadgePreview({ name, memberCount }: TourInfoBadgePreviewProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Route className="h-4 w-4 text-muted-foreground" />
        <span>{name}</span>
      </div>
      {memberCount != null && (
        <div className="text-xs text-muted-foreground">
          Mitarbeiter: {memberCount}
        </div>
      )}
    </div>
  );
}

export function createTourInfoBadgePreview(props: TourInfoBadgePreviewProps): InfoBadgePreview {
  return {
    content: <TourInfoBadgePreview {...props} />,
    options: tourInfoBadgePreviewOptions,
  };
}
