import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { CardListLayout } from "@/components/ui/card-list-layout";
import { ColoredEntityCard } from "@/components/ui/colored-entity-card";
import { ProjectStatusEditDialog } from "@/components/ui/project-status-edit-dialog";
import { ListChecks, Pencil, Shield, GripVertical } from "lucide-react";
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

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/project-status/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/project-status?active=all"] });
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

  const handleDelete = (status: ProjectStatus) => {
    if (status.isDefault) {
      alert("Default-Status kann nicht gelöscht werden.");
      return;
    }
    if (window.confirm(`Möchten Sie den Status "${status.title}" wirklich löschen?`)) {
      deleteMutation.mutate(status.id);
    }
  };

  const getDefaultSortOrder = () => {
    return statuses.reduce((max, s) => Math.max(max, s.sortOrder), -1) + 1;
  };

  return (
    <>
      <CardListLayout
        title="Projekt Status"
        icon={<ListChecks className="w-5 h-5" />}
        helpKey="project-status"
        isLoading={isLoading}
        gridTestId="list-project-status"
        gridCols="3"
        primaryAction={{
          label: "Neuer Status",
          onClick: handleOpenCreate,
          isPending: createMutation.isPending,
          testId: "button-new-status",
        }}
        isEmpty={statuses.length === 0}
        emptyState={
          <p className="text-sm text-slate-400 text-center py-8 col-span-3">
            Keine Projektstatus vorhanden
          </p>
        }
      >
        {statuses.map((status) => (
          <ColoredEntityCard
            key={status.id}
            testId={`status-card-${status.id}`}
            title={status.title}
            borderColor={status.color}
            icon={status.isDefault ? <Shield className="w-4 h-4 text-amber-600" /> : undefined}
            className={!status.isActive ? "opacity-60" : ""}
            onDelete={status.isDefault ? undefined : () => handleDelete(status)}
            isDeleting={deleteMutation.isPending}
            onDoubleClick={() => handleOpenEdit(status)}
            footer={
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <GripVertical className="w-3 h-3" />
                  <span>Reihenfolge: {status.sortOrder}</span>
                  {status.isDefault && (
                    <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-medium">
                      Standard
                    </span>
                  )}
                  {!status.isActive && (
                    <span className="ml-2 px-2 py-0.5 bg-slate-200 text-slate-600 rounded text-xs">
                      Inaktiv
                    </span>
                  )}
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenEdit(status);
                  }}
                  data-testid={`button-edit-status-${status.id}`}
                  title="Bearbeiten"
                >
                  <Pencil className="w-4 h-4" />
                </Button>
              </div>
            }
          >
            {status.description ? (
              <p className="text-sm text-slate-600 line-clamp-2" data-testid={`text-status-description-${status.id}`}>
                {status.description}
              </p>
            ) : (
              <p className="text-sm text-slate-400 italic">Keine Beschreibung</p>
            )}
          </ColoredEntityCard>
        ))}
      </CardListLayout>

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
