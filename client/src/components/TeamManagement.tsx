import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ColoredEntityCard } from "@/components/ui/colored-entity-card";
import { ListLayout } from "@/components/ui/list-layout";
import { BoardView } from "@/components/ui/board-view";
import { TeamEditForm } from "@/components/TeamEditForm";
import { ConfirmDialogBase, DialogBaseInlineMessage } from "@/components/ui/dialog-base";
import { EmployeeInfoBadge } from "@/components/ui/employee-info-badge";
import { MembersSectionHeader } from "@/components/ui/members-section-header";
import { BadgeInteractionProvider } from "@/components/ui/badge-interaction-provider";
import { defaultEntityColor } from "@/lib/colors";
import { domainIcons } from "@/lib/domain-icons";
import { normalizeServerError, type NormalizedServerError } from "@/lib/error-normalization";
import { useToast } from "@/hooks/use-toast";
import type { Team, Employee } from "@shared/schema";

interface TeamWithMembers extends Team {
  members: Employee[];
}

interface TeamManagementProps {
  onCancel?: () => void;
  userRole?: string;
  onEditingChange?: (isEditing: boolean) => void;
}

export function TeamManagement({ onCancel, userRole, onEditingChange }: TeamManagementProps) {
  const { toast } = useToast();
  const TeamsIcon = domainIcons.teams;
  const [editingTeam, setEditingTeam] = useState<TeamWithMembers | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TeamWithMembers | null>(null);
  const [listError, setListError] = useState<NormalizedServerError | null>(null);
  const [formError, setFormError] = useState<NormalizedServerError | null>(null);
  const effectiveUserRole = (userRole ?? window.localStorage.getItem("userRole") ?? "").toUpperCase();
  const canMutateTeams =
    effectiveUserRole === "ADMIN"
    || effectiveUserRole === "DISPATCHER"
    || effectiveUserRole === "DISPONENT";

  const { data: teams = [], isLoading: teamsLoading } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  const { data: employees = [], isLoading: employeesLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const isLoading = teamsLoading || employeesLoading;

  const teamsWithMembers: TeamWithMembers[] = teams.map((team) => ({
    ...team,
    members: employees.filter((employee) => employee.teamId === team.id),
  }));

  const getNextTeamName = () => {
    const existingNumbers = teams
      .map((team) => {
        const match = team.name.match(/^Team (\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((value) => value > 0);
    const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
    return `Team ${maxNumber + 1}`;
  };

  const showMutationError = (
    error: unknown,
    fallbackTitle: string,
    setInlineError: (nextError: NormalizedServerError) => void,
  ) => {
    const normalized = normalizeServerError(error, { title: fallbackTitle });
    setInlineError(normalized);
    toast({
      title: normalized.title,
      description: normalized.description,
      variant: "destructive",
    });
    return normalized;
  };

  const createMutation = useMutation({
    mutationFn: async ({ color }: { color: string }) => apiRequest("POST", "/api/teams", { color }),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      return response;
    },
  });

  const invalidateEmployees = () => {
    void queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey;
        return Array.isArray(key) && key[0] === "/api/employees";
      },
    });
  };

  const deleteMutation = useMutation({
    mutationFn: async ({ id, version }: { id: number; version: number }) =>
      apiRequest("DELETE", `/api/teams/${id}`, { version }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      invalidateEmployees();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, color, version }: { id: number; color: string; version: number }) => {
      return apiRequest("PATCH", `/api/teams/${id}`, { color, version });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
    },
  });

  const assignMembersMutation = useMutation({
    mutationFn: async ({ teamId, employeeIds }: { teamId: number; employeeIds: number[] }) => {
      const items = employeeIds.map((employeeId) => {
        const employee = employees.find((entry) => entry.id === employeeId);
        if (!employee || !Number.isInteger(employee.version) || employee.version < 1) {
          throw new Error('422: {"code":"VALIDATION_ERROR","message":"Missing employee version"}');
        }
        return { employeeId, version: employee.version };
      });
      return apiRequest("POST", `/api/teams/${teamId}/employees`, { items });
    },
    onSuccess: () => {
      invalidateEmployees();
    },
  });

  const handleOpenCreate = () => {
    if (!canMutateTeams) return;
    setFormError(null);
    setListError(null);
    setEditingTeam(null);
    setIsCreating(true);
  };

  const handleSubmitTeam = async (teamId: number | null, employeeIds: number[], color: string) => {
    if (!canMutateTeams) {
      const forbidden = new Error('403: {"code":"FORBIDDEN"}');
      showMutationError(forbidden, "Speichern nicht möglich", setFormError);
      throw forbidden;
    }

    setFormError(null);
    try {
      if (teamId === null) {
        const response = await createMutation.mutateAsync({ color });
        const newTeam = await response.json();
        await assignMembersMutation.mutateAsync({ teamId: newTeam.id, employeeIds });
      } else {
        const team = teams.find((entry) => entry.id === teamId);
        if (!team || !Number.isInteger(team.version) || team.version < 1) {
          throw new Error('422: {"code":"VALIDATION_ERROR","message":"Missing team version"}');
        }
        const currentMemberIds = new Set(
          employees
            .filter((employee) => employee.teamId === teamId)
            .map((employee) => employee.id),
        );
        const nextMemberIds = new Set(employeeIds);
        const removedMembers = employees.filter((employee) => currentMemberIds.has(employee.id) && !nextMemberIds.has(employee.id));

        await updateMutation.mutateAsync({ id: teamId, color, version: team.version });
        for (const employee of removedMembers) {
          if (!Number.isInteger(employee.version) || employee.version < 1) {
            throw new Error('422: {"code":"VALIDATION_ERROR","message":"Missing employee version"}');
          }
          await apiRequest("DELETE", `/api/teams/${teamId}/employees/${employee.id}`, { version: employee.version });
        }
        await assignMembersMutation.mutateAsync({ teamId, employeeIds });
      }

      handleCloseDialog();
    } catch (error) {
      showMutationError(error, "Speichern nicht möglich", setFormError);
      throw error;
    }
  };

  const handleCloseDialog = () => {
    setEditingTeam(null);
    setIsCreating(false);
    setFormError(null);
  };

  const handleOpenEdit = (team: TeamWithMembers) => {
    if (!canMutateTeams) return;
    setFormError(null);
    setListError(null);
    setEditingTeam(team);
  };

  const handleOpenEditById = (teamId: number | string) => {
    if (!canMutateTeams) return;
    const target = teamsWithMembers.find((team) => String(team.id) === String(teamId));
    if (!target) return;
    setFormError(null);
    setListError(null);
    setEditingTeam(target);
    setIsCreating(false);
  };

  useEffect(() => {
    onEditingChange?.(!!editingTeam || isCreating);
  }, [editingTeam, isCreating, onEditingChange]);

  const handleRequestDelete = (team: TeamWithMembers) => {
    if (!canMutateTeams) return;
    setListError(null);
    setDeleteTarget(team);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    const currentTeam = teamsWithMembers.find((entry) => entry.id === deleteTarget.id) ?? deleteTarget;
    deleteMutation.mutate(
      { id: currentTeam.id, version: currentTeam.version },
      {
        onSuccess: () => {
          setDeleteTarget(null);
        },
        onError: (error) => {
          showMutationError(error, "Löschen nicht möglich", setListError);
        },
      },
    );
  };

  const handleDeleteFromForm = () => {
    if (!editingTeam || !canMutateTeams) return;
    const currentTeam = teamsWithMembers.find((entry) => entry.id === editingTeam.id) ?? editingTeam;
    setFormError(null);
    deleteMutation.mutate(
      { id: currentTeam.id, version: currentTeam.version },
      {
        onSuccess: handleCloseDialog,
        onError: (error) => {
          showMutationError(error, "Löschen nicht möglich", setFormError);
        },
      },
    );
  };

  const activeTeam = editingTeam
    ? (teamsWithMembers.find((team) => team.id === editingTeam.id) ?? editingTeam)
    : null;

  if (canMutateTeams && (activeTeam || isCreating)) {
    return (
      <TeamEditForm
        team={activeTeam}
        allEmployees={employees}
        onSubmit={handleSubmitTeam}
        onDelete={handleDeleteFromForm}
        canDelete={canMutateTeams}
        isDeleting={deleteMutation.isPending}
        isSaving={createMutation.isPending || updateMutation.isPending || assignMembersMutation.isPending}
        mutationError={formError}
        isCreate={isCreating}
        defaultName={getNextTeamName()}
        defaultColor={defaultEntityColor}
        onCancel={handleCloseDialog}
      />
    );
  }

  return (
    <>
      <BadgeInteractionProvider value={{ openTeamEdit: canMutateTeams ? handleOpenEditById : () => undefined }}>
        <ListLayout
          title="Teams"
          icon={<Users className="w-5 h-5" />}
          helpKey="teams"
          isLoading={isLoading}
          onClose={onCancel}
          closeTestId="button-close-teams"
          footerSlot={(canMutateTeams || onCancel) ? (
            <div className="flex items-center justify-between">
              {canMutateTeams ? (
                <Button
                  variant="outline"
                  onClick={handleOpenCreate}
                  disabled={createMutation.isPending}
                  data-testid="button-new-team"
                >
                  Team anlegen
                </Button>
              ) : <span />}
              {onCancel ? (
                <Button variant="ghost" onClick={onCancel} data-testid="button-cancel-teams">
                  Schließen
                </Button>
              ) : null}
            </div>
          ) : null}
          contentSlot={(
            <div className="space-y-4">
              {listError ? <DialogBaseInlineMessage error={listError} /> : null}
              <BoardView
                gridTestId="list-teams"
                gridCols="3"
                isEmpty={teamsWithMembers.length === 0}
                emptyState={(
                  <p className="text-sm text-slate-400 text-center py-8 col-span-full">
                    Keine Teams vorhanden
                  </p>
                )}
              >
                {teamsWithMembers.map((team) => (
                  <ColoredEntityCard
                    key={team.id}
                    title={team.name}
                  icon={<TeamsIcon className="w-4 h-4" />}
                    borderColor={team.color}
                    onDelete={canMutateTeams ? () => handleRequestDelete(team) : undefined}
                    isDeleting={deleteMutation.isPending}
                    testId={`card-team-${team.id}`}
                    onDoubleClick={canMutateTeams ? () => handleOpenEdit(team) : undefined}
                  >
                    <MembersSectionHeader className="px-0 py-1 mb-1 border-b border-border" />
                    <div className="space-y-2">
                      {team.members.map((member) => (
                        <EmployeeInfoBadge
                          key={member.id}
                          id={member.id}
                          firstName={member.firstName}
                          lastName={member.lastName}
                          action="none"
                          showPreview={false}
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
              </BoardView>
            </div>
          )}
        />
      </BadgeInteractionProvider>
      <ConfirmDialogBase
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Team wirklich löschen?"
        description={deleteTarget ? `${deleteTarget.name} wird gelöscht. Die zugewiesenen Mitarbeiter bleiben erhalten und werden vom Team gelöst.` : undefined}
        confirmLabel="Team löschen"
        icon={<TeamsIcon className="h-5 w-5 text-primary" />}
        pendingLabel="Löschen..."
        isPending={deleteMutation.isPending}
        variant="destructive"
        testId="dialog-confirm-delete-team"
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
