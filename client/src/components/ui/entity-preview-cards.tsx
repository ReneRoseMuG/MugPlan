import type { ReactNode } from "react";
import { Mail, Phone, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CustomerAttachmentsHover } from "@/components/ui/CustomerAttachmentsHover";
import { CustomerInfoPanel } from "@/components/ui/customer-info-panel";
import { EntityAppointmentsHoverPreview } from "@/components/ui/entity-appointments-hover-preview";
import { EntityCard } from "@/components/ui/entity-card";
import { EntityTagFooterRow } from "@/components/ui/entity-tag-footer-row";
import { EmployeeAttachmentsHover } from "@/components/ui/EmployeeAttachmentsHover";
import { HoverPreview } from "@/components/ui/hover-preview";
import { ProjectAttachmentsHover } from "@/components/ui/ProjectAttachmentsHover";
import { ProjectInfoPanel, canOpenProjectInfoPreview } from "@/components/ui/project-info-panel";
import { TeamInfoBadge } from "@/components/ui/team-info-badge";
import { TourInfoBadge } from "@/components/ui/tour-info-badge";
import { EntityNotesHoverPreview } from "@/components/notes/EntityNotesHoverPreview";
import { defaultHeaderColor } from "@/lib/colors";
import { domainIcons } from "@/lib/domain-icons";
import { formatListDateTime } from "@/lib/list-display-format";
import type { ProjectArticleItem } from "@shared/projectArticleList";
import type { Tag } from "@shared/schema";

const PANEL_PREVIEW_CURSOR_OFFSET_PX = 20;
export const TABLE_ENTITY_CARD_PREVIEW_WIDTH_CLASS = "w-[360px]";

type FooterProps = {
  badges: ReactNode;
  tags: Tag[];
  tagsTestId?: string;
};

function EntityCardFooter({ badges, tags, tagsTestId }: FooterProps) {
  return (
    <div className="flex w-full flex-col gap-1.5">
      <div className="flex w-full flex-nowrap items-center gap-1 overflow-visible">
        {badges}
      </div>
      <EntityTagFooterRow tags={tags} testId={tagsTestId} />
    </div>
  );
}

type ProjectEntityCardProps = {
  project: {
    id: number;
    name: string;
    orderNumber: string | null;
    descriptionMd: string | null;
    isActive?: boolean;
    notesCount: number;
    appointmentsCount: number;
    nextAppointmentStartDate?: string | null;
    nextAppointmentStartTimeHour?: number | null;
    nextAppointmentTourName?: string | null;
    nextAppointmentTourColor?: string | null;
    attachmentsCount: number;
    tags: Tag[];
    customer: {
      id: number;
      customerNumber: string;
      fullName: string | null;
      addressLine1?: string | null;
      postalCode?: string | null;
      city?: string | null;
      country?: string | null;
      phone?: string | null;
      email?: string | null;
    };
    projectArticleItems: ProjectArticleItem[];
  };
  className?: string;
  projectPanelCompact?: boolean;
  onDoubleClick?: () => void;
  testIds?: {
    card?: string;
    customerPanel?: string;
    projectPanel?: string;
    appointmentInfo?: string;
    notes?: string;
    tags?: string;
  };
};

function formatProjectAppointmentInfo(project: ProjectEntityCardProps["project"]): string {
  const dateTimeLabel = formatListDateTime({
    startDate: project.nextAppointmentStartDate,
    startTimeHour: project.nextAppointmentStartTimeHour,
  });
  const tourLabel = project.nextAppointmentTourName?.trim() ?? "";

  if (dateTimeLabel && tourLabel) return `${dateTimeLabel} · ${tourLabel}`;
  if (dateTimeLabel) return dateTimeLabel;
  if (tourLabel) return tourLabel;
  if (project.appointmentsCount > 0) return "Kein anstehender Termin";
  return "Kein Termin";
}

