import type { ReactNode } from "react";
import { SidebarChildPanel } from "@/components/ui/sidebar-child-panel";
import { TerminInfoBadge } from "@/components/ui/termin-info-badge";
import type { CalendarAppointment } from "@/lib/calendar-appointments";

type AppointmentItemMode = "kunde" | "projekt" | "mitarbeiter";

interface AllAppointmentsPanelAction {
  onClick: () => void;
  disabled?: boolean;
  ariaLabel?: string;
  testId?: string;
}

export interface AllAppointmentsPanelItem {
  id: number | string;
  startDate: string;
  endDate?: string | null;
  startTimeHour?: number | null;
  mode?: AppointmentItemMode;
  customerLabel?: string | null;
  projectLabel?: string | null;
  employeeLabel?: string | null;
  icon?: ReactNode;
  color?: string | null;
  previewAppointment: CalendarAppointment;
  testId?: string;
}

interface AllAppointmentsPanelProps {
  title: string;
  icon: ReactNode;
  items: AllAppointmentsPanelItem[];
  totalCount?: number;
  todayBerlin: string;
  compact?: boolean;
  isLoading?: boolean;
  helpKey?: string;
  addAction?: AllAppointmentsPanelAction;
  emptyStateLabel?: string;
  footerHint?: ReactNode;
  className?: string;
  readOnly?: boolean;
}

export function AllAppointmentsPanel({
  title,
  icon,
  items,
  totalCount,
  todayBerlin,
  compact = false,
  isLoading = false,
  helpKey,
  addAction,
  emptyStateLabel,
  footerHint,
  className,
  readOnly = false,
}: AllAppointmentsPanelProps) {
  const currentAndUpcomingItems = items.filter((appointment) => appointment.startDate >= todayBerlin);
  const historicalItems = items.filter((appointment) => appointment.startDate < todayBerlin);
  const hasHistoricalItems = historicalItems.length > 0;
  const emptyLabel = emptyStateLabel ?? "Keine Termine vorhanden";

  return (
    <SidebarChildPanel
      title={`${title} (${totalCount ?? items.length})`}
      icon={icon}
      helpKey={helpKey}
      addAction={addAction}
      className={className}
    >
      <div className="space-y-2">
        {isLoading ? (
          <p className="text-sm text-slate-400 text-center py-2">Termine werden geladen...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-2">{emptyLabel}</p>
        ) : (
          <>
            <div className="space-y-2">
              {currentAndUpcomingItems.map((appointment) => (
                <TerminInfoBadge
                  key={appointment.id}
                  id={appointment.id}
                  startDate={appointment.startDate}
                  endDate={appointment.endDate}
                  startTimeHour={appointment.startTimeHour}
                  mode={appointment.mode}
                  customerLabel={appointment.customerLabel}
                  projectLabel={appointment.projectLabel}
                  employeeLabel={appointment.employeeLabel}
                  icon={appointment.icon}
                  color={appointment.color}
                  previewAppointment={appointment.previewAppointment}
                  testId={appointment.testId}
                  fullWidth
                  compact={compact}
                  readOnly={readOnly}
                />
              ))}
            </div>

            {footerHint ? (
              <p className="px-1 text-[11px] text-slate-500">{footerHint}</p>
            ) : null}

            {hasHistoricalItems ? (
              <>
                <div className="border-t border-border/60 pt-2">
                  <p className="text-xs font-medium tracking-wide text-slate-500">Vergangene Termine</p>
                </div>
                <div className="space-y-2 rounded-md bg-slate-50/60 dark:bg-slate-900/20 p-2">
                  {historicalItems.map((appointment) => (
                    <TerminInfoBadge
                      key={appointment.id}
                      id={appointment.id}
                      startDate={appointment.startDate}
                      endDate={appointment.endDate}
                      startTimeHour={appointment.startTimeHour}
                      mode={appointment.mode}
                      customerLabel={appointment.customerLabel}
                      projectLabel={appointment.projectLabel}
                      employeeLabel={appointment.employeeLabel}
                      icon={appointment.icon}
                      color={appointment.color}
                      previewAppointment={appointment.previewAppointment}
                      testId={appointment.testId}
                      fullWidth
                      compact={compact}
                      readOnly={readOnly}
                    />
                  ))}
                </div>
              </>
            ) : null}
          </>
        )}
      </div>
    </SidebarChildPanel>
  );
}
