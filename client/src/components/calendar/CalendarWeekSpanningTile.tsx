import { useState } from "react";
import type { CSSProperties, DragEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, CalendarRange, Clock3, MoreVertical, Ban, ParkingCircle, ExternalLink, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AppointmentCancelConfirmDialog } from "@/components/AppointmentCancelConfirmDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  isReservedVacantTagName,
  RESERVED_APPOINTMENT_CANCELLATION_TAG_COLOR,
  RESERVED_VACANT_TAG_COLOR,
} from "@shared/appointmentCancellation";
import { useToast } from "@/hooks/use-toast";
import type { CalendarAppointment } from "@/lib/calendar-appointments";
import { CALENDAR_NEUTRAL_COLOR } from "@/lib/calendar-utils";
import { refreshMonitoringWithNotification } from "@/lib/monitoring";
import { mergeUniqueTags } from "@/lib/tag-utils";
import { EmployeeInfoBadge } from "@/components/ui/employee-info-badge";
import { CalendarWeekAppointmentPanelCustomer } from "./CalendarWeekAppointmentPanelCustomer";
import { CalendarWeekAppointmentAttachmentsHover } from "./CalendarWeekAppointmentAttachmentsHover";
import { CalendarWeekAppointmentNotesHover } from "./CalendarWeekAppointmentNotesHover";
import { CalendarWeekAppointmentPanelProject } from "./CalendarWeekAppointmentPanelProject";
import { CalendarWeekAppointmentTagPicker } from "./CalendarWeekAppointmentTagPicker";
import {
  getWeekAppointmentFooterStyle,
  WEEK_APPOINTMENT_CARD_HEADER_MIN_HEIGHT_PX,
  WEEK_APPOINTMENT_CARD_FOOTER_SAFE_SPACE_PX,
} from "./weekAppointmentCardStyles";
import { toAlphaColor } from "@/lib/monitoring-ui";

export const WEEK_SPANNING_TILE_FOOTER_SAFE_SPACE_PX = WEEK_APPOINTMENT_CARD_FOOTER_SAFE_SPACE_PX;

type AppointmentApiError = Error & { status?: number; code?: string };

