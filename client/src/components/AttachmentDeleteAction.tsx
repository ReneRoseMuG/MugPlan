import { useState } from "react";
import { Minus, X } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type ParentType = "project" | "customer" | "employee" | "appointment";

const deleteUrlByType: Record<ParentType, (id: number) => string> = {
  project: (id) => `/api/project-attachments/${id}`,
  customer: (id) => `/api/customer-attachments/${id}`,
  employee: (id) => `/api/employee-attachments/${id}`,
  appointment: (id) => `/api/appointment-attachments/${id}`,
};

const parentTypeLabel: Record<ParentType, string> = {
  project: "Projekt",
  customer: "Kunde",
  employee: "Mitarbeiter",
  appointment: "Termin",
};

interface AttachmentDeleteActionProps {
  attachmentId: number;
  parentType: ParentType;
  listQueryKey: unknown[];
  canEdit: boolean;
  defaultMode?: "soft" | "hard";
  isHistoricalAppointment?: boolean;
}

export function AttachmentDeleteAction({
  attachmentId,
  parentType,
  listQueryKey,
  canEdit,
  isHistoricalAppointment,
}: AttachmentDeleteActionProps) {
  const [confirmed, setConfirmed] = useState(false);
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: async (mode: "soft" | "hard") => {
      const baseUrl = deleteUrlByType[parentType](attachmentId);
      const url = mode === "hard" ? `${baseUrl}?mode=hard` : baseUrl;
      const response = await fetch(url, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.message ?? `Fehler ${response.status}`);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: listQueryKey });
      await queryClient.invalidateQueries({ queryKey: ["calendarAppointments"] });
      setConfirmed(false);
      toast({ title: "Anhang gelöscht" });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Löschen fehlgeschlagen";
      toast({ title: "Fehler", description: message, variant: "destructive" });
    },
  });

  if (!canEdit || isHistoricalAppointment) return null;

  const label = parentTypeLabel[parentType];

  return (
    <div
      className="relative"
      onClick={(e) => e.stopPropagation()}
      data-testid={`attachment-delete-action-${attachmentId}`}
    >
      {/* Trigger — always in the tree */}
      <Button
        size="icon"
        variant="ghost"
        className="h-5 w-5"
        data-testid={`attachment-delete-trigger-${attachmentId}`}
        onClick={() => setConfirmed((v) => !v)}
        aria-expanded={confirmed}
      >
        <Minus className="w-3 h-3" />
      </Button>

      {/* Confirmation panel — always in the tree, visibility controlled via CSS */}
      <div
        className={`absolute right-0 top-full z-50 flex w-56 flex-col gap-1 rounded border bg-popover p-2 text-sm shadow${confirmed ? "" : " hidden"}`}
        data-testid={`attachment-delete-panel-${attachmentId}`}
        aria-hidden={!confirmed}
      >
        <p className="text-xs text-muted-foreground">
          Anhang des {label} löschen
        </p>
        <Button
          size="sm"
          variant="outline"
          disabled={deleteMutation.isPending}
          data-testid={`attachment-delete-soft-${attachmentId}`}
          onClick={() => deleteMutation.mutate("soft")}
        >
          Nur Verknüpfung entfernen
        </Button>
        <Button
          size="sm"
          variant="destructive"
          disabled={deleteMutation.isPending}
          data-testid={`attachment-delete-hard-${attachmentId}`}
          onClick={() => deleteMutation.mutate("hard")}
        >
          Datei vollständig löschen
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={deleteMutation.isPending}
          onClick={() => setConfirmed(false)}
        >
          <X className="h-3 w-3" />
          Abbrechen
        </Button>
      </div>
    </div>
  );
}
