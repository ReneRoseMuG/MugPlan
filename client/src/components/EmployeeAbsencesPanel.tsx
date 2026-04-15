import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CalendarRange, Pencil, Plus, Trash2 } from "lucide-react";
import type { Employee, EmployeeAbsence } from "@shared/schema";
import { EditFormContextText } from "@/components/ui/edit-form-context-text";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatAbsenceEditContext } from "@/lib/edit-form-context";
import { refreshMonitoringWithNotification } from "@/lib/monitoring";
import { getBerlinTodayDateString } from "@/lib/project-appointments";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableView, type TableViewColumnDef } from "@/components/ui/table-view";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type AbsenceType = "vacation" | "sick";

type FormState = {
  type: AbsenceType;
  from: string;
  until: string;
};

type AffectedAppointment = {
  appointmentId: number;
  startDate: string;
  tourName: string | null;
  employees: Array<{ id: number; fullName: string }>;
};

type BulkReplaceResult = {
  updatedAppointmentCount: number;
  skippedAlreadyAssignedCount: number;
  skipped: Array<{ appointmentId: number; reason: "EMPLOYEE_ABSENCE" | "EMPLOYEE_EXIT_DATE" }>;
};

const defaultFormState = (): FormState => {
  const today = getBerlinTodayDateString();
  return {
    type: "vacation",
    from: today,
    until: today,
  };
};

function extractApiCode(error: unknown): string | null {
  if (!(error instanceof Error)) return null;
  const match = error.message.match(/"code"\s*:\s*"([A-Z_]+)"/);
  return match?.[1] ?? null;
}

function formatAbsenceType(type: AbsenceType): string {
  return type === "vacation" ? "Urlaub" : "Krankheit";
}

function formatDate(value: string): string {
  const [year, month, day] = value.split("-");
  return `${day}.${month}.${year}`;
}

async function fetchEmployeeAbsences(employeeId: number): Promise<EmployeeAbsence[]> {
  const response = await fetch(`/api/employees/${employeeId}/absences`, {
    credentials: "include",
  });

  if (!response.ok) {
    const text = (await response.text()) || "Abwesenheiten konnten nicht geladen werden";
    throw new Error(text);
  }

  const payload = await response.json();
  if (!Array.isArray(payload)) {
    throw new Error("Abwesenheiten konnten nicht geladen werden");
  }

  return payload as EmployeeAbsence[];
}

interface EmployeeAbsencesPanelProps {
  employeeId: number;
  employees?: Employee[];
  listVariant?: "cards" | "table";
  onOpenAppointment?: (appointmentId: number) => void;
}

