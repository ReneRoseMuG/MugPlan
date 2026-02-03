import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ProjectStatusListView } from "@/components/ProjectStatusList";
import { ProjectStatusEditDialog } from "@/components/ui/project-status-edit-dialog";
import type { ProjectStatus } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface StatusFormData {
  title: string;
  description: string;
  color: string;
  sortOrder: number;
  isActive: boolean;
}

export function ProjectStatusPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<ProjectStatus | null>(null);

  const { data: statuses = [], isLoading } = useQuery<ProjectStatus[]>({
    queryKey: ["/api/project-status?active=all"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: Omit<StatusFormData, 'isActive'>) => {
      return apiRequest("POST", "/api/project-status", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/project-status?active=all"] });
      handleCloseDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<StatusFormData> }) => {
      return apiRequest("PUT", `/api/project-status/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/project-status?active=all"] });
      handleCloseDialog();
    },
  });

  const handleOpenCreate = () => {
    setEditingStatus(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (status: ProjectStatus) => {
    setEditingStatus(status);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingStatus(null);
  };

  const handleSave = (formData: StatusFormData, isCreate: boolean) => {
    if (isCreate) {
      createMutation.mutate({
        title: formData.title,
        description: formData.description,
        color: formData.color,
        sortOrder: formData.sortOrder,
      });
    } else if (editingStatus) {
      updateMutation.mutate({
        id: editingStatus.id,
        data: {
          title: formData.title,
          description: formData.description || undefined,
          color: formData.color,
          sortOrder: formData.sortOrder,
          isActive: formData.isActive,
        },
      });
    }
  };

  const getDefaultSortOrder = () => {
    return statuses.reduce((max, s) => Math.max(max, s.sortOrder), -1) + 1;
  };

  return (
    <>
      <ProjectStatusListView
        statuses={statuses}
        isLoading={isLoading}
        onCreateStatus={handleOpenCreate}
        onEditStatus={handleOpenEdit}
        isCreatePending={createMutation.isPending}
      />

      <ProjectStatusEditDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        status={editingStatus}
        onSave={handleSave}
        isSaving={createMutation.isPending || updateMutation.isPending}
        defaultSortOrder={getDefaultSortOrder()}
      />
    </>
  );
}
