/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der zentrale Workflow-Notizvorschlag verwendet einheitlich Überspringen und Jetzt anlegen.
 * - Bestätigen und Überspringen werden über die gemeinsamen Dialog-Callbacks ausgelöst.
 * - Der zentrale Entfernen-Dialog verwendet einheitlich Behalten und Entfernen.
 *
 * Ziel:
 * Die gemeinsamen Dialogtexte und Callback-Wiring für Reklamation und Messe unabhängig vom auslösenden UI-Kontext absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type DialogButtonProps = {
  "data-testid"?: string;
  onClick?: () => void;
  children?: React.ReactNode;
};

const actionProps = new Map<string, DialogButtonProps>();
const cancelProps = new Map<string, DialogButtonProps>();

vi.mock("@/components/ui/alert-dialog", () => ({
  AlertDialog: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  AlertDialogContent: ({ children, ...props }: { children?: React.ReactNode }) => <section {...props}>{children}</section>,
  AlertDialogDescription: ({ children }: { children?: React.ReactNode }) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: { children?: React.ReactNode }) => <footer>{children}</footer>,
  AlertDialogHeader: ({ children }: { children?: React.ReactNode }) => <header>{children}</header>,
  AlertDialogTitle: ({ children }: { children?: React.ReactNode }) => <h2>{children}</h2>,
  AlertDialogAction: (props: DialogButtonProps) => {
    if (props["data-testid"]) actionProps.set(props["data-testid"], props);
    return <button type="button" {...props}>{props.children}</button>;
  },
  AlertDialogCancel: (props: DialogButtonProps) => {
    if (props["data-testid"]) cancelProps.set(props["data-testid"], props);
    return <button type="button" {...props}>{props.children}</button>;
  },
}));

import { WorkflowNoteRemovalDialog, WorkflowNoteSuggestionDialog } from "../../../client/src/components/notes/WorkflowNoteDialogs";

describe("WorkflowNoteDialogs", () => {
  beforeEach(() => {
    actionProps.clear();
    cancelProps.clear();
  });

  it("renders the shared suggestion wording and wires skip and confirm", () => {
    const onSkip = vi.fn();
    const onConfirm = vi.fn();

    const html = renderToStaticMarkup(
      <WorkflowNoteSuggestionDialog
        open
        templateTitle="Reklamation"
        targetLabel="diesen Termin"
        onOpenChange={() => undefined}
        onSkip={onSkip}
        onConfirm={onConfirm}
      />,
    );

    expect(html).toContain("Soll eine Notiz „Reklamation“ für diesen Termin angelegt werden?");
    expect(html).toContain("Überspringen");
    expect(html).toContain("Jetzt anlegen");

    cancelProps.get("button-note-suggestion-skip")?.onClick?.();
    actionProps.get("button-note-suggestion-confirm")?.onClick?.();

    expect(onSkip).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("renders the shared removal actions and wires keep and confirm", () => {
    const onKeep = vi.fn();
    const onConfirm = vi.fn();

    const html = renderToStaticMarkup(
      <WorkflowNoteRemovalDialog
        open
        description="Soll die Notiz „Messe Aufbau/Abbau“ ebenfalls entfernt werden?"
        onOpenChange={() => undefined}
        onKeep={onKeep}
        onConfirm={onConfirm}
      />,
    );

    expect(html).toContain("Notiz entfernen?");
    expect(html).toContain("Behalten");
    expect(html).toContain("Entfernen");

    cancelProps.get("button-note-removal-keep")?.onClick?.();
    actionProps.get("button-note-removal-confirm")?.onClick?.();

    expect(onKeep).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
