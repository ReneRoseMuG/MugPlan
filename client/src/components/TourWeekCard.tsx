import React, { type ReactNode } from "react";
import { Route } from "lucide-react";
import { ColoredEntityCard } from "@/components/ui/colored-entity-card";
import { EmployeeInfoBadge } from "@/components/ui/employee-info-badge";
import { formatListDateRange } from "@/lib/list-display-format";
import { TourWeekAppointmentsHoverPreview } from "@/components/TourWeekAppointmentsHoverPreview";
import { TourWeekNotesHoverPreview } from "@/components/TourWeekNotesHoverPreview";

export type TourWeekCardMember = {
  assignmentId: number;
  employeeId: number;
  fullName: string;
};

export type TourWeekCardData = {
  assignmentId?: number;
  tourId: number;
  tourName: string;
  tourColor: string | null;
  isoYear: number;
  isoWeek: number;
  weekStartDate: string;
  weekEndDate: string;
  isLocked: boolean;
  isBlocked: boolean;
  appointmentsCount: number;
  notesCount: number;
  employees: TourWeekCardMember[];
};

interface TourWeekCardProps {
  week: TourWeekCardData;
  scope: "tour" | "employee";
  employeeId?: number | null;
  borderColor?: string | null;
  actions?: ReactNode;
  testId: string;
  memberTestIdPrefix: string;
  blockedTextTestId?: string;
  blockedBadgeTestId?: string;
  onOpen?: () => void;
  onRemoveEmployee?: (member: TourWeekCardMember) => void;
  footer?: ReactNode;
  footerVisibility?: "hidden" | "visible";
  children?: ReactNode;
  legacyLabel?: string;
}

export function TourWeekCard({
  week,
  scope,
  employeeId = null,
  borderColor,
  actions,
  testId,
  memberTestIdPrefix,
  blockedTextTestId,
  blockedBadgeTestId,
  onOpen,
  onRemoveEmployee,
  footer: _legacyFooter,
  footerVisibility: _legacyFooterVisibility,
  children: _legacyChildren,
  legacyLabel: _legacyLabel,
}: TourWeekCardProps) {
  const isTourScope = scope === "tour";
  const resolvedBorderColor = borderColor ?? week.tourColor;

  return (
    <ColoredEntityCard
      title={`KW ${String(week.isoWeek).padStart(2, "0")} / ${week.isoYear}`}
      icon={<Route className="w-4 h-4" />}
      borderColor={resolvedBorderColor}
      testId={testId}
      actions={actions}
      onDoubleClick={onOpen}
      footerVisibility="visible"
      footer={(
        <div className="flex w-full items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <TourWeekAppointmentsHoverPreview
              tourId={week.tourId}
              employeeId={isTourScope ? null : employeeId}
              weekStartDate={week.weekStartDate}
              weekEndDate={week.weekEndDate}
              count={week.appointmentsCount}
              triggerTestId={`${testId}-appointments`}
            />
            <TourWeekNotesHoverPreview
              tourId={week.tourId}
              isoYear={week.isoYear}
              isoWeek={week.isoWeek}
              count={week.notesCount}
              triggerTestId={`${testId}-notes`}
            />
          </div>
          {week.isBlocked ? (
            <span
              className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700"
              data-testid={blockedBadgeTestId}
            >
              Blockiert
            </span>
          ) : null}
        </div>
      )}
    >
      <div className="space-y-3">
        <div className="text-sm font-medium text-slate-700">
          {formatListDateRange(week.weekStartDate, week.weekEndDate)}
        </div>

        {scope === "employee" ? (
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {week.tourName}
          </div>
        ) : null}

        {week.isBlocked ? (
          <div
            className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
            data-testid={blockedTextTestId}
          >
            Die Wochenplanung ist blockiert. Termine dieser Woche wurden auf Parkplatz verschoben, als geparkt markiert und können dort weiter bearbeitet werden.
          </div>
        ) : null}

        <div className="space-y-2">
          {week.employees.map((employee) => (
            <EmployeeInfoBadge
              key={employee.assignmentId}
              id={employee.employeeId}
              fullName={employee.fullName}
              tourName={scope === "employee" ? week.tourName : undefined}
              action={isTourScope && !week.isLocked && !week.isBlocked && onRemoveEmployee ? "remove" : "none"}
              onRemove={() => onRemoveEmployee?.(employee)}
              size="sm"
              fullWidth
              showPreview={scope !== "employee"}
              testId={`${memberTestIdPrefix}-${employee.assignmentId}`}
            />
          ))}
          {week.employees.length === 0 ? (
            <div className="text-sm italic text-slate-400">Keine Mitarbeiter geplant</div>
          ) : null}
        </div>
      </div>
    </ColoredEntityCard>
  );
}
