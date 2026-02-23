import { useEffect, useMemo, useState } from "react";
import { Route } from "lucide-react";
import { EntityFormLayout } from "@/components/ui/entity-form-layout";
import { ColorSelectButton } from "@/components/ui/color-select-button";
import { MembersSectionHeader } from "@/components/ui/members-section-header";
import { PlusActionButton } from "@/components/ui/plus-action-button";
import { EmployeeInfoBadge } from "@/components/ui/employee-info-badge";
import { AppointmentsListPage } from "@/components/AppointmentsListPage";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EmployeePickerDialogList } from "@/components/EmployeePickerDialogList";
import type { Tour, Employee } from "@shared/schema";

type TourWithMembers = Tour & {
  members: Employee[];
};

interface TourEditFormProps {
  tour: TourWithMembers | null;
  allEmployees: Employee[];
  onSubmit: (tourId: number | null, employeeIds: number[], color: string) => Promise<void>;
  onDelete?: () => Promise<void>;
  canDelete?: boolean;
  isDeleting?: boolean;
  isSaving: boolean;
  isCreate?: boolean;
  defaultName?: string;
  defaultColor?: string;
  onCancel: () => void;
}

export function TourEditForm({
  tour,
  allEmployees,
  onSubmit,
  onDelete,
  canDelete = false,
  isDeleting = false,
  isSaving,
  isCreate = false,
  defaultName = "Neue Tour",
  defaultColor = "#60a5fa",
  onCancel,
}: TourEditFormProps) {
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [selectedColor, setSelectedColor] = useState<string>(defaultColor);
  const [employeePickerOpen, setEmployeePickerOpen] = useState(false);

  useEffect(() => {
    setSelectedMembers(tour?.members.map((member) => member.id) ?? []);
    setSelectedColor(tour?.color ?? defaultColor);
  }, [defaultColor, tour]);

  const assignedElsewhere = (employee: Employee) => {
    if (tour?.id == null) return employee.tourId !== null;
    return employee.tourId !== null && employee.tourId !== tour.id;
  };

  const availableEmployees = useMemo(
    () =>
      allEmployees.filter((employee) => {
        if (!employee.isActive) return false;
        if (assignedElsewhere(employee)) return false;
        return !selectedMembers.includes(employee.id);
      }),
    [allEmployees, selectedMembers, tour?.id],
  );

  const assignedEmployees = useMemo(
    () =>
      selectedMembers
        .map((memberId) => allEmployees.find((employee) => employee.id === memberId))
        .filter((employee): employee is Employee => Boolean(employee)),
    [allEmployees, selectedMembers],
  );

  const title = isCreate ? defaultName : (tour?.name ?? "Tour bearbeiten");
  const leftEmptyState = (
    <p className="py-4 text-sm text-slate-400">
      Nach dem Speichern der Tour werden Termine angezeigt.
    </p>
  );

  return (
    <EntityFormLayout
      title={title}
      icon={<Route className="w-6 h-6" />}
      onClose={onCancel}
      onCancel={onCancel}
      onSubmit={() => onSubmit(tour?.id ?? null, selectedMembers, selectedColor)}
      isSaving={isSaving}
      saveLabel="Speichern"
      testIdPrefix="tour"
      footerActions={
        !isCreate && canDelete && tour && onDelete ? (
          <Button
            variant="destructive"
            onClick={() => {
              void onDelete().catch(() => {
                // errors are handled via mutation toasts in parent
              });
            }}
            disabled={isSaving || isDeleting}
            data-testid="button-delete-tour-form"
          >
            {isDeleting ? "Loeschen..." : "Tour loeschen"}
          </Button>
        ) : undefined
      }
    >
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <AppointmentsListPage
            title="Termine"
            showCloseButton={false}
            hideTourFilter
            lockedTourId={tour?.id ?? null}
            hideTourColumn
            enforceFromToday
            emptyStateOverride={leftEmptyState}
          />
        </div>

        <div className="space-y-4">
          <div className="sub-panel space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
              <Route className="w-4 h-4" />
              Farbe
            </h3>
            <ColorSelectButton
              color={selectedColor}
              onChange={setSelectedColor}
              testId="button-tour-color-picker"
              disabled={isSaving}
            />
          </div>

          <div
            className="border-l-4 border border-border bg-slate-50 overflow-hidden"
            style={{ borderLeftColor: selectedColor }}
          >
            <MembersSectionHeader
              className="px-3 py-1.5 border-b border-border bg-slate-50"
              action={(
                <PlusActionButton
                  onClick={() => setEmployeePickerOpen(true)}
                  aria-label="Mitarbeiter hinzufügen"
                  data-testid="button-add-tour-member"
                  disabled={isSaving}
                />
              )}
            />
            <div className="space-y-2 p-3 bg-slate-50">
              {assignedEmployees.map((employee) => (
                <EmployeeInfoBadge
                  key={employee.id}
                  id={employee.id}
                  firstName={employee.firstName}
                  lastName={employee.lastName}
                  action="remove"
                  onRemove={() => setSelectedMembers((prev) => prev.filter((id) => id !== employee.id))}
                  size="sm"
                  fullWidth
                  testId={`badge-tour-member-${employee.id}`}
                />
              ))}
              {assignedEmployees.length === 0 && (
                <div className="text-sm text-slate-400 italic">
                  Keine Mitarbeiter zugewiesen
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={employeePickerOpen} onOpenChange={setEmployeePickerOpen}>
        <DialogContent className="w-[100dvw] h-[100dvh] max-w-none p-0 overflow-hidden rounded-none sm:w-[95vw] sm:h-[85vh] sm:max-w-5xl sm:rounded-lg">
          <EmployeePickerDialogList
            employees={availableEmployees}
            teams={[]}
            tours={[]}
            title="Mitarbeiter auswählen"
            onSelectEmployee={(employeeId) => {
              setSelectedMembers((prev) => (prev.includes(employeeId) ? prev : [...prev, employeeId]));
              setEmployeePickerOpen(false);
            }}
            onClose={() => setEmployeePickerOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </EntityFormLayout>
  );
}
