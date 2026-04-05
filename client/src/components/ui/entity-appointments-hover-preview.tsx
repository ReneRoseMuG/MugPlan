import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar } from "lucide-react";
import { AllAppointmentsPanel, type AllAppointmentsPanelItem } from "@/components/AllAppointmentsPanel";
import { FooterChildCollectionBadge } from "@/components/ui/footer-child-collection-badge";
import { HoverPreview } from "@/components/ui/hover-preview";
import type { CalendarAppointment } from "@/lib/calendar-appointments";
import { sortAppointmentsByDateDesc } from "@/lib/entity-appointments";
import { getBerlinTodayDateString } from "@/lib/project-appointments";

type AppointmentSourceType = "customer" | "project" | "employee";
type AppointmentSummary = CalendarAppointment & { startTimeHour: number | null };

interface EntityAppointmentsHoverPreviewProps {
  source: {
    type: AppointmentSourceType;
    id: number;
    count: number;
  };
  triggerLabel?: string;
  triggerTestId?: string;
  fullWidth?: boolean;
  previewWidthClassName?: string;
}

function resolveEndpoint(type: AppointmentSourceType, id: number): string {
  if (type === "customer") {
    return `/api/customers/${id}/appointments?scope=all`;
  }
  if (type === "employee") {
    return `/api/employees/${id}/appointments?scope=all`;
  }
  return `/api/projects/${id}/appointments?fromDate=1900-01-01`;
}

function mapAppointmentItem(
  type: AppointmentSourceType,
  appointment: AppointmentSummary,
): AllAppointmentsPanelItem {
  return {
    id: appointment.id,
    startDate: appointment.startDate,
    endDate: appointment.endDate,
    startTimeHour: appointment.startTimeHour,
    mode: type === "employee" ? "projekt" : type === "project" ? "kunde" : "projekt",
    customerLabel: appointment.customer.fullName ?? null,
    projectLabel: appointment.projectName ?? null,
    previewAppointment: appointment,
    testId: `${type}-appointment-preview-${appointment.id}`,
  };
}

export function EntityAppointmentsHoverPreview({
  source,
  triggerLabel = "Termine",
  triggerTestId,
  fullWidth = false,
  previewWidthClassName = "w-[320px]",
}: EntityAppointmentsHoverPreviewProps) {
  const [shouldLoadPreview, setShouldLoadPreview] = useState(false);
  const normalizedCount = Number.isFinite(source.count) ? Math.max(0, source.count) : 0;
  const todayBerlin = getBerlinTodayDateString();

  const appointmentsQuery = useQuery<AppointmentSummary[]>({
    queryKey: ["/api/entity-appointments-preview", source.type, source.id],
    enabled: shouldLoadPreview && normalizedCount > 0,
    queryFn: async () => {
      const response = await fetch(resolveEndpoint(source.type, source.id), { credentials: "include" });
      if (!response.ok) {
        throw new Error("Termine konnten nicht geladen werden");
      }
      const payload = (await response.json()) as unknown;
      return Array.isArray(payload) ? (payload as AppointmentSummary[]) : [];
    },
  });

  const items = useMemo(
    () =>
      [...(appointmentsQuery.data ?? [])]
        .sort(sortAppointmentsByDateDesc)
        .slice(0, 4)
        .map((row) => mapAppointmentItem(source.type, row)),
    [appointmentsQuery.data, source.type],
  );
  const totalLoadedAppointments = appointmentsQuery.data?.length ?? 0;
  const footerHint = totalLoadedAppointments > 4
    ? "... weitere im Formular"
    : undefined;

  return (
    <HoverPreview
      preview={(
        <div className={previewWidthClassName}>
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
        label={triggerLabel}
        count={normalizedCount}
        testId={triggerTestId}
        onHoverStart={() => setShouldLoadPreview(true)}
        fullWidth={fullWidth}
        inactive={normalizedCount <= 0}
      />
    </HoverPreview>
  );
}