export function EmployeeAbsencesPanel({
  employeeId,
  employees = [],
  listVariant = "cards",
  onOpenAppointment,
}: EmployeeAbsencesPanelProps) {
  const { toast } = useToast();
  const [userRole] = useState(() => window.localStorage.getItem("userRole")?.toUpperCase() ?? "DISPATCHER");
  const canManageAbsences = userRole === "ADMIN" || userRole === "DISPATCHER" || userRole === "DISPONENT";
  const [formState, setFormState] = useState<FormState>(() => defaultFormState());
  const [editingAbsenceId, setEditingAbsenceId] = useState<number | null>(null);
  const [previewAbsenceId, setPreviewAbsenceId] = useState<number | null>(null);
  const [previewAppointments, setPreviewAppointments] = useState<AffectedAppointment[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [replacementEmployeeId, setReplacementEmployeeId] = useState<number | null>(null);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [previewFollowUpError, setPreviewFollowUpError] = useState<string | null>(null);

  const queryKey = useMemo(() => ["/api/employees", employeeId, "absences"], [employeeId]);

  const invalidateAbsences = () => {
    void queryClient.invalidateQueries({ queryKey });
    void queryClient.invalidateQueries({ queryKey: ["/api/employees", employeeId] });
  };

  const { data: absences = [], isLoading } = useQuery<EmployeeAbsence[]>({
    queryKey,
    queryFn: () => fetchEmployeeAbsences(employeeId),
    enabled: canManageAbsences,
  });

  const loadPreview = async (absenceId: number) => {
    setPreviewLoading(true);
    try {
      const response = await fetch(`/api/employees/${employeeId}/absences/${absenceId}/appointments-preview`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error((await response.text()) || "Vorschau konnte nicht geladen werden");
      }
      const payload = await response.json() as { appointments?: AffectedAppointment[] };
      setPreviewAbsenceId(absenceId);
      setPreviewAppointments(Array.isArray(payload.appointments) ? payload.appointments : []);
      setReplacementEmployeeId(null);
      setPreviewOpen(true);
      setPreviewFollowUpError(null);
      return true;
    } catch (error) {
      const description = error instanceof Error ? error.message : "Vorschau konnte nicht geladen werden";
      setPreviewFollowUpError(
        "Die Abwesenheit wurde gespeichert, aber die betroffenen Termine konnten nicht geladen werden. Bitte öffnen Sie die Vorschau erneut, bevor Sie die Disposition abschließen.",
      );
      toast({
        title: "Vorschau konnte nicht geladen werden",
        description,
        variant: "destructive",
      });
      return false;
    } finally {
      setPreviewLoading(false);
    }
  };

  const createMutation = useMutation({
    mutationFn: async (payload: FormState) => {
      const response = await apiRequest("POST", `/api/employees/${employeeId}/absences`, payload);
      return response.json() as Promise<EmployeeAbsence>;
    },
    onSuccess: async (created) => {
      invalidateAbsences();
      setFormState(defaultFormState());
      const previewLoaded = await loadPreview(created.id);
      toast({
        title: previewLoaded ? "Abwesenheit gespeichert" : "Abwesenheit gespeichert, Folgeprüfung offen",
        description: previewLoaded
          ? undefined
          : "Betroffene Termine konnten nicht geladen werden. Bitte pruefen Sie die Vorschau erneut.",
        variant: previewLoaded ? "default" : "destructive",
      });
    },
    onError: (error: Error) => {
      const code = extractApiCode(error);
      toast({
        title: "Abwesenheit konnte nicht gespeichert werden",
        description: code === "VALIDATION_ERROR" ? "Bitte pruefen Sie Typ, Von und Bis." : undefined,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: FormState & { version: number }) => {
      const response = await apiRequest("PUT", `/api/employees/${employeeId}/absences/${editingAbsenceId}`, payload);
      return response.json() as Promise<EmployeeAbsence>;
    },
    onSuccess: async (updated) => {
      invalidateAbsences();
      setEditingAbsenceId(null);
      setFormState(defaultFormState());
      const previewLoaded = await loadPreview(updated.id);
      toast({
        title: previewLoaded ? "Abwesenheit aktualisiert" : "Abwesenheit aktualisiert, Folgeprüfung offen",
        description: previewLoaded
          ? undefined
          : "Betroffene Termine konnten nicht geladen werden. Bitte pruefen Sie die Vorschau erneut.",
        variant: previewLoaded ? "default" : "destructive",
      });
    },
    onError: (error: Error) => {
      const code = extractApiCode(error);
      const description = code === "VERSION_CONFLICT"
        ? "Die Abwesenheit wurde zwischenzeitlich geaendert. Bitte neu laden."
        : code === "VALIDATION_ERROR"
          ? "Bitte pruefen Sie Typ, Von und Bis."
          : undefined;
      toast({ title: "Abwesenheit konnte nicht aktualisiert werden", description, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ absenceId, version }: { absenceId: number; version: number }) =>
      apiRequest("DELETE", `/api/employees/${employeeId}/absences/${absenceId}`, { version }),
    onSuccess: () => {
      invalidateAbsences();
      if (editingAbsenceId !== null) {
        setEditingAbsenceId(null);
        setFormState(defaultFormState());
      }
      toast({ title: "Abwesenheit gelöscht" });
    },
    onError: (error: Error) => {
      const code = extractApiCode(error);
      const description = code === "VERSION_CONFLICT"
        ? "Die Abwesenheit wurde zwischenzeitlich geaendert. Bitte neu laden."
        : code === "VALIDATION_ERROR"
          ? "Vergangene Abwesenheiten können nicht gelöscht werden."
          : undefined;
      toast({ title: "Abwesenheit konnte nicht gelöscht werden", description, variant: "destructive" });
    },
  });

  const bulkReplaceMutation = useMutation({
    mutationFn: async () => {
      if (!previewAbsenceId || !replacementEmployeeId) {
        throw new Error("Bitte Ersatzmitarbeiter wählen.");
      }
      const response = await apiRequest(
        "POST",
        `/api/employees/${employeeId}/absences/${previewAbsenceId}/bulk-replace-appointments`,
        { replacementEmployeeId },
      );
      return response.json() as Promise<BulkReplaceResult>;
    },
    onSuccess: (result) => {
      setBulkConfirmOpen(false);
      setPreviewOpen(false);
      setPreviewAppointments([]);
      setPreviewAbsenceId(null);
      setReplacementEmployeeId(null);
      void refreshMonitoringWithNotification(toast);
      const skippedDescription = result.skippedAlreadyAssignedCount > 0
        ? ` ${result.skippedAlreadyAssignedCount} Termine wurden übersprungen, weil der Ersatz bereits zugewiesen war.`
        : "";
      const availabilitySkippedDescription = result.skipped.length > 0
        ? ` ${result.skipped.length} Termine wurden wegen Abwesenheit oder Austritt nicht angepasst.`
        : "";
      toast({
        title: "Termine bereinigt",
        description: `${result.updatedAppointmentCount} Termine wurden aktualisiert.${skippedDescription}${availabilitySkippedDescription}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Bulk-Ersatz fehlgeschlagen",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async () => {
    if (editingAbsenceId === null) {
      await createMutation.mutateAsync(formState);
      return;
    }

    const currentAbsence = absences.find((absence) => absence.id === editingAbsenceId);
    if (!currentAbsence) {
      toast({ title: "Abwesenheit nicht gefunden", variant: "destructive" });
      return;
    }

    await updateMutation.mutateAsync({
      ...formState,
      version: currentAbsence.version,
    });
  };

  const handleEdit = (absence: EmployeeAbsence) => {
    setPreviewFollowUpError(null);
    setEditingAbsenceId(absence.id);
    setFormState({
      type: absence.type,
      from: absence.from,
      until: absence.until,
    });
  };

  const absenceRows = Array.isArray(absences) ? absences : [];
  const replacementOptions = employees.filter((employee) => employee.id !== employeeId && employee.isActive);
  const tableColumns = useMemo<TableViewColumnDef<EmployeeAbsence>[]>(() => [
    {
      id: "type",
      header: "Typ",
      accessor: (row) => formatAbsenceType(row.type),
      minWidth: 160,
    },
    {
      id: "from",
      header: "Von",
      accessor: (row) => row.from,
      minWidth: 120,
      cell: ({ row }) => <span>{formatDate(row.from)}</span>,
    },
    {
      id: "until",
      header: "Bis",
      accessor: (row) => row.until,
      minWidth: 120,
      cell: ({ row }) => <span>{formatDate(row.until)}</span>,
    },
    {
      id: "actions",
      header: "Aktionen",
      minWidth: 320,
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => handleEdit(row)} data-testid={`button-edit-employee-absence-${row.id}`}>
            <Pencil className="mr-2 h-4 w-4" />
            Bearbeiten
          </Button>
          <Button type="button" variant="outline" onClick={() => void loadPreview(row.id)} data-testid={`button-preview-employee-absence-${row.id}`}>
            Vorschau
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => deleteMutation.mutate({ absenceId: row.id, version: row.version })}
            data-testid={`button-delete-employee-absence-${row.id}`}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Löschen
          </Button>
        </div>
      ),
    },
  ], [deleteMutation]);

  const handleReset = () => {
    setPreviewFollowUpError(null);
    setEditingAbsenceId(null);
    setFormState(defaultFormState());
  };
  const absenceEditContext = useMemo(
    () => (
      editingAbsenceId !== null
        ? formatAbsenceEditContext({
          from: formState.from,
          until: formState.until,
          typeLabel: formatAbsenceType(formState.type),
        })
        : null
    ),
    [editingAbsenceId, formState.from, formState.type, formState.until],
  );

  if (!canManageAbsences) {
    return (
      <div className="rounded-md border border-border bg-slate-50 px-4 py-3 text-sm text-muted-foreground">
        Keine Berechtigung für Mitarbeiterabwesenheiten.
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="employee-absences-panel">
      <Card>
        <CardHeader className="gap-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarRange className="h-4 w-4" />
            {editingAbsenceId === null ? "Abwesenheit anlegen" : "Abwesenheit bearbeiten"}
          </CardTitle>
          <EditFormContextText>{absenceEditContext}</EditFormContextText>
        </CardHeader>
        <CardContent className="space-y-4">
          {previewFollowUpError ? (
            <Alert variant="destructive" data-testid="alert-employee-absence-preview-followup-required">
              <AlertTitle>Betroffene Termine muessen noch geprueft werden</AlertTitle>
              <AlertDescription>{previewFollowUpError}</AlertDescription>
            </Alert>
          ) : null}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="employee-absence-type">Typ</Label>
              <Select
                value={formState.type}
                onValueChange={(value: AbsenceType) => setFormState((prev) => ({ ...prev, type: value }))}
              >
                <SelectTrigger id="employee-absence-type" data-testid="select-employee-absence-type">
                  <SelectValue placeholder="Typ wählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vacation">Urlaub</SelectItem>
                  <SelectItem value="sick">Krankheit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="employee-absence-from">Von</Label>
              <Input
                id="employee-absence-from"
                type="date"
                value={formState.from}
                onChange={(event) => setFormState((prev) => ({ ...prev, from: event.target.value }))}
                data-testid="input-employee-absence-from"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employee-absence-until">Bis</Label>
              <Input
                id="employee-absence-until"
                type="date"
                value={formState.until}
                onChange={(event) => setFormState((prev) => ({ ...prev, until: event.target.value }))}
                data-testid="input-employee-absence-until"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-employee-absence"
            >
              {editingAbsenceId === null ? <Plus className="mr-2 h-4 w-4" /> : <Pencil className="mr-2 h-4 w-4" />}
              {editingAbsenceId === null ? "Abwesenheit speichern" : "Aenderung speichern"}
            </Button>
            {editingAbsenceId !== null ? (
              <Button type="button" variant="outline" onClick={handleReset} data-testid="button-cancel-employee-absence-edit">
                Bearbeitung abbrechen
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Abwesenheitsliste</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Abwesenheiten werden geladen...</div>
          ) : absenceRows.length === 0 ? (
            <div className="rounded-md border border-dashed border-border px-4 py-6 text-sm text-muted-foreground" data-testid="empty-employee-absences">
              Für diesen Mitarbeiter sind noch keine Abwesenheiten erfasst.
            </div>
          ) : listVariant === "table" ? (
            <TableView
              testId="table-employee-absences"
              columns={tableColumns}
              rows={absenceRows}
              rowKey={(row) => row.id}
              stickyHeader
            />
          ) : (
            <div className="space-y-3">
              {absenceRows.map((absence) => (
                <div
                  key={absence.id}
                  className="flex flex-col gap-3 rounded-md border border-border bg-card p-4 md:flex-row md:items-center md:justify-between"
                  data-testid={`employee-absence-row-${absence.id}`}
                >
                  <div className="space-y-1">
                    <div className="text-sm font-medium">{formatAbsenceType(absence.type)}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(absence.from)} bis {formatDate(absence.until)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => handleEdit(absence)} data-testid={`button-edit-employee-absence-${absence.id}`}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Bearbeiten
                    </Button>
                    <Button type="button" variant="outline" onClick={() => void loadPreview(absence.id)} data-testid={`button-preview-employee-absence-${absence.id}`}>
                      Vorschau
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => deleteMutation.mutate({ absenceId: absence.id, version: absence.version })}
                      data-testid={`button-delete-employee-absence-${absence.id}`}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Löschen
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl" data-testid="dialog-employee-absence-preview">
          <DialogHeader>
            <DialogTitle>Betroffene Termine</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {previewLoading ? (
              <div className="text-sm text-muted-foreground">Vorschau wird geladen...</div>
            ) : previewAppointments.length === 0 ? (
              <div
                className="rounded-md border border-dashed border-border px-4 py-6 text-sm text-muted-foreground"
                data-testid="empty-employee-absence-preview"
              >
                Keine zukuenftigen Termine betroffen.
              </div>
            ) : (
              <div className="space-y-3">
                {previewAppointments.map((appointment) => (
                  <div key={appointment.appointmentId} className="rounded-md border border-border p-4" data-testid={`employee-absence-preview-appointment-${appointment.appointmentId}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="font-medium">{formatDate(appointment.startDate)}</div>
                        <div className="text-sm text-muted-foreground">
                          Tour: {appointment.tourName ?? "-"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Mitarbeiter: {appointment.employees.map((employee) => employee.fullName).join(", ") || "-"}
                        </div>
                      </div>
                      <Button type="button" variant="outline" onClick={() => onOpenAppointment?.(appointment.appointmentId)}>
                        Termin oeffnen
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
              <div className="space-y-2">
                <Label htmlFor="employee-absence-replacement">Ersatzmitarbeiter</Label>
                <Select
                  value={replacementEmployeeId === null ? "" : String(replacementEmployeeId)}
                  onValueChange={(value) => setReplacementEmployeeId(value ? Number(value) : null)}
                >
                  <SelectTrigger id="employee-absence-replacement" data-testid="select-employee-absence-replacement">
                    <SelectValue placeholder="Ersatzmitarbeiter wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {replacementOptions.map((employee) => (
                      <SelectItem key={employee.id} value={String(employee.id)}>
                        {employee.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                onClick={() => setBulkConfirmOpen(true)}
                disabled={previewAppointments.length === 0 || replacementEmployeeId === null || bulkReplaceMutation.isPending}
                data-testid="button-employee-absence-bulk-replace"
              >
                Pulkersatz ausfuehren
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={bulkConfirmOpen} onOpenChange={setBulkConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pulkersatz bestaetigen?</AlertDialogTitle>
            <AlertDialogDescription>
              {previewAppointments.length} betroffene Termine werden bereinigt. Diese Aktion wird nur nach Ihrer Bestaetigung ausgefuehrt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                void bulkReplaceMutation.mutateAsync();
              }}
            >
              Bestaetigen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
