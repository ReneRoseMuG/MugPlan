import { useMemo, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Paperclip } from "lucide-react";
import { SidebarChildPanel } from "@/components/ui/sidebar-child-panel";
import { AttachmentInfoBadge } from "@/components/ui/attachment-info-badge";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ProjectAttachment } from "@shared/schema";

interface ProjectAttachmentsPanelProps {
  projectId?: number | null;
  isEditing: boolean;
}

export function ProjectAttachmentsPanel({ projectId, isEditing }: ProjectAttachmentsPanelProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { data: attachments = [], isLoading } = useQuery<ProjectAttachment[]>({
    queryKey: ["/api/projects", projectId, "attachments"],
    enabled: isEditing && Boolean(projectId),
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!projectId) throw new Error("Projekt fehlt");
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`/api/projects/${projectId}/attachments`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || response.statusText);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "attachments"] });
      toast({ title: "Dokument hochgeladen" });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Upload fehlgeschlagen";
      toast({ title: "Fehler", description: message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (attachmentId: number) => {
      const response = await fetch(`/api/project-attachments/${attachmentId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || response.statusText);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "attachments"] });
      toast({ title: "Dokument gelöscht" });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Löschen fehlgeschlagen";
      toast({ title: "Fehler", description: message, variant: "destructive" });
    },
  });

  const items = useMemo(() => attachments, [attachments]);

  const addAction = isEditing && projectId
    ? {
        onClick: () => fileInputRef.current?.click(),
        disabled: uploadMutation.isPending,
        ariaLabel: "Dokument hinzufügen",
        testId: "button-add-document-header",
      }
    : undefined;

  return (
    <SidebarChildPanel
      title={`Dokumente (${items.length})`}
      icon={<Paperclip className="w-4 h-4" />}
      addAction={addAction}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          uploadMutation.mutate(file);
          event.currentTarget.value = "";
        }}
      />
      {isLoading ? (
        <p className="text-sm text-slate-400 text-center py-2">Dokumente werden geladen...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-2">Keine Dokumente</p>
      ) : (
        <div className="space-y-2">
          {items.map((attachment) => {
            const openUrl = `/api/project-attachments/${attachment.id}/download`;
            const downloadUrl = `/api/project-attachments/${attachment.id}/download?download=1`;
            return (
              <AttachmentInfoBadge
                key={attachment.id}
                attachment={attachment}
                onRemove={() => deleteMutation.mutate(attachment.id)}
                actionDisabled={deleteMutation.isPending}
                openUrl={openUrl}
                downloadUrl={downloadUrl}
                testId={`attachment-badge-${attachment.id}`}
              />
            );
          })}
        </div>
      )}
    </SidebarChildPanel>
  );
}
