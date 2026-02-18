import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ProjectStatusListView } from "@/components/ProjectStatusList";
import { ProjectStatusEditDialog } from "@/components/ui/project-status-edit-dialog";
import type { ProjectStatus } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface StatusFormData {
  title: string;
  description: string;
  color: string;
  sortOrder: number;
  isActive: boolean;
}

export function ProjectStatusPage() {
  const { toast } = useToast();
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
      void queryClient.invalidateQueries({ queryKey: ["/api/project-status?active=all"] });
      handleCloseDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ status, data }: { status: ProjectStatus; data: Partial<StatusFormData> }) => {
      return apiRequest("PUT", `/api/project-status/${status.id}`, {
        ...data,
        version: status.version,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["/api/project-status?active=all"] });
      handleCloseDialog();
    },
    onError: (error) => {
      const code = extractApiCode(error);
      if (code === "VERSION_CONFLICT") {
        toast({ title: "Status wurde zwischenzeitlich geändert", variant: "destructive" });
        return;
      }
      if (code === "BUSINESS_CONFLICT") {
        toast({ title: "Statusänderung ist fachlich nicht zulässig", variant: "destructive" });
        return;
      }
      toast({ title: "Status konnte nicht gespeichert werden", variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ status, isActive }: { status: ProjectStatus; isActive: boolean }) => {
      return apiRequest("PATCH", `/api/project-status/${status.id}/active`, {
        isActive,
        version: status.version,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["/api/project-status?active=all"] });
    },
    onError: (error) => {
      const code = extractApiCode(error);
      if (code === "VERSION_CONFLICT") {
        toast({ title: "Status wurde zwischenzeitlich geändert", variant: "destructive" });
        return;
      }
      if (code === "BUSINESS_CONFLICT") {
        toast({ title: "Default-Status kann nicht deaktiviert werden", variant: "destructive" });
        return;
      }
      toast({ title: "Aktiv-Status konnte nicht geändert werden", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ status }: { status: ProjectStatus }) => {
      return apiRequest("DELETE", `/api/project-status/${status.id}`, {
        version: status.version,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["/api/project-status?active=all"] });
    },
    onError: (error) => {
      const code = extractApiCode(error);
      if (code === "VERSION_CONFLICT") {
        toast({ title: "Status wurde zwischenzeitlich geändert", variant: "destructive" });
        return;
      }
      if (code === "BUSINESS_CONFLICT") {
        toast({ title: "Status kann nicht gelöscht werden (verwendet oder geschützt)", variant: "destructive" });
        return;
      }
      toast({ title: "Status konnte nicht gelöscht werden", variant: "destructive" });
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
        status: editingStatus,
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

  const handleToggleStatusActive = (status: ProjectStatus) => {
    toggleActiveMutation.mutate({ status, isActive: !status.isActive });
  };

  const handleDeleteStatus = (status: ProjectStatus) => {
    if (status.isDefault) return;
    const confirmed = window.confirm(`Status "${status.title}" wirklich löschen?`);
    if (!confirmed) return;
    deleteMutation.mutate({ status });
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
        onToggleStatusActive={handleToggleStatusActive}
        onDeleteStatus={handleDeleteStatus}
        isCreatePending={createMutation.isPending}
        isActionPending={toggleActiveMutation.isPending || deleteMutation.isPending}
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

function extractApiCode(error: unknown): string | null {
  if (!(error instanceof Error)) return null;
  const start = error.message.indexOf("{");
  if (start < 0) return null;
  const jsonPart = error.message.slice(start);
  try {
    const payload = JSON.parse(jsonPart) as { code?: unknown };
    return typeof payload.code === "string" ? payload.code : null;
  } catch {
    return null;
  }
}
