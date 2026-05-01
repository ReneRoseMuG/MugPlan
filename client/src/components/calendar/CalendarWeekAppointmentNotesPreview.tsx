import { useQuery } from "@tanstack/react-query";
import type { Note } from "@shared/schema";
import { formatDisplayDate } from "@/lib/date-display-format";

function htmlToExcerpt(value: string, maxLength = 140): string {
  const plainText = value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (plainText.length <= maxLength) return plainText;
  return `${plainText.slice(0, maxLength - 1).trimEnd()}…`;
}

function formatNoteDate(value: Date | string | null): string {
  return formatDisplayDate(value, "-");
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
            style={{ backgroundColor: note.cardColor ?? "#ffffff" }}
          >
            <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-slate-800">
              <span>{note.title}</span>
              <span className={`rounded-full px-1.5 py-0.5 text-[9px] ${note.print ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"}`}>
                {note.print ? "D" : "N"}
              </span>
            </div>
            <div className="text-[11px] leading-snug text-slate-600">{htmlToExcerpt(note.body ?? "") || "-"}</div>
            <div className="mt-1 text-[10px] text-slate-400">{formatNoteDate(note.updatedAt)}</div>
          </article>
        ))}
      </div>
    </div>
  );
}

export function CalendarWeekAppointmentNotesPreview({
  customerId,
  projectId,
  customerNotesCount,
  projectNotesCount,
  shouldLoad,
}: {
  customerId: number;
  projectId: number;
  customerNotesCount: number;
  projectNotesCount: number;
  shouldLoad: boolean;
}) {
  const customerEnabled = shouldLoad && customerNotesCount > 0;
  const projectEnabled = shouldLoad && projectNotesCount > 0;

  const {
    data: customerNotes = [],
    isLoading: isCustomerLoading,
    isError: isCustomerError,
  } = useQuery<Note[]>({
    queryKey: ["/api/customers", customerId, "notes", "week-card-preview"],
    enabled: customerEnabled,
    queryFn: async () => {
      const response = await fetch(`/api/customers/${customerId}/notes`, { credentials: "include" });
      if (!response.ok) {
        throw new Error("Kundennotizen konnten nicht geladen werden");
      }
      const payload = (await response.json()) as unknown;
      return Array.isArray(payload) ? (payload as Note[]) : [];
    },
  });

  const {
    data: projectNotes = [],
    isLoading: isProjectLoading,
    isError: isProjectError,
  } = useQuery<Note[]>({
    queryKey: ["/api/projects", projectId, "notes", "week-card-preview"],
    enabled: projectEnabled,
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/notes`, { credentials: "include" });
      if (!response.ok) {
        throw new Error("Projektnotizen konnten nicht geladen werden");
      }
      const payload = (await response.json()) as unknown;
      return Array.isArray(payload) ? (payload as Note[]) : [];
    },
  });

  return (
    <div className="rounded-lg bg-white p-2">
      <div className="max-h-[320px] space-y-2 overflow-y-auto">
        {customerNotesCount > 0 && (
          <NotesSection
            title="Kunde"
            notes={customerNotes}
            isLoading={isCustomerLoading}
            isError={isCustomerError}
          />
        )}
        {projectNotesCount > 0 && (
          <NotesSection
            title="Projekt"
            notes={projectNotes}
            isLoading={isProjectLoading}
            isError={isProjectError}
          />
        )}
      </div>
    </div>
  );
}
