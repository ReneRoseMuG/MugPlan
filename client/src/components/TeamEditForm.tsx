import React, { useEffect, useMemo, useState } from "react";
import { Users, X } from "lucide-react";
import { EntityFormShell } from "@/components/ui/entity-form-shell";
import { ColorSelectButton } from "@/components/ui/color-select-button";
import { MembersSectionHeader } from "@/components/ui/members-section-header";
import { PlusActionButton } from "@/components/ui/plus-action-button";
import { EmployeeInfoBadge } from "@/components/ui/employee-info-badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
              {!isCreate && canDelete && team && onDelete ? (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={onDelete}
                  disabled={isSaving || isDeleting}
                  data-testid="button-delete-team-form"
                >
                  {isDeleting ? "Loeschen..." : "Team loeschen"}
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                data-testid="button-cancel-team"
              >
                Abbrechen
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
      >
      <div className="max-w-xl space-y-4" data-testid="team-form-main-column">
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
                aria-label="Mitarbeiter hinzufuegen"
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
            title="Mitarbeiter auswaehlen"
            onSelectEmployee={(employeeId) => {
              setSelectedMembers((prev) => (prev.includes(employeeId) ? prev : [...prev, employeeId]));
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