const isPastStartDate = (startDate: string) => {
  const startDateValue = new Date(`${startDate}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return startDateValue < today;
};

const normalizeTourName = (value: string | null | undefined) => (value ?? "").trim().toLocaleLowerCase("de").replace(/ß/g, "ss");

const buildApiError = (message: string, status?: number, code?: string): AppointmentApiError => {
  const error = new Error(message) as AppointmentApiError;
  error.status = status;
  error.code = code;
  return error;
};

const parseJsonBody = (rawBody: string): unknown | null => {
  const trimmedBody = rawBody.trim();
  if (
    !trimmedBody ||
    !(
      (trimmedBody.startsWith("{") && trimmedBody.endsWith("}")) ||
      (trimmedBody.startsWith("[") && trimmedBody.endsWith("]"))
    )
  ) {
    return null;
  }
  try {
    return JSON.parse(trimmedBody);
  } catch {
    return null;
  }
};

const parseErrorPayload = (rawBody: string): { message?: string; code?: string } | null => {
  const parsed = parseJsonBody(rawBody);
  if (!parsed || typeof parsed !== "object") return null;
  const payload = parsed as { message?: unknown; code?: unknown };
  return {
    message: typeof payload.message === "string" && payload.message.trim().length > 0 ? payload.message : undefined,
    code: typeof payload.code === "string" ? payload.code : undefined,
  };
};

type CalendarWeekSpanningTileProps = {
  appointment: CalendarAppointment;
  spanColumns: number;
  weekTileBodyMode?: "collapsed" | "semiexpanded" | "expanded";
  visibleStartDate: string;
  visibleDayNumberStart: number;
  uniformHeightPx?: number | null;
  projectStatusAreaHeightPx?: number | null;
  projectStatusAreaRef?: React.Ref<HTMLDivElement>;
  showTagActions?: boolean;
  canEditTags?: boolean;
  containerRef?: React.Ref<HTMLDivElement>;
  style?: CSSProperties;
  isDragging?: boolean;
  isLocked?: boolean;
  highlighted?: boolean;
  isConflict?: boolean;
  isBlocked?: boolean;
  conflictColor?: string;
  onDoubleClick?: () => void;
  onDragStart?: (event: DragEvent) => void;
  onDragEnd?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  testId?: string;
};

export function CalendarWeekSpanningTile({
  appointment,
  spanColumns,
  weekTileBodyMode = "semiexpanded",
  visibleStartDate,
  visibleDayNumberStart,
  uniformHeightPx,
  projectStatusAreaHeightPx: _projectStatusAreaHeightPx,
  projectStatusAreaRef: _projectStatusAreaRef,
  showTagActions = false,
  canEditTags = false,
  containerRef,
  style,
  isDragging,
  isLocked,
  highlighted = false,
  isConflict = false,
  isBlocked = false,
  conflictColor,
  onDoubleClick,
  onDragStart,
  onDragEnd,
  onMouseEnter,
  onMouseLeave,
  testId,
}: CalendarWeekSpanningTileProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [parkConfirmOpen, setParkConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const isParked = appointment.appointmentTags.some((t) => isReservedVacantTagName(t.name));
  const isHistoricalReadOnly = isPastStartDate(appointment.startDate)
    && normalizeTourName(appointment.tourName) !== normalizeTourName("Parkplatz");

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/appointments/${appointment.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: appointment.version }),
      });
      if (!res.ok) throw new Error("Stornieren fehlgeschlagen");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["calendarAppointments"] });
      await queryClient.invalidateQueries({ queryKey: ["calendarWeekLaneEmployeePreviews"] });
      toast({ title: "Termin storniert" });
    },
    onError: () => {
      toast({ title: "Stornieren nicht möglich", variant: "destructive" });
    },
  });

  const parkMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/appointments/${appointment.id}/park`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: appointment.version }),
      });
      if (!res.ok) throw new Error("Parken fehlgeschlagen");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["calendarAppointments"] });
      await queryClient.invalidateQueries({ queryKey: ["calendarWeekLaneEmployeePreviews"] });
      await refreshMonitoringWithNotification(toast);
      toast({ title: "Termin geparkt" });
    },
    onError: () => {
      toast({ title: "Parken nicht möglich", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const fetchFreshVersion = async (): Promise<number> => {
        const detail = await queryClient.fetchQuery({
          queryKey: ["/api/appointments", appointment.id],
          queryFn: async () => {
            const response = await fetch(`/api/appointments/${appointment.id}`, {
              credentials: "include",
            });
            if (!response.ok) {
              throw new Error("Termindetails konnten nicht geladen werden");
            }
            return response.json() as Promise<{ version?: number }>;
          },
          staleTime: 0,
        });
        const version = detail?.version;
        if (typeof version !== "number" || !Number.isInteger(version) || version < 1) {
          throw buildApiError("Termin kann derzeit nicht gelöscht werden. Bitte neu laden.", 422, "VALIDATION_ERROR");
        }
        return version;
      };

      const requestDelete = async (version: number) => {
        const response = await fetch(`/api/appointments/${appointment.id}`, {
          method: "DELETE",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ version }),
        });
        if (response.ok) return;

        const rawBody = await response.text();
        const parsed = parseErrorPayload(rawBody);
        if (parsed?.code === "PAST_APPOINTMENT_READONLY") {
          throw buildApiError("Termin ist gesperrt.", response.status, "PAST_APPOINTMENT_READONLY");
        }
        if (parsed?.code === "CANCELLED_APPOINTMENT_READONLY") {
          throw buildApiError("Stornierte Termine können nicht gelöscht werden.", response.status, "CANCELLED_APPOINTMENT_READONLY");
        }
        if (parsed?.code === "VERSION_CONFLICT") {
          throw buildApiError("Termin wurde parallel geändert.", response.status, "VERSION_CONFLICT");
        }
        if (parsed?.code === "VALIDATION_ERROR") {
          throw buildApiError("Ungültige Löschdaten. Bitte neu laden.", response.status, "VALIDATION_ERROR");
        }
        throw buildApiError(parsed?.message ?? (response.statusText || "Löschen fehlgeschlagen"), response.status, parsed?.code);
      };

      try {
        const freshVersion = await fetchFreshVersion();
        await requestDelete(freshVersion);
      } catch (error) {
        const err = error as AppointmentApiError;
        if (err.code !== "VERSION_CONFLICT") throw error;

        const freshVersion = await fetchFreshVersion();
        try {
          await requestDelete(freshVersion);
        } catch (retryError) {
          const retryErr = retryError as AppointmentApiError;
          if (retryErr.code === "VERSION_CONFLICT") {
            throw buildApiError(
              "Termin wurde parallel geändert. Bitte Termin neu öffnen.",
              retryErr.status,
              "VERSION_CONFLICT",
            );
          }
          throw retryError;
        }
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["calendarAppointments"] });
      await queryClient.invalidateQueries({ queryKey: ["calendarWeekLaneEmployeePreviews"] });
      await refreshMonitoringWithNotification(toast);
      toast({ title: "Termin gelöscht" });
    },
    onError: (error) => {
      const err = error as AppointmentApiError;
      if (err.code === "PAST_APPOINTMENT_READONLY" || err.status === 403) {
        toast({
          title: "Löschen nicht möglich",
          description: "Termin ist gesperrt.",
          variant: "destructive",
        });
        return;
      }
      if (err.code === "CANCELLED_APPOINTMENT_READONLY") {
        toast({
          title: "Löschen nicht möglich",
          description: "Stornierte Termine können nicht gelöscht werden.",
          variant: "destructive",
        });
        return;
      }
      if (err.code === "VERSION_CONFLICT") {
        toast({
          title: "Löschen nicht möglich",
          description: err.message || "Termin wurde zwischenzeitlich geändert. Bitte neu laden.",
          variant: "destructive",
        });
        return;
      }
      if (err.code === "VALIDATION_ERROR") {
        toast({
          title: "Löschen nicht möglich",
          description: "Ungültige Löschdaten. Bitte neu laden.",
          variant: "destructive",
        });
        return;
      }
      const message = error instanceof Error ? error.message : "Löschen fehlgeschlagen";
      toast({ title: "Fehler", description: message, variant: "destructive" });
    },
  });

  const menuSlot = !isHistoricalReadOnly ? (
    <span
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center justify-center rounded p-0.5 opacity-60 hover:opacity-100 hover:bg-white/20 transition-opacity focus:outline-none"
            aria-label="Terminaktionen"
            data-testid={`week-spanning-tile-menu-trigger-${appointment.id}`}
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[160px]">
          {onDoubleClick && (
            <DropdownMenuItem
              onClick={onDoubleClick}
              className="gap-2 text-xs cursor-pointer"
            >
              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              Termin öffnen
            </DropdownMenuItem>
          )}
          {!appointment.isCancelled && (
            <DropdownMenuItem
              onClick={() => setCancelConfirmOpen(true)}
              className="gap-2 text-xs cursor-pointer"
              style={{ color: RESERVED_APPOINTMENT_CANCELLATION_TAG_COLOR }}
            >
              <Ban className="h-3.5 w-3.5 shrink-0" />
              Stornieren
            </DropdownMenuItem>
          )}
          {!appointment.isCancelled && !isParked && (
            <DropdownMenuItem
              onClick={() => setParkConfirmOpen(true)}
              className="gap-2 text-xs cursor-pointer"
              style={{ color: RESERVED_VACANT_TAG_COLOR }}
            >
              <ParkingCircle className="h-3.5 w-3.5 shrink-0" />
              Parken
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={() => setDeleteConfirmOpen(true)}
            className="gap-2 text-xs cursor-pointer text-destructive focus:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5 shrink-0" />
            Termin löschen
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </span>
  ) : undefined;

  const canDrag = Boolean(onDragStart);
  const interactiveClass = isLocked ? "cursor-not-allowed opacity-80" : "hover:shadow-md";
  const borderColor = appointment.tourColor ?? CALENDAR_NEUTRAL_COLOR;
  const highlightClass = highlighted ? "shadow-md ring-1 ring-primary/30" : "";
  const uniformBorderShadow = highlighted ? undefined : `inset 0 0 0 1px ${borderColor}`;
  const resolvedProjectName = appointment.projectName;
  const visibleColumns = Math.max(1, spanColumns);
  const headerDays = Array.from({ length: visibleColumns }, (_, dayOffset) => {
    const dayDate = new Date(`${visibleStartDate}T00:00:00`);
    dayDate.setDate(dayDate.getDate() + dayOffset);
    return {
      key: `${visibleStartDate}-${dayOffset}`,
      formattedDate: Number.isNaN(dayDate.getTime())
        ? visibleStartDate
        : new Intl.DateTimeFormat("de-DE", {
            day: "2-digit",
            month: "2-digit",
            year: "2-digit",
          }).format(dayDate),
      dayLabel: `Tag ${visibleDayNumberStart + dayOffset}`,
      isFirst: dayOffset === 0,
      isLast: dayOffset === visibleColumns - 1,
    };
  });
  const hasStartTime = Boolean(appointment.startTime?.trim());
  const TimingIcon = visibleColumns > 1 ? CalendarRange : hasStartTime ? Clock3 : CalendarDays;
  const resolvedStartTime = appointment.startTime?.trim().slice(0, 5) || null;
  const resolvedCustomerNumber = appointment.customer.customerNumber.trim() || "-";
  const resolvedPostalCode = appointment.customer.postalCode?.trim() || "-";
  const showCustomerPanel = true;
  const customerMode = weekTileBodyMode === "expanded" ? "expanded" : "collapsed";
  const isCompactPanelMode = weekTileBodyMode === "collapsed";
  const effectiveCustomerMode = isCompactPanelMode ? "collapsed" : customerMode;
  const projectCollapsed = isCompactPanelMode;
  const projectDisplayMode = isCompactPanelMode
    ? "compact"
    : weekTileBodyMode === "expanded"
      ? "detail"
      : "standard";
  const customerPanelHeightClassName = isCompactPanelMode
    ? "h-8 overflow-hidden"
    : effectiveCustomerMode === "expanded"
      ? "h-[6.5rem] overflow-hidden"
      : "h-8 overflow-hidden";
  const projectPanelClassName = projectCollapsed
    ? "h-8 w-full overflow-hidden"
    : "min-h-0 h-full w-full";
  const contentGridTemplateRows = isCompactPanelMode
    ? "2rem 2rem"
    : `${effectiveCustomerMode === "expanded" ? "6.5rem" : "2rem"} minmax(0, 1fr)`;
  const bodyShellClassName = isCompactPanelMode ? "flex shrink-0 flex-col" : "flex min-h-0 flex-1 flex-col";
  const bodyContentContainerClassName = isCompactPanelMode
    ? "relative shrink-0 flex flex-col bg-white/90 px-1 pt-1 pb-0"
    : "relative flex min-h-0 flex-1 flex-col bg-white/90 px-1 pt-1 pb-2";
  const mainContentPanelsClassName = isCompactPanelMode
    ? "grid w-full shrink-0 content-start gap-1 overflow-hidden"
    : "grid min-h-0 w-full flex-1 content-start gap-1 overflow-hidden";
  const mergedTags = mergeUniqueTags(
    appointment.appointmentTags,
    appointment.customerTags,
    appointment.projectTags,
  );
  const footerStyle = getWeekAppointmentFooterStyle(appointment.tourColor, isCompactPanelMode ? "compact" : "standard");
  const footerClassName = isCompactPanelMode
    ? "relative shrink-0 border-t px-1 py-1"
    : "relative mt-auto shrink-0 border-t px-1 py-1";
  const conflictOverlayStyle = conflictColor
    ? {
        backgroundImage: `repeating-linear-gradient(135deg, ${toAlphaColor(conflictColor, 0.26)} 0 10px, ${toAlphaColor(conflictColor, 0.08)} 10px 20px)`,
      }
    : undefined;
  const compactEmployeeBadges = appointment.employees.length > 0 ? (
    appointment.employees.slice(0, 6).map((employee) => (
      <EmployeeInfoBadge
        key={employee.id}
        id={employee.id}
        firstName={employee.firstName}
        lastName={employee.lastName}
        fullName={employee.fullName}
        renderMode="compact"
        size="sm"
        showPreview
        testId={`week-spanning-tile-employee-compact-${appointment.id}-${employee.id}`}
      />
    ))
  ) : (
    <span className="text-[9px] italic text-slate-400">Keine MA</span>
  );
  const standardEmployeeBadges = appointment.employees.length > 0 ? (
    appointment.employees.map((employee) => (
      <EmployeeInfoBadge
        key={employee.id}
        id={employee.id}
        firstName={employee.firstName}
        lastName={employee.lastName}
        fullName={employee.fullName}
        renderMode="standard"
        size="sm"
        showPreview
        testId={`week-spanning-tile-employee-std-${appointment.id}-${employee.id}`}
      />
    ))
  ) : (
    <span className="text-[9px] italic text-slate-400">Keine MA</span>
  );

  const mainContentPanels = (
    <div className={mainContentPanelsClassName} style={{ gridTemplateRows: contentGridTemplateRows }}>
      {showCustomerPanel ? (
        <CalendarWeekAppointmentPanelCustomer
          mode={effectiveCustomerMode}
          fullName={appointment.customer.fullName ?? ""}
          customerNumber={appointment.customer.customerNumber}
          phone={appointment.customer.phone}
          email={appointment.customer.email}
          addressLine1={appointment.customer.addressLine1}
          postalCode={appointment.customer.postalCode}
          city={appointment.customer.city}
          country={appointment.customer.country}
          className={customerPanelHeightClassName}
        />
      ) : null}
      <CalendarWeekAppointmentPanelProject
        projectName={resolvedProjectName}
        projectOrderNumber={appointment.projectOrderNumber}
        projectArticleItems={appointment.projectArticleItems}
        projectDescription={appointment.projectDescription}
        collapsed={projectCollapsed}
        displayMode={projectDisplayMode}
        enableFullDescriptionPreview
        className={projectPanelClassName}
      />
    </div>
  );

  const footerContentPanels = (
    <div className="flex h-full flex-col gap-1">
      {isCompactPanelMode ? (
        <>
          <div className="flex min-h-6 w-full items-center gap-1 overflow-hidden">
            <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-hidden">
              {compactEmployeeBadges}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <CalendarWeekAppointmentNotesHover
                appointmentId={appointment.id}
                customerId={appointment.customer.id}
                projectId={appointment.projectId}
                customerNotesCount={appointment.customerNotesCount ?? 0}
                projectNotesCount={appointment.projectNotesCount ?? 0}
                appointmentNotesCount={appointment.appointmentNotesCount ?? 0}
              />
              <CalendarWeekAppointmentAttachmentsHover
                appointmentId={appointment.id}
                totalAttachmentsCount={appointment.totalAttachmentsCount ?? 0}
              />
            </div>
          </div>
          <div className="flex min-h-6 w-full items-center">
            <CalendarWeekAppointmentTagPicker
              appointmentId={appointment.id}
              tags={mergedTags}
              appointmentTags={appointment.appointmentTags}
              projectTags={appointment.projectTags}
              canEdit={showTagActions && canEditTags}
              testId={`week-spanning-tile-tags-${appointment.id}`}
            />
          </div>
        </>
      ) : (
        <>
          <div className="flex min-h-7 w-full items-center gap-0.5 overflow-x-auto overflow-y-visible">
            {standardEmployeeBadges}
          </div>
          <div className="flex min-h-6 w-full items-center gap-1">
            <CalendarWeekAppointmentNotesHover
              appointmentId={appointment.id}
              customerId={appointment.customer.id}
              projectId={appointment.projectId}
              customerNotesCount={appointment.customerNotesCount ?? 0}
              projectNotesCount={appointment.projectNotesCount ?? 0}
              appointmentNotesCount={appointment.appointmentNotesCount ?? 0}
            />
            <CalendarWeekAppointmentAttachmentsHover
              appointmentId={appointment.id}
              totalAttachmentsCount={appointment.totalAttachmentsCount ?? 0}
            />
          </div>
          <div className="flex min-h-6 w-full items-center">
            <CalendarWeekAppointmentTagPicker
              appointmentId={appointment.id}
              tags={mergedTags}
              appointmentTags={appointment.appointmentTags}
              projectTags={appointment.projectTags}
              canEdit={showTagActions && canEditTags}
              testId={`week-spanning-tile-tags-${appointment.id}`}
            />
          </div>
        </>
      )}
    </div>
  );

  const bodyContent = (
    <div className={bodyShellClassName}>
      <div className={bodyContentContainerClassName} data-testid={`week-spanning-tile-content-${appointment.id}`}>
        {isConflict ? (
          <div
            className="pointer-events-none absolute inset-0 rounded-sm opacity-100 transition-opacity duration-200 group-hover/calendar-card:opacity-25"
            style={conflictOverlayStyle}
            data-testid={`week-spanning-tile-conflict-overlay-${appointment.id}`}
          />
        ) : null}
        <div className="flex min-h-0 w-full flex-1 overflow-hidden">
          {mainContentPanels}
        </div>
      </div>
      <div
        className={footerClassName}
        style={footerStyle}
        data-testid={`week-spanning-tile-footer-${appointment.id}`}
      >
        {isConflict ? (
          <div
            className="pointer-events-none absolute inset-0 opacity-100 transition-opacity duration-200 group-hover/calendar-card:opacity-25"
            style={conflictOverlayStyle}
            data-testid={`week-spanning-tile-conflict-overlay-${appointment.id}`}
          />
        ) : null}
        {footerContentPanels}
      </div>
    </div>
  );

  return (
  <>
    <div
      className={`group/calendar-card relative grid w-full min-w-0 overflow-hidden rounded-lg border shadow-sm transition ${highlightClass} ${interactiveClass} ${isDragging ? "opacity-50" : ""}`}
      style={{
        gridTemplateColumns: `repeat(${Math.max(1, spanColumns)}, minmax(0, 1fr))`,
        gridTemplateRows: "auto 1fr",
        borderColor: highlighted ? undefined : borderColor,
        boxShadow: uniformBorderShadow,
        alignSelf: isCompactPanelMode ? "start" : undefined,
        ...(!isCompactPanelMode && uniformHeightPx && uniformHeightPx > 0
          ? { height: `${uniformHeightPx + WEEK_SPANNING_TILE_FOOTER_SAFE_SPACE_PX}px` }
          : {}),
        ...style,
      }}
      onDoubleClick={onDoubleClick}
      draggable={canDrag}
      onDragStart={canDrag ? onDragStart : undefined}
      onDragEnd={canDrag ? onDragEnd : undefined}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      ref={containerRef}
      aria-disabled={isLocked}
      data-testid={testId ?? `week-spanning-tile-${appointment.id}`}
    >
      <div
        className="grid box-border rounded-b-none border-b border-white/15 text-[10px] font-semibold tracking-wide"
        style={{
          gridColumn: `1 / span ${visibleColumns}`,
          gridRow: 1,
          gridTemplateColumns: `repeat(${visibleColumns}, minmax(0, 1fr))`,
          backgroundColor: appointment.tourColor ?? CALENDAR_NEUTRAL_COLOR,
          color: "#ffffff",
          borderColor: "rgba(255,255,255,0.18)",
          minHeight: `${WEEK_APPOINTMENT_CARD_HEADER_MIN_HEIGHT_PX}px`,
          height: `${WEEK_APPOINTMENT_CARD_HEADER_MIN_HEIGHT_PX}px`,
          backgroundImage:
            "linear-gradient(180deg, rgba(255,255,255,0.24) 0%, rgba(255,255,255,0) 42%), linear-gradient(180deg, rgba(0,0,0,0) 58%, rgba(0,0,0,0.18) 100%)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.26), inset 0 -1px 0 rgba(0,0,0,0.14), 0 2px 6px rgba(15,23,42,0.2)",
          filter: isBlocked ? "saturate(0.38) brightness(0.82)" : undefined,
          opacity: isBlocked ? 0.86 : undefined,
        }}
        data-testid={`week-spanning-tile-header-${appointment.id}`}
      >
        {headerDays.map((headerDay) => (
          <div
            key={headerDay.key}
            className="box-border min-w-0 h-full px-2 py-1"
            style={{
              borderLeft: headerDay.isFirst ? undefined : "1px solid rgba(255,255,255,0.16)",
            }}
          >
            <div className="flex h-full flex-col justify-between text-[10px] font-semibold tracking-wide">
              <div className={`grid items-center gap-1 ${headerDay.isLast ? "grid-cols-[auto_1fr_auto_auto]" : "grid-cols-[auto_1fr_auto]"}`}>
                {headerDay.isFirst ? (
                  <>
                    <span
                      className="inline-flex items-center justify-center"
                      title={visibleColumns > 1 ? "Mehrtagestermin" : hasStartTime ? "Termin mit Startzeit" : "Tagestermin"}
                    >
                      <TimingIcon className="h-3.5 w-3.5" aria-hidden />
                    </span>
                    <span className="truncate text-center">{[resolvedStartTime, headerDay.formattedDate].filter(Boolean).join(" | ")}</span>
                  </>
                ) : (
                  <>
                    <span />
                    <span className="truncate text-center">{headerDay.formattedDate}</span>
                  </>
                )}
                <span className="shrink-0 text-right justify-self-end">{headerDay.dayLabel}</span>
                {headerDay.isLast && (
                  <span className="shrink-0 flex items-center justify-center">{menuSlot}</span>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-white/20 pt-1">
                {headerDay.isFirst ? <span className="truncate">K: {resolvedCustomerNumber}</span> : <span />}
                {headerDay.isLast ? <span className="truncate text-right">PLZ: {resolvedPostalCode}</span> : <span />}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div
        className="flex min-h-0 h-full flex-col bg-white/90"
        style={{ gridColumn: `1 / span ${visibleColumns}`, gridRow: 2 }}
        data-testid={`week-spanning-tile-body-filled-${appointment.id}`}
      >
        {bodyContent}
      </div>
    </div>
    <AppointmentCancelConfirmDialog
      open={cancelConfirmOpen}
      onOpenChange={setCancelConfirmOpen}
      isPending={cancelMutation.isPending}
      onConfirm={() => cancelMutation.mutate()}
    />

    <AlertDialog open={parkConfirmOpen} onOpenChange={setParkConfirmOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Termin parken?</AlertDialogTitle>
          <AlertDialogDescription>
            Der Termin wird in die Parkplatz-Tour verschoben und als geparkt markiert. Zugewiesene Mitarbeiter werden entfernt.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={parkMutation.isPending}>Abbrechen</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => parkMutation.mutate()}
            disabled={parkMutation.isPending}
            style={{
              backgroundColor: RESERVED_VACANT_TAG_COLOR,
              borderColor: RESERVED_VACANT_TAG_COLOR,
            }}
          >
            {parkMutation.isPending ? "Parken…" : "Parken"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Termin löschen?</AlertDialogTitle>
          <AlertDialogDescription>
            Dieser Termin wird dauerhaft gelöscht und kann nicht rückgängig gemacht werden.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>Abbrechen</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            className="bg-destructive text-destructive-foreground border border-destructive-border hover:bg-destructive/90"
          >
            {deleteMutation.isPending ? "Termin löschen..." : "Termin löschen"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  );
}
