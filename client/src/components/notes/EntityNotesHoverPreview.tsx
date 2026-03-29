import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { StickyNote } from "lucide-react";
import { HoverPreview } from "@/components/ui/hover-preview";
import { FooterChildCollectionBadge } from "@/components/ui/footer-child-collection-badge";
import type { Note } from "@shared/schema";

type NotesSourceType = "customer" | "project" | "appointment" | "employee";

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
      fullWidth?: boolean;
    }
  | {
      sourceMode: "single-parent";
      sources: SingleParentSource;
      triggerLabel?: string;
      triggerTestId?: string;
      maxWidth?: number;
      maxHeight?: number;
      fullWidth?: boolean;
    };

function normalizeCount(count: number): number {
  return Number.isFinite(count) ? Math.max(0, count) : 0;
}

function resolveTitle(type: NotesSourceType): string {
  if (type === "customer") return "Kunde";
  if (type === "project") return "Projekt";
  if (type === "employee") return "Mitarbeiter";
  return "Termin";
}

function resolveEndpoint(type: NotesSourceType, id: number): string {
  if (type === "customer") return `/api/customers/${id}/notes`;
  if (type === "project") return `/api/projects/${id}/notes`;
  if (type === "employee") return `/api/employees/${id}/notes`;
  return `/api/appointments/${id}/notes`;
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
  fullWidth = false,
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

  const employeeSource = sourceEntries.find((entry) => entry.type === "employee");
  const employeeEnabled = shouldLoadPreview && Boolean(employeeSource);

  const employeeQuery = useQuery<Note[]>({
    queryKey: ["/api/notes-preview", "employee", employeeSource?.id ?? null],
    enabled: employeeEnabled,
    queryFn: async () => {
      if (!employeeSource) return [];
      const response = await fetch(resolveEndpoint("employee", employeeSource.id), { credentials: "include" });
      if (!response.ok) throw new Error("Mitarbeiternotizen konnten nicht geladen werden");
      const payload = (await response.json()) as unknown;
      return Array.isArray(payload) ? (payload as Note[]) : [];
    },
  });

  return (
    <HoverPreview
      preview={(
        <div className="rounded-lg bg-white p-2">
          {sourceEntries.length === 0 ? (
            <div className="text-xs text-slate-500">Keine Notizen vorhanden.</div>
          ) : (
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
              {employeeSource ? (
                <NotesSection
                  title={resolveTitle("employee")}
                  notes={employeeQuery.data ?? []}
                  isLoading={employeeQuery.isLoading}
                  isError={employeeQuery.isError}
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
          )}
        </div>
      )}
      closeDelay={80}
      side="right"
      align="start"
      maxWidth={maxWidth}
      maxHeight={maxHeight}
      className="z-[9999] w-[360px]"
    >
      <FooterChildCollectionBadge
        icon={<StickyNote className="h-3 w-3" />}
        label={triggerLabel}
        count={totalNotesCount}
        testId={triggerTestId}
        onHoverStart={() => setShouldLoadPreview(true)}
        fullWidth={fullWidth}
        inactive={totalNotesCount <= 0}
      />
    </HoverPreview>
  );
}
