import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar } from "lucide-react";
import { AllAppointmentsPanel, type AllAppointmentsPanelItem } from "@/components/AllAppointmentsPanel";
import { FooterChildCollectionBadge } from "@/components/ui/footer-child-collection-badge";
import { HoverPreview } from "@/components/ui/hover-preview";
import { getBerlinTodayDateString } from "@/lib/project-appointments";
import type { CalendarAppointment } from "@/lib/calendar-appointments";

type AppointmentListItem = CalendarAppointment & {
  startTimeHour: number | null;
};

type AppointmentListResponse = {
  items: AppointmentListItem[];
};

interface TourWeekAppointmentsHoverPreviewProps {
  tourId: number;
  employeeId?: number | null;
  weekStartDate: string;
  weekEndDate: string;
  count: number;
  triggerTestId?: string;
}

function mapAppointmentItem(appointment: AppointmentListItem): AllAppointmentsPanelItem {
  return {
    id: appointment.id,
    startDate: appointment.startDate,
    endDate: appointment.endDate,
    startTimeHour: appointment.startTimeHour,
    mode: "projekt",
    customerLabel: appointment.customer.fullName ?? null,
    projectLabel: appointment.projectName ?? null,
    previewAppointment: appointment,
    testId: `tour-week-appointment-preview-${appointment.id}`,
  };
}

export function TourWeekAppointmentsHoverPreview({
  tourId,
  employeeId = null,
  weekStartDate,
  weekEndDate,
  count,
  triggerTestId,
}: TourWeekAppointmentsHoverPreviewProps) {
  const [shouldLoadPreview, setShouldLoadPreview] = useState(false);
  const normalizedCount = Number.isFinite(count) ? Math.max(0, count) : 0;
  const todayBerlin = getBerlinTodayDateString();

  const appointmentsQuery = useQuery<AppointmentListResponse>({
    queryKey: ["/api/appointments/list", "tour-week-preview", tourId, employeeId, weekStartDate, weekEndDate],
    enabled: shouldLoadPreview && normalizedCount > 0,
    queryFn: async () => {
      const params = new URLSearchParams({
        page: "1",
        pageSize: "25",
        tourId: String(tourId),
        dateFrom: weekStartDate,
        dateTo: weekEndDate,
      });
      if (employeeId != null) {
        params.set("employeeId", String(employeeId));
      }

      const response = await fetch(`/api/appointments/list?${params.toString()}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Termine konnten nicht geladen werden");
      }
      return (await response.json()) as AppointmentListResponse;
    },
  });

  const items = useMemo(
    () => (appointmentsQuery.data?.items ?? []).slice(0, 4).map(mapAppointmentItem),
    [appointmentsQuery.data?.items],
  );
  const totalLoadedAppointments = appointmentsQuery.data?.items?.length ?? 0;
  const footerHint = totalLoadedAppointments > 4 ? "... weitere im Formular" : undefined;

  return (
    <HoverPreview
      preview={(
        <div className="w-[320px]">
          <AllAppointmentsPanel
            title="Termine"
            icon={<Calendar className="w-4 h-4" />}
            items={items}
            totalCount={totalLoadedAppointments}
            isLoading={appointmentsQuery.isLoading}
            todayBerlin={todayBerlin}
            footerHint={footerHint}
            compact
            readOnly
          />
        </div>
      )}
      closeDelay={120}
      side="right"
      align="start"
      maxWidth={360}
      maxHeight={420}
      className="z-[9999] w-[360px]"
    >
      <FooterChildCollectionBadge
        icon={<Calendar className="h-3 w-3" />}
        label="Termine"
        count={normalizedCount}
        testId={triggerTestId}
        onHoverStart={() => setShouldLoadPreview(true)}
        inactive={normalizedCount <= 0}
      />
    </HoverPreview>
  );
}
