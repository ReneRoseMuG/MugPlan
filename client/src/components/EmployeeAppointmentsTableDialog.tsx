import { useMemo } from "react";
import { format, isValid, parseISO } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CalendarDays } from "lucide-react";
import { ListLayout } from "@/components/ui/list-layout";
import { TableView, type TableViewColumnDef } from "@/components/ui/table-view";
import { createAppointmentWeeklyPanelPreview } from "@/components/ui/badge-previews/appointment-weekly-panel-preview";
import { useCalendarAppointments, type CalendarAppointment } from "@/lib/calendar-appointments";

const ALL_APPOINTMENTS_FROM_DATE = "1900-01-01";
const ALL_APPOINTMENTS_TO_DATE = "2100-12-31";

interface EmployeeAppointmentsTableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: number | null;
  employeeName?: string | null;
  onOpenAppointment?: (appointmentId: number) => void;
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

export function EmployeeAppointmentsTableDialog({
  open,
  onOpenChange,
  employeeId,
  employeeName,
  onOpenAppointment,
}: EmployeeAppointmentsTableDialogProps) {
  const userRole = useMemo(
    () => window.localStorage.getItem("userRole")?.toUpperCase() ?? "DISPATCHER",
    [],
  );

  const { data: appointments = [], isLoading } = useCalendarAppointments({
    fromDate: ALL_APPOINTMENTS_FROM_DATE,
    toDate: ALL_APPOINTMENTS_TO_DATE,
    employeeId: employeeId ?? undefined,
    detail: "full",
    userRole,
  });

  const sortedAppointments = useMemo(() => {
    return [...appointments].sort((a, b) => {
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
  }, [appointments]);

  const handleOpenAppointment = (appointmentId: number) => {
    onOpenChange(false);
    onOpenAppointment?.(appointmentId);
  };

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[100dvw] h-[100dvh] max-w-none p-0 overflow-hidden rounded-none sm:w-[95vw] sm:h-[85vh] sm:max-w-6xl sm:rounded-lg">
        <div className="h-full flex flex-col p-6 gap-4">
          <DialogHeader>
            <DialogTitle>
              Termine {employeeName ? `- ${employeeName}` : ""} ({sortedAppointments.length})
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            <ListLayout
              title="Termine"
              icon={<CalendarDays className="w-5 h-5" />}
              viewModeKey="employeeAppointmentsDialog"
              isLoading={isLoading}
              showCloseButton={false}
              contentSlot={(
                <TableView
                  testId="table-employee-appointments-dialog"
                  columns={tableColumns}
                  rows={sortedAppointments}
                  rowKey={(row) => row.id}
                  onRowDoubleClick={(row) => handleOpenAppointment(row.id)}
                  rowPreviewRenderer={(row) => createAppointmentWeeklyPanelPreview(row).content}
                  emptyState={<p className="py-4 text-sm text-muted-foreground">Keine Termine vorhanden</p>}
                  stickyHeader
                />
              )}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
