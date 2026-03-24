import React, { useEffect, useMemo, useState } from "react";
import { Route, X } from "lucide-react";
import { EntityFormShell } from "@/components/ui/entity-form-shell";
import { ColorSelectButton } from "@/components/ui/color-select-button";
import { MembersSectionHeader } from "@/components/ui/members-section-header";
import { PlusActionButton } from "@/components/ui/plus-action-button";
import { EmployeeInfoBadge } from "@/components/ui/employee-info-badge";
import { AppointmentsListPage, type AppointmentsListContext } from "@/components/AppointmentsListPage";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmployeePickerDialogList } from "@/components/EmployeePickerDialogList";
import type { Tour, Employee } from "@shared/schema";

type TourWithMembers = Tour & {
  members: Employee[];
};

interface TourEditFormProps {
  tour: TourWithMembers | null;
  allEmployees: Employee[];
  onSubmit: (tourId: number | null, employeeIds: number[], name: string, color: string) => Promise<void>;
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
  const [selectedMembers, setSelectedMembers] = useState<number[]>(() => tour?.members.map((member) => member.id) ?? []);
  const [selectedName, setSelectedName] = useState<string>(() => tour?.name ?? defaultName);
  const [selectedColor, setSelectedColor] = useState<string>(() => tour?.color ?? defaultColor);
  const [employeePickerOpen, setEmployeePickerOpen] = useState(false);
  const memberIdsKey = (tour?.members ?? []).map((member) => member.id).join(",");

  useEffect(() => {
    setSelectedMembers(tour?.members.map((member) => member.id) ?? []);
  }, [memberIdsKey, tour?.id]);

  useEffect(() => {
    setSelectedName(tour?.name ?? defaultName);
  }, [defaultName, tour?.id, tour?.name]);

  useEffect(() => {
    setSelectedColor(tour?.color ?? defaultColor);
  }, [defaultColor, tour?.color, tour?.id]);

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
  const handleSubmit = async () => onSubmit(tour?.id ?? null, selectedMembers, selectedName, selectedColor);

  return (
    <div className="flex h-full min-h-0 w-full flex-1">
      <EntityFormShell
        header={(
          <div className="flex items-center justify-between gap-4 px-6 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <h2 className="text-2xl font-bold text-primary flex min-w-0 items-center gap-3">
                <Route className="w-6 h-6" />
                {title}
              </h2>
            </div>

            <Button
              type="button"
              size="lg"
              variant="ghost"
              onClick={onCancel}
              data-testid="button-close-tour"
            >
              <X className="w-6 h-6" />
            </Button>
          </div>
        )}
        footer={(
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
            <div className="flex flex-wrap items-center gap-3">
              {!isCreate && canDelete && tour && onDelete ? (
                <Button
                  type="button"
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
              ) : null}
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                data-testid="button-cancel-tour"
              >
                Abbrechen
              </Button>
            </div>

            <Button
              type="button"
              onClick={() => {
                void handleSubmit();
              }}
              disabled={isSaving || !selectedName.trim()}
              data-testid="button-save-tour"
            >
              {isSaving ? "Speichern..." : "Speichern"}
            </Button>
          </div>
        )}
      >
      <Tabs
        defaultValue="stammdaten"
        className="flex h-full min-h-0 w-full flex-col space-y-4"
        data-testid="tour-form-main-column"
      >
        <TabsList>
          <TabsTrigger value="stammdaten" data-testid="tab-tour-stammdaten">Stammdaten</TabsTrigger>
          <TabsTrigger value="termine" data-testid="tab-tour-termine">Termine</TabsTrigger>
        </TabsList>

        <TabsContent value="stammdaten" className="w-full">
          <div className="w-full space-y-4">
            <div className="sub-panel space-y-3">
              <div className="space-y-2">
                <Label htmlFor="tour-name">Name</Label>
                <Input
                  id="tour-name"
                  value={selectedName}
                  readOnly={isCreate}
                  disabled={isSaving}
                  onChange={(event) => setSelectedName(event.target.value)}
                  placeholder="Tourname eingeben"
                  data-testid="input-tour-name"
                />
              </div>
              {isCreate ? (
                <p className="text-sm text-slate-500" data-testid="text-tour-generated-name-hint">
                  Der Tourname wird beim Speichern serverseitig vergeben. Die Anzeige zeigt den naechsten freien Namen.
                </p>
              ) : null}
            </div>

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
            emptyStateOverride={<></>}
            onOpenAppointment={onOpenAppointment}
            className="min-h-0 flex-1"
            splitDateRangeRow
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
      </EntityFormShell>
    </div>
  );
}
