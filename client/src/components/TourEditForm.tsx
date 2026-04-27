import React, { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import { addWeeks, format, getISOWeek, getISOWeekYear, startOfISOWeek } from "date-fns";
import { CalendarPlus2, LayoutList, Lock, LockOpen, MoreVertical, Route, ScrollText, Trash2, X } from "lucide-react";
import { EntityFormShell } from "@/components/ui/entity-form-shell";
import { ColorSelectButton } from "@/components/ui/color-select-button";
import { EditFormContextText } from "@/components/ui/edit-form-context-text";
import { PlusActionButton } from "@/components/ui/plus-action-button";
import { EmployeeInfoBadge } from "@/components/ui/employee-info-badge";
import { AppointmentsListPage, type AppointmentsListContext } from "@/components/AppointmentsListPage";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { JournalRecordsView } from "@/components/JournalRecordsView";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toggle } from "@/components/ui/toggle";
import { EmployeePickerDialogList } from "@/components/EmployeePickerDialogList";
import { TourWeekCard, type TourWeekCardData } from "@/components/TourWeekCard";
import { useSetting } from "@/hooks/useSettings";
import { useToast } from "@/hooks/use-toast";
import type { Tour, Employee } from "@shared/schema";

type TourWeekEmployeeMember = {
  assignmentId: number;
  employeeId: number;
  fullName: string;
};

const normalizeTourName = (value: string | null | undefined) => (value ?? "").trim().toLocaleLowerCase("de").replace(/ÃŸ/g, "ss");

function isParkplatzTourName(value: string | null | undefined): boolean {
  return normalizeTourName(value) === normalizeTourName("Parkplatz");
}

type TourWeekEmployeesWeek = {
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
  employees: TourWeekEmployeeMember[];
};

function readStoredUserRole(): string {
  if (typeof window === "undefined") {
    return "DISPATCHER";
  }
  return window.localStorage.getItem("userRole")?.toUpperCase() ?? "DISPATCHER";
}

interface TourEditFormProps {
  tour: Tour | null;
  allEmployees?: Employee[];
  onSubmit: (tourId: number | null, employeeIds: number[], name: string, color: string) => Promise<void>;
  onCreateWeek?: (params: { isoYear: number; isoWeek: number }) => Promise<void>;
  onBlockWeek?: (params: { isoYear: number; isoWeek: number }) => Promise<void>;
  onUnblockWeek?: (params: { isoYear: number; isoWeek: number }) => Promise<void>;
  onAddWeekEmployee?: (params: { isoYear: number; isoWeek: number; employeeId: number }) => Promise<void>;
  onAddWeekEmployees?: (params: { isoYear: number; isoWeek: number; employeeIds: number[] }) => Promise<void>;
  onRemoveWeekEmployee?: (assignment: TourWeekEmployeeMember & { isoYear: number; isoWeek: number }) => Promise<void>;
  onDelete?: () => Promise<void>;
  canDelete?: boolean;
  isDeleting?: boolean;
  isSaving: boolean;
  isMutatingMembers?: boolean;
  isMutatingWeeks?: boolean;
  isCreate?: boolean;
  readOnly?: boolean;
  defaultName?: string;
  defaultColor?: string;
  onCancel: () => void;
  onOpenAppointment?: (appointmentId: number, context: AppointmentsListContext) => void;
  onOpenTourWeek?: (week: TourWeekCardData) => void;
}

