import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { addWeeks, format, getISOWeek, getISOWeekYear, startOfISOWeek } from "date-fns";
import { Route, X } from "lucide-react";
import { EntityFormShell } from "@/components/ui/entity-form-shell";
import { ColorSelectButton } from "@/components/ui/color-select-button";
import { PlusActionButton } from "@/components/ui/plus-action-button";
import { EmployeeInfoBadge } from "@/components/ui/employee-info-badge";
import { ColoredEntityCard } from "@/components/ui/colored-entity-card";
import { AppointmentsListPage, type AppointmentsListContext } from "@/components/AppointmentsListPage";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmployeePickerDialogList } from "@/components/EmployeePickerDialogList";
import type { Tour, Employee } from "@shared/schema";

type TourWeekEmployeeMember = {
  assignmentId: number;
  employeeId: number;
  fullName: string;
};

type TourWeekEmployeesWeek = {
  isoYear: number;
  isoWeek: number;
  weekStartDate: string;
  weekEndDate: string;
  isLocked: boolean;
  employees: TourWeekEmployeeMember[];
};

interface TourEditFormProps {
  tour: Tour | null;
  allEmployees: Employee[];
  onSubmit: (tourId: number | null, employeeIds: number[], name: string, color: string) => Promise<void>;
  onAddWeekEmployee?: (params: { isoYear: number; isoWeek: number; employeeId: number }) => Promise<void>;
  onRemoveWeekEmployee?: (assignment: TourWeekEmployeeMember & { isoYear: number; isoWeek: number }) => Promise<void>;
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
  onAddWeekEmployee,
  onRemoveWeekEmployee,
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
  const minimumWeekInput = useMemo(() => {
    const nextWeek = addWeeks(startOfISOWeek(new Date()), 1);
    return `${getISOWeekYear(nextWeek)}-W${String(getISOWeek(nextWeek)).padStart(2, "0")}`;
  }, []);
  const [selectedName, setSelectedName] = useState<string>(() => tour?.name ?? defaultName);
  const [selectedColor, setSelectedColor] = useState<string>(() => tour?.color ?? defaultColor);
  const [weekPickerOpen, setWeekPickerOpen] = useState(false);
  const [employeePickerOpen, setEmployeePickerOpen] = useState(false);
  const [pendingWeekInput, setPendingWeekInput] = useState(minimumWeekInput);
  const [pendingWeekSelection, setPendingWeekSelection] = useState<{ isoYear: number; isoWeek: number } | null>(null);

  useEffect(() => {
    setSelectedName(tour?.name ?? defaultName);
  }, [defaultName, tour?.id, tour?.name]);

  useEffect(() => {
    setSelectedColor(tour?.color ?? defaultColor);
  }, [defaultColor, tour?.color, tour?.id]);

  const { data: plannedWeeks = [] } = useQuery<TourWeekEmployeesWeek[]>({
    queryKey: [`/api/tours/${tour?.id}/week-employees`],
    enabled: !isCreate && tour?.id != null,
    queryFn: async () => {
      const response = await fetch(`/api/tours/${tour?.id}/week-employees`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Wochenplanung konnte nicht geladen werden");
      }
      return response.json() as Promise<TourWeekEmployeesWeek[]>;
    },
  });

  const availableEmployees = useMemo(() => {
    if (!pendingWeekSelection) return [];
    const week = plannedWeeks.find((entry) => entry.isoYear === pendingWeekSelection.isoYear && entry.isoWeek === pendingWeekSelection.isoWeek);
    const assignedIds = new Set((week?.employees ?? []).map((employee) => employee.employeeId));
    return allEmployees.filter((employee) => employee.isActive && !assignedIds.has(employee.id));
  }, [allEmployees, pendingWeekSelection, plannedWeeks]);

  const openEmployeePickerForWeek = (isoYear: number, isoWeek: number) => {
    setPendingWeekSelection({ isoYear, isoWeek });
    setEmployeePickerOpen(true);
  };

  const confirmWeekInputSelection = () => {
    const match = /^(\d{4})-W(\d{2})$/.exec(pendingWeekInput);
    if (!match) return;
    openEmployeePickerForWeek(Number(match[1]), Number(match[2]));
    setWeekPickerOpen(false);
  };

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
          {!isCreate ? (
            <TabsTrigger value="wochenplanung" data-testid="tab-tour-wochenplanung">Wochenplanung</TabsTrigger>
          ) : null}
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

