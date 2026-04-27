import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LayoutList, Lock, LockOpen, Route, ScrollText, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { EditFormContextText } from "@/components/ui/edit-form-context-text";
import { EmployeePickerDialogList } from "@/components/EmployeePickerDialogList";
import { EntityFormShell } from "@/components/ui/entity-form-shell";
import { JournalRecordsView } from "@/components/JournalRecordsView";
import { NotesSection } from "@/components/NotesSection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppointmentsListPage, type AppointmentsListContext } from "@/components/AppointmentsListPage";
import { EmployeeInfoBadge } from "@/components/ui/employee-info-badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatListDateRange } from "@/lib/list-display-format";
import { invalidateTourWeekQueries } from "@/lib/tour-week-queries";
import type { Employee, Note, Team } from "@shared/schema";
import type { TourWeekCardData, TourWeekCardMember } from "@/components/TourWeekCard";

type EmployeeWeekPlanResponse = Array<TourWeekCardData & {
  members?: TourWeekCardMember[];
}>;

interface TourWeekFormProps {
  week: TourWeekCardData;
  scope: "tour" | "employee";
  readOnly?: boolean;
  employeeId?: number | null;
  onClose: () => void;
  onOpenAppointment?: (appointmentId: number, context: AppointmentsListContext) => void;
  onAddWeekEmployees?: (params: { tourId: number; isoYear: number; isoWeek: number; employeeIds: number[] }) => Promise<void>;
  onRemoveWeekEmployee?: (assignment: TourWeekCardMember & { tourId: number; isoYear: number; isoWeek: number }) => Promise<void>;
  onBlockWeek?: (params: { tourId: number; isoYear: number; isoWeek: number }) => Promise<void>;
  onUnblockWeek?: (params: { tourId: number; isoYear: number; isoWeek: number }) => Promise<void>;
  isMutatingMembers?: boolean;
  isMutatingWeeks?: boolean;
}

function extractApiCode(error: unknown): string | null {
  if (error instanceof Error) {
    try {
      const parsed = JSON.parse(error.message);
      return parsed?.code ?? null;
    } catch {
      return null;
    }
  }
  return null;
}

function resolveWeekKey(week: Pick<TourWeekCardData, "tourId" | "isoYear" | "isoWeek">): string {
  return `${week.tourId}-${week.isoYear}-${week.isoWeek}`;
}

function normalizeWeekResponseItem(
  item: TourWeekCardData & { members?: TourWeekCardMember[] },
): TourWeekCardData {
  return {
    ...item,
    employees: item.employees ?? item.members ?? [],
  };
}

function readStoredUserRole(): string {
  if (typeof window === "undefined") {
    return "DISPATCHER";
  }
  return window.localStorage.getItem("userRole")?.toUpperCase() ?? "DISPATCHER";
}

