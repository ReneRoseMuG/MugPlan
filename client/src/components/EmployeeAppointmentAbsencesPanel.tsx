import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CalendarX, Check, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  ABSENCE_TAG_DEFINITIONS,
  absenceTypeValues,
  resolveAbsenceTypeFromTagName,
  type AbsenceType,
} from "@shared/absenceAppointments";
import type { EmployeeAppointmentAbsenceResponse } from "@shared/routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AbsenceFormState = {
  absenceType: AbsenceType;
  startDate: string;
  endDate: string;
  note: string;
};

type EmployeeAppointmentAbsencesPanelProps = {
  employeeId: number;
  readOnly: boolean;
  onOpenAppointment?: (appointmentId: number) => void;
};

const defaultFormState: AbsenceFormState = {
  absenceType: "vacation",
  startDate: "",
  endDate: "",
  note: "",
};

function extractApiCode(error: unknown): string | null {
  if (!(error instanceof Error)) return null;
  const match = error.message.match(/"code"\s*:\s*"([A-Z_]+)"/);
  return match?.[1] ?? null;
}

function extractConflictEmployees(error: unknown): string | null {
  if (!(error instanceof Error)) return null;
  const match = error.message.match(/"conflictEmployees"\s*:\s*(\[[^\]]*\])/);
  if (!match) return null;
  try {
    const employees = JSON.parse(match[1]) as Array<{ fullName?: string }>;
    const names = employees.map((employee) => employee.fullName).filter(Boolean);
    return names.length > 0 ? names.join(", ") : null;
  } catch {
    return null;
  }
}

function toFormState(item: EmployeeAppointmentAbsenceResponse): AbsenceFormState {
  const tagType = item.appointmentTags
    .map((tag) => resolveAbsenceTypeFromTagName(tag.name))
    .find((absenceType): absenceType is AbsenceType => absenceType != null);
  return {
    absenceType: tagType ?? "absent",
    startDate: item.startDate,
    endDate: item.endDate ?? "",
    note: item.description ?? "",
  };
}

function toPayload(state: AbsenceFormState) {
  return {
    absenceType: state.absenceType,
    startDate: state.startDate,
    endDate: state.endDate.trim().length > 0 ? state.endDate : null,
    note: state.note.trim().length > 0 ? state.note.trim() : null,
  };
}

function getAbsenceTypeLabel(absenceType: AbsenceType): string {
  return ABSENCE_TAG_DEFINITIONS[absenceType].name;
}

function formatDateRange(startDate: string, endDate: string | null): string {
  if (!endDate || endDate === startDate) return startDate;
  return `${startDate} - ${endDate}`;
}

