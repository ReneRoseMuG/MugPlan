import { useEffect, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { SplitAttachmentsPanel } from "@/components/SplitAttachmentsPanel";
import { AttachmentDeleteAction } from "@/components/AttachmentDeleteAction";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { CustomerAttachment, ProjectAttachment } from "@shared/schema";

type AttachmentItem = {
  id: number;
  originalName: string;
  mimeType: string | null;
};

export type PendingProjectAttachmentItem = AttachmentItem & {
  file: File;
};

interface ProjectAttachmentsPanelProps {
  projectId?: number | null;
  customerId?: number | null;
  isEditing: boolean;
  canDelete?: boolean;
  className?: string;
  pendingProjectAttachments?: PendingProjectAttachmentItem[];
  onUploadPendingProjectAttachment?: (file: File) => void;
}

export function ProjectAttachmentsPanel({
  projectId,
  customerId,
  isEditing,
  canDelete = false,
  className,
  pendingProjectAttachments = [],
  onUploadPendingProjectAttachment,
}: ProjectAttachmentsPanelProps) {
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
  const resolvedCustomerId = isEditing ? (projectWithCustomer?.project.customerId ?? null) : customerId;
  const { data: customerAttachments = [], isLoading: isCustomerAttachmentsLoading } = useQuery<CustomerAttachment[]>({
    queryKey: ["/api/customers", resolvedCustomerId, "attachments"],
    enabled: Boolean(resolvedCustomerId),
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

  const pendingAttachmentUrls = useMemo(
    () => pendingProjectAttachments.map((attachment) => ({
      id: attachment.id,
      url: URL.createObjectURL(attachment.file),
    })),
    [pendingProjectAttachments],
  );

  useEffect(() => {
    return () => {
      for (const attachment of pendingAttachmentUrls) {
        URL.revokeObjectURL(attachment.url);
      }
    };
  }, [pendingAttachmentUrls]);

  const pendingAttachmentUrlsById = useMemo(
    () => new Map(pendingAttachmentUrls.map((attachment) => [attachment.id, attachment.url])),
    [pendingAttachmentUrls],
  );

  const resolvedProjectAttachments = isEditing
    ? [...attachments, ...pendingProjectAttachments]
    : pendingProjectAttachments;
  const canUploadProjectAttachment = Boolean(projectId) || typeof onUploadPendingProjectAttachment === "function";
  const handleProjectUpload = (file: File) => {
    if (projectId) {
      uploadMutation.mutate(file);
      return;
    }
    onUploadPendingProjectAttachment?.(file);
  };
  const buildPendingAttachmentUrl = (id: number) => pendingAttachmentUrlsById.get(id) ?? "#";

  return (
    <SplitAttachmentsPanel
      title="Dokumente"
      helpKey="projects.sidebar.attachments"
      className={className}
      sections={[
        {
          id: "project",
          title: "Projektdokumente",
          items: resolvedProjectAttachments,
          isLoading,
          emptyText: "Keine Dokumente vorhanden",
          canUpload: canUploadProjectAttachment,
          isUploading: uploadMutation.isPending,
          onUpload: handleProjectUpload,
          buildOpenUrl: (id) => pendingAttachmentUrlsById.has(id)
            ? buildPendingAttachmentUrl(id)
            : `/api/project-attachments/${id}/download`,
          buildDownloadUrl: (id) => pendingAttachmentUrlsById.has(id)
            ? buildPendingAttachmentUrl(id)
            : `/api/project-attachments/${id}/download?download=1`,
          buildActionSlot: projectId
            ? (id) => (
                <AttachmentDeleteAction
                  attachmentId={id}
                  parentId={projectId}
                  domain="project"
                  canDelete={canDelete && !pendingAttachmentUrlsById.has(id)}
                />
              )
            : undefined,
        },
        {
          id: "customer",
          title: "Kundendokumente",
          items: customerAttachments,
          isLoading: isCustomerAttachmentsLoading,
          emptyText: resolvedCustomerId ? "Keine Kundendokumente vorhanden" : "Kein Kunde zugeordnet",
          buildOpenUrl: (id) => `/api/customer-attachments/${id}/download`,
          buildDownloadUrl: (id) => `/api/customer-attachments/${id}/download?download=1`,
        },
      ]}
    />
  );
}
