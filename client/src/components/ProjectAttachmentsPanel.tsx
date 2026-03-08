import { useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { SplitAttachmentsPanel } from "@/components/SplitAttachmentsPanel";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { CustomerAttachment, ProjectAttachment } from "@shared/schema";

interface ProjectAttachmentsPanelProps {
  projectId?: number | null;
  isEditing: boolean;
  className?: string;
}

export function ProjectAttachmentsPanel({ projectId, isEditing, className }: ProjectAttachmentsPanelProps) {
  const { toast } = useToast();

  const { data: attachments = [], isLoading } = useQuery<ProjectAttachment[]>({
    queryKey: ["/api/projects", projectId, "attachments"],
    enabled: isEditing && Boolean(projectId),
  });
  const { data: projectWithCustomer } = useQuery<{
    project: { customerId: number };
  }>({
    queryKey: ["/api/projects", projectId],
    enabled: isEditing && Boolean(projectId),
  });
  const customerId = projectWithCustomer?.project.customerId ?? null;
  const { data: customerAttachments = [], isLoading: isCustomerAttachmentsLoading } = useQuery<CustomerAttachment[]>({
    queryKey: ["/api/customers", customerId, "attachments"],
    enabled: isEditing && Boolean(customerId),
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
  const customerItems = useMemo(() => customerAttachments, [customerAttachments]);

  return (
    <SplitAttachmentsPanel
      title="Dokumente"
      helpKey="projects.sidebar.attachments"
      className={className}
      sections={[
        {
          id: "project",
          title: "Projektdokumente",
          items,
          isLoading,
          emptyText: "Keine Dokumente vorhanden",
          canUpload: isEditing && Boolean(projectId),
          isUploading: uploadMutation.isPending,
          onUpload: (file) => uploadMutation.mutate(file),
          buildOpenUrl: (id) => `/api/project-attachments/${id}/download`,
          buildDownloadUrl: (id) => `/api/project-attachments/${id}/download?download=1`,
        },
        {
          id: "customer",
          title: "Kundendokumente",
          items: customerItems,
          isLoading: isCustomerAttachmentsLoading,
          emptyText: "Keine Kundendokumente vorhanden",
          buildOpenUrl: (id) => `/api/customer-attachments/${id}/download`,
          buildDownloadUrl: (id) => `/api/customer-attachments/${id}/download?download=1`,
        },
      ]}
    />
  );
}
