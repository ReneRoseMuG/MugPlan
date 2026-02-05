import type { ReactNode } from "react";
import { Calendar, Clock, FolderKanban, Phone, Route, User, Users } from "lucide-react";
import { differenceInCalendarDays, format, isValid, parseISO } from "date-fns";

export type BadgeType = "team" | "tour" | "appointment" | "employee" | "customer" | "project";

type BaseBadgeData = {
  id: number | string | null;
};

export type TeamBadgeData = BaseBadgeData & {
  name: string;
  color?: string | null;
  memberCount?: number | null;
};

export type TourBadgeData = BaseBadgeData & {
  name: string;
  color?: string | null;
  memberCount?: number | null;
};

export type EmployeeBadgeData = BaseBadgeData & {
  fullName: string;
  teamName?: string | null;
  tourName?: string | null;
};

export type CustomerBadgeData = BaseBadgeData & {
  fullName: string;
  customerNumber?: string | null;
  phone?: string | null;
};

export type ProjectBadgeData = BaseBadgeData & {
  title: string;
  customerName?: string | null;
  appointmentCount?: number | null;
  earliestAppointmentDate?: string | null;
};

export type AppointmentBadgeData = BaseBadgeData & {
  startDate: string;
  endDate?: string | null;
  startTimeHour?: number | null;
  projectName?: string | null;
  customerName?: string | null;
  employeeName?: string | null;
};

export type BadgeData =
  | TeamBadgeData
  | TourBadgeData
  | EmployeeBadgeData
  | CustomerBadgeData
  | ProjectBadgeData
  | AppointmentBadgeData;

type PreviewOptions = {
  openDelayMs: number;
  side: "top" | "right" | "bottom" | "left";
  align: "start" | "center" | "end";
  maxWidth: number;
  maxHeight: number;
};

const defaultPreviewOptions: PreviewOptions = {
  openDelayMs: 380,
  side: "right",
  align: "start",
  maxWidth: 360,
  maxHeight: 260,
};

const formatDateLabel = (value: string) => {
  const parsed = parseISO(value);
  return isValid(parsed) ? format(parsed, "dd.MM.yy") : value;
};

const resolveDurationDays = (startDate: string, endDate: string) => {
  const parsedStart = parseISO(startDate);
  const parsedEnd = parseISO(endDate);
  if (!isValid(parsedStart) || !isValid(parsedEnd)) return null;
  const diff = differenceInCalendarDays(parsedEnd, parsedStart);
  return diff >= 0 ? diff + 1 : null;
};

const resolveStartHourLabel = (value?: number | null) => {
  if (value == null) return null;
  const normalized = Number(value);
  if (!Number.isFinite(normalized)) return null;
  const clamped = Math.min(23, Math.max(0, Math.floor(normalized)));
  return `${String(clamped).padStart(2, "0")}h`;
};

export function getPreviewOptions(type: BadgeType): PreviewOptions {
  if (type === "appointment") {
    return {
      ...defaultPreviewOptions,
      maxWidth: 420,
      maxHeight: 300,
    };
  }
  return defaultPreviewOptions;
}

export function renderPreview(type: BadgeType, data: BadgeData): ReactNode | null {
  if (type === "team") {
    const team = data as TeamBadgeData;
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span>{team.name}</span>
        </div>
        {team.memberCount != null && (
          <div className="text-xs text-muted-foreground">
            Mitglieder: {team.memberCount}
          </div>
        )}
      </div>
    );
  }

  if (type === "tour") {
    const tour = data as TourBadgeData;
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Route className="h-4 w-4 text-muted-foreground" />
          <span>{tour.name}</span>
        </div>
        {tour.memberCount != null && (
          <div className="text-xs text-muted-foreground">
            Mitarbeiter: {tour.memberCount}
          </div>
        )}
      </div>
    );
  }

  if (type === "employee") {
    const employee = data as EmployeeBadgeData;
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <User className="h-4 w-4 text-muted-foreground" />
          <span>{employee.fullName}</span>
        </div>
        {(employee.teamName || employee.tourName) && (
          <div className="text-xs text-muted-foreground space-y-1">
            {employee.teamName && <div>Team: {employee.teamName}</div>}
            {employee.tourName && <div>Tour: {employee.tourName}</div>}
          </div>
        )}
      </div>
    );
  }

  if (type === "customer") {
    const customer = data as CustomerBadgeData;
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <User className="h-4 w-4 text-muted-foreground" />
          <span>{customer.fullName}</span>
        </div>
        <div className="text-xs text-muted-foreground space-y-1">
          {customer.customerNumber && <div>Kundennr.: {customer.customerNumber}</div>}
          {customer.phone && (
            <div className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              <span>{customer.phone}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (type === "project") {
    const project = data as ProjectBadgeData;
    const appointmentLine = typeof project.appointmentCount === "number"
      ? `Termine: ${project.appointmentCount}${project.earliestAppointmentDate ? ` · Frühester: ${project.earliestAppointmentDate}` : ""}`
      : project.earliestAppointmentDate
        ? `Frühester Termin: ${project.earliestAppointmentDate}`
        : null;

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <FolderKanban className="h-4 w-4 text-muted-foreground" />
          <span>{project.title}</span>
        </div>
        <div className="text-xs text-muted-foreground space-y-1">
          {project.customerName && <div>Kunde: {project.customerName}</div>}
          {appointmentLine && <div>{appointmentLine}</div>}
        </div>
      </div>
    );
  }

  if (type === "appointment") {
    const appointment = data as AppointmentBadgeData;
    const dateLabel = formatDateLabel(appointment.startDate);
    const isMultiDay = Boolean(appointment.endDate && appointment.endDate !== appointment.startDate);
    const durationDays = isMultiDay && appointment.endDate
      ? resolveDurationDays(appointment.startDate, appointment.endDate)
      : null;
    const startHourLabel = !isMultiDay ? resolveStartHourLabel(appointment.startTimeHour) : null;

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>{dateLabel}</span>
          {durationDays ? (
            <span className="text-xs text-muted-foreground">({durationDays} Tage)</span>
          ) : startHourLabel ? (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {startHourLabel}
            </span>
          ) : null}
        </div>
        <div className="text-xs text-muted-foreground space-y-1">
          {appointment.projectName && <div>Projekt: {appointment.projectName}</div>}
          {appointment.customerName && <div>Kunde: {appointment.customerName}</div>}
          {appointment.employeeName && <div>Mitarbeiter: {appointment.employeeName}</div>}
        </div>
      </div>
    );
  }

  return null;
}
