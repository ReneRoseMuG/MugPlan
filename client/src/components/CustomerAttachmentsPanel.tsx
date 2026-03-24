import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { CustomerAttachment } from "@shared/schema";
import { SplitAttachmentsPanel } from "@/components/SplitAttachmentsPanel";
import { AttachmentDeleteAction } from "@/components/AttachmentDeleteAction";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CustomerAttachmentsPanelProps {
  customerId?: number | null;
  isEditing?: boolean;
  canDelete?: boolean;
  className?: string;
  pendingCustomerAttachments?: PendingCustomerAttachmentItem[];
  onUploadPendingCustomerAttachment?: (file: File) => void;
}

type AttachmentItem = {
  id: number;
  originalName: string;
  mimeType: string | null;
};

export type PendingCustomerAttachmentItem = AttachmentItem & {
  file: File;
};

type ProjectAttachmentGroup = {
  projectId: number;
  projectName: string;
  attachments: Array<{
    id: number;
    originalName: string;
    mimeType: string | null;
  }>;
};

type CustomerProjectAttachmentAggregateResponse = {
  items: ProjectAttachmentGroup[];
  totalProjects: number;
  totalAttachments: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

export function CustomerAttachmentsPanel({
  customerId,
  isEditing = true,
  canDelete = false,
  className,
  pendingCustomerAttachments = [],
  onUploadPendingCustomerAttachment,
}: CustomerAttachmentsPanelProps) {
  const { toast } = useToast();
  const [projectsPage, setProjectsPage] = useState(1);
  const pageSize = 20;
  const { data: attachments = [], isLoading } = useQuery<CustomerAttachment[]>({
    queryKey: ["/api/customers", customerId, "attachments"],
    enabled: Boolean(customerId),
  });
  const {
    data: projectAttachmentAggregate,
    isLoading: isProjectAttachmentsLoading,
  } = useQuery<CustomerProjectAttachmentAggregateResponse>({
    queryKey: ["/api/customers", customerId, "project-attachments", projectsPage, pageSize],
    enabled: Boolean(customerId),
    queryFn: async () => {
      const response = await fetch(
        `/api/customers/${customerId}/project-attachments?page=${projectsPage}&pageSize=${pageSize}`,
        {
          credentials: "include",
        },
      );
      if (!response.ok) {
        throw new Error("Projektdokumente konnten nicht geladen werden");
      }
      return response.json();
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!customerId) throw new Error("Kunde fehlt");
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`/api/customers/${customerId}/attachments`, {
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
      void queryClient.invalidateQueries({ queryKey: ["/api/customers", customerId, "attachments"] });
      toast({ title: "Dokument hochgeladen" });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Upload fehlgeschlagen";
      toast({ title: "Fehler", description: message, variant: "destructive" });
    },
  });

  const pendingAttachmentUrls = useMemo(
    () => pendingCustomerAttachments.map((attachment) => ({
      id: attachment.id,
      url: URL.createObjectURL(attachment.file),
    })),
    [pendingCustomerAttachments],
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
    () => (isEditing ? attachments : pendingCustomerAttachments),
    [attachments, isEditing, pendingCustomerAttachments],
  );
  const projectItems = useMemo(
    () => (projectAttachmentAggregate?.items ?? []).flatMap((group) =>
      group.attachments.map((attachment) => ({
        ...attachment,
        originalName: `[${group.projectName}] ${attachment.originalName}`,
      }))),
    [projectAttachmentAggregate],
  );
  const canUploadCustomerAttachment = Boolean(customerId) || typeof onUploadPendingCustomerAttachment === "function";
  const handleCustomerUpload = (file: File) => {
    if (customerId) {
      uploadMutation.mutate(file);
      return;
    }
    onUploadPendingCustomerAttachment?.(file);
  };
  const buildPendingAttachmentUrl = (id: number) => pendingAttachmentUrlsById.get(id) ?? "#";

  return (
    <SplitAttachmentsPanel
      title="Dokumente"
      helpKey="customers.sidebar.attachments"
      className={className}
      sections={[
        {
          id: "customer",
          title: "Kundendokumente",
          items,
          isLoading,
          emptyText: isEditing ? "Keine Dokumente vorhanden" : "Keine Kundendokumente ausgewaehlt",
          canUpload: canUploadCustomerAttachment,
          isUploading: uploadMutation.isPending,
          onUpload: handleCustomerUpload,
          buildOpenUrl: (id) => customerId ? `/api/customer-attachments/${id}/download` : buildPendingAttachmentUrl(id),
          buildDownloadUrl: (id) => customerId ? `/api/customer-attachments/${id}/download?download=1` : buildPendingAttachmentUrl(id),
          buildActionSlot: customerId
            ? (id) => (
                <AttachmentDeleteAction
                  attachmentId={id}
                  parentId={customerId}
                  domain="customer"
                  canDelete={canDelete && !pendingAttachmentUrlsById.has(id)}
                />
              )
            : undefined,
        },
        {
          id: "project",
          title: "Projektdokumente",
          items: projectItems,
          isLoading: isProjectAttachmentsLoading,
          emptyText: customerId ? "Keine Projektdokumente vorhanden" : "Projektdokumente werden nach dem Speichern angezeigt",
          buildOpenUrl: (id) => `/api/project-attachments/${id}/download`,
          buildDownloadUrl: (id) => `/api/project-attachments/${id}/download?download=1`,
          footer: projectAttachmentAggregate?.hasMore ? (
            <div className="pt-1">
              <button
                type="button"
                className="text-xs text-primary underline"
                onClick={() => setProjectsPage((current) => current + 1)}
              >
                Mehr laden
              </button>
            </div>
          ) : null,
        },
      ]}
    />
  );
}
