import { useState, useEffect } from "react";
import { Users } from "lucide-react";
import { EmployeeSelectEntityEditDialog } from "./employee-select-entity-edit-dialog";
import type { Team, Employee } from "@shared/schema";

interface TeamWithMembers extends Team {
  members: Employee[];
}

export interface TeamEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: TeamWithMembers | null;
  allEmployees: Employee[];
  onSubmit: (teamId: number | null, employeeIds: number[], color: string) => Promise<void>;
  isSaving: boolean;
  isCreate?: boolean;
  defaultName?: string;
  defaultColor?: string;
}

export function TeamEditDialog({
  open,
  onOpenChange,
  team,
  allEmployees,
  onSubmit,
  isSaving,
  isCreate = false,
  defaultName = "Neues Team",
  defaultColor = "#60a5fa",
}: TeamEditDialogProps) {
  const currentMemberIds = team?.members.map(m => m.id) || [];
  const [selectedMembers, setSelectedMembers] = useState<number[]>(currentMemberIds);
  const [selectedColor, setSelectedColor] = useState<string>(team?.color || defaultColor);

  useEffect(() => {
    if (open) {
      setSelectedMembers(team?.members.map(m => m.id) || []);
      setSelectedColor(team?.color || defaultColor);
    }
  }, [open, team, defaultColor]);

  const handleToggleMember = (employeeId: number) => {
    setSelectedMembers((prev) =>
      prev.includes(employeeId)
        ? prev.filter((id) => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const handleSubmit = () => {
    return onSubmit(team?.id || null, selectedMembers, selectedColor);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const title = isCreate ? defaultName : (team?.name || "Team bearbeiten");

  return (
    <EmployeeSelectEntityEditDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      icon={Users}
      allEmployees={allEmployees}
      selectedMembers={selectedMembers}
      onToggleMember={handleToggleMember}
      entityId={team?.id || null}
      entityType="team"
      selectedColor={selectedColor}
      onColorChange={setSelectedColor}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      isSaving={isSaving}
      colorPickerTestId="button-team-color-picker"
      saveTestId="button-save-team-members"
      cancelTestId="button-cancel-team"
    />
  );
}
