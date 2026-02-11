import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { format, isValid, parseISO } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCalendarAppointments, type CalendarAppointment } from "@/lib/calendar-appointments";
import { CalendarAppointmentPopover } from "@/components/calendar/CalendarAppointmentPopover";

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
  const [hoveredAppointment, setHoveredAppointment] = useState<CalendarAppointment | null>(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const handleRowMouseEnter = (appointment: CalendarAppointment, event: MouseEvent<HTMLTableRowElement>) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setHoverPosition({ x: event.clientX + 12, y: event.clientY + 10 });
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredAppointment(appointment);
    }, 320);
  };

  const handleRowMouseMove = (event: MouseEvent<HTMLTableRowElement>) => {
    setHoverPosition({ x: event.clientX + 12, y: event.clientY + 10 });
  };

  const handleRowMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setHoveredAppointment(null);
  };

  const handleOpenAppointment = (appointmentId: number) => {
    onOpenChange(false);
    onOpenAppointment?.(appointmentId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[100dvw] h-[100dvh] max-w-none p-0 overflow-hidden rounded-none sm:w-[95vw] sm:h-[85vh] sm:max-w-6xl sm:rounded-lg">
        <div className="h-full flex flex-col p-6 gap-4">
          <DialogHeader>
            <DialogTitle>
              Termine {employeeName ? `- ${employeeName}` : ""} ({sortedAppointments.length})
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Termin</TableHead>
                  <TableHead>Kundennummer</TableHead>
                  <TableHead>Kunde (Fullname)</TableHead>
                  <TableHead>Projekt Titel</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                      Termine werden geladen...
                    </TableCell>
                  </TableRow>
                ) : sortedAppointments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                      Keine Termine vorhanden
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedAppointments.map((appointment) => (
                    <TableRow
                      key={appointment.id}
                      onMouseEnter={(event) => handleRowMouseEnter(appointment, event)}
                      onMouseMove={handleRowMouseMove}
                      onMouseLeave={handleRowMouseLeave}
                      onDoubleClick={() => handleOpenAppointment(appointment.id)}
                      className="cursor-default"
                      data-testid={`employee-appointments-row-${appointment.id}`}
                    >
                      <TableCell>
                        {formatDateLabel(appointment.startDate)} - {formatStartTimeLabel(appointment.startTime)}
                      </TableCell>
                      <TableCell>{appointment.customer.customerNumber}</TableCell>
                      <TableCell>{appointment.customer.fullName}</TableCell>
                      <TableCell>{appointment.projectName}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {hoveredAppointment ? (
          <CalendarAppointmentPopover appointment={hoveredAppointment} position={hoverPosition} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
