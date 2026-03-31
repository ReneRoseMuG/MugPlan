import React from "react";
import type { Project } from "@shared/schema";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatListDateTime } from "@/lib/list-display-format";

export type ProjectDuplicateLatestAppointment = {
  id: number;
  startDate: string;
  endDate: string | null;
  startTime: string | null;
  startTimeHour: number | null;
  tourName: string | null;
  customerName: string | null;
};

export type ProjectDuplicateResolution = {
  project: Project;
  latestAppointment: ProjectDuplicateLatestAppointment | null;
};

interface ProjectDuplicateResolutionDialogProps {
  open: boolean;
  resolution: ProjectDuplicateResolution | null;
  isBusy?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function ProjectDuplicateResolutionDialog({
  open,
  resolution,
  isBusy = false,
  onOpenChange,
  onConfirm,
}: ProjectDuplicateResolutionDialogProps) {
  const projectName = resolution?.project?.name?.trim() || "Unbenanntes Projekt";
  const orderNumber = resolution?.project?.orderNumber?.trim() || "Keine Auftragsnummer";
  const latestAppointmentLabel = resolution?.latestAppointment
    ? formatListDateTime(resolution.latestAppointment)
    : "";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-testid="project-duplicate-resolution-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>Projekt bereits vorhanden</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p data-testid="project-duplicate-resolution-summary">
                Das Projekt <strong>{projectName}</strong> mit der Auftragsnummer <strong>{orderNumber}</strong> existiert bereits.
              </p>
              {resolution?.latestAppointment ? (
                <div className="space-y-1" data-testid="project-duplicate-resolution-latest-appointment">
                  <p>Der aktuellste Termin zu diesem Projekt ist bereits geplant.</p>
                  <p>
                    Termin: <strong>{latestAppointmentLabel}</strong>
                  </p>
                  {resolution.latestAppointment.customerName ? (
                    <p>
                      Kunde: <strong>{resolution.latestAppointment.customerName}</strong>
                    </p>
                  ) : null}
                  {resolution.latestAppointment.tourName ? (
                    <p>
                      Tour: <strong>{resolution.latestAppointment.tourName}</strong>
                    </p>
                  ) : null}
                </div>
              ) : (
                <p data-testid="project-duplicate-resolution-no-appointment">
                  Fuer dieses Projekt existiert noch keine Terminplanung.
                </p>
              )}
              <p>Bei Bestätigung wird wie bisher das vorhandene Projekt im Bearbeitungsformular geöffnet.</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isBusy} data-testid="button-project-duplicate-cancel">
            Abbrechen
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isBusy || !resolution}
            data-testid="button-project-duplicate-confirm"
          >
            Vorhandenes Projekt öffnen
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
