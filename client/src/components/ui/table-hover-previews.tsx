import { CalendarDays, Clock3, StickyNote } from "lucide-react";
import { EntityNotesHoverPreview } from "@/components/notes/EntityNotesHoverPreview";
import { EntityTagFooterRow } from "@/components/ui/entity-tag-footer-row";
import { formatListDateTime } from "@/lib/list-display-format";
import type { Tag } from "@shared/schema";

type NotesSource =
  | { type: "customer"; id: number; count: number }
  | { type: "project"; id: number; count: number };

type HistoricalAppointmentPreviewItem = {
  id: number;
  startDate: string;
  startTime: string | null;
  orderNumber: string | null;
  projectName: string;
};

function PreviewSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-1 rounded-md border border-slate-200 bg-white/80 px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">{title}</div>
      <div className="space-y-1 text-sm text-slate-700">{children}</div>
    </section>
  );
}

function PreviewLabelRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="grid grid-cols-[6rem_1fr] gap-2 text-xs">
      <span className="font-medium text-slate-500">{label}</span>
      <span className="truncate text-slate-800">{value || "-"}</span>
    </div>
  );
}

export function ProjectTableHoverPreview({
  header,
  customer,
  project,
  nextAppointmentLabel,
  notes,
  tags,
}: {
  header: { orderNumber: string; name: string };
  customer: { number: string; name: string };
  project: { description: string; amount: string };
  nextAppointmentLabel: string;
  notes: NotesSource[];
  tags: Tag[];
}) {
  const hasNotes = notes.some((source) => source.count > 0);

  return (
    <div className="w-[360px] rounded-lg border border-slate-200 bg-slate-50 shadow-sm">
      <div className="border-b border-slate-200 bg-slate-200 px-4 py-2">
        <div className="text-xs font-semibold text-slate-600">{header.orderNumber}</div>
        <div className="truncate text-sm font-semibold text-slate-900">{header.name}</div>
      </div>
      <div className="space-y-2 p-3">
        <PreviewSection title="Kunde">
          <PreviewLabelRow label="Kunde Nr." value={customer.number} />
          <PreviewLabelRow label="Kunde" value={customer.name} />
        </PreviewSection>
        <PreviewSection title="Projekt">
          <PreviewLabelRow label="Projekt" value={header.name} />
          <PreviewLabelRow label="Beschreibung" value={project.description} />
          <PreviewLabelRow label="Betrag" value={project.amount} />
        </PreviewSection>
      </div>
      <div className="space-y-2 border-t border-slate-200 bg-white px-3 py-3">
        <div className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-700">
          {nextAppointmentLabel ? <Clock3 className="h-3 w-3" /> : <CalendarDays className="h-3 w-3" />}
          <span>{nextAppointmentLabel || ""}</span>
        </div>
        {hasNotes ? (
          <EntityNotesHoverPreview
            sourceMode="cumulative"
            sources={{
              customer: notes.find((source) => source.type === "customer"),
              project: notes.find((source) => source.type === "project"),
            }}
            triggerLabel="Notizen"
            triggerTestId="project-table-preview-notes"
            maxWidth={360}
            maxHeight={320}
          />
        ) : (
          <div className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-500">
            <StickyNote className="h-3 w-3" />
            <span>0</span>
          </div>
        )}
        <EntityTagFooterRow tags={tags} testId="project-table-preview-tags" />
      </div>
    </div>
  );
}

export function CustomerTableHoverPreview({
  customer,
  notesCount,
  tags,
  historicalAppointments,
}: {
  customer: {
    id: number;
    fullName: string;
    customerNumber: string;
    company: string;
    phone: string;
    email: string;
    city: string;
  };
  notesCount: number;
  tags: Tag[];
  historicalAppointments: HistoricalAppointmentPreviewItem[];
}) {
  return (
    <div className="w-[360px] rounded-lg border border-slate-200 bg-slate-50 shadow-sm">
      <div className="border-b border-slate-200 bg-slate-200 px-4 py-2">
        <div className="text-xs font-semibold text-slate-600">{customer.customerNumber}</div>
        <div className="truncate text-sm font-semibold text-slate-900">{customer.fullName}</div>
      </div>
      <div className="space-y-2 p-3">
        <PreviewSection title="Kunde">
          <PreviewLabelRow label="Firma" value={customer.company} />
          <PreviewLabelRow label="Telefon" value={customer.phone} />
          <PreviewLabelRow label="E-Mail" value={customer.email} />
          <PreviewLabelRow label="Ort" value={customer.city} />
        </PreviewSection>
        {historicalAppointments.length > 0 ? (
          <PreviewSection title="Historische Termine">
            <div className="max-h-40 space-y-2 overflow-y-auto pr-1">
              {historicalAppointments.map((appointment) => (
                <div key={appointment.id} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs">
                  <div className="font-semibold text-slate-800">{appointment.orderNumber?.trim() || "-"}</div>
                  <div className="truncate text-slate-700">{appointment.projectName}</div>
                  <div className="text-slate-500">{formatListDateTime(appointment)}</div>
                </div>
              ))}
            </div>
          </PreviewSection>
        ) : null}
      </div>
      <div className="space-y-2 border-t border-slate-200 bg-white px-3 py-3">
        {notesCount > 0 ? (
          <EntityNotesHoverPreview
            sourceMode="single-parent"
            sources={{ type: "customer", id: customer.id, count: notesCount }}
            triggerLabel="Notizen"
            triggerTestId="customer-table-preview-notes"
            maxWidth={360}
            maxHeight={320}
          />
        ) : (
          <div className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-500">
            <StickyNote className="h-3 w-3" />
            <span>0</span>
          </div>
        )}
        <EntityTagFooterRow tags={tags} testId="customer-table-preview-tags" />
      </div>
    </div>
  );
}
