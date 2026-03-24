import { useEffect, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { EmployeeAttachment } from "@shared/schema";
import { AttachmentsPanel } from "@/components/AttachmentsPanel";
import { AttachmentDeleteAction } from "@/components/AttachmentDeleteAction";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AttachmentItem = {
  id: number;
  originalName: string;
  mimeType: string | null;
};

export type PendingEmployeeAttachmentItem = AttachmentItem & {
  file: File;
};

interface EmployeeAttachmentsPanelProps {
  employeeId?: number | null;
  isEditing?: boolean;
  canDelete?: boolean;
  className?: string;
  pendingEmployeeAttachments?: PendingEmployeeAttachmentItem[];
  onUploadPendingEmployeeAttachment?: (file: File) => void;
}

export function EmployeeAttachmentsPanel({
  employeeId,
  isEditing = true,
  canDelete = false,
  className,
  pendingEmployeeAttachments = [],
  onUploadPendingEmployeeAttachment,
}: EmployeeAttachmentsPanelProps) {
  const { toast } = useToast();
  const { data: attachments = [], isLoading } = useQuery<EmployeeAttachment[]>({
    queryKey: ["/api/employees", employeeId, "attachments"],
    enabled: isEditing && Boolean(employeeId),
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!employeeId) throw new Error("Mitarbeiter fehlt");
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`/api/employees/${employeeId}/attachments`, {
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
      void queryClient.invalidateQueries({ queryKey: ["/api/employees", employeeId, "attachments"] });
      toast({ title: "Dokument hochgeladen" });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Upload fehlgeschlagen";
      toast({ title: "Fehler", description: message, variant: "destructive" });
    },
  });

  const pendingAttachmentUrls = useMemo(
    () => pendingEmployeeAttachments.map((attachment) => ({
      id: attachment.id,
      url: URL.createObjectURL(attachment.file),
    })),
    [pendingEmployeeAttachments],
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

  const items = useMemo(
    () => (isEditing ? attachments : pendingEmployeeAttachments),
    [attachments, isEditing, pendingEmployeeAttachments],
  );
  const canUploadEmployeeAttachment = Boolean(employeeId) || typeof onUploadPendingEmployeeAttachment === "function";
  const handleEmployeeUpload = (file: File) => {
    if (employeeId) {
      uploadMutation.mutate(file);
      return;
    }
    onUploadPendingEmployeeAttachment?.(file);
  };
  const buildPendingAttachmentUrl = (id: number) => pendingAttachmentUrlsById.get(id) ?? "#";

  return (
    <AttachmentsPanel
      title="Dokumente"
      helpKey="employees.sidebar.attachments"
      className={className}
      items={items}
      isLoading={isLoading}
      canUpload={canUploadEmployeeAttachment}
      isUploading={uploadMutation.isPending}
      onUpload={handleEmployeeUpload}
      buildOpenUrl={(id) => employeeId ? `/api/employee-attachments/${id}/download` : buildPendingAttachmentUrl(id)}
      buildDownloadUrl={(id) => employeeId ? `/api/employee-attachments/${id}/download?download=1` : buildPendingAttachmentUrl(id)}
      buildActionSlot={employeeId
        ? (id) => (
            <AttachmentDeleteAction
              attachmentId={id}
              parentType="employee"
              listQueryKey={["/api/employees", employeeId, "attachments"]}
              canEdit={canDelete && !pendingAttachmentUrlsById.has(id)}
            />
          )
        : undefined}
    />
  );
}