export function TourWeekForm({
  week,
  scope,
  readOnly = false,
  employeeId = null,
  onClose,
  onOpenAppointment,
  onAddWeekEmployees,
  onRemoveWeekEmployee,
  onBlockWeek,
  onUnblockWeek,
  isMutatingMembers = false,
  isMutatingWeeks = false,
}: TourWeekFormProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [userRole] = useState(readStoredUserRole);
  const [activeMainTab, setActiveMainTab] = useState<"details" | "journal">("details");
  const [activeTab, setActiveTab] = useState("stammdaten");
  const [employeePickerOpen, setEmployeePickerOpen] = useState(false);
  const isTourScope = scope === "tour";
  const canAccessJournal = userRole === "ADMIN" || userRole === "DISPATCHER" || userRole === "DISPONENT";
  const showJournalTab = isTourScope && canAccessJournal;

  const { data: resolvedWeekResponse } = useQuery<TourWeekCardData | null>({
    queryKey: isTourScope
      ? [`/api/tours/${week.tourId}/week-employees`, week.isoYear, week.isoWeek]
      : ["/api/employees", employeeId, "week-plans", week.tourId, week.isoYear, week.isoWeek],
    queryFn: async () => {
      if (isTourScope) {
        const response = await fetch(`/api/tours/${week.tourId}/week-employees`, { credentials: "include" });
        if (!response.ok) {
          throw new Error("Wochenplanung konnte nicht geladen werden");
        }
        const payload = (await response.json()) as TourWeekCardData[];
        return payload.find((item) => resolveWeekKey(item) === resolveWeekKey(week)) ?? null;
      }

      if (employeeId == null) {
        return null;
      }

      const response = await fetch(`/api/employees/${employeeId}/week-plans`, { credentials: "include" });
      if (!response.ok) {
        throw new Error("Wochenplanung konnte nicht geladen werden");
      }
      const payload = (await response.json()) as EmployeeWeekPlanResponse;
      const entry = payload.find((item) => resolveWeekKey(item) === resolveWeekKey(week));
      return entry ? normalizeWeekResponseItem(entry) : null;
    },
  });

  const resolvedWeek = resolvedWeekResponse ?? week;

  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
    enabled: employeePickerOpen && isTourScope,
  });

  const { data: availableEmployees = [], isLoading: availableEmployeesLoading } = useQuery<Employee[]>({
    queryKey: [`/api/tours/${resolvedWeek.tourId}/week-employees/available`, resolvedWeek.isoYear, resolvedWeek.isoWeek],
    enabled: employeePickerOpen && isTourScope && !resolvedWeek.isBlocked && !resolvedWeek.isLocked,
    queryFn: async () => {
      const params = new URLSearchParams({
        isoYear: String(resolvedWeek.isoYear),
        isoWeek: String(resolvedWeek.isoWeek),
      });
      const response = await fetch(`/api/tours/${resolvedWeek.tourId}/week-employees/available?${params.toString()}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Verfügbare Mitarbeiter konnten nicht geladen werden");
      }
      return response.json() as Promise<Employee[]>;
    },
  });

  const notesQueryKey = ["calendarWeekNotes", resolvedWeek.isoYear, resolvedWeek.isoWeek, resolvedWeek.tourId];
  const notesBaseUrl = `/api/calendar-weeks/${resolvedWeek.isoYear}/${resolvedWeek.isoWeek}/tours/${resolvedWeek.tourId}/notes`;
  const { data: notes = [], isLoading: notesLoading } = useQuery<Note[]>({
    queryKey: notesQueryKey,
    queryFn: async () => {
      const response = await fetch(notesBaseUrl, { credentials: "include" });
      if (!response.ok) {
        throw new Error("Wochennotizen konnten nicht geladen werden");
      }
      return response.json() as Promise<Note[]>;
    },
  });

  const invalidateWeekData = async () => {
    await queryClient.invalidateQueries({ queryKey: notesQueryKey });
    await invalidateTourWeekQueries(queryClient, {
      tourId: resolvedWeek.tourId,
      isoYear: resolvedWeek.isoYear,
      isoWeek: resolvedWeek.isoWeek,
      employeeId,
    });
  };

  const createNoteMutation = useMutation({
    mutationFn: async (data: { title: string; body: string; cardColor?: string | null; print: boolean; templateId?: number }) => {
      const response = await apiRequest("POST", notesBaseUrl, data);
      return response.json();
    },
    onSuccess: () => {
      void invalidateWeekData();
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: async ({
      noteId,
      title,
      body,
      cardColor,
      print,
      version,
    }: {
      noteId: number;
      title: string;
      body: string;
      cardColor?: string | null;
      print: boolean;
      version: number;
    }) => {
      const response = await apiRequest("PUT", `/api/notes/${noteId}`, { title, body, cardColor, print, version });
      return response.json();
    },
    onSuccess: () => {
      void invalidateWeekData();
    },
    onError: (error) => {
      if (extractApiCode(error) === "VERSION_CONFLICT") {
        toast({
          title: "Notiz konnte nicht aktualisiert werden",
          description: "Datensatz wurde zwischenzeitlich geändert. Bitte neu laden.",
          variant: "destructive",
        });
      }
    },
  });

  const togglePinMutation = useMutation({
    mutationFn: async ({ noteId, isPinned, version }: { noteId: number; isPinned: boolean; version: number }) => {
      const response = await apiRequest("PATCH", `/api/notes/${noteId}/pin`, { isPinned, version });
      return response.json();
    },
    onSuccess: () => {
      void invalidateWeekData();
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async ({ noteId, version }: { noteId: number; version: number }) => {
      await apiRequest("DELETE", `${notesBaseUrl}/${noteId}`, { version });
    },
    onSuccess: () => {
      void invalidateWeekData();
    },
    onError: (error) => {
      if (extractApiCode(error) === "VERSION_CONFLICT") {
        toast({
          title: "Notiz konnte nicht gelöscht werden",
          description: "Datensatz wurde zwischenzeitlich geändert. Bitte neu laden.",
          variant: "destructive",
        });
      }
    },
  });

  const currentNoteVersion = (noteId: number): number => notes.find((note) => note.id === noteId)?.version ?? 1;

  const headerContext = useMemo(
    () => `KW ${String(resolvedWeek.isoWeek).padStart(2, "0")} / ${resolvedWeek.isoYear}`,
    [resolvedWeek.isoWeek, resolvedWeek.isoYear],
  );

  const footerActionDisabled = isMutatingMembers || isMutatingWeeks;
  const showFunctionsPanel = isTourScope && !readOnly;
  const journalContextKey = `${resolvedWeek.isoYear}-${String(resolvedWeek.isoWeek).padStart(2, "0")}-${resolvedWeek.tourId}`;

  return (
    <>
      <Tabs
        value={showJournalTab ? activeMainTab : "details"}
        onValueChange={(value) => setActiveMainTab(value as "details" | "journal")}
        className="h-full"
      >
      <div className="fixed inset-0 z-50 bg-background overflow-y-auto" data-testid="tour-week-form-overlay">
        <EntityFormShell
          header={(
            <div className="flex items-center justify-between gap-4 px-6 py-4">
              <div className="flex min-w-0 flex-col gap-1">
                <h2 className="text-2xl font-bold text-primary flex min-w-0 items-center gap-3">
                  <Route className="w-6 h-6" />
                  Wochenplanung
                </h2>
                <EditFormContextText>
                  {isTourScope ? headerContext : `${resolvedWeek.tourName} · ${headerContext}`}
                </EditFormContextText>
              </div>

              <Button type="button" size="lg" variant="ghost" onClick={onClose} data-testid="button-close-tour-week">
                <X className="w-6 h-6" />
              </Button>
            </div>
          )}
          sidebar={(
            <div className="min-w-0 space-y-6 p-6" data-testid="tour-week-form-sidebar">
              {showJournalTab ? (
                <div className="sub-panel space-y-3">
                  <h3 className="text-sm font-bold tracking-wider text-primary">Daten anzeigen</h3>
                  <TabsList className="w-full" data-testid="tabs-tour-week-main">
                    <TabsTrigger value="details" className="flex-1 gap-1.5" data-testid="tab-tour-week-details-main">
                      <LayoutList className="w-4 h-4" />
                      Details
                    </TabsTrigger>
                    <TabsTrigger value="journal" className="flex-1 gap-1.5" data-testid="tab-tour-week-journal">
                      <ScrollText className="w-4 h-4" />
                      Journal
                    </TabsTrigger>
                  </TabsList>
                </div>
              ) : null}
              {showFunctionsPanel ? (
                <div className="sub-panel space-y-3" data-testid="tour-week-form-functions-panel">
                  <h3 className="text-sm font-bold tracking-wider text-primary">Funktionen</h3>
                  <div className="flex flex-col gap-2">
                    {!resolvedWeek.isBlocked ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          void onBlockWeek?.({
                            tourId: resolvedWeek.tourId,
                            isoYear: resolvedWeek.isoYear,
                            isoWeek: resolvedWeek.isoWeek,
                          });
                        }}
                        disabled={resolvedWeek.isLocked || footerActionDisabled}
                        data-testid="button-block-tour-week"
                        className="w-full justify-start"
                      >
                        <Lock className="mr-2 h-4 w-4" />
                        Planung blockieren
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          void onUnblockWeek?.({
                            tourId: resolvedWeek.tourId,
                            isoYear: resolvedWeek.isoYear,
                            isoWeek: resolvedWeek.isoWeek,
                          });
                        }}
                        disabled={resolvedWeek.isLocked || footerActionDisabled}
                        data-testid="button-unblock-tour-week"
                        className="w-full justify-start"
                      >
                        <LockOpen className="mr-2 h-4 w-4" />
                        Planung freigeben
                      </Button>
                    )}
                  </div>
                </div>
              ) : null}
              <NotesSection
                title="Notizen"
                notes={notes}
                isLoading={notesLoading}
                readOnly={readOnly}
                onAdd={(data) => createNoteMutation.mutate(data)}
                onUpdate={(noteId, data) => updateNoteMutation.mutate({ noteId, ...data, version: currentNoteVersion(noteId) })}
                onTogglePin={(noteId, isPinned) => togglePinMutation.mutate({ noteId, isPinned, version: currentNoteVersion(noteId) })}
                onDelete={(noteId) => deleteNoteMutation.mutate({ noteId, version: currentNoteVersion(noteId) })}
              />
            </div>
          )}
          footer={(
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Schließen
              </Button>
            </div>
          )}
        >
          {activeMainTab === "details" || !showJournalTab ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col">
            <TabsList className="mb-6 w-full justify-start">
              <TabsTrigger value="stammdaten" data-testid="tab-tour-week-stammdaten">
                Stammdaten
              </TabsTrigger>
              <TabsTrigger value="termine" data-testid="tab-tour-week-termine">
                Termine
              </TabsTrigger>
            </TabsList>

            <TabsContent value="stammdaten" className="mt-0 flex min-h-0 flex-1 flex-col">
              <div className="sub-panel space-y-4" data-testid="panel-tour-week-stammdaten">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-base font-semibold text-slate-900">
                      {formatListDateRange(resolvedWeek.weekStartDate, resolvedWeek.weekEndDate)}
                    </div>
                    <div className="text-sm text-slate-500">
                      {resolvedWeek.tourName}
                    </div>
                  </div>

                  {isTourScope && !readOnly ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEmployeePickerOpen(true)}
                      disabled={resolvedWeek.isLocked || resolvedWeek.isBlocked || footerActionDisabled}
                      data-testid="button-open-tour-week-employee-picker"
                    >
                      <Users className="mr-2 h-4 w-4" />
                      Mitarbeiter wählen
                    </Button>
                  ) : null}
                </div>

                {resolvedWeek.isBlocked ? (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    Die Wochenplanung ist blockiert. Termine dieser Woche wurden auf Parkplatz verschoben, als geparkt markiert und können dort weiter bearbeitet werden.
                  </div>
                ) : null}

                <div className="space-y-2" data-testid="list-tour-week-members">
                  {resolvedWeek.employees.map((member) => (
                    <EmployeeInfoBadge
                      key={member.assignmentId}
                      id={member.employeeId}
                      fullName={member.fullName}
                      tourName={!isTourScope ? resolvedWeek.tourName : undefined}
                      action={isTourScope && !readOnly && !resolvedWeek.isLocked && !resolvedWeek.isBlocked ? "remove" : "none"}
                      onRemove={isTourScope && !readOnly && !resolvedWeek.isLocked && !resolvedWeek.isBlocked ? () => {
                        void onRemoveWeekEmployee?.({
                          ...member,
                          tourId: resolvedWeek.tourId,
                          isoYear: resolvedWeek.isoYear,
                          isoWeek: resolvedWeek.isoWeek,
                        });
                      } : undefined}
                      size="sm"
                      fullWidth
                      showPreview={false}
                      testId={`badge-tour-week-form-member-${member.assignmentId}`}
                    />
                  ))}
                  {resolvedWeek.employees.length === 0 ? (
                    <p className="text-sm italic text-slate-400">Keine Mitarbeiter geplant</p>
                  ) : null}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="termine" className="mt-0 flex min-h-0 flex-1 flex-col">
              <AppointmentsListPage
                title="Termine"
                helpKey={isTourScope ? "appointments.list.tourForm" : "appointments.list.employeeForm"}
                context={isTourScope
                  ? { type: "tour", tourId: resolvedWeek.tourId }
                  : { type: "employee", employeeId: employeeId as number }}
                onOpenAppointment={onOpenAppointment}
                fixedDateRange={{
                  dateFrom: resolvedWeek.weekStartDate,
                  dateTo: resolvedWeek.weekEndDate,
                }}
                emptyStateOverride={<></>}
                className="min-h-0 flex-1"
              />
            </TabsContent>
          </Tabs>
          ) : (
            <JournalRecordsView
              context={{ tableName: "calendar_week", recordKey: journalContextKey }}
              pageSize={25}
              testIdPrefix="tour-week-journal"
            />
          )}
        </EntityFormShell>
      </div>
      </Tabs>

      <Dialog open={!readOnly && employeePickerOpen} onOpenChange={setEmployeePickerOpen}>
        <DialogContent className="h-[100dvh] w-[100dvw] max-w-none overflow-hidden rounded-none p-0 sm:h-[85vh] sm:w-[95vw] sm:max-w-5xl sm:rounded-lg">
          <EmployeePickerDialogList
            employees={availableEmployees}
            teams={teams}
            tours={[]}
            isLoading={availableEmployeesLoading}
            title="Mitarbeiter auswählen"
            allowBulkSelection
            viewModeSettingKey="appointmentEmployeePicker.viewMode"
            onSelectEmployee={(employeeId) => {
              if (!onAddWeekEmployees) return;
              void onAddWeekEmployees({
                tourId: resolvedWeek.tourId,
                isoYear: resolvedWeek.isoYear,
                isoWeek: resolvedWeek.isoWeek,
                employeeIds: [employeeId],
              }).then(() => {
                setEmployeePickerOpen(false);
              });
            }}
            onConfirmSelection={(employeeIds) => {
              if (!onAddWeekEmployees) return;
              void onAddWeekEmployees({
                tourId: resolvedWeek.tourId,
                isoYear: resolvedWeek.isoYear,
                isoWeek: resolvedWeek.isoWeek,
                employeeIds,
              }).then(() => {
                setEmployeePickerOpen(false);
              });
            }}
            onClose={() => setEmployeePickerOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