function toSubtleTourColor(color: string | null | undefined, alpha: number): string {
  const normalized = color?.trim();
  if (!normalized) return defaultHeaderColor;

  const hex = normalized.startsWith("#") ? normalized.slice(1) : normalized;
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return defaultHeaderColor;

  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function ProjectEntityCard({
  project,
  className,
  projectPanelCompact = true,
  onDoubleClick,
  testIds,
}: ProjectEntityCardProps) {
  const ProjectIcon = domainIcons.projects;
  const appointmentInfo = formatProjectAppointmentInfo(project);
  const appointmentInfoTourColor = project.nextAppointmentTourColor?.trim() || null;
  const appointmentInfoBackground = appointmentInfoTourColor
    ? toSubtleTourColor(appointmentInfoTourColor, 0.18)
    : defaultHeaderColor;
  const appointmentInfoBorderColor = appointmentInfoTourColor
    ? toSubtleTourColor(appointmentInfoTourColor, 0.32)
    : defaultHeaderColor;
  const canOpenProjectPreview = canOpenProjectInfoPreview(
    project.name,
    project.projectArticleItems,
    project.descriptionMd ?? null,
  );

  return (
    <EntityCard
      title={project.name}
      icon={<ProjectIcon className="w-4 h-4" />}
      headerMeta={<span>{`A-Nr. ${project.orderNumber?.trim() || "-"}`}</span>}
      headerColor={defaultHeaderColor}
      testId={testIds?.card ?? `project-card-${project.id}`}
      className={className}
      onDoubleClick={onDoubleClick}
      footer={(
        <EntityCardFooter
          badges={(
            <>
              <EntityNotesHoverPreview
                sourceMode="single-parent"
                sources={{ type: "project", id: project.id, count: project.notesCount ?? 0 }}
                triggerTestId={testIds?.notes ?? `text-project-notes-count-${project.id}`}
              />
              <ProjectAttachmentsHover
                projectId={project.id}
                totalAttachmentsCount={project.attachmentsCount}
              />
            </>
          )}
          tags={project.tags}
          tagsTestId={testIds?.tags ?? `project-card-tags-${project.id}`}
        />
      )}
      footerVisibility="visible"
    >
      <div className="-mb-3 -mt-3 -mx-3 flex flex-col gap-1">
        <CustomerInfoPanel
          mode="collapsed"
          fullName={project.customer.fullName}
          customerNumber={project.customer.customerNumber}
          addressLine1={project.customer.addressLine1}
          postalCode={project.customer.postalCode}
          city={project.customer.city}
          country={project.customer.country}
          phone={project.customer.phone}
          email={project.customer.email}
          testId={testIds?.customerPanel ?? `project-card-customer-${project.id}`}
        />
        {canOpenProjectPreview ? (
          <HoverPreview
            preview={(
              <ProjectInfoPanel
                mode="expanded"
                hideHeader={true}
                projectName={project.name}
                projectOrderNumber={project.orderNumber ?? null}
                projectArticleItems={project.projectArticleItems}
                projectDescription={project.descriptionMd ?? null}
              />
            )}
            mode="cursor"
            side="right"
            align="start"
            cursorOffsetX={PANEL_PREVIEW_CURSOR_OFFSET_PX}
            cursorOffsetY={PANEL_PREVIEW_CURSOR_OFFSET_PX}
            maxWidth={420}
            maxHeight={400}
            openDelay={300}
            className="w-[420px] p-2"
          >
            <div className="shrink-0 overflow-hidden cursor-pointer" data-testid={testIds?.projectPanel ?? `project-card-project-${project.id}`}>
              <ProjectInfoPanel
                mode="expanded"
                hideHeader={true}
                compact={projectPanelCompact}
                projectName={project.name}
                projectOrderNumber={project.orderNumber ?? null}
                projectArticleItems={project.projectArticleItems}
                projectDescription={project.descriptionMd ?? null}
              />
            </div>
          </HoverPreview>
        ) : (
          <div className="shrink-0 overflow-hidden" data-testid={testIds?.projectPanel ?? `project-card-project-${project.id}`}>
            <ProjectInfoPanel
              mode="expanded"
              hideHeader={true}
              compact={projectPanelCompact}
              projectName={project.name}
              projectOrderNumber={project.orderNumber ?? null}
              projectArticleItems={project.projectArticleItems}
              projectDescription={project.descriptionMd ?? null}
            />
          </div>
        )}
        {!project.isActive ? (
          <Badge variant="secondary" className="text-xs">
            Inaktiv
          </Badge>
        ) : null}
        <div
          className="mt-1 flex min-h-8 shrink-0 items-center rounded-md border px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm"
          style={{
            backgroundColor: appointmentInfoBackground,
            borderColor: appointmentInfoBorderColor,
          }}
          data-testid={testIds?.appointmentInfo ?? `text-project-next-appointment-${project.id}`}
        >
          <span className="block w-full truncate">{appointmentInfo}</span>
        </div>
      </div>
    </EntityCard>
  );
}

type CustomerEntityCardProps = {
  customer: {
    id: number;
    fullName: string | null;
    customerNumber: string;
    addressLine1?: string | null;
    postalCode?: string | null;
    city?: string | null;
    country?: string | null;
    phone?: string | null;
    email?: string | null;
    notesCount: number;
    appointmentsCount: number;
    attachmentsCount: number;
    tags: Tag[];
  };
  className?: string;
  onDoubleClick?: () => void;
  testIds?: {
    card?: string;
    infoPanel?: string;
    appointments?: string;
    notes?: string;
    tags?: string;
  };
};

export function CustomerEntityCard({ customer, className, onDoubleClick, testIds }: CustomerEntityCardProps) {
  const CustomerIcon = domainIcons.customers;

  return (
    <EntityCard
      title={customer.fullName ?? "Ohne Name"}
      icon={<CustomerIcon className="w-4 h-4" />}
      headerMeta={<span>{`K-Nr. ${customer.customerNumber?.trim() || "-"}`}</span>}
      headerColor={defaultHeaderColor}
      testId={testIds?.card ?? `customer-card-${customer.id}`}
      className={className}
      onDoubleClick={onDoubleClick}
      footer={(
        <EntityCardFooter
          badges={(
            <>
              <EntityAppointmentsHoverPreview
                source={{ type: "customer", id: customer.id, count: customer.appointmentsCount }}
                triggerTestId={testIds?.appointments ?? `text-customer-planned-appointments-${customer.id}`}
              />
              <EntityNotesHoverPreview
                sourceMode="single-parent"
                sources={{ type: "customer", id: customer.id, count: customer.notesCount ?? 0 }}
                triggerTestId={testIds?.notes ?? `text-customer-notes-count-${customer.id}`}
              />
              <CustomerAttachmentsHover
                customerId={customer.id}
                totalAttachmentsCount={customer.attachmentsCount}
              />
            </>
          )}
          tags={customer.tags}
          tagsTestId={testIds?.tags ?? `customer-card-tags-${customer.id}`}
        />
      )}
      footerVisibility="visible"
    >
      <div className="-mb-3 -mt-3 -mx-3">
        <CustomerInfoPanel
          mode="expanded"
          hideHeader={true}
          fullName={customer.fullName}
          customerNumber={customer.customerNumber}
          addressLine1={customer.addressLine1}
          postalCode={customer.postalCode}
          city={customer.city}
          country={customer.country}
          phone={customer.phone}
          email={customer.email}
          testId={testIds?.infoPanel ?? `customer-card-info-${customer.id}`}
        />
      </div>
    </EntityCard>
  );
}

type EmployeeEntityCardProps = {
  employee: {
    id: number;
    fullName: string;
    phone?: string | null;
    email?: string | null;
    isActive: boolean;
    notesCount: number;
    attachmentsCount: number;
    tags: Tag[];
    appointmentsCount: number;
  };
  team?: {
    id: number;
    name: string;
    color?: string | null;
    members?: Array<{ id: number; fullName: string }>;
  } | null;
  tour?: {
    id: number;
    name: string;
    color?: string | null;
    members?: Array<{ id: number; fullName: string }>;
  } | null;
  actions?: ReactNode;
  className?: string;
  onDoubleClick?: () => void;
  testIds?: {
    card?: string;
    phone?: string;
    email?: string;
    tour?: string;
    team?: string;
    appointments?: string;
    notes?: string;
    attachments?: string;
    tags?: string;
  };
};

export function EmployeeEntityCard({
  employee,
  team,
  tour,
  actions,
  className,
  onDoubleClick,
  testIds,
}: EmployeeEntityCardProps) {
  return (
    <EntityCard
      testId={testIds?.card ?? `employee-card-${employee.id}`}
      title={employee.fullName}
      icon={<Users className="w-4 h-4" />}
      className={`${!employee.isActive ? "opacity-60" : ""}${className ? ` ${className}` : ""}`}
      onDoubleClick={onDoubleClick}
      actions={actions}
      footer={(
        <EntityCardFooter
          badges={(
            <>
              <EntityAppointmentsHoverPreview
                source={{ type: "employee", id: employee.id, count: employee.appointmentsCount }}
                triggerTestId={testIds?.appointments ?? `text-employee-current-appointments-${employee.id}`}
              />
              <EntityNotesHoverPreview
                sourceMode="single-parent"
                sources={{ type: "employee", id: employee.id, count: employee.notesCount ?? 0 }}
                triggerTestId={testIds?.notes ?? `text-employee-notes-count-${employee.id}`}
              />
              <EmployeeAttachmentsHover
                employeeId={employee.id}
                totalAttachmentsCount={employee.attachmentsCount ?? 0}
                triggerTestId={testIds?.attachments ?? `text-employee-attachments-count-${employee.id}`}
              />
            </>
          )}
          tags={employee.tags ?? []}
          tagsTestId={testIds?.tags ?? `employee-card-tags-${employee.id}`}
        />
      )}
      footerVisibility="visible"
    >
      <div className="space-y-2 text-sm">
        {employee.phone && (
          <div className="flex items-center gap-1 text-slate-600" data-testid={testIds?.phone ?? `text-employee-phone-${employee.id}`}>
            <Phone className="w-3 h-3" />
            {employee.phone}
          </div>
        )}
        {employee.email && (
          <div className="flex items-center gap-1 text-slate-600" data-testid={testIds?.email ?? `text-employee-email-${employee.id}`}>
            <Mail className="w-3 h-3" />
            {employee.email}
          </div>
        )}
        {(tour || team || !employee.isActive) && (
          <div className="flex items-center gap-2 flex-wrap pt-1">
            {tour && (
              <TourInfoBadge
                id={tour.id}
                name={tour.name}
                color={tour.color ?? null}
                members={tour.members ?? []}
                size="sm"
                testId={testIds?.tour ?? `badge-employee-tour-${employee.id}`}
              />
            )}
            {team && (
              <TeamInfoBadge
                id={team.id}
                name={team.name}
                color={team.color ?? null}
                members={team.members ?? []}
                size="sm"
                testId={testIds?.team ?? `badge-employee-team-${employee.id}`}
              />
            )}
            {!employee.isActive && (
              <Badge variant="secondary" className="text-xs">
                Inaktiv
              </Badge>
            )}
          </div>
        )}
      </div>
    </EntityCard>
  );
}
