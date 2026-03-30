import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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

interface TourEditFormProps {
  tour: Tour | null;
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
  const [selectedName, setSelectedName] = useState<string>(() => tour?.name ?? defaultName);
  const [selectedColor, setSelectedColor] = useState<string>(() => tour?.color ?? defaultColor);
  const [employeePickerOpen, setEmployeePickerOpen] = useState(false);

  useEffect(() => {
    setSelectedName(tour?.name ?? defaultName);
  }, [defaultName, tour?.id, tour?.name]);

  useEffect(() => {
    setSelectedColor(tour?.color ?? defaultColor);
  }, [defaultColor, tour?.color, tour?.id]);

  const { data: activeMembers = [], isLoading: activeMembersLoading } = useQuery<Employee[]>({
    queryKey: [`/api/tours/${tour?.id}/employees/active`],
    enabled: !isCreate && tour?.id != null,
    queryFn: async () => {
      const response = await fetch(`/api/tours/${tour?.id}/employees/active`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Mitarbeiterliste konnte nicht geladen werden");
      }
      return response.json() as Promise<Employee[]>;
    },
  });

  const assignedEmployees = useMemo(
    () => isCreate ? [] : activeMembers,
    [activeMembers, isCreate],
  );

  const availableEmployees = useMemo(
    () =>
      allEmployees.filter((employee) => {
        if (!employee.isActive) return false;
        return !assignedEmployees.some((member) => member.id === employee.id);
      }),
    [allEmployees, assignedEmployees],
  );

  const title = isCreate ? defaultName : (tour?.name ?? "Tour bearbeiten");
  const handleSubmit = async () => onSubmit(tour?.id ?? null, [], selectedName, selectedColor);

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

            {!isCreate ? (
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
                  {activeMembersLoading ? (
                    <div className="text-sm italic text-slate-400">
                      Mitarbeiterliste wird geladen
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
                        void onRemoveMember?.(employee);
                      }}
                      size="sm"
                      fullWidth
                      testId={`badge-tour-member-${employee.id}`}
                    />
                  ))}
                  {!activeMembersLoading && assignedEmployees.length === 0 ? (
                    <div className="text-sm italic text-slate-400">
                      Keine Mitarbeiter zugewiesen
                    </div>
                  ) : null}
                  <p className="mt-2 text-xs italic text-slate-400">
                    Diese Liste zeigt alle Mitarbeiter, die auf mindestens einem aktuellen oder zukuenftigen Termin dieser Tour eingeplant sind.
                    Ein Eintrag bedeutet nicht, dass der Mitarbeiter auf allen Tour-Terminen gebucht ist.
                  </p>
                </div>
              </div>
            ) : null}
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
              void onAddMember?.(employeeId);
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
