import { useState, useEffect } from "react";
import { Route } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmployeeSelectEntityEditDialog } from "./employee-select-entity-edit-dialog";
import { TourAppointmentsPanel } from "@/components/TourAppointmentsPanel";
import { TourAppointmentsTableDialog } from "@/components/TourAppointmentsTableDialog";
import type { Tour, Employee } from "@shared/schema";

interface TourWithMembers extends Tour {
  members: Employee[];
}

export interface TourEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tour: TourWithMembers | null;
  allEmployees: Employee[];
  onSubmit: (tourId: number | null, employeeIds: number[], color: string) => Promise<void>;
  onDelete?: () => Promise<void>;
  canDelete?: boolean;
  isDeleting?: boolean;
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
  onSubmit,
  onDelete,
  canDelete = false,
  isDeleting = false,
  isSaving,
  isCreate = false,
  defaultName = "Neue Tour",
  defaultColor = "#60a5fa",
}: TourEditDialogProps) {
  const currentMemberIds = tour?.members.map(m => m.id) || [];
  const [selectedMembers, setSelectedMembers] = useState<number[]>(currentMemberIds);
  const [selectedColor, setSelectedColor] = useState<string>(tour?.color || defaultColor);
  const [tourAppointmentsTableOpen, setTourAppointmentsTableOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedMembers(tour?.members.map(m => m.id) || []);
      setSelectedColor(tour?.color || defaultColor);
    } else {
      setTourAppointmentsTableOpen(false);
    }
  }, [open, tour, defaultColor]);

  const handleToggleMember = (employeeId: number) => {
    setSelectedMembers((prev) =>
      prev.includes(employeeId)
        ? prev.filter((id) => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const handleSubmit = () => {
    return onSubmit(tour?.id || null, selectedMembers, selectedColor);
  };

  const handleCancel = () => {
    setTourAppointmentsTableOpen(false);
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
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      isSaving={isSaving}
      colorPickerTestId="button-tour-color-picker"
      saveTestId="button-save-tour-members"
      cancelTestId="button-cancel-tour"
      leftActions={
        !isCreate && canDelete && tour && onDelete ? (
          <Button
            variant="destructive"
            onClick={() => {
              void onDelete().catch(() => {
                // errors are handled by mutation toasts in the parent
              });
            }}
            disabled={isSaving || isDeleting}
            data-testid="button-delete-tour-dialog"
          >
            {isDeleting ? "Loeschen..." : "Tour loeschen"}
          </Button>
        ) : undefined
      }
    >
      <TourAppointmentsPanel
        tourId={tour?.id ?? null}
        onOpenTourAppointmentsView={() => setTourAppointmentsTableOpen(true)}
      />
      {tourAppointmentsTableOpen && tour ? (
        <TourAppointmentsTableDialog
          open={tourAppointmentsTableOpen}
          onOpenChange={setTourAppointmentsTableOpen}
          tourId={tour.id}
          tourName={tour.name}
        />
      ) : null}
    </EmployeeSelectEntityEditDialog>
  );
}
