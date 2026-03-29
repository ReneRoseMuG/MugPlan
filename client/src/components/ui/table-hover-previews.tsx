import { StickyNote, CalendarDays } from "lucide-react";
import { EntityNotesHoverPreview } from "@/components/notes/EntityNotesHoverPreview";
import { EntityTagFooterRow } from "@/components/ui/entity-tag-footer-row";
import { AppointmentCountBadge } from "@/components/ui/appointment-count-badge";
import { CustomerInfoPanel } from "@/components/ui/customer-info-panel";
import { ProjectInfoPanel } from "@/components/ui/project-info-panel";
import { ProjectAttachmentsHover } from "@/components/ui/ProjectAttachmentsHover";
import { CustomerAttachmentsHover } from "@/components/ui/CustomerAttachmentsHover";
import { HoverPreview } from "@/components/ui/hover-preview";
import {
  AppointmentWeeklyPanelPreview,
  resolveAppointmentWeeklyPanelPreviewWidthPx,
} from "@/components/ui/badge-previews/appointment-weekly-panel-preview";
import { formatListDate } from "@/lib/list-display-format";
import { domainIcons } from "@/lib/domain-icons";
import type { ProjectArticleItem } from "@shared/projectArticleList";
import type { Tag } from "@shared/schema";
import type { CalendarAppointment } from "@/lib/calendar-appointments";

type NotesSource =
  | { type: "customer"; id: number; count: number }
  | { type: "project"; id: number; count: number };

export function ProjectTableHoverPreview({
  header,
  customer,
  project,
  plannedAppointmentsCount,
  attachmentsCount,
  notes,
  tags,
}: {
  header: { orderNumber: string | null; name: string };
  customer: {
    id: number;
    number: string;
    name: string | null;
    addressLine1?: string | null;
    postalCode?: string | null;
    city?: string | null;
    phone?: string | null;
    email?: string | null;
  };
  project: { id: number; articleItems: ProjectArticleItem[]; description: string | null };
  plannedAppointmentsCount: number;
  attachmentsCount: number;
  notes: NotesSource[];
  tags: Tag[];
}) {
  const ProjectIcon = domainIcons.projects;
  const hasNotes = notes.some((source) => source.count > 0);

  return (
    <div className="w-[360px] rounded-lg border border-slate-200 bg-slate-50 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-200 px-3 py-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <ProjectIcon className="h-4 w-4 flex-shrink-0 text-slate-600" />
          <div className="truncate text-sm font-semibold text-slate-900">{header.name}</div>
        </div>
        <div className="ml-2 flex-shrink-0 text-xs font-medium text-slate-500">{header.orderNumber ?? "-"}</div>
      </div>
      <div className="space-y-1.5 overflow-hidden p-3">
        <CustomerInfoPanel
          mode="collapsed"
          fullName={customer.name}
          customerNumber={customer.number}
          addressLine1={customer.addressLine1}
          postalCode={customer.postalCode}
          city={customer.city}
          phone={customer.phone}
          email={customer.email}
          testId={`project-table-preview-customer-${project.id}`}
        />
        <div className="overflow-hidden">
          <ProjectInfoPanel
            mode="expanded"
            hideHeader={true}
            projectName={header.name}
            projectOrderNumber={header.orderNumber}
            projectArticleItems={project.articleItems}
            projectDescription={project.description}
            testId={`project-table-preview-project-${project.id}`}
          />
        </div>
      </div>
      <div className="space-y-2 border-t border-slate-200 bg-white px-3 py-3">
        <AppointmentCountBadge
          count={plannedAppointmentsCount}
          testId={`project-table-preview-appointments-${project.id}`}
          fullWidth
        />
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
            fullWidth
          />
        ) : (
          <div className="block w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-500">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1">
                <StickyNote className="h-3 w-3" />
                <span>Notizen</span>
              </span>
              <span>0</span>
            </div>
          </div>
        )}
        <ProjectAttachmentsHover
          projectId={project.id}
          totalAttachmentsCount={attachmentsCount}
          fullWidth
        />
        <EntityTagFooterRow tags={tags} testId="project-table-preview-tags" />
      </div>
    </div>
  );
}

