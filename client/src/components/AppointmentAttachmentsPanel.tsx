import { useQuery } from "@tanstack/react-query";
import { SplitAttachmentsPanel } from "@/components/SplitAttachmentsPanel";

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
};

interface AppointmentAttachmentsPanelProps {
  appointmentId?: number | null;
}

export function AppointmentAttachmentsPanel({ appointmentId }: AppointmentAttachmentsPanelProps) {
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

  return (
    <SplitAttachmentsPanel
      title="Dokumente"
      helpKey="appointments.sidebar.attachments"
      sections={[
        {
          id: "customer",
          title: "Kundendokumente",
          subtitle: data ? `(Kunde: ${data.customer.fullName ?? data.customer.customerNumber})` : undefined,
          items: data?.customerAttachments ?? [],
          isLoading,
          emptyText: "Keine Kundendokumente vorhanden",
          buildOpenUrl: (id) => `/api/customer-attachments/${id}/download`,
          buildDownloadUrl: (id) => `/api/customer-attachments/${id}/download?download=1`,
        },
        {
          id: "project",
          title: "Projektdokumente",
          subtitle: data?.project ? `(Projekt: ${data.project.name})` : "(Kein Projekt)",
          items: data?.projectAttachments ?? [],
          isLoading,
          emptyText: data?.project ? "Keine Projektdokumente vorhanden" : "Kein Projekt zugeordnet",
          buildOpenUrl: (id) => `/api/project-attachments/${id}/download`,
          buildDownloadUrl: (id) => `/api/project-attachments/${id}/download?download=1`,
        },
      ]}
    />
  );
}
