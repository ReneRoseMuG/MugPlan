import { useId } from "react";
import type { ReactNode } from "react";
import { SidebarChildPanel } from "@/components/ui/sidebar-child-panel";
import { TerminInfoBadge } from "@/components/ui/termin-info-badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

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
  customerName?: string | null;
  projectName?: string | null;
  employeeName?: string | null;
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
  showAll: boolean;
  onShowAllChange: (showAll: boolean) => void;
  isLoading?: boolean;
  helpKey?: string;
  headerActions?: ReactNode;
  addAction?: AppointmentsPanelAction;
  closeAction?: AppointmentsPanelAction;
  onOpenAppointment?: (appointmentId: number | string) => void;
  note?: ReactNode;
  emptyStateLabel?: string;
  emptyStateFilteredLabel?: string;
}

export function AppointmentsPanel({
  title,
  icon,
  items,
  showAll,
  onShowAllChange,
  isLoading = false,
  helpKey,
  headerActions,
  addAction,
  closeAction,
  onOpenAppointment,
  note,
  emptyStateLabel,
  emptyStateFilteredLabel,
}: AppointmentsPanelProps) {
  const toggleId = useId();

  const emptyLabel = showAll ? emptyStateLabel ?? "Keine Termine vorhanden" : emptyStateFilteredLabel ?? "Keine Termine ab heute";
  const titleWithCount = `${title} (${items.length})`;

  return (
    <SidebarChildPanel
      title={titleWithCount}
      icon={icon}
      helpKey={helpKey}
      headerActions={headerActions}
      addAction={addAction}
      closeAction={closeAction}
      footer={(
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor={toggleId} className="text-sm text-muted-foreground">
            Alle Termine
          </Label>
          <Switch id={toggleId} checked={showAll} onCheckedChange={onShowAllChange} />
        </div>
      )}
    >
      <div className="space-y-2">
        {isLoading ? (
          <p className="text-sm text-slate-400 text-center py-2">Termine werden geladen...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-2">{emptyLabel}</p>
        ) : (
          items.map((appointment) => (
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
              customerName={appointment.customerName}
              projectName={appointment.projectName}
              employeeName={appointment.employeeName}
              icon={appointment.icon}
              color={appointment.color}
              action={appointment.action}
              onAdd={appointment.onAdd}
              onRemove={appointment.onRemove}
              actionDisabled={appointment.actionDisabled}
              testId={appointment.testId}
              onDoubleClick={onOpenAppointment ? () => onOpenAppointment(appointment.id) : undefined}
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