export function CustomerTableHoverPreview({
  customer,
  notesCount,
  plannedAppointmentsCount,
  attachmentsCount,
  nextAppointment,
}: {
  customer: {
    id: number;
    fullName: string | null;
    customerNumber: string;
    addressLine1?: string | null;
    postalCode?: string | null;
    city?: string | null;
    phone?: string | null;
    email?: string | null;
  };
  notesCount: number;
  plannedAppointmentsCount: number;
  attachmentsCount: number;
  nextAppointment: { id: number | null; startDate: string; startTimeHour: number | null } | null;
}) {
  const CustomerIcon = domainIcons.customers;
  const nextAppointmentDateLabel = nextAppointment
    ? formatListDate(nextAppointment.startDate)
    : null;

  const headerColor = "#475569";
  const previewWidthPx = resolveAppointmentWeeklyPanelPreviewWidthPx("sidebarTable");

  const nextAppointmentCard: CalendarAppointment | null = nextAppointment
    ? {
        id: nextAppointment.id ?? customer.id,
        version: 1,
        projectId: null,
        projectName: customer.fullName ?? "Kunde",
        projectVersion: null,
        projectOrderNumber: null,
        projectArticleItems: [],
        projectDescription: null,
        startDate: nextAppointment.startDate,
        endDate: null,
        startTime:
          nextAppointment.startTimeHour != null
            ? `${String(nextAppointment.startTimeHour).padStart(2, "0")}:00:00`
            : null,
        tourId: null,
        tourName: null,
        tourColor: null,
        customer: {
          id: customer.id,
          customerNumber: customer.customerNumber,
          fullName: customer.fullName,
          phone: customer.phone,
          email: customer.email,
          addressLine1: customer.addressLine1,
          postalCode: customer.postalCode ?? null,
          city: customer.city ?? null,
        },
        employees: [],
        customerNotesCount: 0,
        projectNotesCount: 0,
        appointmentNotesCount: 0,
        customerAttachmentsCount: 0,
        projectAttachmentsCount: 0,
        appointmentAttachmentsCount: 0,
        totalAttachmentsCount: 0,
        appointmentTags: [],
        customerTags: [],
        projectTags: [],
        displayMode: "compact",
        isLocked: false,
        isCancelled: false,
      }
    : null;

  return (
    <div className="w-[360px] rounded-lg border border-slate-200 bg-slate-50 shadow-sm overflow-hidden">
      <div
        className="px-3 py-2 text-white text-[11px] font-semibold tracking-wide"
        style={{
          backgroundColor: headerColor,
          backgroundImage:
            "linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 42%), linear-gradient(180deg, rgba(0,0,0,0) 58%, rgba(0,0,0,0.14) 100%)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.20), inset 0 -1px 0 rgba(0,0,0,0.12), 0 2px 4px rgba(15,23,42,0.18)",
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <CustomerIcon className="h-3.5 w-3.5 flex-shrink-0" aria-hidden />
            <span className="truncate">{customer.fullName ?? "-"}</span>
          </div>
          <span className="flex-shrink-0 opacity-80">{customer.customerNumber}</span>
        </div>
      </div>
      <div className="space-y-1.5 overflow-hidden p-3">
        <CustomerInfoPanel
          mode="expanded"
          hideHeader={true}
          fullName={customer.fullName}
          customerNumber={customer.customerNumber}
          addressLine1={customer.addressLine1}
          postalCode={customer.postalCode}
          city={customer.city}
          phone={customer.phone}
          email={customer.email}
          testId={`customer-table-preview-info-${customer.id}`}
        />
        {nextAppointmentDateLabel && nextAppointmentCard && (
          <HoverPreview
            preview={
              <AppointmentWeeklyPanelPreview
                appointment={nextAppointmentCard}
                widthPx={previewWidthPx}
              />
            }
            side="right"
            align="start"
            maxWidth={previewWidthPx}
            maxHeight={null}
            openDelay={300}
          >
            <div className="cursor-pointer rounded-md border border-slate-200/90 bg-white px-2 py-1.5 hover:border-slate-300 hover:bg-slate-50">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                  <CalendarDays className="h-3 w-3" aria-hidden />
                  <span>Nächster Termin</span>
                </div>
                <div className="text-[11px] font-medium text-slate-800">{nextAppointmentDateLabel}</div>
              </div>
            </div>
          </HoverPreview>
        )}
      </div>
      <div className="space-y-2 border-t border-slate-200 bg-white px-3 py-3">
        <AppointmentCountBadge
          count={plannedAppointmentsCount}
          testId={`customer-table-preview-appointments-${customer.id}`}
          fullWidth
        />
        {notesCount > 0 ? (
          <EntityNotesHoverPreview
            sourceMode="single-parent"
            sources={{ type: "customer", id: customer.id, count: notesCount }}
            triggerLabel="Notizen"
            triggerTestId="customer-table-preview-notes"
            maxWidth={360}
            maxHeight={320}
            fullWidth
          />
        ) : (
          <div className="block w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-500">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1">
                <StickyNote className="h-3 w-3" />
                <span>Notizen</span>
              </span>
              <span>0</span>
            </div>
          </div>
        )}
        <CustomerAttachmentsHover
          customerId={customer.id}
          totalAttachmentsCount={attachmentsCount}
          fullWidth
        />
      </div>
    </div>
  );
}
