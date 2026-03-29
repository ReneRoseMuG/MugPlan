import type { ReactNode } from "react";
import { CalendarDays, Mail, Phone, Users } from "lucide-react";
import { EntityNotesHoverPreview } from "@/components/notes/EntityNotesHoverPreview";
import { AppointmentWeeklyPanelPreview, resolveAppointmentWeeklyPanelPreviewWidthPx } from "@/components/ui/badge-previews/appointment-weekly-panel-preview";
import { EntityAppointmentsHoverPreview } from "@/components/ui/entity-appointments-hover-preview";
import { EmployeeAttachmentsHover } from "@/components/ui/EmployeeAttachmentsHover";
import { EntityTagFooterRow } from "@/components/ui/entity-tag-footer-row";
import { CustomerAttachmentsHover } from "@/components/ui/CustomerAttachmentsHover";
import { CustomerInfoPanel } from "@/components/ui/customer-info-panel";
import { HoverPreview } from "@/components/ui/hover-preview";
import { ProjectAttachmentsHover } from "@/components/ui/ProjectAttachmentsHover";
import { ProjectInfoPanel } from "@/components/ui/project-info-panel";
import { formatListDate } from "@/lib/list-display-format";
import { domainIcons } from "@/lib/domain-icons";
import type { CalendarAppointment } from "@/lib/calendar-appointments";
import type { ProjectArticleItem } from "@shared/projectArticleList";
import type { Tag } from "@shared/schema";

type NotesSource =
  | { type: "customer"; id: number; count: number }
  | { type: "project"; id: number; count: number };

type EmployeeRelevantAppointment = CalendarAppointment & { startTimeHour: number | null };

function renderFooterCollections(content: ReactNode, tags: Tag[], testId: string) {
  return (
    <div className="space-y-1 border-t border-slate-200 bg-white px-3 py-2">
      <div className="flex w-full flex-nowrap items-center gap-1 overflow-visible">
        {content}
      </div>
      <EntityTagFooterRow tags={tags} testId={testId} />
    </div>
  );
}

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

  return (
    <div className="w-[360px] overflow-hidden rounded-lg border border-slate-200 bg-slate-50 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-200 px-3 py-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <ProjectIcon className="h-4 w-4 flex-shrink-0 text-slate-600" />
          <div className="truncate text-sm font-semibold text-slate-900">{header.name}</div>
        </div>
        <div className="ml-2 flex-shrink-0 text-xs font-medium text-slate-500">{header.orderNumber ?? "-"}</div>
      </div>
      <div className="space-y-1 overflow-hidden p-1">
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
            compact
            projectName={header.name}
            projectOrderNumber={header.orderNumber}
            projectArticleItems={project.articleItems}
            projectDescription={project.description}
            testId={`project-table-preview-project-${project.id}`}
          />
        </div>
      </div>
      {renderFooterCollections(
        <>
          <EntityAppointmentsHoverPreview
            source={{ type: "project", id: project.id, count: plannedAppointmentsCount }}
            triggerTestId={`project-table-preview-appointments-${project.id}`}
          />
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
          <ProjectAttachmentsHover
            projectId={project.id}
            totalAttachmentsCount={attachmentsCount}
          />
        </>,
        tags,
        "project-table-preview-tags",
      )}
    </div>
  );
}

export function CustomerTableHoverPreview({
  customer,
  notesCount,
  plannedAppointmentsCount,
  attachmentsCount,
  nextAppointment,
  tags = [],
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
  tags?: Tag[];
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
    <div className="w-[360px] overflow-hidden rounded-lg border border-slate-200 bg-slate-50 shadow-sm">
      <div
        className="px-3 py-2 text-[11px] font-semibold tracking-wide text-white"
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
      <div className="space-y-1 overflow-hidden p-1">
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
        {nextAppointmentDateLabel && nextAppointmentCard ? (
          <HoverPreview
            preview={(
              <AppointmentWeeklyPanelPreview
                appointment={nextAppointmentCard}
                widthPx={previewWidthPx}
              />
            )}
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
        ) : (
          <div className="rounded-md border border-slate-200/90 bg-white px-2 py-1.5 text-[11px] text-slate-500">
            Kein nächster Termin geplant.
          </div>
        )}
      </div>
      {renderFooterCollections(
        <>
          <EntityAppointmentsHoverPreview
            source={{ type: "customer", id: customer.id, count: plannedAppointmentsCount }}
            triggerTestId={`customer-table-preview-appointments-${customer.id}`}
          />
          <EntityNotesHoverPreview
            sourceMode="single-parent"
            sources={{ type: "customer", id: customer.id, count: notesCount }}
            triggerLabel="Notizen"
            triggerTestId="customer-table-preview-notes"
            maxWidth={360}
            maxHeight={320}
          />
          <CustomerAttachmentsHover
            customerId={customer.id}
            totalAttachmentsCount={attachmentsCount}
          />
        </>,
        tags,
        "customer-table-preview-tags",
      )}
    </div>
  );
}

