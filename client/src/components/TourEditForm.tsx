import { useEffect, useMemo, useState } from "react";
import { Route } from "lucide-react";
import { EntityFormLayout } from "@/components/ui/entity-form-layout";
import { ColorSelectButton } from "@/components/ui/color-select-button";
import { MembersSectionHeader } from "@/components/ui/members-section-header";
import { PlusActionButton } from "@/components/ui/plus-action-button";
import { EmployeeInfoBadge } from "@/components/ui/employee-info-badge";
import { AppointmentsListPage, type AppointmentsListContext } from "@/components/AppointmentsListPage";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmployeePickerDialogList } from "@/components/EmployeePickerDialogList";
import type { Tour, Employee } from "@shared/schema";

type TourWithMembers = Tour & {
  members: Employee[];
};

interface TourEditFormProps {
  tour: TourWithMembers | null;
  allEmployees: Employee[];
  onSubmit: (tourId: number | null, employeeIds: number[], color: string) => Promise<void>;
  onAddMember?: (employeeId: number) => Promise<void>;
  onRemoveMember?: (employee: Employee) => Promise<void>;
  onDelete?: () => Promise<void>;
  canDelete?: boolean;
  isDeleting?: boolean;
  isSaving: boolean;
  isMutatingMembers?: boolean;
  isCreate?: boolean;
  defaultName?: string;
  defaultColor?: string;
  onCancel: () => void;
  onOpenAppointment?: (appointmentId: number, context: AppointmentsListContext) => void;
}

export function TourEditForm({
  tour,
  allEmployees,
  onSubmit,
  onAddMember,
  onRemoveMember,
  onDelete,
  canDelete = false,
  isDeleting = false,
  isSaving,
  isMutatingMembers = false,
  isCreate = false,
  defaultName = "Neue Tour",
  defaultColor = "#60a5fa",
  onCancel,
  onOpenAppointment,
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
        if (isCreate) {
          return !selectedMembers.includes(employee.id);
        }
        return !(tour?.members ?? []).some((member) => member.id === employee.id);
      }),
    [allEmployees, isCreate, selectedMembers, tour?.id, tour?.members],
  );

  const assignedEmployees = useMemo(
    () => isCreate
      ? selectedMembers
        .map((memberId) => allEmployees.find((employee) => employee.id === memberId))
        .filter((employee): employee is Employee => Boolean(employee))
      : (tour?.members ?? []),
    [allEmployees, isCreate, selectedMembers, tour?.members],
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
      contentScrollMode="contained"
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
      <Tabs defaultValue="stammdaten" className="flex h-full min-h-0 flex-col space-y-4">
        <TabsList>
          <TabsTrigger value="stammdaten" data-testid="tab-tour-stammdaten">Stammdaten</TabsTrigger>
          <TabsTrigger value="termine" data-testid="tab-tour-termine">Termine</TabsTrigger>
        </TabsList>

        <TabsContent value="stammdaten">
          <div className="max-w-xl space-y-4">
            <div className="sub-panel space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-bold tracking-wider text-primary">
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
              className="overflow-hidden border border-border bg-slate-50 border-l-4"
              style={{ borderLeftColor: selectedColor }}
            >
              <MembersSectionHeader
                className="border-b border-border bg-slate-50 px-3 py-1.5"
                action={(
                  <PlusActionButton
                    onClick={() => setEmployeePickerOpen(true)}
                    aria-label="Mitarbeiter hinzufuegen"
                    data-testid="button-add-tour-member"
                    disabled={isSaving || isMutatingMembers}
                  />
                )}
              />
              <div className="space-y-2 bg-slate-50 p-3">
                {!isCreate ? (
                  <div className="text-sm text-slate-500">
                    Bestehende Touren aendern Mitarbeiter nur ueber explizites Hinzufuegen oder Abziehen mit Vorschau.
                  </div>
                ) : null}
                {assignedEmployees.map((employee) => (
                  <EmployeeInfoBadge
                    key={employee.id}
                    id={employee.id}
                    firstName={employee.firstName}
                    lastName={employee.lastName}
                    action="remove"
                    onRemove={() => {
                      if (isCreate) {
                        setSelectedMembers((prev) => prev.filter((id) => id !== employee.id));
                        return;
                      }
                      void onRemoveMember?.(employee);
                    }}
                    size="sm"
                    fullWidth
                    testId={`badge-tour-member-${employee.id}`}
                  />
                ))}
                {assignedEmployees.length === 0 ? (
                  <div className="text-sm italic text-slate-400">
                    Keine Mitarbeiter zugewiesen
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="termine" className="flex min-h-0 flex-1 flex-col">
          <AppointmentsListPage
            title="Termine"
            helpKey="appointments.list.tourForm"
            context={{ type: "tour", tourId: tour?.id ?? null }}
            emptyStateOverride={leftEmptyState}
            onOpenAppointment={onOpenAppointment}
            className="min-h-0 flex-1"
          />
        </TabsContent>
      </Tabs>

      <Dialog open={employeePickerOpen} onOpenChange={setEmployeePickerOpen}>
        <DialogContent className="h-[100dvh] w-[100dvw] max-w-none overflow-hidden rounded-none p-0 sm:h-[85vh] sm:w-[95vw] sm:max-w-5xl sm:rounded-lg">
          <EmployeePickerDialogList
            employees={availableEmployees}
            teams={[]}
            tours={[]}
            title="Mitarbeiter auswaehlen"
            onSelectEmployee={(employeeId) => {
              if (isCreate) {
                setSelectedMembers((prev) => (prev.includes(employeeId) ? prev : [...prev, employeeId]));
              } else {
                void onAddMember?.(employeeId);
              }
              setEmployeePickerOpen(false);
            }}
            onClose={() => setEmployeePickerOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </EntityFormLayout>
  );
}
