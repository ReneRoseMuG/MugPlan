import { useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { EmployeeAttachment } from "@shared/schema";
import { AttachmentsPanel } from "@/components/AttachmentsPanel";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface EmployeeAttachmentsPanelProps {
  employeeId?: number | null;
}

export function EmployeeAttachmentsPanel({ employeeId }: EmployeeAttachmentsPanelProps) {
  const { toast } = useToast();
  const { data: attachments = [], isLoading } = useQuery<EmployeeAttachment[]>({
    queryKey: ["/api/employees", employeeId, "attachments"],
    enabled: Boolean(employeeId),
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
      queryClient.invalidateQueries({ queryKey: ["/api/employees", employeeId, "attachments"] });
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
      canUpload={Boolean(employeeId)}
      isUploading={uploadMutation.isPending}
      onUpload={(file) => uploadMutation.mutate(file)}
      buildOpenUrl={(id) => `/api/employee-attachments/${id}/download`}
      buildDownloadUrl={(id) => `/api/employee-attachments/${id}/download?download=1`}
    />
  );
}
