import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type Domain = "project" | "customer" | "employee" | "appointment";

const domainConfig: Record<Domain, { deleteUrl: (id: number) => string; listQueryKey: (parentId: number) => unknown[] }> = {
  project: {
    deleteUrl: (id) => `/api/project-attachments/${id}`,
    listQueryKey: (parentId) => ["/api/projects", parentId, "attachments"],
  },
  customer: {
    deleteUrl: (id) => `/api/customer-attachments/${id}`,
    listQueryKey: (parentId) => ["/api/customers", parentId, "attachments"],
  },
  employee: {
    deleteUrl: (id) => `/api/employee-attachments/${id}`,
    listQueryKey: (parentId) => ["/api/employees", parentId, "attachments"],
  },
  appointment: {
    deleteUrl: (id) => `/api/appointment-attachments/${id}`,
    listQueryKey: (parentId) => ["/api/appointments", parentId, "attachment-context"],
  },
};

interface AttachmentDeleteActionProps {
  attachmentId: number;
  parentId: number;
  domain: Domain;
  canDelete: boolean;
}

export function AttachmentDeleteAction({
  attachmentId,
  parentId,
  domain,
  canDelete,
}: AttachmentDeleteActionProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const config = domainConfig[domain];

  const deleteMutation = useMutation({
    mutationFn: async (mode: "soft" | "hard") => {
      const url = mode === "hard"
        ? `${config.deleteUrl(attachmentId)}?mode=hard`
        : config.deleteUrl(attachmentId);
      const response = await fetch(url, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.message ?? `Fehler ${response.status}`);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: config.listQueryKey(parentId) });
      setOpen(false);
      toast({ title: "Anhang geloescht" });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Loeschen fehlgeschlagen";
      toast({ title: "Fehler", description: message, variant: "destructive" });
    },
  });

  if (!canDelete) return null;

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="h-5 w-5"
          data-testid={`attachment-delete-trigger-${attachmentId}`}
          onClick={(e) => e.stopPropagation()}
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Anhang loeschen</AlertDialogTitle>
          <AlertDialogDescription>
            Wie soll der Anhang geloescht werden?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-col gap-2">
          <Button
            variant="outline"
            onClick={() => deleteMutation.mutate("soft")}
            disabled={deleteMutation.isPending}
            data-testid={`attachment-delete-soft-${attachmentId}`}
          >
            Nur Verknuepfung entfernen
          </Button>
          <Button
            variant="destructive"
            onClick={() => deleteMutation.mutate("hard")}
            disabled={deleteMutation.isPending}
            data-testid={`attachment-delete-hard-${attachmentId}`}
          >
            Datei vollstaendig loeschen
          </Button>
          <AlertDialogCancel disabled={deleteMutation.isPending}>
            Abbrechen
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
