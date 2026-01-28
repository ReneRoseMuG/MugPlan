import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CardListLayout } from "@/components/ui/card-list-layout";
import { EntityCard } from "@/components/ui/entity-card";
import { ListChecks, Pencil, Power, PowerOff, Shield, GripVertical } from "lucide-react";
import type { ProjectStatus } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { pastelColors } from "@/lib/colors";

interface StatusFormData {
  title: string;
  description: string;
  color: string;
  sortOrder: number;
  isActive: boolean;
}

const defaultFormData: StatusFormData = {
  title: "",
  description: "",
  color: pastelColors[0],
  sortOrder: 0,
  isActive: true,
};

export function ProjectStatusPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<ProjectStatus | null>(null);
  const [formData, setFormData] = useState<StatusFormData>(defaultFormData);

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

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      return apiRequest("PATCH", `/api/project-status/${id}/active`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/project-status?active=all"] });
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
    const maxSortOrder = statuses.reduce((max, s) => Math.max(max, s.sortOrder), -1);
    setFormData({
      ...defaultFormData,
      sortOrder: maxSortOrder + 1,
      color: pastelColors[(statuses.length) % pastelColors.length],
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (status: ProjectStatus) => {
    setEditingStatus(status);
    setFormData({
      title: status.title,
      description: status.description || "",
      color: status.color,
      sortOrder: status.sortOrder,
      isActive: status.isActive,
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingStatus(null);
    setFormData(defaultFormData);
  };

  const handleSave = () => {
    if (!formData.title.trim()) return;

    if (editingStatus) {
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
    } else {
      createMutation.mutate({
        title: formData.title,
        description: formData.description,
        color: formData.color,
        sortOrder: formData.sortOrder,
      });
    }
  };

  const handleToggleActive = (status: ProjectStatus) => {
    if (status.isDefault) return;
    toggleActiveMutation.mutate({ id: status.id, isActive: !status.isActive });
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
          <EntityCard
            key={status.id}
            testId={`status-card-${status.id}`}
            title={status.title}
            headerColor={status.color}
            icon={status.isDefault ? <Shield className="w-4 h-4 text-amber-600" /> : undefined}
            className={!status.isActive ? "opacity-60" : ""}
            onDelete={status.isDefault ? undefined : () => handleDelete(status)}
            isDeleting={deleteMutation.isPending}
            onDoubleClick={() => handleOpenEdit(status)}
            actions={
              <>
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
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleActive(status);
                  }}
                  disabled={status.isDefault || toggleActiveMutation.isPending}
                  data-testid={`button-toggle-status-${status.id}`}
                  title={status.isDefault ? "Default-Status" : (status.isActive ? "Deaktivieren" : "Aktivieren")}
                >
                  {status.isActive ? (
                    <PowerOff className="w-4 h-4" />
                  ) : (
                    <Power className="w-4 h-4" />
                  )}
                </Button>
              </>
            }
            footer={
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
            }
          >
            {status.description ? (
              <p className="text-sm text-slate-600 line-clamp-2" data-testid={`text-status-description-${status.id}`}>
                {status.description}
              </p>
            ) : (
              <p className="text-sm text-slate-400 italic">Keine Beschreibung</p>
            )}
          </EntityCard>
        ))}
      </CardListLayout>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListChecks className="w-5 h-5" />
              {editingStatus ? "Status bearbeiten" : "Neuer Projektstatus"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="status-title">Titel *</Label>
              <Input
                id="status-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Name des Status..."
                data-testid="input-status-title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status-description">Beschreibung</Label>
              <Textarea
                id="status-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optionale Beschreibung..."
                rows={3}
                data-testid="input-status-description"
              />
            </div>

            <div className="space-y-2">
              <Label>Farbe</Label>
              <div className="flex flex-wrap gap-2" data-testid="color-picker">
                {pastelColors.map((color, index) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    className={`w-8 h-8 rounded-md border-2 transition-all ${
                      formData.color === color 
                        ? "border-primary ring-2 ring-primary/30 scale-110" 
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                    style={{ backgroundColor: color }}
                    data-testid={`color-option-${index}`}
                    title={`Farbe ${index + 1}`}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status-sort-order">Sortierreihenfolge</Label>
              <Input
                id="status-sort-order"
                type="number"
                min="0"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                data-testid="input-status-sort-order"
              />
              <p className="text-xs text-slate-500">Niedrigere Werte werden zuerst angezeigt.</p>
            </div>

            {editingStatus && !editingStatus.isDefault && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="status-active"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4"
                  data-testid="checkbox-status-active"
                />
                <Label htmlFor="status-active">Aktiv</Label>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleCloseDialog} data-testid="button-cancel-status">
              Abbrechen
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.title.trim() || createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-status"
            >
              {createMutation.isPending || updateMutation.isPending ? "Speichern..." : "Speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
