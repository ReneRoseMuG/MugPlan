/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der Projekt-Speichern-Review rendert mehrere Gründe als Stepper statt als einzelne Dialoge.
 * - Die Projektnamenentscheidung wird als Teil des Review-Dialogs bestätigt.
 * - Die PDF-Duplikatentscheidung wird nicht implizit bestätigt.
 *
 * Ziel:
 * Das Dialog-Wiring des neuen Speichern-Flows unabhängig vom Browser-E2E absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type DialogAction = {
  label: string;
  onClick?: () => void;
  testId?: string;
};

const actions = new Map<string, DialogAction>();

vi.mock("@/components/ui/dialog-base", () => ({
  DialogBaseShell: ({
    children,
    footer,
    testId,
    title,
  }: {
    children?: React.ReactNode;
    footer?: React.ReactNode;
    testId?: string;
    title?: React.ReactNode;
  }) => (
    <section data-testid={testId}>
      <h2>{title}</h2>
      {children}
      <footer>{footer}</footer>
    </section>
  ),
  DialogBaseFooter: ({
    backAction,
    primaryAction,
    secondaryAction,
  }: {
    backAction?: DialogAction;
    primaryAction?: DialogAction;
    secondaryAction?: DialogAction;
  }) => {
    for (const action of [backAction, secondaryAction, primaryAction]) {
      if (action?.testId) actions.set(action.testId, action);
    }
    return (
      <>
        {backAction ? <button type="button" data-testid={backAction.testId}>{backAction.label}</button> : null}
        {secondaryAction ? <button type="button" data-testid={secondaryAction.testId}>{secondaryAction.label}</button> : null}
        {primaryAction ? <button type="button" data-testid={primaryAction.testId}>{primaryAction.label}</button> : null}
      </>
    );
  },
  DialogBaseInlineMessage: ({ title, description }: { title?: React.ReactNode; description?: React.ReactNode }) => (
    <aside>
      <strong>{title}</strong>
      <p>{description}</p>
    </aside>
  ),
  DialogBaseStepper: ({ steps }: { steps: Array<{ title: string }> }) => (
    <ol>{steps.map((step) => <li key={step.title}>{step.title}</li>)}</ol>
  ),
}));

vi.mock("@/components/RichTextEditor", () => ({
  RichTextEditor: () => <div>editor</div>,
}));

import { ProjectSaveReviewDialog } from "../../../client/src/components/ProjectSaveReviewDialog";

describe("ProjectSaveReviewDialog", () => {
  beforeEach(() => {
    actions.clear();
    vi.stubGlobal("React", React);
  });

  it("renders article and title reasons as one stepped save dialog", () => {
    const html = renderToStaticMarkup(
      <ProjectSaveReviewDialog
        open
        currentProjectName="Manueller Titel"
        missingArticleLabels={["Ofen", "Steuerung"]}
        saunaModelName="Sauna Modell A"
        onCancel={() => undefined}
        onConfirm={() => undefined}
        onOpenChange={() => undefined}
      />,
    );

    expect(html).toContain("dialog-project-save-review");
    expect(html).toContain("Artikelliste");
    expect(html).toContain("Artikelliste enthält nicht ausgewählte Positionen");
    expect(html).not.toContain("Diese Einträge stehen auf nicht ausgewählt");
    expect(html).toContain("Projektname");
    expect(html).not.toContain("Projektname kann aus dem Sauna-Modell übernommen werden");
    expect(html).toContain("Ofen");
    expect(html).toContain("Steuerung");
    expect(html).toContain("Weiter");
    expect(actions.get("button-project-save-review-next")?.label).toBe("Weiter");
  });

  it("confirms the sauna title adoption from the save dialog", () => {
    const onConfirm = vi.fn();

    renderToStaticMarkup(
      <ProjectSaveReviewDialog
        open
        currentProjectName="Manueller Titel"
        missingArticleLabels={[]}
        saunaModelName="Sauna Modell A"
        onCancel={() => undefined}
        onConfirm={onConfirm}
        onOpenChange={() => undefined}
      />,
    );

    actions.get("button-project-save-review-confirm")?.onClick?.();

    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({
      adoptSaunaTitle: true,
      reklamationNote: null,
    }));
  });

  it("does not link duplicate PDFs unless explicitly selected", () => {
    const onConfirm = vi.fn();

    renderToStaticMarkup(
      <ProjectSaveReviewDialog
        open
        currentProjectName="Projekt"
        missingArticleLabels={[]}
        duplicateAttachmentSummary={{ customer: 1, project: 2, employee: 0 }}
        onCancel={() => undefined}
        onConfirm={onConfirm}
        onOpenChange={() => undefined}
      />,
    );

    actions.get("button-project-save-review-confirm")?.onClick?.();

    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({
      linkDuplicateAttachment: false,
    }));
  });
});
