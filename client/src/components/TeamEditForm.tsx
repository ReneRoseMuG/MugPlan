import React, { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Trash2, Users, X } from "lucide-react";
import { EntityFormShell } from "@/components/ui/entity-form-shell";
import { ColorSelectButton } from "@/components/ui/color-select-button";
import { MembersSectionHeader } from "@/components/ui/members-section-header";
import { PlusActionButton } from "@/components/ui/plus-action-button";
import { EmployeeInfoBadge } from "@/components/ui/employee-info-badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
import { EmployeePickerDialogList } from "@/components/EmployeePickerDialogList";
import type { Team, Employee } from "@shared/schema";

type TeamWithMembers = Team & {
  members: Employee[];
};

interface TeamEditFormProps {
  team: TeamWithMembers | null;
  allEmployees: Employee[];
  onSubmit: (teamId: number | null, employeeIds: number[], color: string) => Promise<void>;
  onDelete?: () => void;
  canDelete?: boolean;
  isDeleting?: boolean;
  isSaving: boolean;
  isCreate?: boolean;
  defaultName?: string;
  defaultColor?: string;
  onCancel: () => void;
}

export function TeamEditForm({
  team,
  allEmployees,
  onSubmit,
  onDelete,
  canDelete = false,
  isDeleting = false,
  isSaving,
  isCreate = false,
  defaultName = "Neues Team",
  defaultColor = "#60a5fa",
  onCancel,
}: TeamEditFormProps) {
  const [selectedMembers, setSelectedMembers] = useState<number[]>(() => team?.members.map((member) => member.id) ?? []);
  const [selectedColor, setSelectedColor] = useState<string>(() => team?.color ?? defaultColor);
  const [employeePickerOpen, setEmployeePickerOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const memberIdsKey = (team?.members ?? []).map((member) => member.id).join(",");

  useEffect(() => {
    setSelectedMembers(team?.members.map((member) => member.id) ?? []);
  }, [memberIdsKey, team?.id]);

  useEffect(() => {
    setSelectedColor(team?.color ?? defaultColor);
  }, [defaultColor, team?.color, team?.id]);

  const availableEmployees = useMemo(
    () =>
      allEmployees.filter((employee) => {
        if (!employee.isActive) return false;
        const assignedElsewhere = employee.teamId !== null && employee.teamId !== (team?.id ?? null);
        if (assignedElsewhere) return false;
        return !selectedMembers.includes(employee.id);
      }),
    [allEmployees, selectedMembers, team?.id],
  );

  const title = isCreate ? defaultName : (team?.name ?? "Team bearbeiten");
  const handleSubmit = async () => onSubmit(team?.id ?? null, selectedMembers, selectedColor);

  return (
    <div className="flex h-full min-h-0 w-full flex-1">
      <EntityFormShell
        header={(
          <div className="flex items-center justify-between gap-4 px-6 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <h2 className="text-2xl font-bold text-primary flex min-w-0 items-center gap-3">
                <Users className="w-6 h-6" />
                {title}
              </h2>
            </div>

            <Button
              type="button"
              size="lg"
              variant="ghost"
              onClick={onCancel}
              data-testid="button-close-team"
            >
              <X className="w-6 h-6" />
            </Button>
          </div>
        )}
        footer={(
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                data-testid="button-cancel-team"
              >
                Schließen
              </Button>
            </div>

            <Button
              type="button"
              onClick={() => {
                void handleSubmit();
              }}
              disabled={isSaving}
              data-testid="button-save-team"
            >
              {isSaving ? "Speichern..." : "Speichern"}
            </Button>
          </div>
        )}
        sidebar={(
          <div className="min-w-0 space-y-6 p-6" data-testid="team-form-sidebar">
            {!isCreate && canDelete && team && onDelete ? (
              <div className="sub-panel space-y-3" data-testid="team-form-functions-panel">
                <h3 className="text-sm font-bold tracking-wider text-primary">Funktionen</h3>
                <div className="flex flex-col gap-2">
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
                    data-testid="button-delete-team-form"
                  >
                    <Trash2 className="w-4 h-4" />
                    {isDeleting ? "Löschen..." : "Löschen"}
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        )}
        contentMaxWidth={99999}
      >
        <div className="w-full space-y-4" data-testid="team-form-main-column">
          <div className="sub-panel space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-bold tracking-wider text-primary">
              <Users className="w-4 h-4" />
              Farbe
            </h3>
            <ColorSelectButton
              color={selectedColor}
              onChange={setSelectedColor}
              testId="button-team-color-picker"
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
                  aria-label="Mitarbeiter hinzufügen"
                  data-testid="button-add-team-member"
                  disabled={isSaving}
                />
              )}
            />
            <div className="space-y-2 bg-slate-50 p-3">
              {selectedMembers.map((memberId) => {
                const employee = allEmployees.find((entry) => entry.id === memberId);
                if (!employee) return null;
                return (
                  <EmployeeInfoBadge
                    key={employee.id}
                    id={employee.id}
                    firstName={employee.firstName}
                    lastName={employee.lastName}
                    action="remove"
                    onRemove={() => setSelectedMembers((prev) => prev.filter((id) => id !== employee.id))}
                    size="sm"
                    fullWidth
                    testId={`badge-team-member-${employee.id}`}
                  />
                );
              })}
              {selectedMembers.length === 0 && (
                <div className="text-sm italic text-slate-400">
                  Keine Mitarbeiter zugewiesen
                </div>
              )}
            </div>
          </div>
        </div>

        <Dialog open={employeePickerOpen} onOpenChange={setEmployeePickerOpen}>
          <DialogContent className="h-[100dvh] w-[100dvw] max-w-none overflow-hidden rounded-none p-0 sm:h-[85vh] sm:w-[95vw] sm:max-w-5xl sm:rounded-lg">
            <EmployeePickerDialogList
              employees={availableEmployees}
              teams={[]}
              tours={[]}
              title="Mitarbeiter auswählen"
              onSelectEmployee={(employeeId) => {
                setSelectedMembers((prev) => (prev.includes(employeeId) ? prev : [...prev, employeeId]));
                setEmployeePickerOpen(false);
              }}
              onClose={() => setEmployeePickerOpen(false)}
            />
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Team wirklich löschen?</AlertDialogTitle>
              <AlertDialogDescription>
                Diese Aktion ist endgültig. Das Team wird gelöscht und die aktuelle Bearbeitung geschlossen.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  onDelete?.();
                }}
                data-testid="button-confirm-delete-team"
              >
                Team löschen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </EntityFormShell>
    </div>
  );
}
