import { useState, useEffect } from "react";
import { ListChecks } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ColorSelectEntityEditDialog } from "./color-select-entity-edit-dialog";
import { RichTextEditor } from "@/components/RichTextEditor";
import type { ProjectStatus } from "@shared/schema";

interface StatusFormData {
  title: string;
  description: string;
  color: string;
  sortOrder: number;
  isActive: boolean;
}

export interface ProjectStatusEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: ProjectStatus | null;
  onSave: (data: StatusFormData, isCreate: boolean) => void;
  isSaving: boolean;
  defaultSortOrder?: number;
}

const defaultFormData: StatusFormData = {
  title: "",
  description: "",
  color: "#60a5fa",
  sortOrder: 0,
  isActive: true,
};

export function ProjectStatusEditDialog({
  open,
  onOpenChange,
  status,
  onSave,
  isSaving,
  defaultSortOrder = 0,
}: ProjectStatusEditDialogProps) {
  const [formData, setFormData] = useState<StatusFormData>(defaultFormData);

  useEffect(() => {
    if (open) {
      if (status) {
        setFormData({
          title: status.title,
          description: status.description || "",
          color: status.color,
          sortOrder: status.sortOrder,
          isActive: status.isActive,
        });
      } else {
        setFormData({
          ...defaultFormData,
          sortOrder: defaultSortOrder,
        });
      }
    }
  }, [open, status, defaultSortOrder]);

  const handleSave = () => {
    if (!formData.title.trim()) return;
    onSave(formData, status === null);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const isCreate = status === null;
  const title = isCreate ? "Neuer Projektstatus" : "Status bearbeiten";

  return (
    <ColorSelectEntityEditDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      icon={ListChecks}
      selectedColor={formData.color}
      onColorChange={(color) => setFormData({ ...formData, color })}
      onSave={handleSave}
      onCancel={handleCancel}
      isSaving={isSaving}
      saveDisabled={!formData.title.trim()}
      maxWidth="max-w-lg"
      colorPickerTestId="button-status-color-picker"
      saveTestId="button-save-status"
      cancelTestId="button-cancel-status"
    >
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
          <RichTextEditor
            value={formData.description}
            onChange={(value) => setFormData({ ...formData, description: value })}
            placeholder="Optionale Beschreibung..."
          />
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

        {!isCreate && (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="status-active"
              checked={formData.isActive}
              disabled={true}
              className="w-4 h-4 cursor-not-allowed"
              data-testid="checkbox-status-active"
            />
            <Label htmlFor="status-active" className="text-muted-foreground">
              Aktiv <span className="text-xs">(nur durch Administrator änderbar)</span>
            </Label>
          </div>
        )}
    </ColorSelectEntityEditDialog>
  );
}
