import { useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { CustomerAttachment } from "@shared/schema";
import { AttachmentsPanel } from "@/components/AttachmentsPanel";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CustomerAttachmentsPanelProps {
  customerId?: number | null;
}

export function CustomerAttachmentsPanel({ customerId }: CustomerAttachmentsPanelProps) {
  const { toast } = useToast();
  const { data: attachments = [], isLoading } = useQuery<CustomerAttachment[]>({
    queryKey: ["/api/customers", customerId, "attachments"],
    enabled: Boolean(customerId),
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

  return (
    <AttachmentsPanel
      title="Dokumente"
      items={items}
      isLoading={isLoading}
      canUpload={Boolean(customerId)}
      isUploading={uploadMutation.isPending}
      onUpload={(file) => uploadMutation.mutate(file)}
      buildOpenUrl={(id) => `/api/customer-attachments/${id}/download`}
      buildDownloadUrl={(id) => `/api/customer-attachments/${id}/download?download=1`}
    />
  );
}
