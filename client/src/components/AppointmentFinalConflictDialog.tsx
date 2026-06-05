import { TriangleAlert } from "lucide-react";

import {
  DialogBaseFooter,
  DialogBaseShell,
} from "@/components/ui/dialog-base";
import { EmployeeInfoBadge } from "@/components/ui/employee-info-badge";

export type AppointmentConflictEmployee = {
  id: number | string;
  fullName: string;
};

export type AppointmentConflictEmployeePayload = {
  id?: unknown;
  fullName?: unknown;
};

interface AppointmentFinalConflictDialogProps {
  open: boolean;
  title: string;
  description?: string;
  conflictEmployees: AppointmentConflictEmployee[];
  onClose: () => void;
  closeLabel?: string;
  testId?: string;
}

export function normalizeAppointmentConflictEmployees(
  employees: AppointmentConflictEmployeePayload[] | null | undefined,
): AppointmentConflictEmployee[] {
  if (!Array.isArray(employees)) return [];
  return employees
    .map((employee, index) => {
      const fullName = typeof employee.fullName === "string" ? employee.fullName.trim() : "";
      if (!fullName) return null;
      const id = typeof employee.id === "number" && Number.isFinite(employee.id)
        ? employee.id
        : typeof employee.id === "string" && employee.id.trim()
          ? employee.id.trim()
          : `conflict-${index}`;
      return { id, fullName };
    })
    .filter((employee): employee is AppointmentConflictEmployee => employee !== null);
}

export function AppointmentFinalConflictDialog({
  open,
  title,
  description,
  conflictEmployees,
  onClose,
  closeLabel = "Schließen",
  testId = "dialog-appointment-final-conflict",
}: AppointmentFinalConflictDialogProps) {
  return (
    <DialogBaseShell
      closeDisabled={false}
      footer={(
        <DialogBaseFooter
          primaryAction={{
            label: closeLabel,
            onClick: onClose,
            testId: "button-appointment-final-conflict-close",
          }}
        />
      )}
      icon={<TriangleAlert />}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
      open={open}
      size="md"
      testId={testId}
      title={title}
    >
      <section
        className="rounded-md border border-red-200 bg-red-50 p-4"
        data-testid="appointment-final-conflict-alert"
      >
        <div className="flex items-start gap-3">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />
          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <p className="text-sm font-semibold text-red-800">
                Mitarbeiter können nicht übernommen werden
              </p>
              <p className="mt-1 text-sm text-red-700">
                {description
                  ?? "Ein oder mehrere Mitarbeiter sind im Zielzeitraum bereits anderweitig verplant. Die Aktion wird nicht ausgeführt; der Termin bleibt unverändert."}
              </p>
            </div>
            {conflictEmployees.length > 0 ? (
              <div className="flex flex-col gap-2" data-testid="appointment-final-conflict-employees">
                {conflictEmployees.map((employee) => (
                  <EmployeeInfoBadge
                    key={employee.id}
                    id={employee.id}
                    fullName={employee.fullName}
                    size="sm"
                    fullWidth
                    renderMode="detail"
                    showPreview={false}
                    testId={`badge-appointment-final-conflict-${employee.id}`}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-red-700" data-testid="appointment-final-conflict-no-employees">
                Die betroffenen Mitarbeiter konnten nicht eindeutig aufgelöst werden.
              </p>
            )}
          </div>
        </div>
      </section>
    </DialogBaseShell>
  );
}
