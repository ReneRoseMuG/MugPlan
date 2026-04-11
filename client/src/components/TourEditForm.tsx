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
import { useToast } from "@/hooks/use-toast";
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

type DraftTourWeek = {
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
  const { toast } = useToast();
  const nextEditableWeek = useMemo(() => {
    const nextWeek = addWeeks(startOfISOWeek(new Date()), 1);
    const isoYear = getISOWeekYear(nextWeek);
    const isoWeek = getISOWeek(nextWeek);
    const maxIsoWeek = getISOWeek(new Date(isoYear, 11, 28));
    return {
      isoYear,
      isoWeek,
      maxIsoWeek,
    };
  }, []);
  const [selectedName, setSelectedName] = useState<string>(() => tour?.name ?? defaultName);
  const [selectedColor, setSelectedColor] = useState<string>(() => tour?.color ?? defaultColor);
  const [activeTab, setActiveTab] = useState("stammdaten");
  const [weekPickerOpen, setWeekPickerOpen] = useState(false);
  const [employeePickerOpen, setEmployeePickerOpen] = useState(false);
  const [draftWeeks, setDraftWeeks] = useState<DraftTourWeek[]>([]);
  const [pendingWeekInput, setPendingWeekInput] = useState(String(nextEditableWeek.isoWeek));
  const [pendingWeekSelection, setPendingWeekSelection] = useState<{ isoYear: number; isoWeek: number } | null>(null);

  useEffect(() => {
    setSelectedName(tour?.name ?? defaultName);
  }, [defaultName, tour?.id, tour?.name]);

  useEffect(() => {
    setSelectedColor(tour?.color ?? defaultColor);
  }, [defaultColor, tour?.color, tour?.id]);

  useEffect(() => {
    setDraftWeeks([]);
    setPendingWeekInput(String(nextEditableWeek.isoWeek));
  }, [nextEditableWeek.isoWeek, tour?.id]);

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

  const allWeeks = useMemo(() => {
    const merged = new Map<string, TourWeekEmployeesWeek | DraftTourWeek>();
    for (const week of draftWeeks) {
      merged.set(`${week.isoYear}-${week.isoWeek}`, week);
    }
    for (const week of plannedWeeks) {
      merged.set(`${week.isoYear}-${week.isoWeek}`, week);
    }
    return Array.from(merged.values()).sort((left, right) => {
      if (left.isoYear !== right.isoYear) return left.isoYear - right.isoYear;
      return left.isoWeek - right.isoWeek;
    });
  }, [draftWeeks, plannedWeeks]);

  const availableEmployees = useMemo(() => {
    if (!pendingWeekSelection) return [];
    const week = allWeeks.find((entry) => entry.isoYear === pendingWeekSelection.isoYear && entry.isoWeek === pendingWeekSelection.isoWeek);
    const assignedIds = new Set((week?.employees ?? []).map((employee) => employee.employeeId));
    return allEmployees.filter((employee) => employee.isActive && !assignedIds.has(employee.id));
  }, [allEmployees, allWeeks, pendingWeekSelection]);

  const openEmployeePickerForWeek = (isoYear: number, isoWeek: number) => {
    setPendingWeekSelection({ isoYear, isoWeek });
    setEmployeePickerOpen(true);
  };

  const confirmWeekInputSelection = () => {
    const isoWeek = Number(pendingWeekInput);
    if (!Number.isInteger(isoWeek)) {
      toast({
        title: "Kalenderwoche fehlt",
        description: "Bitte eine gueltige Kalenderwoche auswaehlen.",
        variant: "destructive",
      });
      return;
    }

    if (isoWeek < nextEditableWeek.isoWeek) {
      toast({
        title: "Kalenderwoche zu klein",
        description: `Fruehestens KW ${String(nextEditableWeek.isoWeek).padStart(2, "0")} ist zulaessig.`,
        variant: "destructive",
      });
      return;
    }

    if (isoWeek > nextEditableWeek.maxIsoWeek) {
      toast({
        title: "Kalenderwoche zu gross",
        description: `Fuer ${nextEditableWeek.isoYear} ist spaetestens KW ${String(nextEditableWeek.maxIsoWeek).padStart(2, "0")} zulaessig.`,
        variant: "destructive",
      });
      return;
    }

    const weekKey = `${nextEditableWeek.isoYear}-${isoWeek}`;
    const alreadyExists = allWeeks.some((week) => `${week.isoYear}-${week.isoWeek}` === weekKey);
    if (alreadyExists) {
      toast({
        title: "Kalenderwoche bereits vorhanden",
        description: `KW ${String(isoWeek).padStart(2, "0")} / ${nextEditableWeek.isoYear} ist bereits angelegt.`,
        variant: "destructive",
      });
      return;
    }

    const weekStartDate = startOfISOWeek(new Date(nextEditableWeek.isoYear, 0, 4 + (isoWeek - 1) * 7));
    const weekEndDate = addWeeks(weekStartDate, 1);
    weekEndDate.setDate(weekEndDate.getDate() - 1);

    setDraftWeeks((current) => [...current, {
      isoYear: nextEditableWeek.isoYear,
      isoWeek,
      weekStartDate: format(weekStartDate, "yyyy-MM-dd"),
      weekEndDate: format(weekEndDate, "yyyy-MM-dd"),
      isLocked: false,
      employees: [],
    }]);
    setPendingWeekInput(String(isoWeek));
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
          <div className="flex flex-col gap-2 px-6 py-4">
            {!isCreate && activeTab === "wochenplanung" ? (
              <div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setWeekPickerOpen(true)}
                  disabled={isSaving || isMutatingMembers}
                  data-testid="button-add-tour-week-footer"
                >
                  KW einfuegen
                </Button>
              </div>
            ) : null}
            <div className="flex flex-wrap items-center justify-between gap-3">
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
                    {isDeleting ? "Löschen..." : "Löschen"}
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  data-testid="button-cancel-tour"
                >
                  Zurück
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
          </div>
        )}
        sidebar={<div className="min-w-0 p-6" data-testid="tour-form-sidebar" />}
        contentMaxWidth={99999}
      >
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
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
          />
        </TabsContent>

        {!isCreate ? (
          <TabsContent value="wochenplanung" className="w-full">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" data-testid="grid-tour-week-planning">
              {allWeeks.map((week) => (
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
            </div>
          </TabsContent>
        ) : null}
      </Tabs>

      <Dialog open={weekPickerOpen} onOpenChange={setWeekPickerOpen}>
        <DialogContent className="sm:max-w-md">
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-slate-900" data-testid="text-tour-week-dialog-title">
                KW einfuegen
              </h3>
              <p className="text-sm text-slate-500" data-testid="text-tour-week-dialog-year">
                Jahr {nextEditableWeek.isoYear}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tour-week-input">Kalenderwoche</Label>
              <Input
                id="tour-week-input"
                type="number"
                value={pendingWeekInput}
                min={nextEditableWeek.isoWeek}
                max={nextEditableWeek.maxIsoWeek}
                step={1}
                onChange={(event) => setPendingWeekInput(event.target.value)}
                data-testid="input-tour-week"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setWeekPickerOpen(false)}>
                Zurück
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
