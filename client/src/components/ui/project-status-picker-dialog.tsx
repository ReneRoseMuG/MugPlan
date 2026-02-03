import { EntityEditDialog } from "@/components/ui/entity-edit-dialog";
import { ProjectStatusList } from "@/components/ProjectStatusList";
import { ListChecks } from "lucide-react";

interface ProjectStatusPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancel: () => void;
  onSelectStatus?: (statusId: number) => void;
  selectedStatusId?: number | null;
  title?: string;
}

export function ProjectStatusPickerDialog({
  open,
  onOpenChange,
  onCancel,
  onSelectStatus,
  selectedStatusId = null,
  title = "Projektstatus auswählen",
}: ProjectStatusPickerDialogProps) {
  const handleSelect = (statusId: number) => {
    onSelectStatus?.(statusId);
    onOpenChange(false);
  };

  return (
    <EntityEditDialog
      open={open}
      onOpenChange={onOpenChange}
      onCancel={onCancel}
      title={title}
      icon={ListChecks}
      maxWidth="max-w-6xl"
      hideActions
    >
      <ProjectStatusList
        mode="picker"
        selectedStatusId={selectedStatusId}
        onSelectStatus={handleSelect}
        helpKey="project-status"
      />
    </EntityEditDialog>
  );
}
