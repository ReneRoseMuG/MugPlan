import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { StickyNote } from "lucide-react";
import { HoverPreview } from "@/components/ui/hover-preview";
import type { Note } from "@shared/schema";

type NotesSourceType = "customer" | "project" | "appointment";

type NotesSource = {
  type: NotesSourceType;
  id: number;
  count: number;
};

type CumulativeSources = {
  customer?: { id: number; count: number };
  project?: { id: number; count: number };
  appointment?: { id: number; count: number };
};

type SingleParentSource = {
  type: NotesSourceType;
  id: number;
  count: number;
};

type EntityNotesHoverPreviewProps =
  | {
      sourceMode: "cumulative";
      sources: CumulativeSources;
      triggerLabel?: string;
      triggerTestId?: string;
      maxWidth?: number;
      maxHeight?: number;
    }
  | {
      sourceMode: "single-parent";
      sources: SingleParentSource;
      triggerLabel?: string;
      triggerTestId?: string;
      maxWidth?: number;
      maxHeight?: number;
    };

function normalizeCount(count: number): number {
  return Number.isFinite(count) ? Math.max(0, count) : 0;
}

function resolveTitle(type: NotesSourceType): string {
  if (type === "customer") return "Kunde";
  if (type === "project") return "Projekt";
  return "Termin";
}

function resolveEndpoint(type: NotesSourceType, id: number): string {
  if (type === "customer") return `/api/customers/${id}/notes`;
  if (type === "project") return `/api/projects/${id}/notes`;
  return `/api/appointments/${id}/notes`;
}

function htmlToExcerpt(value: string, maxLength = 140): string {
  const plainText = value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (plainText.length <= maxLength) return plainText;
  return `${plainText.slice(0, maxLength - 1).trimEnd()}...`;
}

function formatNoteDate(value: Date | string | null): string {
  if (!value) return "-";
  const parsed = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(parsed.getTime())) return "-";
  return format(parsed, "dd.MM.yyyy", { locale: de });
}

function NotesSection({
  title,
  notes,
  isLoading,
  isError,
}: {
  title: string;
  notes: Note[];
  isLoading: boolean;
  isError: boolean;
}) {
  if (isError) {
    return <div className="text-xs text-red-600">Notizen konnten nicht geladen werden.</div>;
  }

  if (isLoading) {
    return <div className="text-xs text-slate-500">Notizen werden geladen...</div>;
  }

  return (
    <div className="space-y-1.5">
      <div className="text-[10px] font-semibold tracking-wide text-slate-500">
        {title} ({notes.length})
      </div>
      <div className="space-y-1.5">
        {notes.map((note) => (
          <article
            key={note.id}
            className={`rounded-md border border-slate-200 bg-white px-2 py-1.5 ${note.color ? "border-l-4" : ""}`}
            style={note.color ? { borderLeftColor: note.color } : undefined}
          >
            <div className="text-[11px] font-semibold text-slate-800">{note.title}</div>
            <div className="text-[11px] leading-snug text-slate-600">{htmlToExcerpt(note.body ?? "") || "-"}</div>
            <div className="mt-1 text-[10px] text-slate-400">{formatNoteDate(note.updatedAt)}</div>
          </article>
        ))}
      </div>
    </div>
  );
}

