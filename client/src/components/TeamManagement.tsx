import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Plus, Users, UserCheck, Pencil, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { EntityCard } from "@/components/ui/entity-card";
import { getRandomPastelColor } from "@/lib/colors";
import type { Team } from "@shared/schema";

interface TeamMember {
  id: string;
  name: string;
}

interface TeamWithMembers extends Team {
  members: TeamMember[];
}

interface TeamManagementProps {
  onCancel?: () => void;
}

const allEmployees: TeamMember[] = [
  { id: "e1", name: "Thomas Müller" },
  { id: "e2", name: "Anna Schmidt" },
  { id: "e3", name: "Michael Weber" },
  { id: "e4", name: "Sandra Fischer" },
  { id: "e5", name: "Klaus Hoffmann" },
];

function EditTeamMembersDialog({
  open,
  onOpenChange,
  team,
  onSaveMembers,
  assignedMemberIds,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: TeamWithMembers;
  onSaveMembers: (teamId: number, memberIds: string[]) => void;
  assignedMemberIds: string[];
}) {
  const currentMemberIds = team.members.map(m => m.id);
  const [selectedMembers, setSelectedMembers] = useState<string[]>(currentMemberIds);

  const handleToggleMember = (memberId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleSave = () => {
    onSaveMembers(team.id, selectedMembers);
    onOpenChange(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setSelectedMembers(currentMemberIds);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Users className="w-5 h-5" />
            Mitarbeiter bearbeiten - {team.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div 
            className="px-4 py-2 rounded-lg border border-border"
            style={{ backgroundColor: team.color }}
          >
            <span className="font-bold text-slate-700">{team.name}</span>
          </div>
          
          <div>
            <div className="text-sm font-medium text-slate-700 mb-3">
              Mitarbeiter auswählen:
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {allEmployees.map((employee) => {
                const isAssignedElsewhere = assignedMemberIds.includes(employee.id) && !currentMemberIds.includes(employee.id);
                const isSelected = selectedMembers.includes(employee.id);
                return (
                  <div
                    key={employee.id}
                    onClick={() => !isAssignedElsewhere && handleToggleMember(employee.id)}
                    className={`flex items-center gap-3 p-2 rounded-md cursor-pointer ${
                      isAssignedElsewhere ? "opacity-50 bg-slate-100 cursor-not-allowed" : isSelected ? "bg-primary/10" : "hover:bg-slate-50"
                    }`}
                    data-testid={`checkbox-edit-employee-${employee.id}`}
                  >
                    <Checkbox
                      id={`edit-employee-${employee.id}`}
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
                      {employee.name}
                      {isAssignedElsewhere && (
                        <span className="ml-2 text-xs text-slate-400">(bereits in Team)</span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSave} data-testid="button-save-team-members">
              Speichern
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function TeamManagement({ onCancel }: TeamManagementProps) {
  const [teamMembers, setTeamMembers] = useState<Record<number, TeamMember[]>>({});
  const [editingTeam, setEditingTeam] = useState<TeamWithMembers | null>(null);

  const { data: teams = [], isLoading } = useQuery<Team[]>({
    queryKey: ['/api/teams'],
  });

  const teamsWithMembers: TeamWithMembers[] = teams.map((team, index) => ({
    ...team,
    members: teamMembers[team.id] || [],
    color: team.color || getRandomPastelColor(index),
  }));

  const assignedMemberIds = teamsWithMembers.flatMap((t) => t.members.map((m) => m.id));

  const createMutation = useMutation({
    mutationFn: async () => {
      const color = getRandomPastelColor(teams.length);
      return apiRequest('POST', '/api/teams', { color });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/teams'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/teams/${id}`);
    },
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/teams'] });
      setTeamMembers(prev => {
        const next = { ...prev };
        delete next[deletedId];
        return next;
      });
    },
  });

  const handleSaveMembers = (teamId: number, memberIds: string[]) => {
    const members = allEmployees.filter(e => memberIds.includes(e.id));
    setTeamMembers(prev => ({
      ...prev,
      [teamId]: members,
    }));
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card className="bg-card">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Card className="bg-card">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold uppercase tracking-wider text-primary flex items-center gap-2">
              <Users className="w-5 h-5" />
              Teams
            </CardTitle>
            {onCancel && (
              <Button size="lg" variant="ghost" onClick={onCancel} data-testid="button-close-teams">
                <X className="w-6 h-6" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="list-teams">
            {teamsWithMembers.map((team) => (
              <EntityCard
                key={team.id}
                title={team.name}
                icon={<Users className="w-4 h-4" />}
                headerColor={team.color}
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
                      className="text-sm text-slate-700 flex items-center gap-2"
                      data-testid={`text-member-${member.id}`}
                    >
                      <UserCheck className="w-3 h-3 text-primary" />
                      {member.name}
                    </div>
                  ))}
                  {team.members.length === 0 && (
                    <div className="text-sm text-slate-400 italic">
                      Keine Mitarbeiter zugewiesen
                    </div>
                  )}
                </div>
              </EntityCard>
            ))}
          </div>

          <div className="mt-6 flex justify-between items-center">
            <Button
              variant="outline"
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              className="flex items-center gap-2"
              data-testid="button-new-team"
            >
              {createMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Neues Team
            </Button>

            {onCancel && (
              <Button variant="ghost" onClick={onCancel} data-testid="button-cancel-teams">
                Schließen
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {editingTeam && (
        <EditTeamMembersDialog
          open={!!editingTeam}
          onOpenChange={(open) => !open && setEditingTeam(null)}
          team={editingTeam}
          onSaveMembers={handleSaveMembers}
          assignedMemberIds={assignedMemberIds}
        />
      )}
    </div>
  );
}
