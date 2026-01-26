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

const pastelColors = [
  "#E8F4F8",
  "#FDF6E3",
  "#F0F4E8",
  "#F8E8F4",
  "#E8E8F8",
  "#F4F0E8",
];

const allEmployees: TeamMember[] = [
  { id: "e1", name: "Thomas Müller" },
  { id: "e2", name: "Anna Schmidt" },
  { id: "e3", name: "Michael Weber" },
  { id: "e4", name: "Sandra Fischer" },
  { id: "e5", name: "Klaus Hoffmann" },
];

function TeamCard({
  team,
  onDelete,
  onEditMembers,
  onColorChange,
  isDeleting,
}: {
  team: TeamWithMembers;
  onDelete: () => void;
  onEditMembers: () => void;
  onColorChange: (color: string) => void;
  isDeleting: boolean;
}) {
  return (
    <div
      className="relative rounded-lg border border-border shadow-sm bg-white"
      data-testid={`card-team-${team.id}`}
    >
      <div 
        className="px-4 py-3 rounded-t-lg border-b border-border"
        style={{ backgroundColor: team.color }}
      >
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-700" data-testid={`text-team-name-${team.id}`}>
            {team.name}
          </span>
          <Button
            size="icon"
            variant="ghost"
            onClick={onDelete}
            disabled={isDeleting}
            data-testid={`button-delete-team-${team.id}`}
          >
            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
          </Button>
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Mitarbeiter
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={onEditMembers}
            data-testid={`button-edit-team-members-${team.id}`}
          >
            <Pencil className="w-3 h-3" />
          </Button>
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
      </div>
      <div className="px-4 pb-4">
        <label className="relative block w-full cursor-pointer">
          <input
            type="color"
            value={team.color}
            onChange={(e) => onColorChange(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            data-testid={`input-team-color-${team.id}`}
          />
          <div 
            className="w-full py-2 rounded-md border border-border text-center text-sm font-medium transition-colors hover:bg-slate-50"
            style={{ backgroundColor: team.color }}
          >
            Farbe ändern
          </div>
        </label>
      </div>
    </div>
  );
}

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
            className="px-4 py-3 rounded-lg border border-border"
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

  const teamsWithMembers: TeamWithMembers[] = teams.map(team => ({
    ...team,
    members: teamMembers[team.id] || [],
  }));

  const assignedMemberIds = teamsWithMembers.flatMap((t) => t.members.map((m) => m.id));

  const createMutation = useMutation({
    mutationFn: async () => {
      const colorIndex = teams.length % pastelColors.length;
      const color = pastelColors[colorIndex];
      return apiRequest('POST', '/api/teams', { color });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/teams'] });
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

  const handleColorChange = (id: number, color: string) => {
    updateMutation.mutate({ id, color });
  };

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
              <TeamCard
                key={team.id}
                team={team}
                onDelete={() => deleteMutation.mutate(team.id)}
                onEditMembers={() => setEditingTeam(team)}
                onColorChange={(color) => handleColorChange(team.id, color)}
                isDeleting={deleteMutation.isPending}
              />
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
