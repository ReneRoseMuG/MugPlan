import { useId, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { format, isValid, parseISO } from "date-fns";
import { SidebarChildPanel } from "@/components/ui/sidebar-child-panel";
import { TerminInfoBadge } from "@/components/ui/termin-info-badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { getBerlinTodayDateString } from "@/lib/project-appointments";

type AppointmentItemMode = "kunde" | "projekt" | "mitarbeiter";

interface AppointmentsPanelAction {
  onClick: () => void;
  disabled?: boolean;
  ariaLabel?: string;
  testId?: string;
}

export interface AppointmentPanelItem {
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
  action?: "add" | "remove" | "none";
  onAdd?: () => void;
  onRemove?: () => void;
  actionDisabled?: boolean;
  testId?: string;
}

interface AppointmentsPanelProps {
  title: string;
  icon: ReactNode;
  items: AppointmentPanelItem[];
  isLoading?: boolean;
  helpKey?: string;
  headerActions?: ReactNode;
  addAction?: AppointmentsPanelAction;
  closeAction?: AppointmentsPanelAction;
  topContent?: ReactNode;
  note?: ReactNode;
  emptyStateLabel?: string;
  emptyStateFilteredLabel?: string;
}

const normalizeDateString = (value: string) => {
  const parsed = parseISO(value);
  return isValid(parsed) ? format(parsed, "yyyy-MM-dd") : value;
};

export function AppointmentsPanel({
  title,
  icon,
  items,
  isLoading = false,
  helpKey,
  headerActions,
  addAction,
  closeAction,
  topContent,
  note,
  emptyStateLabel,
  emptyStateFilteredLabel,
}: AppointmentsPanelProps) {
  const toggleId = useId();
  const [showAll, setShowAll] = useState(false);
  const today = getBerlinTodayDateString();

  const visibleItems = useMemo(() => {
    if (showAll) return items;
    return items.filter((item) => normalizeDateString(item.startDate) >= today);
  }, [items, showAll, today]);

  const emptyLabel = showAll
    ? emptyStateLabel ?? "Keine Termine vorhanden"
    : emptyStateFilteredLabel ?? "Keine Termine ab heute";

  return (
    <SidebarChildPanel
      title={title}
      icon={icon}
      count={isLoading ? null : visibleItems.length}
      helpKey={helpKey}
      headerActions={headerActions}
      addAction={addAction}
      closeAction={closeAction}
      footer={(
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor={toggleId} className="text-sm text-muted-foreground">
            Alle Termine
          </Label>
          <Switch id={toggleId} checked={showAll} onCheckedChange={setShowAll} />
        </div>
      )}
    >
      {topContent}
      <div className="space-y-2">
        {isLoading ? (
          <p className="text-sm text-slate-400 text-center py-2">Termine werden geladen...</p>
        ) : visibleItems.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-2">{emptyLabel}</p>
        ) : (
          visibleItems.map((appointment) => (
            <TerminInfoBadge
              key={appointment.id}
              startDate={appointment.startDate}
              endDate={appointment.endDate}
              startTimeHour={appointment.startTimeHour}
              mode={appointment.mode}
              customerLabel={appointment.customerLabel}
              projectLabel={appointment.projectLabel}
              employeeLabel={appointment.employeeLabel}
              icon={appointment.icon}
              color={appointment.color}
              action={appointment.action}
              onAdd={appointment.onAdd}
              onRemove={appointment.onRemove}
              actionDisabled={appointment.actionDisabled}
              testId={appointment.testId}
              fullWidth
            />
          ))
        )}
      </div>
      {note && (
        <p className="text-xs text-slate-400 text-center">
          {note}
        </p>
      )}
    </SidebarChildPanel>
  );
}