export function TourEditForm({
  tour,
  onSubmit,
  onCreateWeek,
  onBlockWeek,
  onUnblockWeek,
  onAddWeekEmployee,
  onAddWeekEmployees,
  onRemoveWeekEmployee,
  onDelete,
  canDelete = false,
  isDeleting = false,
  isSaving,
  isMutatingMembers = false,
  isMutatingWeeks = false,
  isCreate = false,
  readOnly = false,
  defaultName = "Tour anlegen",
  defaultColor = "#60a5fa",
  onCancel,
  onOpenAppointment,
  onOpenTourWeek,
}: TourEditFormProps) {
  const { toast } = useToast();
  const contentMaxWidth = useSetting("entityFormShell.contentMaxWidthPx") ?? 960;
  const [userRole] = useState(readStoredUserRole);
  const isWeekPlanningSupported = !isCreate && !isParkplatzTourName(tour?.name);
  const canAccessJournal = userRole === "ADMIN" || userRole === "DISPATCHER" || userRole === "DISPONENT";
  const showJournalTab = !isCreate && tour?.id != null && canAccessJournal;
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
  const [activeMainTab, setActiveMainTab] = useState<"details" | "journal">("details");
  const [activeTab, setActiveTab] = useState("stammdaten");
  const [weekPickerOpen, setWeekPickerOpen] = useState(false);
  const [employeePickerOpen, setEmployeePickerOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [pendingWeekInput, setPendingWeekInput] = useState(String(nextEditableWeek.isoWeek));
  const [pendingWeekSelection, setPendingWeekSelection] = useState<{ isoYear: number; isoWeek: number } | null>(null);
  const [pendingWeekScrollTarget, setPendingWeekScrollTarget] = useState<string | null>(null);

  useEffect(() => {
    setSelectedName(tour?.name ?? defaultName);
  }, [defaultName, tour?.id, tour?.name]);

  useEffect(() => {
    setSelectedColor(tour?.color ?? defaultColor);
  }, [defaultColor, tour?.color, tour?.id]);

  useEffect(() => {
    if (activeTab !== "wochenplanung") return;

    const mainContainer = document.querySelector<HTMLElement>('[data-testid="entity-form-shell-main"]');
    if (!mainContainer) return;
    mainContainer.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [activeTab]);

  const { data: allWeeks = [] } = useQuery<TourWeekEmployeesWeek[]>({
    queryKey: [`/api/tours/${tour?.id}/week-employees`],
    enabled: !isCreate && tour?.id != null && isWeekPlanningSupported,
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

  const nextAvailableWeek = useMemo(() => {
    const existingWeeks = new Set(
      allWeeks
        .filter((week) => week.isoYear === nextEditableWeek.isoYear)
        .map((week) => week.isoWeek),
    );

    for (let isoWeek = nextEditableWeek.isoWeek; isoWeek <= nextEditableWeek.maxIsoWeek; isoWeek += 1) {
      if (!existingWeeks.has(isoWeek)) {
        return {
          isoYear: nextEditableWeek.isoYear,
          isoWeek,
        };
      }
    }

    return null;
  }, [allWeeks, nextEditableWeek.isoWeek, nextEditableWeek.isoYear, nextEditableWeek.maxIsoWeek]);

  useEffect(() => {
    setPendingWeekInput(String(nextAvailableWeek?.isoWeek ?? nextEditableWeek.isoWeek));
    setPendingWeekScrollTarget(null);
  }, [nextAvailableWeek?.isoWeek, nextEditableWeek.isoWeek, tour?.id]);

  const { data: availableEmployees = [], isLoading: availableEmployeesLoading } = useQuery<Employee[]>({
    queryKey: [
      `/api/tours/${tour?.id}/week-employees/available`,
      pendingWeekSelection?.isoYear ?? null,
      pendingWeekSelection?.isoWeek ?? null,
    ],
    enabled: !isCreate && isWeekPlanningSupported && employeePickerOpen && tour?.id != null && pendingWeekSelection != null,
    queryFn: async () => {
      if (!tour?.id || !pendingWeekSelection) return [];
      const params = new URLSearchParams({
        isoYear: String(pendingWeekSelection.isoYear),
        isoWeek: String(pendingWeekSelection.isoWeek),
      });
      const response = await fetch(`/api/tours/${tour.id}/week-employees/available?${params.toString()}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Verfügbare Mitarbeiter konnten nicht geladen werden");
      }
      return response.json() as Promise<Employee[]>;
    },
  });

  useEffect(() => {
    if (!pendingWeekScrollTarget) return;

    const scrollToWeekCard = () => {
      const mainContainer = document.querySelector<HTMLElement>('[data-testid="entity-form-shell-main"]');
      const target = document.querySelector<HTMLElement>(`[data-testid="${pendingWeekScrollTarget}"]`);
      if (!mainContainer || !target) return;
      const containerRect = mainContainer.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const nextTop = mainContainer.scrollTop + (targetRect.top - containerRect.top) - 16;
      mainContainer.scrollTo({ top: Math.max(0, nextTop), left: 0, behavior: "auto" });
      setPendingWeekScrollTarget(null);
    };

    const frameId = window.requestAnimationFrame(scrollToWeekCard);
    return () => window.cancelAnimationFrame(frameId);
  }, [allWeeks, pendingWeekScrollTarget]);

  const openEmployeePickerForWeek = (isoYear: number, isoWeek: number) => {
    setPendingWeekSelection({ isoYear, isoWeek });
    setEmployeePickerOpen(true);
  };

  const confirmWeekInputSelection = async () => {
    if (!nextAvailableWeek) {
      toast({
        title: "Keine freie Kalenderwoche verfügbar",
        description: `Für ${nextEditableWeek.isoYear} ist keine weitere freie KW mehr verfügbar.`,
        variant: "destructive",
      });
      return;
    }

    const isoWeek = Number(pendingWeekInput);
    if (!Number.isInteger(isoWeek)) {
      toast({
        title: "Kalenderwoche fehlt",
        description: "Bitte eine gültige Kalenderwoche auswählen.",
        variant: "destructive",
      });
      return;
    }

    if (isoWeek < nextEditableWeek.isoWeek) {
      toast({
        title: "Kalenderwoche zu klein",
        description: `Frühestens KW ${String(nextEditableWeek.isoWeek).padStart(2, "0")} ist zulässig.`,
        variant: "destructive",
      });
      return;
    }

    if (isoWeek > nextEditableWeek.maxIsoWeek) {
      toast({
        title: "Kalenderwoche zu groß",
        description: `Für ${nextEditableWeek.isoYear} ist spätestens KW ${String(nextEditableWeek.maxIsoWeek).padStart(2, "0")} zulässig.`,
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

    try {
      setPendingWeekScrollTarget(`card-tour-week-${nextEditableWeek.isoYear}-${isoWeek}`);
      await onCreateWeek?.({
        isoYear: nextEditableWeek.isoYear,
        isoWeek,
      });
      setPendingWeekInput(String(isoWeek));
      setWeekPickerOpen(false);
    } catch {
      setPendingWeekScrollTarget(null);
    }
  };

  const title = isCreate ? defaultName : "Tour bearbeiten";
  const tourEditContext = !isCreate ? (selectedName.trim() || tour?.name?.trim() || null) : null;
  const handleSubmit = async () => {
    if (readOnly) return;
    await onSubmit(tour?.id ?? null, [], selectedName, selectedColor);
  };
  const showWeekInsertAction = !isCreate && activeTab === "wochenplanung" && isWeekPlanningSupported;
  const showDeleteAction = !isCreate && canDelete && tour && onDelete;
  const showFunctionsPanel = !readOnly && (showWeekInsertAction || showDeleteAction);

  return (
    <Tabs
      value={showJournalTab ? activeMainTab : "details"}
      onValueChange={(value) => setActiveMainTab(value as "details" | "journal")}
      className="h-full"
    >
      <div className="flex h-full min-h-0 w-full flex-1">
      <EntityFormShell
        mainClassName="bg-[hsl(var(--color-cream))]"
        header={(
          <div className="flex items-center justify-between gap-4 px-6 py-4">
            <div className="flex min-w-0 flex-col gap-1">
              <h2 className="text-2xl font-bold text-primary flex min-w-0 items-center gap-3">
                <Route className="w-6 h-6" />
                {title}
              </h2>
              <EditFormContextText>{tourEditContext}</EditFormContextText>
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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  data-testid="button-cancel-tour"
                >
                  Schließen
                </Button>
              </div>
              {!readOnly ? (
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
              ) : null}
            </div>
          </div>
        )}
        sidebar={(
          <div className="min-w-0 space-y-6 p-6" data-testid="tour-form-sidebar">
            {showJournalTab ? (
              <div className="sub-panel space-y-3">
                <h3 className="text-sm font-bold tracking-wider text-primary">Daten anzeigen</h3>
                <TabsList className="w-full" data-testid="tabs-tour-main">
                  <TabsTrigger value="details" className="flex-1 gap-1.5" data-testid="tab-tour-details-main">
                    <LayoutList className="w-4 h-4" />
                    Details
                  </TabsTrigger>
                  <TabsTrigger value="journal" className="flex-1 gap-1.5" data-testid="tab-tour-journal">
                    <ScrollText className="w-4 h-4" />
                    Journal
                  </TabsTrigger>
                </TabsList>
              </div>
            ) : null}
            {showFunctionsPanel ? (
              <div className="sub-panel space-y-3" data-testid="tour-form-functions-panel">
                <h3 className="text-sm font-bold tracking-wider text-primary">Funktionen</h3>
                <div className="flex flex-col gap-2">
                  {showWeekInsertAction ? (
                    <Toggle
                      pressed={weekPickerOpen}
                      onPressedChange={(pressed) => setWeekPickerOpen(pressed)}
                      disabled={isSaving || isMutatingMembers || isMutatingWeeks}
                      className="flex w-full items-center justify-start gap-2 border bg-[var(--action-bg)] px-3 py-2 text-left text-sm font-medium text-[var(--action-fg)] [border-color:var(--action-border)] transition-[background-color,border-color,box-shadow,color] hover:bg-[var(--action-bg-hover)] hover:[border-color:var(--action-border-hover)] hover:shadow-sm data-[state=on]:border-transparent data-[state=on]:text-white"
                      style={weekPickerOpen
                        ? ({
                            backgroundColor: selectedColor,
                            "--action-bg-hover": selectedColor,
                            "--action-border-hover": selectedColor,
                          } as CSSProperties)
                        : ({
                            "--action-bg": `${selectedColor}14`,
                            "--action-bg-hover": `${selectedColor}22`,
                            "--action-border": `${selectedColor}66`,
                            "--action-border-hover": `${selectedColor}99`,
                            "--action-fg": selectedColor,
                          } as CSSProperties)}
                      data-testid="toggle-tour-week-picker"
                      aria-label="Wochenplanung anlegen"
                    >
                      <CalendarPlus2 className="h-4 w-4" />
                      <span>KW einfügen</span>
                    </Toggle>
                  ) : null}

                  {showDeleteAction ? (
                    <Button
                      type="button"
                      className="w-full justify-start gap-2 border bg-[var(--action-bg)] text-[var(--action-fg)] [border-color:var(--action-border)] transition-[background-color,border-color,box-shadow,color] hover:bg-[var(--action-bg-hover)] hover:[border-color:var(--action-border-hover)] hover:shadow-sm"
                      style={{
                        "--action-bg": "hsl(var(--destructive) / 0.14)",
                        "--action-bg-hover": "hsl(var(--destructive) / 0.22)",
                        "--action-border": "hsl(var(--destructive) / 0.35)",
                        "--action-border-hover": "hsl(var(--destructive) / 0.5)",
                        "--action-fg": "hsl(var(--destructive))",
                      } as CSSProperties}
                      onClick={() => setDeleteConfirmOpen(true)}
                      disabled={isSaving || isDeleting}
                      data-testid="button-delete-tour-form"
                    >
                      <Trash2 className="w-4 h-4" />
                      {isDeleting ? "Löschen..." : "Löschen"}
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        )}
        contentMaxWidth={99999}
      >
        {activeMainTab === "details" || !showJournalTab ? (
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className={`flex min-h-0 w-full flex-col space-y-4 ${activeTab === "wochenplanung" ? "" : "h-full"}`}
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
            <div
              className="mx-auto w-full max-w-[var(--tour-stammdaten-max-width)] space-y-4"
              style={{ "--tour-stammdaten-max-width": `${contentMaxWidth}px` } as React.CSSProperties}
            >
              <div className="sub-panel space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="tour-name">Name</Label>
                  <Input
                    id="tour-name"
                    value={selectedName}
                    readOnly={isCreate || readOnly}
                    disabled={isSaving || readOnly}
                    onChange={(event) => setSelectedName(event.target.value)}
                    placeholder="Tourname eingeben"
                    data-testid="input-tour-name"
                  />
                </div>
                {isCreate ? (
                  <p className="text-sm text-slate-500" data-testid="text-tour-generated-name-hint">
                    Der Tourname wird beim Speichern serverseitig vergeben. Die Anzeige zeigt den nächsten freien Namen.
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
                  disabled={isSaving || readOnly}
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
            <TabsContent value="wochenplanung" className="mt-0 w-full flex-none">
              {!isWeekPlanningSupported ? (
                <div
                  className="sub-panel mx-auto w-full max-w-[760px] space-y-3"
                  data-testid="panel-tour-week-planning-unsupported"
                >
                  <h3 className="text-base font-semibold text-slate-900">Keine Wochenplanung für diese Tour</h3>
                  <p className="text-sm text-slate-600" data-testid="text-tour-week-planning-unsupported">
                    Die Parkplatz-Tour unterstützt keine Mitarbeiter-Planung. Die Parkplatz-Tour ist Zwischenspeicher und dient nicht der konkreten Terminplanung.
                  </p>
                </div>
              ) : (
                <div className="grid auto-rows-max content-start items-start gap-4 md:grid-cols-2 xl:grid-cols-3" data-testid="grid-tour-week-planning">
                {allWeeks.map((week) => (
                  <TourWeekCard
                    key={`${week.isoYear}-${week.isoWeek}`}
                    week={week}
                    scope="tour"
                    borderColor={selectedColor}
                    testId={`card-tour-week-${week.isoYear}-${week.isoWeek}`}
                    memberTestIdPrefix="badge-tour-week-member"
                    blockedTextTestId={`text-tour-week-blocked-${week.isoYear}-${week.isoWeek}`}
                    blockedBadgeTestId={`badge-tour-week-blocked-${week.isoYear}-${week.isoWeek}`}
                    onOpen={() => onOpenTourWeek?.(week)}
                    onRemoveEmployee={readOnly ? undefined : (employee) => {
                      void onRemoveWeekEmployee?.({
                        ...employee,
                        isoYear: week.isoYear,
                        isoWeek: week.isoWeek,
                      });
                    }}
                    actions={(
                      <>
                        {!readOnly && !week.isLocked && !week.isBlocked ? (
                          <PlusActionButton
                            onClick={() => openEmployeePickerForWeek(week.isoYear, week.isoWeek)}
                            aria-label="Mitarbeiter zur KW hinzufügen"
                            disabled={isSaving || isMutatingMembers || isMutatingWeeks}
                            data-testid={`button-add-tour-week-member-${week.isoYear}-${week.isoWeek}`}
                          />
                        ) : null}
                        {!readOnly ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                              disabled={isSaving || isMutatingWeeks}
                              data-testid={`button-tour-week-menu-${week.isoYear}-${week.isoWeek}`}
                              aria-label="Wochenplanungsaktionen"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="min-w-[210px]">
                            {week.isBlocked ? (
                              <DropdownMenuItem
                                onClick={() => {
                                  void onUnblockWeek?.({ isoYear: week.isoYear, isoWeek: week.isoWeek });
                                }}
                                disabled={week.isLocked || isMutatingWeeks}
                                className="gap-2 text-xs cursor-pointer"
                              >
                                <LockOpen className="h-3.5 w-3.5 shrink-0" />
                                Wochenplanung freigeben
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => {
                                  void onBlockWeek?.({ isoYear: week.isoYear, isoWeek: week.isoWeek });
                                }}
                                disabled={week.isLocked || isMutatingWeeks}
                                className="gap-2 text-xs cursor-pointer"
                              >
                                <Lock className="h-3.5 w-3.5 shrink-0" />
                                Wochenplanung blockieren
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        ) : null}
                      </>
                    )}
                    legacyLabel=
                          {week.isLocked ? "Schreibgeschützt ab Wochenstart" : `${format(new Date(`${week.weekStartDate}T00:00:00`), "dd.MM.yyyy")} - ${format(new Date(`${week.weekEndDate}T00:00:00`), "dd.MM.yyyy")}`}
                  >
                    <div className="space-y-2">
                      {week.isBlocked ? (
                        <div
                          className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
                          data-testid={`text-tour-week-blocked-${week.isoYear}-${week.isoWeek}`}
                        >
                          Die Wochenplanung ist blockiert. Termine dieser Woche wurden auf Parkplatz verschoben, als geparkt markiert und können dort weiter bearbeitet werden.
                        </div>
                      ) : null}
                      {week.employees.map((employee) => (
                        <EmployeeInfoBadge
                          key={employee.assignmentId}
                          id={employee.employeeId}
                          fullName={employee.fullName}
                          action={readOnly || week.isLocked || week.isBlocked ? "none" : "remove"}
                          onRemove={readOnly ? undefined : () => {
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
                  </TourWeekCard>
                ))}
                </div>
              )}
            </TabsContent>
          ) : null}
        </Tabs>
        ) : (
          <JournalRecordsView
            context={{ tableName: "tour", recordId: tour?.id ?? null }}
            pageSize={25}
            testIdPrefix="tour-journal"
          />
        )}

        <Dialog open={!readOnly && weekPickerOpen} onOpenChange={setWeekPickerOpen}>
          <DialogContent className="sm:max-w-md">
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-slate-900" data-testid="text-tour-week-dialog-title">
                  KW einfügen
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
                <Button
                  type="button"
                  disabled={isMutatingWeeks}
                  onClick={() => {
                    void confirmWeekInputSelection();
                  }}
                  data-testid="button-confirm-tour-week"
                >
                  Weiter
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={!readOnly && employeePickerOpen} onOpenChange={setEmployeePickerOpen}>
          <DialogContent className="h-[100dvh] w-[100dvw] max-w-none overflow-hidden rounded-none p-0 sm:h-[85vh] sm:w-[95vw] sm:max-w-5xl sm:rounded-lg">
            <EmployeePickerDialogList
              employees={availableEmployees}
              teams={[]}
              tours={[]}
              isLoading={availableEmployeesLoading}
              allowBulkSelection
              viewModeSettingKey="appointmentEmployeePicker.viewMode"
              title="Mitarbeiter auswählen"
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
              onConfirmSelection={(employeeIds) => {
                if (pendingWeekSelection && employeeIds.length > 0) {
                  const normalizedEmployeeIds = Array.from(new Set(
                    employeeIds.filter((employeeId) => Number.isInteger(employeeId) && employeeId > 0),
                  ));

                  if (normalizedEmployeeIds.length === 1) {
                    void onAddWeekEmployee?.({
                      isoYear: pendingWeekSelection.isoYear,
                      isoWeek: pendingWeekSelection.isoWeek,
                      employeeId: normalizedEmployeeIds[0],
                    });
                  } else if (normalizedEmployeeIds.length > 1) {
                    void onAddWeekEmployees?.({
                      isoYear: pendingWeekSelection.isoYear,
                      isoWeek: pendingWeekSelection.isoWeek,
                      employeeIds: normalizedEmployeeIds,
                    });
                  }
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

        <AlertDialog open={!readOnly && deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Tour wirklich löschen?</AlertDialogTitle>
              <AlertDialogDescription>
                Diese Aktion ist endgültig. Die Tour wird nur gelöscht, wenn keine blockierenden Verknüpfungen bestehen.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  void onDelete?.().catch(() => {
                    // errors are handled via mutation toasts in parent
                  });
                }}
                data-testid="button-confirm-delete-tour"
              >
                Tour löschen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </EntityFormShell>
      </div>
    </Tabs>
  );
}
