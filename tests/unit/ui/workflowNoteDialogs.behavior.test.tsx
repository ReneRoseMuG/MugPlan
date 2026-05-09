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

vi.mock("@/components/ui/dialog-base", () => ({
  DialogBaseShell: ({
    children,
    description,
    footer,
    testId,
    title,
  }: {
    children?: React.ReactNode;
    description?: React.ReactNode;
    footer?: React.ReactNode;
    testId?: string;
    title?: React.ReactNode;
  }) => (
    <section data-testid={testId}>
      <h2>{title}</h2>
      <p>{description}</p>
      {children}
      <footer>{footer}</footer>
    </section>
  ),
  DialogBaseFooter: ({
    primaryAction,
    secondaryAction,
  }: {
    primaryAction?: { label: string; onClick?: () => void; testId?: string };
    secondaryAction?: { label: string; onClick?: () => void; testId?: string };
  }) => {
    if (primaryAction?.testId) {
      actionProps.set(primaryAction.testId, {
        "data-testid": primaryAction.testId,
        onClick: primaryAction.onClick,
        children: primaryAction.label,
      });
    }
    if (secondaryAction?.testId) {
      cancelProps.set(secondaryAction.testId, {
        "data-testid": secondaryAction.testId,
        onClick: secondaryAction.onClick,
        children: secondaryAction.label,
      });
    }
    return (
      <>
        {secondaryAction ? <button type="button" data-testid={secondaryAction.testId} onClick={secondaryAction.onClick}>{secondaryAction.label}</button> : null}
        {primaryAction ? <button type="button" data-testid={primaryAction.testId} onClick={primaryAction.onClick}>{primaryAction.label}</button> : null}
      </>
    );
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
