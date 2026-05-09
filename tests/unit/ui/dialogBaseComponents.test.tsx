import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/alert-dialog", () => ({
  AlertDialog: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  AlertDialogAction: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => (
    <button type="button" {...props}>{children}</button>
  ),
  AlertDialogCancel: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => (
    <button type="button" {...props}>{children}</button>
  ),
  AlertDialogContent: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => (
    <section {...props}>{children}</section>
  ),
  AlertDialogDescription: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => (
    <p {...props}>{children}</p>
  ),
  AlertDialogFooter: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => (
    <footer {...props}>{children}</footer>
  ),
  AlertDialogHeader: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => (
    <header {...props}>{children}</header>
  ),
  AlertDialogTitle: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => (
    <h2 {...props}>{children}</h2>
  ),
}));

import {
  ConfirmDialogBase,
  DialogBaseFooter,
  DialogBaseInlineMessage,
  DialogBaseStepper,
} from "../../../client/src/components/ui/dialog-base";

describe("dialog base components", () => {
  it("renders explicit footer actions without caller-provided free-form buttons", () => {
    const html = renderToStaticMarkup(
      <DialogBaseFooter
        backAction={{ label: "Zurück" }}
        primaryAction={{ label: "Speichern", isPending: true }}
        secondaryAction={{ label: "Abbrechen" }}
      />,
    );

    expect(html).toContain("Zurück");
    expect(html).toContain("Speichern");
    expect(html).toContain("Abbrechen");
    expect(html).toContain("disabled");
    expect(html).toContain("animate-spin");
  });

  it("renders confirm dialogs with MuG icon, body and footer structure", () => {
    const html = renderToStaticMarkup(
      <ConfirmDialogBase
        open
        onOpenChange={() => undefined}
        title="Team wirklich löschen?"
        description="Team 1 wird gelöscht."
        confirmLabel="Team löschen"
        icon={<span data-testid="team-domain-icon">team-domain-icon</span>}
        onConfirm={() => undefined}
      />,
    );

    expect(html).not.toContain("mugplan-icon-b2.svg");
    expect(html).toContain("team-domain-icon");
    expect(html).toContain("Team wirklich löschen?");
    expect(html).toContain("Team 1 wird gelöscht.");
    expect(html).toContain("Abbrechen");
    expect(html).toContain("Team löschen");
    expect(html).toContain("border-b");
    expect(html).toContain("border-t");
  });

  it("renders normalized server errors without exposing raw backend codes", () => {
    const html = renderToStaticMarkup(
      <DialogBaseInlineMessage
        error={'409: {"code":"EMPLOYEE_OVERLAP_CONFLICT"}'}
      />,
    );

    expect(html).toContain("Mitarbeiter ist bereits verplant");
    expect(html).toContain("Prüfen Sie die Auswahl");
    expect(html).not.toContain("EMPLOYEE_OVERLAP_CONFLICT");
  });

  it("marks the active step and keeps all step titles visible", () => {
    const html = renderToStaticMarkup(
      <DialogBaseStepper
        steps={[
          { id: "preview", state: "complete", title: "Vorschau" },
          { id: "confirm", state: "active", title: "Bestätigung" },
          { id: "result", state: "pending", title: "Ergebnis" },
        ]}
      />,
    );

    expect(html).toContain('aria-current="step"');
    expect(html).toContain("Vorschau");
    expect(html).toContain("Bestätigung");
    expect(html).toContain("Ergebnis");
  });
});
