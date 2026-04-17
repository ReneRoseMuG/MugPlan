import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { StickyNote } from "lucide-react";
import { HoverPreview } from "@/components/ui/hover-preview";
import { FooterChildCollectionBadge } from "@/components/ui/footer-child-collection-badge";
import type { Note } from "@shared/schema";

interface TourWeekNotesHoverPreviewProps {
  tourId: number;
  isoYear: number;
  isoWeek: number;
  count: number;
  triggerTestId?: string;
}

function htmlToExcerpt(value: string, maxLength = 140): string {
  const withLineBreaks = value
    .replace(/<\/p>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/div>/gi, "\n");

  const plainText = withLineBreaks
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();

  if (plainText.length <= maxLength) return plainText;
  return `${plainText.slice(0, maxLength - 1).trimEnd()}...`;
}

function resolveTextColor(hex: string | null | undefined): string {
  if (!hex) return "#1e293b";
  const h = hex.replace("#", "");
  if (h.length !== 6) return "#1e293b";
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#1e293b" : "#ffffff";
}

export function TourWeekNotesHoverPreview({
  tourId,
  isoYear,
  isoWeek,
  count,
  triggerTestId,
}: TourWeekNotesHoverPreviewProps) {
  const [shouldLoadPreview, setShouldLoadPreview] = useState(false);
  const normalizedCount = Number.isFinite(count) ? Math.max(0, count) : 0;

  const notesQuery = useQuery<Note[]>({
    queryKey: ["calendarWeekNotes", isoYear, isoWeek, tourId, "preview"],
    enabled: shouldLoadPreview && normalizedCount > 0,
    queryFn: async () => {
      const response = await fetch(`/api/calendar-weeks/${isoYear}/${isoWeek}/tours/${tourId}/notes`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Notizen konnten nicht geladen werden");
      }
      const payload = (await response.json()) as unknown;
      return Array.isArray(payload) ? payload as Note[] : [];
    },
  });

  return (
    <HoverPreview
      preview={(
        <div className="w-[320px] rounded-lg bg-white p-2">
          {notesQuery.isLoading ? (
            <div className="text-xs text-slate-500">Notizen werden geladen...</div>
          ) : (notesQuery.data?.length ?? 0) === 0 ? (
            <div className="text-xs text-slate-500">Keine Notizen vorhanden.</div>
          ) : (
            <div className="max-h-[320px] space-y-1.5 overflow-y-auto">
              {(notesQuery.data ?? []).map((note) => (
                <article
                  key={note.id}
                  className="rounded-md border border-slate-200 px-2 py-1.5"
                  style={{ backgroundColor: note.cardColor ?? "#ffffff", color: resolveTextColor(note.cardColor) }}
                >
                  <div className="text-[11px] font-semibold">
                    {note.title}
                  </div>
                  <div className="text-[11px] leading-snug whitespace-pre-line">
                    {htmlToExcerpt(note.body ?? "") || "-"}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}
      closeDelay={120}
      side="right"
      align="start"
      maxWidth={360}
      maxHeight={360}
      className="z-[9999] w-[360px]"
    >
      <FooterChildCollectionBadge
        icon={<StickyNote className="h-3 w-3" />}
        label="Notizen"
        count={normalizedCount}
        testId={triggerTestId}
        onHoverStart={() => setShouldLoadPreview(true)}
        inactive={normalizedCount <= 0}
      />
    </HoverPreview>
  );
}
