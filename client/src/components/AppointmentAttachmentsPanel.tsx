import { useMutation, useQuery } from "@tanstack/react-query";
import { SplitAttachmentsPanel } from "@/components/SplitAttachmentsPanel";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AttachmentItem = {
  id: number;
  originalName: string;
  mimeType: string | null;
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
}

export function AppointmentAttachmentsPanel({ appointmentId }: AppointmentAttachmentsPanelProps) {
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

  return (
    <SplitAttachmentsPanel
      title="Dokumente"
      helpKey="appointments.sidebar.attachments"
      className="h-full"
      sections={[
        {
          id: "customer",
          title: "Kundendokumente",
          items: data?.customerAttachments ?? [],
          isLoading,
          emptyText: "Keine Kundendokumente vorhanden",
          buildOpenUrl: (id) => `/api/customer-attachments/${id}/download`,
          buildDownloadUrl: (id) => `/api/customer-attachments/${id}/download?download=1`,
        },
        {
          id: "project",
          title: "Projektdokumente",
          items: data?.projectAttachments ?? [],
          isLoading,
          emptyText: data?.project ? "Keine Projektdokumente vorhanden" : "Kein Projekt zugeordnet",
          buildOpenUrl: (id) => `/api/project-attachments/${id}/download`,
          buildDownloadUrl: (id) => `/api/project-attachments/${id}/download?download=1`,
        },
        {
          id: "appointment",
          title: "Terminanhaenge",
          items: data?.appointmentAttachments ?? [],
          isLoading,
          emptyText: "Keine Terminanhaenge vorhanden",
          canUpload: Boolean(appointmentId),
          isUploading: uploadMutation.isPending,
          onUpload: (file) => uploadMutation.mutate(file),
          buildOpenUrl: (id) => `/api/appointment-attachments/${id}/download`,
          buildDownloadUrl: (id) => `/api/appointment-attachments/${id}/download?download=1`,
        },
      ]}
    />
  );
}
