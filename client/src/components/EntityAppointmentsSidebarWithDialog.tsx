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
import type { CalendarAppointment } from "@/lib/calendar-appointments";

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

async function fetchEntityAppointments(url: string): Promise<AppointmentSummary[]> {
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) {
    throw new Error(response.statusText);
  }
  return (await response.json()) as AppointmentSummary[];
}

export function EntityAppointmentsSidebarWithDialog({
  entityType,
  entityId,
  entityLabel,
  onOpenAppointment,
  maxSidebarItems = 5,
}: EntityAppointmentsSidebarWithDialogProps) {
  const [allAppointmentsDialogOpen, setAllAppointmentsDialogOpen] = useState(false);
  const canLoad = Boolean(entityId);
  const showOpenAllButton = canLoad;
  const entityPath = entityType === "employee" ? "employees" : "customers";
  const upcomingUrl = canLoad ? `/api/${entityPath}/${entityId}/appointments?scope=upcoming` : null;
  const allUrl = canLoad ? `/api/${entityPath}/${entityId}/appointments?scope=all` : null;

  const { data: sidebarSourceAppointments = [], isLoading: sidebarLoading } = useQuery<AppointmentSummary[]>({
    queryKey: ["entityAppointments", entityType, entityId ?? null, "upcoming"],
    enabled: !!upcomingUrl,
    queryFn: () => fetchEntityAppointments(upcomingUrl as string),
  });

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

  const { data: allAppointments = [], isLoading: allLoading } = useQuery<AppointmentSummary[]>({
    queryKey: ["entityAppointments", entityType, entityId ?? null, "all"],
    enabled: !!allUrl,
    queryFn: () => fetchEntityAppointments(allUrl as string),
  });

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
        helpKey={entityType === "employee" ? "employees.sidebar.appointments" : "customers.sidebar.appointments"}
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
