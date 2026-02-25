import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, isValid, parseISO } from "date-fns";
import { Calendar, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ListLayout } from "@/components/ui/list-layout";
import { TableView, type TableViewColumnDef } from "@/components/ui/table-view";
import { AppointmentsPanel, type AppointmentPanelItem } from "@/components/AppointmentsPanel";
import { createAppointmentWeeklyPanelPreview } from "@/components/ui/badge-previews/appointment-weekly-panel-preview";
import { getBerlinTodayDateString, PROJECT_APPOINTMENTS_ALL_FROM_DATE } from "@/lib/project-appointments";
import { useCalendarAppointments, type CalendarAppointment } from "@/lib/calendar-appointments";
import type { Project } from "@shared/schema";

const ALL_APPOINTMENTS_FROM_DATE = PROJECT_APPOINTMENTS_ALL_FROM_DATE;
const ALL_APPOINTMENTS_TO_DATE = "2100-12-31";

type EntityType = "employee" | "customer";
type AppointmentSummary = CalendarAppointment & { startTimeHour: number | null };

interface EntityAppointmentsSidebarWithDialogProps {
  entityType: EntityType;
  entityId?: number | null;
  entityLabel?: string | null;
  onOpenAppointment?: (appointmentId: number) => void;
  maxSidebarItems?: number;
}

const parseStartTimeToSortValue = (startTime: string | null): number => {
  if (!startTime) return -1;
  const [hourPart, minutePart] = startTime.split(":");
  const hour = Number(hourPart);
  const minute = Number(minutePart);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return -1;
  return hour * 60 + minute;
};

const formatDateLabel = (value: string) => {
  const parsed = parseISO(value);
  return isValid(parsed) ? format(parsed, "dd.MM.yyyy") : value;
};

const formatStartTimeLabel = (value: string | null) => {
  if (!value) return "-";
  return value.slice(0, 5);
};

