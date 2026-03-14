import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CalendarRange, Pencil, Plus, Trash2 } from "lucide-react";
import type { EmployeeAbsence } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getBerlinTodayDateString } from "@/lib/project-appointments";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableView, type TableViewColumnDef } from "@/components/ui/table-view";

type AbsenceType = "vacation" | "sick";

type FormState = {
  type: AbsenceType;
  from: string;
  until: string;
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
  listVariant?: "cards" | "table";
}

export function EmployeeAbsencesPanel({
  employeeId,
  listVariant = "cards",
}: EmployeeAbsencesPanelProps) {
  const { toast } = useToast();
  const [userRole] = useState(() => window.localStorage.getItem("userRole")?.toUpperCase() ?? "DISPATCHER");
  const canManageAbsences = userRole === "ADMIN" || userRole === "DISPATCHER" || userRole === "DISPONENT";
  const [formState, setFormState] = useState<FormState>(() => defaultFormState());
  const [editingAbsenceId, setEditingAbsenceId] = useState<number | null>(null);

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

  const createMutation = useMutation({
    mutationFn: async (payload: FormState) => apiRequest("POST", `/api/employees/${employeeId}/absences`, payload),
    onSuccess: () => {
      invalidateAbsences();
      setFormState(defaultFormState());
      toast({ title: "Abwesenheit gespeichert" });
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
    mutationFn: async (payload: FormState & { version: number }) =>
      apiRequest("PUT", `/api/employees/${employeeId}/absences/${editingAbsenceId}`, payload),
    onSuccess: () => {
      invalidateAbsences();
      setEditingAbsenceId(null);
      setFormState(defaultFormState());
      toast({ title: "Abwesenheit aktualisiert" });
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
      toast({ title: "Abwesenheit geloescht" });
    },
    onError: (error: Error) => {
      const code = extractApiCode(error);
      const description = code === "VERSION_CONFLICT"
        ? "Die Abwesenheit wurde zwischenzeitlich geaendert. Bitte neu laden."
        : code === "VALIDATION_ERROR"
          ? "Vergangene Abwesenheiten koennen nicht geloescht werden."
          : undefined;
      toast({ title: "Abwesenheit konnte nicht geloescht werden", description, variant: "destructive" });
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
    setEditingAbsenceId(absence.id);
    setFormState({
      type: absence.type,
      from: absence.from,
      until: absence.until,
    });
  };

  const absenceRows = Array.isArray(absences) ? absences : [];
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
      minWidth: 260,
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => handleEdit(row)} data-testid={`button-edit-employee-absence-${row.id}`}>
            <Pencil className="mr-2 h-4 w-4" />
            Bearbeiten
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => deleteMutation.mutate({ absenceId: row.id, version: row.version })}
            data-testid={`button-delete-employee-absence-${row.id}`}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Loeschen
          </Button>
        </div>
      ),
    },
  ], [deleteMutation, handleEdit]);

  const handleReset = () => {
    setEditingAbsenceId(null);
    setFormState(defaultFormState());
  };

  if (!canManageAbsences) {
    return (
      <div className="rounded-md border border-border bg-slate-50 px-4 py-3 text-sm text-muted-foreground">
        Keine Berechtigung fuer Mitarbeiterabwesenheiten.
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="employee-absences-panel">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarRange className="h-4 w-4" />
            {editingAbsenceId === null ? "Abwesenheit anlegen" : "Abwesenheit bearbeiten"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="employee-absence-type">Typ</Label>
              <Select
                value={formState.type}
                onValueChange={(value: AbsenceType) => setFormState((prev) => ({ ...prev, type: value }))}
              >
                <SelectTrigger id="employee-absence-type" data-testid="select-employee-absence-type">
                  <SelectValue placeholder="Typ waehlen" />
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
              Fuer diesen Mitarbeiter sind noch keine Abwesenheiten erfasst.
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
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => deleteMutation.mutate({ absenceId: absence.id, version: absence.version })}
                      data-testid={`button-delete-employee-absence-${absence.id}`}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Loeschen
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
