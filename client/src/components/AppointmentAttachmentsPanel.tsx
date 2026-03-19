import { useEffect, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { SplitAttachmentsPanel } from "@/components/SplitAttachmentsPanel";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AttachmentItem = {
  id: number;
  originalName: string;
  mimeType: string | null;
};

export type PendingAppointmentAttachmentItem = AttachmentItem & {
  file: File;
};

type AppointmentAttachmentContext = {
  appointmentId: number;
  project: {
    id: number;
    name: string;
    orderNumber: string | null;
  } | null;
  customer: {
    id: number;
    customerNumber: string;
    fullName: string | null;
  };
  projectAttachments: AttachmentItem[];
  customerAttachments: AttachmentItem[];
  appointmentAttachments: AttachmentItem[];
};

interface AppointmentAttachmentsPanelProps {
  appointmentId?: number | null;
  customerId?: number | null;
  projectId?: number | null;
  pendingAppointmentAttachments?: PendingAppointmentAttachmentItem[];
  onUploadPendingAppointmentAttachment?: (file: File) => void;
}

export function AppointmentAttachmentsPanel({
  appointmentId,
  customerId,
  projectId,
  pendingAppointmentAttachments = [],
  onUploadPendingAppointmentAttachment,
}: AppointmentAttachmentsPanelProps) {
  const { toast } = useToast();
  const { data, isLoading } = useQuery<AppointmentAttachmentContext>({
    queryKey: ["/api/appointments", appointmentId, "attachment-context"],
    enabled: Boolean(appointmentId),
    queryFn: async () => {
      const response = await fetch(`/api/appointments/${appointmentId}/attachment-context`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Attachment-Kontext konnte nicht geladen werden");
      }
      return response.json();
    },
  });
  const { data: customerAttachments = [], isLoading: customerAttachmentsLoading } = useQuery<AttachmentItem[]>({
    queryKey: ["/api/customers", customerId, "attachments"],
    enabled: !appointmentId && Boolean(customerId),
  });
  const { data: projectAttachments = [], isLoading: projectAttachmentsLoading } = useQuery<AttachmentItem[]>({
    queryKey: ["/api/projects", projectId, "attachments"],
    enabled: !appointmentId && Boolean(projectId),
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!appointmentId) throw new Error("Termin fehlt");
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`/api/appointments/${appointmentId}/attachments`, {
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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/appointments", appointmentId, "attachment-context"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/appointments", appointmentId, "attachments"] });
      await queryClient.invalidateQueries({ queryKey: ["calendarAppointments"] });
      toast({ title: "Dokument hochgeladen" });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Upload fehlgeschlagen";
      toast({ title: "Fehler", description: message, variant: "destructive" });
    },
  });

  const pendingAttachmentUrls = useMemo(
    () => pendingAppointmentAttachments.map((attachment) => ({
      id: attachment.id,
      url: URL.createObjectURL(attachment.file),
    })),
    [pendingAppointmentAttachments],
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

  const resolvedCustomerAttachments = appointmentId ? (data?.customerAttachments ?? []) : customerAttachments;
  const resolvedProjectAttachments = appointmentId ? (data?.projectAttachments ?? []) : projectAttachments;
  const resolvedAppointmentAttachments = appointmentId
    ? (data?.appointmentAttachments ?? [])
    : pendingAppointmentAttachments;
  const resolvedProjectLabel = appointmentId ? data?.project : (projectId ? { id: projectId } : null);
  const resolvedCustomerLoading = appointmentId ? isLoading : customerAttachmentsLoading;
  const resolvedProjectLoading = appointmentId ? isLoading : projectAttachmentsLoading;
  const resolvedAppointmentLoading = appointmentId ? isLoading : false;
  const canUploadAppointmentAttachment = Boolean(appointmentId) || typeof onUploadPendingAppointmentAttachment === "function";
  const handleAppointmentUpload = (file: File) => {
    if (appointmentId) {
      uploadMutation.mutate(file);
      return;
    }
    onUploadPendingAppointmentAttachment?.(file);
  };
  const buildPendingAttachmentUrl = (id: number) => pendingAttachmentUrlsById.get(id) ?? "#";

  return (
    <SplitAttachmentsPanel
      title="Dokumente"
      helpKey="appointments.sidebar.attachments"
      sections={[
        {
          id: "customer",
          title: "Kundendokumente",
          items: resolvedCustomerAttachments,
          isLoading: resolvedCustomerLoading,
          emptyText: "Keine Kundendokumente vorhanden",
          buildOpenUrl: (id) => `/api/customer-attachments/${id}/download`,
          buildDownloadUrl: (id) => `/api/customer-attachments/${id}/download?download=1`,
        },
        {
          id: "project",
          title: "Projektdokumente",
          items: resolvedProjectAttachments,
          isLoading: resolvedProjectLoading,
          emptyText: resolvedProjectLabel ? "Keine Projektdokumente vorhanden" : "Kein Projekt zugeordnet",
          buildOpenUrl: (id) => `/api/project-attachments/${id}/download`,
          buildDownloadUrl: (id) => `/api/project-attachments/${id}/download?download=1`,
        },
        {
          id: "appointment",
          title: "Terminanhaenge",
          items: resolvedAppointmentAttachments,
          isLoading: resolvedAppointmentLoading,
          emptyText: "Keine Terminanhaenge vorhanden",
          canUpload: canUploadAppointmentAttachment,
          isUploading: uploadMutation.isPending,
          onUpload: handleAppointmentUpload,
          buildOpenUrl: (id) => appointmentId ? `/api/appointment-attachments/${id}/download` : buildPendingAttachmentUrl(id),
          buildDownloadUrl: (id) => appointmentId ? `/api/appointment-attachments/${id}/download?download=1` : buildPendingAttachmentUrl(id),
        },
      ]}
    />
  );
}
