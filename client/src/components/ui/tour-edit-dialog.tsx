import { useState, useEffect } from "react";
import { Route } from "lucide-react";
import { EmployeeSelectEntityEditDialog } from "./employee-select-entity-edit-dialog";
import type { Tour, Employee } from "@shared/schema";

interface TourWithMembers extends Tour {
  members: Employee[];
}

export interface TourEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tour: TourWithMembers | null;
  allEmployees: Employee[];
  onSave: (tourId: number | null, employeeIds: number[], color: string) => void;
  isSaving: boolean;
  isCreate?: boolean;
  defaultName?: string;
  defaultColor?: string;
}

export function TourEditDialog({
  open,
  onOpenChange,
  tour,
  allEmployees,
  onSave,
  isSaving,
  isCreate = false,
  defaultName = "Neue Tour",
  defaultColor = "#60a5fa",
}: TourEditDialogProps) {
  const currentMemberIds = tour?.members.map(m => m.id) || [];
  const [selectedMembers, setSelectedMembers] = useState<number[]>(currentMemberIds);
  const [selectedColor, setSelectedColor] = useState<string>(tour?.color || defaultColor);

  useEffect(() => {
    if (open) {
      setSelectedMembers(tour?.members.map(m => m.id) || []);
      setSelectedColor(tour?.color || defaultColor);
    }
  }, [open, tour, defaultColor]);

  const handleToggleMember = (employeeId: number) => {
    setSelectedMembers((prev) =>
      prev.includes(employeeId)
        ? prev.filter((id) => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const handleSave = () => {
    onSave(tour?.id || null, selectedMembers, selectedColor);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const title = isCreate ? defaultName : (tour?.name || "Tour bearbeiten");

  return (
    <EmployeeSelectEntityEditDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      icon={Route}
      allEmployees={allEmployees}
      selectedMembers={selectedMembers}
      onToggleMember={handleToggleMember}
      entityId={tour?.id || null}
      entityType="tour"
      selectedColor={selectedColor}
      onColorChange={setSelectedColor}
      onSave={handleSave}
      onCancel={handleCancel}
      isSaving={isSaving}
      colorPickerTestId="button-tour-color-picker"
      saveTestId="button-save-tour-members"
      cancelTestId="button-cancel-tour"
    />
  );
}
