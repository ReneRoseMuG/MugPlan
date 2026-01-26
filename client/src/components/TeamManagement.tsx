import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Plus, Users, UserCheck, Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TeamMember {
  id: string;
  name: string;
}

interface Team {
  id: string;
  number: number;
  color: string;
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

const initialTeams: Team[] = [
  {
    id: "t1",
    number: 1,
    color: pastelColors[0],
    members: [
      { id: "e1", name: "Thomas Müller" },
      { id: "e2", name: "Anna Schmidt" },
    ],
  },
  {
    id: "t2",
    number: 2,
    color: pastelColors[1],
    members: [
      { id: "e3", name: "Michael Weber" },
    ],
  },
];

function TeamCard({
  team,
  onDelete,
  onEditMembers,
}: {
  team: Team;
  onDelete: () => void;
  onEditMembers: () => void;
}) {
  return (
    <div
      className="relative rounded-lg border border-border shadow-sm bg-white"
      data-testid={`card-team-${team.id}`}
    >
      <div 
        className="px-4 py-3 rounded-t-lg border-b border-border"
        style={{ backgroundColor: `${team.color}50` }}
      >
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-700" data-testid={`text-team-name-${team.id}`}>
            Team {team.number}
          </span>
          <Button
            size="icon"
            variant="ghost"
            onClick={onDelete}
            data-testid={`button-delete-team-${team.id}`}
          >
            <X className="w-4 h-4" />
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
  team: Team;
  onSaveMembers: (teamId: string, memberIds: string[]) => void;
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
            Mitarbeiter bearbeiten - Team {team.number}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div 
            className="px-4 py-3 rounded-lg border border-border"
            style={{ backgroundColor: team.color }}
          >
            <span className="font-bold text-slate-700">Team {team.number}</span>
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

function NewTeamDialog({
  open,
  onOpenChange,
  onCreateTeam,
  assignedMemberIds,
  nextTeamNumber,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateTeam: (memberIds: string[]) => void;
  assignedMemberIds: string[];
  nextTeamNumber: number;
}) {
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const nextColor = pastelColors[(nextTeamNumber - 1) % pastelColors.length];

  const handleToggleMember = (memberId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleCreate = () => {
    onCreateTeam(selectedMembers);
    setSelectedMembers([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Users className="w-5 h-5" />
            Neues Team erstellen
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div 
            className="px-4 py-3 rounded-lg border border-border"
            style={{ backgroundColor: nextColor }}
          >
            <span className="font-bold text-slate-700">Team {nextTeamNumber}</span>
          </div>
          
          <div>
            <div className="text-sm font-medium text-slate-700 mb-3">
              Mitarbeiter auswählen:
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {allEmployees.map((employee) => {
                const isAssigned = assignedMemberIds.includes(employee.id);
                const isSelected = selectedMembers.includes(employee.id);
                return (
                  <div
                    key={employee.id}
                    onClick={() => !isAssigned && handleToggleMember(employee.id)}
                    className={`flex items-center gap-3 p-2 rounded-md cursor-pointer ${
                      isAssigned ? "opacity-50 bg-slate-100 cursor-not-allowed" : isSelected ? "bg-primary/10" : "hover:bg-slate-50"
                    }`}
                    data-testid={`checkbox-employee-${employee.id}`}
                  >
                    <Checkbox
                      id={`employee-${employee.id}`}
                      disabled={isAssigned}
                      checked={isSelected}
                      onClick={(e) => e.stopPropagation()}
                      onCheckedChange={() => handleToggleMember(employee.id)}
                    />
                    <span
                      className={`text-sm ${
                        isAssigned ? "text-slate-400" : "text-slate-700"
                      }`}
                    >
                      {employee.name}
                      {isAssigned && (
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
            <Button onClick={handleCreate} data-testid="button-create-team">
              Team erstellen
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function TeamManagement({ onCancel }: TeamManagementProps) {
  const [teams, setTeams] = useState<Team[]>(initialTeams);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);

  const assignedMemberIds = teams.flatMap((t) => t.members.map((m) => m.id));
  const nextTeamNumber = teams.length > 0 ? Math.max(...teams.map((t) => t.number)) + 1 : 1;

  const handleDeleteTeam = (id: string) => {
    setTeams(teams.filter((t) => t.id !== id));
  };

  const handleCreateTeam = (memberIds: string[]) => {
    const newTeam: Team = {
      id: `t${Date.now()}`,
      number: nextTeamNumber,
      color: pastelColors[(nextTeamNumber - 1) % pastelColors.length],
      members: allEmployees.filter((e) => memberIds.includes(e.id)),
    };
    setTeams([...teams, newTeam]);
  };

  const handleSaveMembers = (teamId: string, memberIds: string[]) => {
    setTeams(teams.map(team => 
      team.id === teamId 
        ? { ...team, members: allEmployees.filter(e => memberIds.includes(e.id)) }
        : team
    ));
  };

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
            {teams.map((team) => (
              <TeamCard
                key={team.id}
                team={team}
                onDelete={() => handleDeleteTeam(team.id)}
                onEditMembers={() => setEditingTeam(team)}
              />
            ))}
          </div>

          <div className="mt-6">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(true)}
              className="flex items-center gap-2"
              data-testid="button-new-team"
            >
              <Plus className="w-4 h-4" />
              Neues Team
            </Button>
          </div>
        </CardContent>
      </Card>

      <NewTeamDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreateTeam={handleCreateTeam}
        assignedMemberIds={assignedMemberIds}
        nextTeamNumber={nextTeamNumber}
      />

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