export function EmployeeTableHoverPreview({
  employee,
  tourName,
  teamName,
  plannedAppointmentsCount,
  notesCount,
  attachmentsCount,
  tags,
  relevantAppointment,
}: {
  employee: {
    id: number;
    fullName: string;
    phone?: string | null;
    email?: string | null;
    isActive: boolean;
  };
  tourName?: string | null;
  teamName?: string | null;
  plannedAppointmentsCount: number;
  notesCount: number;
  attachmentsCount: number;
  tags: Tag[];
  relevantAppointment: EmployeeRelevantAppointment | null;
}) {
  const previewWidthPx = resolveAppointmentWeeklyPanelPreviewWidthPx("sidebarTable");
  const EmployeeIcon = Users;
  const nextAppointmentDateLabel = relevantAppointment ? formatListDate(relevantAppointment.startDate) : null;

  return (
    <div className="w-[360px] overflow-hidden rounded-lg border border-slate-200 bg-slate-50 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-200 px-3 py-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <EmployeeIcon className="h-4 w-4 flex-shrink-0 text-slate-600" />
          <div className="truncate text-sm font-semibold text-slate-900">{employee.fullName}</div>
        </div>
        <div className="ml-2 flex-shrink-0 text-xs font-medium text-slate-500">
          {employee.isActive ? "Aktiv" : "Inaktiv"}
        </div>
      </div>
      <div className="space-y-2 overflow-hidden p-3 text-sm">
        {employee.phone ? (
          <div className="flex items-center gap-1 text-slate-600">
            <Phone className="h-3 w-3" />
            {employee.phone}
          </div>
        ) : null}
        {employee.email ? (
          <div className="flex items-center gap-1 text-slate-600">
            <Mail className="h-3 w-3" />
            {employee.email}
          </div>
        ) : null}
        {tourName ? <div className="text-xs font-medium text-slate-500">Tour: {tourName}</div> : null}
        {teamName ? <div className="text-xs font-medium text-slate-500">Team: {teamName}</div> : null}
        {nextAppointmentDateLabel && relevantAppointment ? (
          <HoverPreview
            preview={(
              <AppointmentWeeklyPanelPreview
                appointment={relevantAppointment}
                widthPx={previewWidthPx}
              />
            )}
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
        ) : (
          <div className="rounded-md border border-slate-200/90 bg-white px-2 py-1.5 text-[11px] text-slate-500">
            Kein nächster Termin geplant.
          </div>
        )}
      </div>
      {renderFooterCollections(
        <>
          <EntityAppointmentsHoverPreview
            source={{ type: "employee", id: employee.id, count: plannedAppointmentsCount }}
            triggerTestId={`employee-table-preview-appointments-${employee.id}`}
          />
          <EntityNotesHoverPreview
            sourceMode="single-parent"
            sources={{ type: "employee", id: employee.id, count: notesCount }}
            triggerLabel="Notizen"
            triggerTestId={`employee-table-preview-notes-${employee.id}`}
            maxWidth={360}
            maxHeight={320}
          />
          <EmployeeAttachmentsHover
            employeeId={employee.id}
            totalAttachmentsCount={attachmentsCount}
            triggerTestId={`employee-table-preview-attachments-${employee.id}`}
          />
        </>,
        tags,
        `employee-table-preview-tags-${employee.id}`,
      )}
    </div>
  );
}