export function EntityNotesHoverPreview({
  sourceMode,
  sources,
  triggerLabel = "Notizen",
  triggerTestId,
  maxWidth = 360,
  maxHeight = 340,
}: EntityNotesHoverPreviewProps) {
  const [shouldLoadPreview, setShouldLoadPreview] = useState(false);

  const sourceEntries: NotesSource[] = sourceMode === "cumulative"
    ? [
        sources.customer ? { type: "customer", id: sources.customer.id, count: normalizeCount(sources.customer.count) } : null,
        sources.project ? { type: "project", id: sources.project.id, count: normalizeCount(sources.project.count) } : null,
        sources.appointment ? { type: "appointment", id: sources.appointment.id, count: normalizeCount(sources.appointment.count) } : null,
      ].filter((entry): entry is NotesSource => entry !== null && entry.count > 0)
    : [{ type: sources.type, id: sources.id, count: normalizeCount(sources.count) }].filter((entry) => entry.count > 0);

  const totalNotesCount = sourceEntries.reduce((acc, entry) => acc + entry.count, 0);

  const customerSource = sourceEntries.find((entry) => entry.type === "customer");
  const projectSource = sourceEntries.find((entry) => entry.type === "project");
  const appointmentSource = sourceEntries.find((entry) => entry.type === "appointment");

  const customerEnabled = shouldLoadPreview && Boolean(customerSource);
  const projectEnabled = shouldLoadPreview && Boolean(projectSource);
  const appointmentEnabled = shouldLoadPreview && Boolean(appointmentSource);

  const customerQuery = useQuery<Note[]>({
    queryKey: ["/api/notes-preview", "customer", customerSource?.id ?? null],
    enabled: customerEnabled,
    queryFn: async () => {
      if (!customerSource) return [];
      const response = await fetch(resolveEndpoint("customer", customerSource.id), { credentials: "include" });
      if (!response.ok) throw new Error("Kundennotizen konnten nicht geladen werden");
      const payload = (await response.json()) as unknown;
      return Array.isArray(payload) ? (payload as Note[]) : [];
    },
  });

  const projectQuery = useQuery<Note[]>({
    queryKey: ["/api/notes-preview", "project", projectSource?.id ?? null],
    enabled: projectEnabled,
    queryFn: async () => {
      if (!projectSource) return [];
      const response = await fetch(resolveEndpoint("project", projectSource.id), { credentials: "include" });
      if (!response.ok) throw new Error("Projektnotizen konnten nicht geladen werden");
      const payload = (await response.json()) as unknown;
      return Array.isArray(payload) ? (payload as Note[]) : [];
    },
  });

  const appointmentQuery = useQuery<Note[]>({
    queryKey: ["/api/notes-preview", "appointment", appointmentSource?.id ?? null],
    enabled: appointmentEnabled,
    queryFn: async () => {
      if (!appointmentSource) return [];
      const response = await fetch(resolveEndpoint("appointment", appointmentSource.id), { credentials: "include" });
      if (!response.ok) throw new Error("Terminnotizen konnten nicht geladen werden");
      const payload = (await response.json()) as unknown;
      return Array.isArray(payload) ? (payload as Note[]) : [];
    },
  });

  if (totalNotesCount <= 0) return null;

  return (
    <HoverPreview
      preview={(
        <div className="rounded-lg bg-white p-2">
          <div className="max-h-[320px] space-y-2 overflow-y-auto">
            {customerSource ? (
              <NotesSection
                title={resolveTitle("customer")}
                notes={customerQuery.data ?? []}
                isLoading={customerQuery.isLoading}
                isError={customerQuery.isError}
              />
            ) : null}
            {projectSource ? (
              <NotesSection
                title={resolveTitle("project")}
                notes={projectQuery.data ?? []}
                isLoading={projectQuery.isLoading}
                isError={projectQuery.isError}
              />
            ) : null}
            {appointmentSource ? (
              <NotesSection
                title={resolveTitle("appointment")}
                notes={appointmentQuery.data ?? []}
                isLoading={appointmentQuery.isLoading}
                isError={appointmentQuery.isError}
              />
            ) : null}
          </div>
        </div>
      )}
      closeDelay={80}
      side="right"
      align="start"
      maxWidth={maxWidth}
      maxHeight={maxHeight}
      className="z-[9999] w-[360px]"
    >
      <div
        className="mt-1 cursor-pointer rounded-md border border-slate-200/90 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-100"
        data-testid={triggerTestId}
        onMouseEnter={() => setShouldLoadPreview(true)}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1">
            <StickyNote className="h-3 w-3" />
            {triggerLabel}
          </span>
          <span>{totalNotesCount}</span>
        </div>
      </div>
    </HoverPreview>
  );
}
