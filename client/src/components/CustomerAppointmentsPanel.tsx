import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar } from "lucide-react";
import { AllAppointmentsPanel, type AllAppointmentsPanelItem } from "@/components/AllAppointmentsPanel";
import { getBerlinTodayDateString } from "@/lib/project-appointments";
import type { CalendarAppointment } from "@/lib/calendar-appointments";

type CustomerAppointmentSummary = CalendarAppointment & { startTimeHour: number | null };

const sortAppointmentsDesc = (a: CustomerAppointmentSummary, b: CustomerAppointmentSummary) => {
  if (a.startDate !== b.startDate) {
    return a.startDate > b.startDate ? -1 : 1;
  }

  if (a.startTimeHour == null && b.startTimeHour != null) return 1;
  if (a.startTimeHour != null && b.startTimeHour == null) return -1;
  if (a.startTimeHour != null && b.startTimeHour != null && a.startTimeHour !== b.startTimeHour) {
    return b.startTimeHour - a.startTimeHour;
  }

  return b.id - a.id;
};

async function fetchCustomerAppointments(url: string): Promise<CustomerAppointmentSummary[]> {
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) {
    throw new Error(response.statusText);
  }
  return (await response.json()) as CustomerAppointmentSummary[];
}

interface CustomerAppointmentsPanelProps {
  customerId?: number | null;
}

export function CustomerAppointmentsPanel({ customerId }: CustomerAppointmentsPanelProps) {
  const canLoad = Boolean(customerId);
  const queryUrl = canLoad ? `/api/customers/${customerId}/appointments?scope=all` : null;
  const todayBerlin = getBerlinTodayDateString();

  const { data: appointments = [], isLoading } = useQuery<CustomerAppointmentSummary[]>({
    queryKey: ["customerAppointments", customerId ?? null, "all"],
    enabled: !!queryUrl,
    queryFn: () => fetchCustomerAppointments(queryUrl as string),
  });

  const sortedAppointments = useMemo(
    () => [...appointments].sort(sortAppointmentsDesc),
    [appointments],
  );

  const items = useMemo<AllAppointmentsPanelItem[]>(() => {
    return sortedAppointments.map((appointment) => ({
      id: appointment.id,
      startDate: appointment.startDate,
      endDate: appointment.endDate ?? null,
      startTimeHour: appointment.startTimeHour ?? null,
      projectLabel: appointment.projectName ?? null,
      customerLabel: appointment.customer.fullName ?? null,
      previewAppointment: appointment,
      testId: `customer-appointment-${appointment.id}`,
    }));
  }, [sortedAppointments]);

  return (
    <AllAppointmentsPanel
      title="Alle Termine"
      icon={<Calendar className="w-4 h-4" />}
      helpKey="customers.sidebar.appointments"
      compact
      items={items}
      isLoading={isLoading}
      todayBerlin={todayBerlin}
    />
  );
}
