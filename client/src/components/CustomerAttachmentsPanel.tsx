import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { CustomerAttachment } from "@shared/schema";
import { SplitAttachmentsPanel } from "@/components/SplitAttachmentsPanel";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CustomerAttachmentsPanelProps {
  customerId?: number | null;
}

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

export function CustomerAttachmentsPanel({ customerId }: CustomerAttachmentsPanelProps) {
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

  const items = useMemo(() => attachments, [attachments]);
  const projectItems = useMemo(
    () => (projectAttachmentAggregate?.items ?? []).flatMap((group) =>
      group.attachments.map((attachment) => ({
        ...attachment,
        originalName: `[${group.projectName}] ${attachment.originalName}`,
      }))),
    [projectAttachmentAggregate],
  );

  return (
    <SplitAttachmentsPanel
      title="Dokumente"
      helpKey="customers.sidebar.attachments"
      sections={[
        {
          id: "customer",
          title: "Kundendokumente",
          items,
          isLoading,
          emptyText: "Keine Dokumente vorhanden",
          canUpload: Boolean(customerId),
          isUploading: uploadMutation.isPending,
          onUpload: (file) => uploadMutation.mutate(file),
          buildOpenUrl: (id) => `/api/customer-attachments/${id}/download`,
          buildDownloadUrl: (id) => `/api/customer-attachments/${id}/download?download=1`,
        },
        {
          id: "project",
          title: "Projektdokumente",
          subtitle: "(alle Projekte dieses Kunden)",
          items: projectItems,
          isLoading: isProjectAttachmentsLoading,
          emptyText: "Keine Projektdokumente vorhanden",
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