export function EmployeeAppointmentAbsencesPanel({
  employeeId,
  readOnly,
  onOpenAppointment,
}: EmployeeAppointmentAbsencesPanelProps) {
  const { toast } = useToast();
  const [newForm, setNewForm] = useState<AbsenceFormState>(defaultFormState);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<AbsenceFormState>(defaultFormState);

  const queryKey = useMemo(() => ["/api/employees", employeeId, "absence-appointments"], [employeeId]);

  const { data: absences = [], isLoading } = useQuery<EmployeeAppointmentAbsenceResponse[]>({
    queryKey,
    queryFn: async () => {
      const response = await fetch(`/api/employees/${employeeId}/absence-appointments`, { credentials: "include" });
      if (!response.ok) {
        throw new Error("Abwesenheiten konnten nicht geladen werden");
      }
      return response.json();
    },
  });

  const invalidateAbsenceQueries = async () => {
    await queryClient.invalidateQueries({ queryKey });
    await queryClient.invalidateQueries({ queryKey: ["appointments-list"] });
    await queryClient.invalidateQueries({ queryKey: ["/api/employees", employeeId, "appointments"] });
    await queryClient.invalidateQueries({ queryKey: ["/api/employees", employeeId, "revenue-overview"] });
    await queryClient.invalidateQueries({
      predicate: (query) => {
        const firstKey = Array.isArray(query.queryKey) ? query.queryKey[0] : null;
        return firstKey === "calendarAppointments" || firstKey === "employees-page-appointments";
      },
    });
  };

  const handleMutationError = (error: Error, action: string) => {
    const code = extractApiCode(error);
    if (code === "EMPLOYEE_OVERLAP_CONFLICT") {
      const names = extractConflictEmployees(error);
      toast({
        title: `${action} nicht möglich`,
        description: names ? `Überschneidung mit: ${names}` : "Der Zeitraum überschneidet sich mit bestehenden Terminen.",
        variant: "destructive",
      });
      return;
    }
    if (code === "VERSION_CONFLICT") {
      toast({
        title: `${action} nicht möglich`,
        description: "Die Abwesenheit wurde zwischenzeitlich geändert. Bitte neu laden.",
        variant: "destructive",
      });
      return;
    }
    if (code === "FORBIDDEN") {
      toast({ title: `${action} nicht erlaubt`, variant: "destructive" });
      return;
    }
    toast({ title: `${action} fehlgeschlagen`, variant: "destructive" });
  };

  const createMutation = useMutation({
    mutationFn: async (state: AbsenceFormState) => {
      const response = await apiRequest("POST", `/api/employees/${employeeId}/absence-appointments`, toPayload(state));
      return response.json() as Promise<EmployeeAppointmentAbsenceResponse>;
    },
    onSuccess: async () => {
      setNewForm(defaultFormState);
      await invalidateAbsenceQueries();
      toast({ title: "Abwesenheit angelegt" });
    },
    onError: (error: Error) => handleMutationError(error, "Anlegen"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ item, state }: { item: EmployeeAppointmentAbsenceResponse; state: AbsenceFormState }) => {
      const response = await apiRequest("PUT", `/api/employees/${employeeId}/absence-appointments/${item.id}`, {
        ...toPayload(state),
        version: item.version,
      });
      return response.json() as Promise<EmployeeAppointmentAbsenceResponse>;
    },
    onSuccess: async () => {
      setEditingId(null);
      await invalidateAbsenceQueries();
      toast({ title: "Abwesenheit gespeichert" });
    },
    onError: (error: Error) => handleMutationError(error, "Speichern"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (item: EmployeeAppointmentAbsenceResponse) => {
      await apiRequest("DELETE", `/api/employees/${employeeId}/absence-appointments/${item.id}`, { version: item.version });
    },
    onSuccess: async () => {
      await invalidateAbsenceQueries();
      toast({ title: "Abwesenheit gelöscht" });
    },
    onError: (error: Error) => handleMutationError(error, "Löschen"),
  });

  const canSubmitNew = !readOnly && newForm.startDate.trim().length > 0;
  const currentEditItem = absences.find((item) => item.id === editingId) ?? null;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4" data-testid="employee-absence-appointments-panel">
      {!readOnly ? (
        <div className="sub-panel grid gap-4 lg:grid-cols-[180px_160px_160px_minmax(220px,1fr)_auto]">
          <div className="space-y-2">
            <Label htmlFor="absence-type">Art</Label>
            <select
              id="absence-type"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={newForm.absenceType}
              onChange={(event) => setNewForm((prev) => ({ ...prev, absenceType: event.target.value as AbsenceType }))}
              data-testid="select-employee-absence-type"
            >
              {absenceTypeValues.map((absenceType) => (
                <option key={absenceType} value={absenceType}>{getAbsenceTypeLabel(absenceType)}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="absence-start-date">Von</Label>
            <Input
              id="absence-start-date"
              type="date"
              value={newForm.startDate}
              onChange={(event) => setNewForm((prev) => ({ ...prev, startDate: event.target.value }))}
              data-testid="input-employee-absence-start-date"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="absence-end-date">Bis</Label>
            <Input
              id="absence-end-date"
              type="date"
              value={newForm.endDate}
              onChange={(event) => setNewForm((prev) => ({ ...prev, endDate: event.target.value }))}
              data-testid="input-employee-absence-end-date"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="absence-note">Notiz</Label>
            <Textarea
              id="absence-note"
              value={newForm.note}
              onChange={(event) => setNewForm((prev) => ({ ...prev, note: event.target.value }))}
              className="min-h-10 resize-none"
              data-testid="textarea-employee-absence-note"
            />
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              className="gap-2"
              disabled={!canSubmitNew || createMutation.isPending}
              onClick={() => createMutation.mutate(newForm)}
              data-testid="button-create-employee-absence"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Anlegen
            </Button>
          </div>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-hidden rounded-md border border-border bg-background">
        <Table containerClassName="h-full">
          <TableHeader>
            <TableRow>
              <TableHead className="w-40">Art</TableHead>
              <TableHead className="w-56">Zeitraum</TableHead>
              <TableHead>Notiz</TableHead>
              <TableHead className="w-36 text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground">Wird geladen...</TableCell>
              </TableRow>
            ) : absences.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground">Keine Abwesenheiten vorhanden</TableCell>
              </TableRow>
            ) : absences.map((item) => {
              const absenceType = toFormState(item).absenceType;
              const definition = ABSENCE_TAG_DEFINITIONS[absenceType];
              const isEditingRow = editingId === item.id;
              return (
                <TableRow key={item.id} data-testid={`row-employee-absence-${item.id}`}>
                  <TableCell>
                    {isEditingRow ? (
                      <select
                        className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                        value={editForm.absenceType}
                        onChange={(event) => setEditForm((prev) => ({ ...prev, absenceType: event.target.value as AbsenceType }))}
                        data-testid={`select-employee-absence-edit-type-${item.id}`}
                      >
                        {absenceTypeValues.map((entry) => (
                          <option key={entry} value={entry}>{getAbsenceTypeLabel(entry)}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs font-semibold">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: definition.color }} />
                        {definition.name}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditingRow ? (
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Input
                          type="date"
                          value={editForm.startDate}
                          onChange={(event) => setEditForm((prev) => ({ ...prev, startDate: event.target.value }))}
                          data-testid={`input-employee-absence-edit-start-${item.id}`}
                        />
                        <Input
                          type="date"
                          value={editForm.endDate}
                          onChange={(event) => setEditForm((prev) => ({ ...prev, endDate: event.target.value }))}
                          data-testid={`input-employee-absence-edit-end-${item.id}`}
                        />
                      </div>
                    ) : (
                      formatDateRange(item.startDate, item.endDate)
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditingRow ? (
                      <Textarea
                        value={editForm.note}
                        onChange={(event) => setEditForm((prev) => ({ ...prev, note: event.target.value }))}
                        className="min-h-9 resize-none"
                        data-testid={`textarea-employee-absence-edit-note-${item.id}`}
                      />
                    ) : (
                      item.description || <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {isEditingRow ? (
                        <>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            disabled={editForm.startDate.trim().length === 0 || updateMutation.isPending}
                            onClick={() => currentEditItem && updateMutation.mutate({ item: currentEditItem, state: editForm })}
                            title="Speichern"
                            data-testid={`button-save-employee-absence-${item.id}`}
                          >
                            <Check className="h-4 w-4" aria-hidden />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => setEditingId(null)}
                            title="Abbrechen"
                            data-testid={`button-cancel-employee-absence-${item.id}`}
                          >
                            <X className="h-4 w-4" aria-hidden />
                          </Button>
                        </>
                      ) : (
                        <>
                          {onOpenAppointment ? (
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => onOpenAppointment(item.id)}
                              title="Termin öffnen"
                              data-testid={`button-open-employee-absence-${item.id}`}
                            >
                              <CalendarX className="h-4 w-4" aria-hidden />
                            </Button>
                          ) : null}
                          {!readOnly ? (
                            <>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  setEditingId(item.id);
                                  setEditForm(toFormState(item));
                                }}
                                title="Bearbeiten"
                                data-testid={`button-edit-employee-absence-${item.id}`}
                              >
                                <Pencil className="h-4 w-4" aria-hidden />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                disabled={deleteMutation.isPending}
                                onClick={() => deleteMutation.mutate(item)}
                                title="Löschen"
                                data-testid={`button-delete-employee-absence-${item.id}`}
                              >
                                <Trash2 className="h-4 w-4" aria-hidden />
                              </Button>
                            </>
                          ) : null}
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
