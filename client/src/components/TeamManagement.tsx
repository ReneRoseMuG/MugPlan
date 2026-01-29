import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, UserCheck, Pencil, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ColoredEntityCard } from "@/components/ui/colored-entity-card";
import { CardListLayout } from "@/components/ui/card-list-layout";
import { ColorPickerButton } from "@/components/ui/color-picker-button";
import { getRandomPastelColor } from "@/lib/colors";
import type { Team, Employee } from "@shared/schema";

interface TeamWithMembers extends Team {
  members: Employee[];
}

interface TeamManagementProps {
  onCancel?: () => void;
}

function EditTeamMembersDialog({
  open,
  onOpenChange,
  team,
  allEmployees,
  onSave,
  isSaving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: TeamWithMembers;
  allEmployees: Employee[];
  onSave: (teamId: number, employeeIds: number[], color: string) => void;
  isSaving: boolean;
}) {
  const currentMemberIds = team.members.map(m => m.id);
  const [selectedMembers, setSelectedMembers] = useState<number[]>(currentMemberIds);
  const [selectedColor, setSelectedColor] = useState<string>(team.color);

  const handleToggleMember = (employeeId: number) => {
    setSelectedMembers((prev) =>
      prev.includes(employeeId)
        ? prev.filter((id) => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const handleSave = () => {
    onSave(team.id, selectedMembers, selectedColor);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setSelectedMembers(currentMemberIds);
      setSelectedColor(team.color);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Users className="w-5 h-5" />
            {team.name}
            <ColorPickerButton
              color={selectedColor}
              onChange={setSelectedColor}
              testId="button-team-color-picker"
            />
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div 
            className="border-l-4 border border-border bg-slate-50 p-3"
            style={{ borderLeftColor: selectedColor }}
          >
            <div className="text-sm font-medium text-slate-700 mb-2">
              Mitarbeiter auswählen:
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {allEmployees.filter(e => e.isActive).map((employee) => {
                const isAssignedElsewhere = employee.teamId !== null && employee.teamId !== team.id;
                const isSelected = selectedMembers.includes(employee.id);
                return (
                  <div
                    key={employee.id}
                    onClick={() => !isAssignedElsewhere && handleToggleMember(employee.id)}
                    className={`flex items-center gap-3 p-2 rounded-md cursor-pointer ${
                      isAssignedElsewhere ? "opacity-50 bg-slate-100 cursor-not-allowed" : isSelected ? "bg-primary/10" : "hover:bg-white"
                    }`}
                    data-testid={`checkbox-team-employee-${employee.id}`}
                  >
                    <Checkbox
                      id={`team-employee-${employee.id}`}
                      disabled={isAssignedElsewhere}
                      checked={isSelected}
                      onClick={(e) => e.stopPropagation()}
                      onCheckedChange={() => handleToggleMember(employee.id)}
                    />
                    <span
                      className={`text-sm ${
                        isAssignedElsewhere ? "text-slate-400" : "text-slate-700"
                      }`}
                    >
                      {employee.lastName}, {employee.firstName}
                      {isAssignedElsewhere && (
                        <span className="ml-2 text-xs text-slate-400">(bereits in anderem Team)</span>
                      )}
                    </span>
                  </div>
                );
              })}
              {allEmployees.filter(e => e.isActive).length === 0 && (
                <div className="text-sm text-slate-400 italic py-2">
                  Keine aktiven Mitarbeiter vorhanden
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSave} disabled={isSaving} data-testid="button-save-team-members">
              {isSaving ? "Speichern..." : "Speichern"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function TeamManagement({ onCancel }: TeamManagementProps) {
  const [editingTeam, setEditingTeam] = useState<TeamWithMembers | null>(null);

  const { data: teams = [], isLoading: teamsLoading } = useQuery<Team[]>({
    queryKey: ['/api/teams'],
  });

  const { data: employees = [], isLoading: employeesLoading } = useQuery<Employee[]>({
    queryKey: ['/api/employees'],
  });

  const isLoading = teamsLoading || employeesLoading;

  const teamsWithMembers: TeamWithMembers[] = teams.map((team, index) => ({
    ...team,
    members: employees.filter(e => e.teamId === team.id),
    color: team.color || getRandomPastelColor(index),
  }));

  const createMutation = useMutation({
    mutationFn: async () => {
      const color = getRandomPastelColor(teams.length);
      return apiRequest('POST', '/api/teams', { color });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/teams'] });
    },
  });

  const invalidateEmployees = () => {
    queryClient.invalidateQueries({ 
      predicate: (query) => {
        const key = query.queryKey;
        return Array.isArray(key) && key[0] === "/api/employees";
      }
    });
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/teams/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/teams'] });
      invalidateEmployees();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, color }: { id: number; color: string }) => {
      return apiRequest('PATCH', `/api/teams/${id}`, { color });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/teams'] });
    },
  });

  const assignMembersMutation = useMutation({
    mutationFn: async ({ teamId, employeeIds }: { teamId: number; employeeIds: number[] }) => {
      return apiRequest('POST', `/api/teams/${teamId}/employees`, { employeeIds });
    },
    onSuccess: () => {
      invalidateEmployees();
      setEditingTeam(null);
    },
  });

  const removeEmployeeMutation = useMutation({
    mutationFn: async (employeeId: number) => {
      return apiRequest('DELETE', `/api/teams/employees/${employeeId}`);
    },
    onSuccess: () => {
      invalidateEmployees();
    },
  });

  const handleSaveTeam = async (teamId: number, employeeIds: number[], color: string) => {
    await updateMutation.mutateAsync({ id: teamId, color });
    assignMembersMutation.mutate({ teamId, employeeIds });
  };

  const handleRemoveEmployee = (employeeId: number) => {
    removeEmployeeMutation.mutate(employeeId);
  };

  return (
    <>
      <CardListLayout
        title="Teams"
        icon={<Users className="w-5 h-5" />}
        helpKey="teams"
        isLoading={isLoading}
        onClose={onCancel}
        closeTestId="button-close-teams"
        gridTestId="list-teams"
        gridCols="3"
        primaryAction={{
          label: "Neues Team",
          onClick: () => createMutation.mutate(),
          isPending: createMutation.isPending,
          testId: "button-new-team",
        }}
        secondaryAction={onCancel ? {
          label: "Schließen",
          onClick: onCancel,
          testId: "button-cancel-teams",
        } : undefined}
      >
        {teamsWithMembers.map((team) => (
          <ColoredEntityCard
            key={team.id}
            title={team.name}
            icon={<Users className="w-4 h-4" />}
            borderColor={team.color}
            onDelete={() => deleteMutation.mutate(team.id)}
            isDeleting={deleteMutation.isPending}
            testId={`card-team-${team.id}`}
            footer={
              <Button
                size="icon"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingTeam(team);
                }}
                data-testid={`button-edit-team-members-${team.id}`}
              >
                <Pencil className="w-4 h-4" />
              </Button>
            }
          >
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-2">
              Mitarbeiter
            </div>
            <div className="space-y-1">
              {team.members.map((member) => (
                <div 
                  key={member.id} 
                  className="text-sm text-slate-700 flex items-center justify-between group"
                  data-testid={`text-team-member-${member.id}`}
                >
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-3 h-3 text-primary" />
                    {member.lastName}, {member.firstName}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveEmployee(member.id);
                    }}
                    data-testid={`button-remove-team-employee-${member.id}`}
                  >
                    <X className="w-3 h-3 text-slate-400 hover:text-red-500" />
                  </Button>
                </div>
              ))}
              {team.members.length === 0 && (
                <div className="text-sm text-slate-400 italic">
                  Keine Mitarbeiter zugewiesen
                </div>
              )}
            </div>
          </ColoredEntityCard>
        ))}
      </CardListLayout>

      {editingTeam && (
        <EditTeamMembersDialog
          open={!!editingTeam}
          onOpenChange={(open) => !open && setEditingTeam(null)}
          team={teamsWithMembers.find(t => t.id === editingTeam.id) || editingTeam}
          allEmployees={employees}
          onSave={handleSaveTeam}
          isSaving={updateMutation.isPending || assignMembersMutation.isPending}
        />
      )}
    </>
  );
}