        {!isCreate ? (
          <TabsContent value="wochenplanung" className="w-full">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" data-testid="grid-tour-week-planning">
              {plannedWeeks.map((week) => (
                <ColoredEntityCard
                  key={`${week.isoYear}-${week.isoWeek}`}
                  title={`KW ${String(week.isoWeek).padStart(2, "0")} / ${week.isoYear}`}
                  icon={<Route className="w-4 h-4" />}
                  borderColor={selectedColor}
                  testId={`card-tour-week-${week.isoYear}-${week.isoWeek}`}
                  actions={!week.isLocked ? (
                    <PlusActionButton
                      onClick={() => openEmployeePickerForWeek(week.isoYear, week.isoWeek)}
                      aria-label="Mitarbeiter zur KW hinzufuegen"
                      disabled={isSaving || isMutatingMembers}
                      data-testid={`button-add-tour-week-member-${week.isoYear}-${week.isoWeek}`}
                    />
                  ) : undefined}
                  footerVisibility="visible"
                  footer={(
                    <div className="text-xs text-slate-500">
                      {week.isLocked ? "Schreibgeschuetzt ab Wochenstart" : `${format(new Date(`${week.weekStartDate}T00:00:00`), "dd.MM.yyyy")} - ${format(new Date(`${week.weekEndDate}T00:00:00`), "dd.MM.yyyy")}`}
                    </div>
                  )}
                >
                  <div className="space-y-2">
                    {week.employees.map((employee) => (
                      <EmployeeInfoBadge
                        key={employee.assignmentId}
                        id={employee.employeeId}
                        fullName={employee.fullName}
                        action={week.isLocked ? "none" : "remove"}
                        onRemove={() => {
                          void onRemoveWeekEmployee?.({
                            ...employee,
                            isoYear: week.isoYear,
                            isoWeek: week.isoWeek,
                          });
                        }}
                        size="sm"
                        fullWidth
                        testId={`badge-tour-week-member-${employee.assignmentId}`}
                      />
                    ))}
                    {week.employees.length === 0 ? (
                      <div className="text-sm italic text-slate-400">Keine Mitarbeiter geplant</div>
                    ) : null}
                  </div>
                </ColoredEntityCard>
              ))}

              <ColoredEntityCard
                title="KW hinzufuegen"
                icon={<Route className="w-4 h-4" />}
                borderColor={selectedColor}
                className="border-dashed"
                testId="card-tour-week-add"
                onClick={() => setWeekPickerOpen(true)}
                footerVisibility="visible"
                footer={<div className="text-xs text-slate-500">Zukuenftige ISO-Woche auswaehlen</div>}
              >
                <div className="flex h-full min-h-[6rem] items-center justify-center text-sm text-slate-500">
                  Wochenplanung fuer weitere KW anlegen
                </div>
              </ColoredEntityCard>
            </div>
          </TabsContent>
        ) : null}
      </Tabs>

      <Dialog open={weekPickerOpen} onOpenChange={setWeekPickerOpen}>
        <DialogContent className="sm:max-w-md">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tour-week-input">ISO-Woche</Label>
              <Input
                id="tour-week-input"
                type="week"
                value={pendingWeekInput}
                min={minimumWeekInput}
                onChange={(event) => setPendingWeekInput(event.target.value)}
                data-testid="input-tour-week"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setWeekPickerOpen(false)}>
                Abbrechen
              </Button>
              <Button type="button" onClick={confirmWeekInputSelection} data-testid="button-confirm-tour-week">
                Weiter
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={employeePickerOpen} onOpenChange={setEmployeePickerOpen}>
        <DialogContent className="h-[100dvh] w-[100dvw] max-w-none overflow-hidden rounded-none p-0 sm:h-[85vh] sm:w-[95vw] sm:max-w-5xl sm:rounded-lg">
          <EmployeePickerDialogList
            employees={availableEmployees}
            teams={[]}
            tours={[]}
            title="Mitarbeiter auswaehlen"
            onSelectEmployee={(employeeId) => {
              if (pendingWeekSelection) {
                void onAddWeekEmployee?.({
                  isoYear: pendingWeekSelection.isoYear,
                  isoWeek: pendingWeekSelection.isoWeek,
                  employeeId,
                });
              }
              setEmployeePickerOpen(false);
              setPendingWeekSelection(null);
            }}
            onClose={() => {
              setEmployeePickerOpen(false);
              setPendingWeekSelection(null);
            }}
          />
        </DialogContent>
      </Dialog>
      </EntityFormShell>
    </div>
  );
}
