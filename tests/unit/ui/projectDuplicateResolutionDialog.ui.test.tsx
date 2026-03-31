/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der Projekt-Duplikatdialog zeigt Projektname und Auftragsnummer immer an.
 * - Bei vorhandenem Termin wird der aktuellste Termintext inklusive Kunde und Tour angezeigt.
 * - Ohne Terminplanung wird der explizite No-Appointment-Hinweis gerendert.
 *
 * Fehlerfälle:
 * - Der Dialog verschweigt den Terminstatus eines Projektduplikats.
 * - Abbrechen- oder Bestaetigen-Aktion verschwinden aus dem Dialog.
 *
 * Ziel:
 * Den neuen Projekt-Duplikatdialog ueber seine sichtbaren Fallunterscheidungen absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ProjectDuplicateResolutionDialog } from "../../../client/src/components/ProjectDuplicateResolutionDialog";

vi.mock("@/components/ui/alert-dialog", () => ({
  AlertDialog: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  AlertDialogContent: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <section {...props}>{children}</section>,
  AlertDialogHeader: ({ children }: { children?: React.ReactNode }) => <header>{children}</header>,
  AlertDialogTitle: ({ children }: { children?: React.ReactNode }) => <h2>{children}</h2>,
  AlertDialogDescription: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <div {...props}>{children}</div>,
  AlertDialogFooter: ({ children }: { children?: React.ReactNode }) => <footer>{children}</footer>,
  AlertDialogCancel: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <button type="button" {...props}>{children}</button>,
  AlertDialogAction: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <button type="button" {...props}>{children}</button>,
}));

const project = {
  id: 7,
  name: "Bestandsprojekt",
  customerId: 5,
  type: 1,
  isActive: true,
  version: 3,
  createdAt: new Date("2026-03-30T10:00:00.000Z"),
  updatedAt: new Date("2026-03-30T10:00:00.000Z"),
  orderNumber: "ORD-700",
  amount: null,
  projectOrder: null,
};

describe("FT21 ui: project duplicate resolution dialog", () => {
  it("renders the latest appointment details when a duplicate project already has appointments", () => {
    const html = renderToStaticMarkup(
      <ProjectDuplicateResolutionDialog
        open
        resolution={{
          project,
          latestAppointment: {
            id: 44,
            startDate: "2099-05-03",
            endDate: null,
            startTime: "14:00:00",
            startTimeHour: 14,
            tourName: "Tour Nord",
            customerName: "Kunde Beispiel",
          },
        }}
        onOpenChange={() => undefined}
        onConfirm={() => undefined}
      />,
    );

    expect(html).toContain("project-duplicate-resolution-dialog");
    expect(html).toContain("Bestandsprojekt");
    expect(html).toContain("ORD-700");
    expect(html).toContain("Der aktuellste Termin zu diesem Projekt ist bereits geplant.");
    expect(html).toContain("14:00 - 03.05.99");
    expect(html).toContain("Kunde Beispiel");
    expect(html).toContain("Tour Nord");
    expect(html).toContain("button-project-duplicate-cancel");
    expect(html).toContain("button-project-duplicate-confirm");
  });

  it("renders the explicit no-appointment hint when no planning exists yet", () => {
    const html = renderToStaticMarkup(
      <ProjectDuplicateResolutionDialog
        open
        resolution={{
          project,
          latestAppointment: null,
        }}
        onOpenChange={() => undefined}
        onConfirm={() => undefined}
      />,
    );

    expect(html).toContain("project-duplicate-resolution-no-appointment");
    expect(html).toContain("Fuer dieses Projekt existiert noch keine Terminplanung.");
    expect(html).not.toContain("project-duplicate-resolution-latest-appointment");
  });
});