async function fetchProjectAppointments(projects: Project[], fromDate: string): Promise<AppointmentSummary[]> {
  const responses = await Promise.all(
    projects.map(async (project) => {
      const response = await fetch(`/api/projects/${project.id}/appointments?fromDate=${fromDate}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(response.statusText);
      }
      const payload = await response.json();
      return payload as AppointmentSummary[];
    }),
  );

  return responses.flat();
}

export function EntityAppointmentsSidebarWithDialog({
  entityType,
  entityId,
  entityLabel,
  onOpenAppointment,
  maxSidebarItems = 5,
}: EntityAppointmentsSidebarWithDialogProps) {
  const [allAppointmentsDialogOpen, setAllAppointmentsDialogOpen] = useState(false);
  const today = getBerlinTodayDateString();
  const canLoad = Boolean(entityId);
  const showOpenAllButton = canLoad;

  const { data: customerProjects = [], isLoading: customerProjectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects", { customerId: entityId, filter: "all" }],
    queryFn: () => fetch(`/api/projects?customerId=${entityId}&filter=all`).then((response) => response.json()),
    enabled: entityType === "customer" && canLoad,
  });

  const employeeUpcomingUrl = entityType === "employee" && entityId
    ? `/api/employees/${entityId}/current-appointments?fromDate=${today}`
    : null;

  const { data: employeeUpcomingAppointments = [], isLoading: employeeUpcomingLoading } = useQuery<AppointmentSummary[]>({
    queryKey: [employeeUpcomingUrl ?? ""],
    enabled: !!employeeUpcomingUrl,
  });

  const customerProjectIds = useMemo(
    () => customerProjects.map((project) => project.id).join("-"),
    [customerProjects],
  );

  const customerUpcomingQuery = useQuery<AppointmentSummary[]>({
    queryKey: ["customer-entity-appointments-upcoming", entityId, today, customerProjectIds],
    enabled: entityType === "customer" && customerProjects.length > 0,
    queryFn: () => fetchProjectAppointments(customerProjects, today),
  });

  const sidebarSourceAppointments = entityType === "employee"
    ? employeeUpcomingAppointments
    : (customerUpcomingQuery.data ?? []);
  const sidebarLoading = entityType === "employee"
    ? employeeUpcomingLoading
    : (customerProjectsLoading || customerUpcomingQuery.isLoading);

  const sortedSidebarAppointments = useMemo(() => {
    return [...sidebarSourceAppointments].sort((a, b) => {
      if (a.startDate !== b.startDate) {
        return a.startDate > b.startDate ? 1 : -1;
      }

      const aHour = a.startTimeHour ?? Number.MAX_SAFE_INTEGER;
      const bHour = b.startTimeHour ?? Number.MAX_SAFE_INTEGER;
      if (aHour !== bHour) {
        return aHour - bHour;
      }

      return a.id - b.id;
    });
  }, [sidebarSourceAppointments]);

  const limitedSidebarAppointments = sortedSidebarAppointments.slice(0, maxSidebarItems);

  const sidebarItems = useMemo<AppointmentPanelItem[]>(() => {
    return limitedSidebarAppointments.map((appointment) => ({
      id: appointment.id,
      startDate: appointment.startDate,
      endDate: appointment.endDate ?? null,
      startTimeHour: appointment.startTimeHour ?? null,
      projectName: appointment.projectName ?? null,
      customerName: appointment.customer.fullName ?? null,
      previewAppointment: appointment,
    }));
  }, [limitedSidebarAppointments]);

  const userRole = useMemo(
    () => window.localStorage.getItem("userRole")?.toUpperCase() ?? "DISPATCHER",
    [],
  );

  const { data: employeeAllAppointments = [], isLoading: employeeAllLoading } = useCalendarAppointments({
    fromDate: ALL_APPOINTMENTS_FROM_DATE,
    toDate: ALL_APPOINTMENTS_TO_DATE,
    employeeId: entityType === "employee" ? (entityId ?? undefined) : undefined,
    detail: "full",
    userRole,
    enabled: entityType === "employee" && canLoad,
  });

  const customerAllQuery = useQuery<AppointmentSummary[]>({
    queryKey: ["customer-entity-appointments-all", entityId, ALL_APPOINTMENTS_FROM_DATE, customerProjectIds],
    enabled: entityType === "customer" && customerProjects.length > 0,
    queryFn: () => fetchProjectAppointments(customerProjects, ALL_APPOINTMENTS_FROM_DATE),
  });

  const allAppointments = entityType === "employee"
    ? employeeAllAppointments
    : (customerAllQuery.data ?? []);
  const allLoading = entityType === "employee"
    ? employeeAllLoading
    : (customerProjectsLoading || customerAllQuery.isLoading);

  const sortedAllAppointments = useMemo(() => {
    return [...allAppointments].sort((a, b) => {
      if (a.startDate !== b.startDate) {
        return a.startDate > b.startDate ? -1 : 1;
      }

      const aTime = parseStartTimeToSortValue(a.startTime);
      const bTime = parseStartTimeToSortValue(b.startTime);
      if (aTime !== bTime) {
        return bTime - aTime;
      }

      return b.id - a.id;
    });
  }, [allAppointments]);

  const tableColumns = useMemo<TableViewColumnDef<CalendarAppointment>[]>(
    () => [
      {
        id: "appointment",
        header: "Termin",
        accessor: (row) => row.startDate,
        minWidth: 220,
        cell: ({ row }) => (
          <span>
            {formatDateLabel(row.startDate)} - {formatStartTimeLabel(row.startTime)}
          </span>
        ),
      },
      {
        id: "customerNumber",
        header: "Kundennummer",
        accessor: (row) => row.customer.customerNumber,
        minWidth: 140,
      },
      {
        id: "customer",
        header: "Kunde (Fullname)",
        accessor: (row) => row.customer.fullName,
        minWidth: 240,
      },
      {
        id: "projectTitle",
        header: "Projekt Titel",
        accessor: (row) => row.projectName,
        minWidth: 240,
      },
    ],
    [],
  );

  return (
    <>
      <AppointmentsPanel
        title="Termine"
        icon={<Calendar className="w-4 h-4" />}
        compact
        items={sidebarItems}
        isLoading={sidebarLoading}
        emptyStateLabel="Keine Termine ab heute"
        sidebarFooter={showOpenAllButton ? (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => setAllAppointmentsDialogOpen(true)}
            data-testid={entityType === "employee"
              ? "button-open-employee-appointments-view"
              : "button-open-customer-appointments-view"}
          >
            Alle Termine
          </Button>
        ) : null}
      />

      <Dialog open={allAppointmentsDialogOpen} onOpenChange={setAllAppointmentsDialogOpen}>
        <DialogContent className="w-[100dvw] h-[100dvh] max-w-none p-0 overflow-hidden rounded-none sm:w-[95vw] sm:h-[85vh] sm:max-w-6xl sm:rounded-lg">
          <div className="h-full flex flex-col p-6 gap-4">
            <DialogHeader>
              <DialogTitle>
                Termine {entityLabel ? `- ${entityLabel}` : ""} ({sortedAllAppointments.length})
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 min-h-0">
              <ListLayout
                title="Termine"
                icon={<CalendarDays className="w-5 h-5" />}
                viewModeKey={`${entityType}AppointmentsDialog`}
                isLoading={allLoading}
                showCloseButton={false}
                contentSlot={(
                  <TableView
                    testId={`table-${entityType}-appointments-dialog`}
                    columns={tableColumns}
                    rows={sortedAllAppointments}
                    rowKey={(row) => row.id}
                    onRowDoubleClick={entityType === "employee" && onOpenAppointment
                      ? (row) => {
                          setAllAppointmentsDialogOpen(false);
                          onOpenAppointment(row.id);
                        }
                      : undefined}
                    rowPreviewRenderer={(row) => createAppointmentWeeklyPanelPreview(row)}
                    emptyState={<p className="py-4 text-sm text-muted-foreground">Keine Termine vorhanden</p>}
                    stickyHeader
                  />
                )}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
