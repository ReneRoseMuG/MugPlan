import { useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AttachmentsPanel } from "@/components/AttachmentsPanel";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ProjectAttachment } from "@shared/schema";

interface ProjectAttachmentsPanelProps {
  projectId?: number | null;
  isEditing: boolean;
}

export function ProjectAttachmentsPanel({ projectId, isEditing }: ProjectAttachmentsPanelProps) {
  const { toast } = useToast();

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
      void queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "attachments"] });
      toast({ title: "Dokument hochgeladen" });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Upload fehlgeschlagen";
      toast({ title: "Fehler", description: message, variant: "destructive" });
    },
  });

  const items = useMemo(() => attachments, [attachments]);

  return (
    <AttachmentsPanel
      title="Dokumente"
      items={items}
      isLoading={isLoading}
      canUpload={isEditing && Boolean(projectId)}
      isUploading={uploadMutation.isPending}
      onUpload={(file) => uploadMutation.mutate(file)}
      buildOpenUrl={(id) => `/api/project-attachments/${id}/download`}
      buildDownloadUrl={(id) => `/api/project-attachments/${id}/download?download=1`}
    />
  );
}
