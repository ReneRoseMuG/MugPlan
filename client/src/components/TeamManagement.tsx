import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Users, Pencil } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ColoredEntityCard } from "@/components/ui/colored-entity-card";
import { CardListLayout } from "@/components/ui/card-list-layout";
import { TeamEditDialog } from "@/components/ui/team-edit-dialog";
import { EmployeeInfoBadge } from "@/components/ui/employee-info-badge";
import { BadgeInteractionProvider } from "@/components/ui/badge-interaction-provider";
import { defaultEntityColor } from "@/lib/colors";
import type { Team, Employee } from "@shared/schema";

interface TeamWithMembers extends Team {
  members: Employee[];
}

interface TeamManagementProps {
  onCancel?: () => void;
}

export function TeamManagement({ onCancel }: TeamManagementProps) {
  const [editingTeam, setEditingTeam] = useState<TeamWithMembers | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const { data: teams = [], isLoading: teamsLoading } = useQuery<Team[]>({
    queryKey: ['/api/teams'],
  });

  const { data: employees = [], isLoading: employeesLoading } = useQuery<Employee[]>({
    queryKey: ['/api/employees'],
  });

  const isLoading = teamsLoading || employeesLoading;

  const teamsWithMembers: TeamWithMembers[] = teams.map((team) => ({
    ...team,
    members: employees.filter(e => e.teamId === team.id),
  }));

  const getNextTeamName = () => {
    const existingNumbers = teams
      .map(t => {
        const match = t.name.match(/^Team (\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(n => n > 0);
    const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
    return `Team ${maxNumber + 1}`;
  };

  const createMutation = useMutation({
    mutationFn: async ({ color }: { color: string }) => {
      return apiRequest('POST', '/api/teams', { color });
    },
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ['/api/teams'] });
      return response;
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
    },
  });


  const handleOpenCreate = () => {
    setEditingTeam(null);
    setIsCreating(true);
  };

  const handleSubmitTeam = async (teamId: number | null, employeeIds: number[], color: string) => {
    if (teamId === null) {
      const response = await createMutation.mutateAsync({ color });
      const newTeam = await response.json();
      await assignMembersMutation.mutateAsync({ teamId: newTeam.id, employeeIds });
    } else {
      await updateMutation.mutateAsync({ id: teamId, color });
      await assignMembersMutation.mutateAsync({ teamId, employeeIds });
    }
  };

  const handleCloseDialog = () => {
    setEditingTeam(null);
    setIsCreating(false);
  };

  const handleOpenEdit = (team: TeamWithMembers) => {
    setEditingTeam(team);
  };

  const handleOpenEditById = (teamId: number | string) => {
    const target = teamsWithMembers.find((team) => String(team.id) === String(teamId));
    if (!target) return;
    setEditingTeam(target);
    setIsCreating(false);
  };

  const handleDelete = (team: TeamWithMembers) => {
    if (window.confirm(`Wollen Sie das Team ${team.name} wirklich löschen?`)) {
      deleteMutation.mutate(team.id);
    }
  };

  return (
    <>
      <BadgeInteractionProvider value={{ openTeamEdit: handleOpenEditById }}>
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
          onClick: handleOpenCreate,
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
            onDelete={() => handleDelete(team)}
            isDeleting={deleteMutation.isPending}
            testId={`card-team-${team.id}`}
            onDoubleClick={() => handleOpenEdit(team)}
            footer={
              <Button
                size="icon"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenEdit(team);
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
            <div className="space-y-2">
              {team.members.map((member) => (
                <EmployeeInfoBadge
                  key={member.id}
                  id={member.id}
                  firstName={member.firstName}
                  lastName={member.lastName}
                  action="none"
                  size="sm"
                  fullWidth
                  testId={`text-team-member-${member.id}`}
                />
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
      </BadgeInteractionProvider>

      <TeamEditDialog
        open={!!editingTeam || isCreating}
        onOpenChange={(open) => !open && handleCloseDialog()}
        team={editingTeam ? (teamsWithMembers.find(t => t.id === editingTeam.id) || editingTeam) : null}
        allEmployees={employees}
        onSubmit={handleSubmitTeam}
        isSaving={createMutation.isPending || updateMutation.isPending || assignMembersMutation.isPending}
        isCreate={isCreating}
        defaultName={getNextTeamName()}
        defaultColor={defaultEntityColor}
      />
    </>
  );
}
