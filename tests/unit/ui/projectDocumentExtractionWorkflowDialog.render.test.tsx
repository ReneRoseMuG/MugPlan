/**
 * Test Scope:
 *
 * Feature: FT21 - Projekt-Doc-Extract-Workflow
 *
 * Abgedeckte Regeln:
 * - Der gemeinsame Projektworkflow zeigt Projektdaten, Kundendaten und Mängel in getrennten Schritten.
 * - Fehlende Artikellisten und auffällige Felder werden als Mängel sichtbar, nicht als Abbruch behandelt.
 * - Der Abschluss fasst die Übernahme ohne erneuten Speicherhinweis zusammen.
 *
 * Fehlerfälle:
 * - Der Mängelreport verschwindet aus dem neuen Workflow.
 * - Der Reklamationspfad für fehlende Artikellisten wird nicht mehr angeboten.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ExtractionCustomerEditableFields } from "@/components/document-extraction/DocumentExtractionCustomerSection";
import type { ExtractionCustomerDraft, ExtractionDialogData } from "@/components/DocumentExtractionDialog";

const customerSectionCalls: Array<Record<string, unknown>> = [];
const projectSectionCalls: Array<Record<string, unknown>> = [];

vi.mock("@/components/ui/dialog-base", () => ({
  DialogBaseFooter: ({ backAction, primaryAction, secondaryAction }: Record<string, any>) => (
    <footer>
      {backAction ? <button type="button" data-testid={backAction.testId}>{backAction.label}</button> : null}
      <button type="button" data-testid={secondaryAction.testId}>{secondaryAction.label}</button>
      <button type="button" data-testid={primaryAction.testId}>{primaryAction.label}</button>
    </footer>
  ),
  DialogBaseInlineMessage: ({ title, description }: { title: string; description?: string }) => (
    <div data-testid="dialog-base-inline-message">
      <strong>{title}</strong>
      {description ? <span>{description}</span> : null}
    </div>
  ),
  DialogBaseShell: ({ children, footer, testId, title }: Record<string, any>) => (
    <section data-testid={testId}>
      <h2>{title}</h2>
      {children}
      {footer}
    </section>
  ),
  DialogBaseStepper: ({ steps }: Record<string, any>) => (
    <ol data-testid="dialog-base-stepper">
      {steps.map((step: Record<string, string>) => (
        <li key={step.id} data-state={step.state}>{step.title}</li>
      ))}
    </ol>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => (
    <button type="button" {...props}>{children}</button>
  ),
}));

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({ checked, ...props }: { checked?: boolean; [key: string]: unknown }) => (
    <input type="checkbox" checked={checked} readOnly {...props} />
  ),
}));

vi.mock("@/components/document-extraction/DocumentExtractionCustomerSection", () => ({
  DocumentExtractionCustomerSection: (props: Record<string, unknown>) => {
    customerSectionCalls.push(props);
    return <div data-testid="document-extraction-customer-section">Kundenfelder</div>;
  },
}));

vi.mock("@/components/document-extraction/DocumentExtractionProjectSection", () => ({
  DocumentExtractionProjectSection: (props: Record<string, unknown>) => {
    projectSectionCalls.push(props);
    return <div data-testid="document-extraction-project-section">Projektfelder</div>;
  },
}));

vi.mock("@/components/RichTextEditor", () => ({
  RichTextEditor: ({ value }: { value?: string }) => <div data-testid="richtext-editor">{value}</div>,
}));

const customerDraft: ExtractionCustomerDraft = {
  customerNumber: "C-100",
  firstName: "Ina",
  lastName: "Beispiel",
  company: null,
  email: null,
  phone: "0151-123456",
  addressLine1: "Musterstraße 1",
  addressLine2: null,
  postalCode: "123456",
  city: "Berlin",
  country: "Deutschland",
};

const customerFields: ExtractionCustomerEditableFields = {
  customerNumber: "C-100",
  firstName: "Ina",
  lastName: "Beispiel",
  company: "",
  email: "",
  phone: "0151-123456",
  addressLine1: "Musterstraße 1",
  postalCode: "123456",
  city: "Berlin",
  country: "Deutschland",
};

const dialogData: ExtractionDialogData = {
  customer: customerDraft,
  orderNumber: "A-100",
  amount: "1000.00",
  saunaModel: "Projekt aus Reklamation",
  articleItems: [],
  categorizedItems: [],
  articleListHtml: "",
  documentText: "PDF-Volltext",
  warnings: ["Kundendaten konnten nur teilweise erkannt werden."],
  fieldReport: {
    recognized: [{ key: "customerNumber", label: "Kundennummer", section: "customer", value: "C-100" }],
    missing: [{ key: "company", label: "Firma", section: "customer", reason: "Keine Firmenzeile erkannt." }],
    issues: [
      { key: "postalCodeFormat", label: "PLZ", section: "customer", severity: "warning", reason: "PLZ hat nicht das erwartete Format." },
      { key: "articleListMissing", label: "Artikelliste", section: "project", severity: "warning", reason: "Es konnte keine Artikelliste erkannt werden." },
    ],
  },
};

async function loadWorkflowDialog(state: {
  activeStepIndex: number;
  appendDocumentText?: boolean;
  acceptMissingArticleListAsReklamation?: boolean;
  createReklamationNote?: boolean;
  customerResolution?: any;
}) {
  vi.resetModules();

  vi.doMock("react", async () => {
    const actual = await vi.importActual<typeof import("react")>("react");
    return {
      ...actual,
      useState: vi
        .fn()
        .mockImplementationOnce(() => [state.activeStepIndex, vi.fn()])
        .mockImplementationOnce(() => [customerFields, vi.fn()])
        .mockImplementationOnce(() => ["Projekt aus Reklamation", vi.fn()])
        .mockImplementationOnce(() => ["A-100", vi.fn()])
        .mockImplementationOnce(() => ["1000.00", vi.fn()])
        .mockImplementationOnce(() => ["", vi.fn()])
        .mockImplementationOnce(() => [Boolean(state.appendDocumentText), vi.fn()])
        .mockImplementationOnce(() => [state.acceptMissingArticleListAsReklamation ?? true, vi.fn()])
        .mockImplementationOnce(() => [state.createReklamationNote ?? true, vi.fn()])
        .mockImplementationOnce(() => [true, vi.fn()])
        .mockImplementationOnce(() => ["Reklamation", vi.fn()])
        .mockImplementationOnce(() => ["Vorbereitete Notiz", vi.fn()])
        .mockImplementationOnce(() => [true, vi.fn()])
        .mockImplementationOnce(() => [state.customerResolution ?? null, vi.fn()])
        .mockImplementationOnce(() => [null, vi.fn()])
        .mockImplementationOnce(() => [false, vi.fn()])
        .mockImplementationOnce(() => [false, vi.fn()]),
    };
  });

  return import("../../../client/src/components/ProjectDocumentExtractionWorkflowDialog");
}

function renderWorkflow(Component: React.ComponentType<any>) {
  return renderToStaticMarkup(
    <Component
      open
      data={dialogData}
      canCreateCustomer
      onApply={async () => undefined}
      onCreateCustomer={async () => ({ id: 10, customerNumber: "C-100" })}
      onUpdateExistingCustomer={async (_existing: unknown, _customer: unknown) => ({ id: 10, customerNumber: "C-100" })}
      onOpenChange={() => undefined}
      onResolveCustomerByNumber={async () => ({ resolution: "single", count: 1, customer: { id: 10, customerNumber: "C-100" } })}
    />,
  );
}

describe("FT21 project document extraction workflow dialog", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
    customerSectionCalls.length = 0;
    projectSectionCalls.length = 0;
  });

  it("renders the project step with extracted project fields and optional document text adoption", async () => {
    const { ProjectDocumentExtractionWorkflowDialog } = await loadWorkflowDialog({ activeStepIndex: 1 });
    const html = renderWorkflow(ProjectDocumentExtractionWorkflowDialog);

    expect(html).toContain("document-extraction-overlay");
    expect(html).toContain("Projektfelder");
    expect(html).toContain("doc-extract-project-step-panel");
    expect(html).toContain("grid-rows-[minmax(0,1fr)_auto]");
    expect(html).toContain("doc-extract-document-text-option");
    expect(html).toContain("shrink-0");
    expect(html).toContain("checkbox-doc-extract-append-document-text");
    expect(projectSectionCalls[0]).toMatchObject({
      saunaModel: "Projekt aus Reklamation",
      orderNumber: "A-100",
      amount: "1000.00",
      articleListHtml: "",
    });
  });

  it("renders the customer step with automatic existing-customer resolution", async () => {
    const { ProjectDocumentExtractionWorkflowDialog } = await loadWorkflowDialog({
      activeStepIndex: 0,
      customerResolution: {
        resolution: "single",
        count: 1,
        customer: { id: 10, customerNumber: "C-100", lastName: "Bestehend" },
      },
    });
    const html = renderWorkflow(ProjectDocumentExtractionWorkflowDialog);

    expect(html).toContain("document-extraction-customer-section");
    expect(html).not.toContain("button-doc-extract-resolve-customer");
    expect(html).not.toContain("Kunde prüfen");
    expect(html).toContain("Bestehender Kunde");
    expect(html).toContain("C-100");
    expect(html).toContain("Leere Stammdaten");
    expect(html).toContain("Vorhandene Kundendaten bleiben");
    expect(html).toContain("checkbox-doc-extract-update-existing-customer");
    expect(customerSectionCalls[0]).toMatchObject({
      value: expect.objectContaining({ customerNumber: "C-100", postalCode: "123456" }),
    });
    expect(html).not.toContain("überschreiben");
  });

  it("renders missing fields, issues and the reklamation decision for missing article lists", async () => {
    const { ProjectDocumentExtractionWorkflowDialog } = await loadWorkflowDialog({ activeStepIndex: 2 });
    const html = renderWorkflow(ProjectDocumentExtractionWorkflowDialog);

    expect(html).toContain("Kundendaten konnten nur teilweise erkannt werden.");
    expect(html).toContain("document-extraction-report-missing");
    expect(html).toContain("Keine Firmenzeile erkannt.");
    expect(html).toContain("document-extraction-report-issues");
    expect(html).toContain("PLZ hat nicht das erwartete Format.");
    expect(html).toContain("Es konnte keine Artikelliste erkannt werden.");
    expect(html).toContain("checkbox-doc-extract-accept-reklamation");
    expect(html).toContain("Dieses Dokument als Reklamation ohne Artikelliste");
    expect(html).not.toContain("checkbox-doc-extract-create-reklamation-note");

    const warningIndex = html.indexOf("Kundendaten konnten nur teilweise erkannt werden.");
    const missingIndex = html.indexOf("document-extraction-report-missing");
    const issuesIndex = html.indexOf("document-extraction-report-issues");
    const reklamationIndex = html.indexOf("checkbox-doc-extract-accept-reklamation");

    expect(missingIndex).toBeGreaterThan(warningIndex);
    expect(issuesIndex).toBeGreaterThan(missingIndex);
    expect(reklamationIndex).toBeGreaterThan(issuesIndex);
  });

  it("renders the embedded reklamation note editor after the reklamation decision", async () => {
    const { ProjectDocumentExtractionWorkflowDialog } = await loadWorkflowDialog({ activeStepIndex: 3 });
    const html = renderWorkflow(ProjectDocumentExtractionWorkflowDialog);

    expect(html).toContain("doc-extract-reklamation-step");
    expect(html).toContain("checkbox-doc-extract-create-reklamation-note");
    expect(html).toContain("doc-extract-reklamation-note-editor");
    expect(html).toContain("input-doc-extract-reklamation-note-title");
    expect(html).toContain("Vorbereitete Notiz");
  });

  it("renders the summary without the no-duplicate-review sentence", async () => {
    const { ProjectDocumentExtractionWorkflowDialog } = await loadWorkflowDialog({
      activeStepIndex: 3,
      appendDocumentText: true,
      acceptMissingArticleListAsReklamation: false,
    });
    const html = renderWorkflow(ProjectDocumentExtractionWorkflowDialog);

    expect(html).toContain("Bereit zur Übernahme");
    expect(html).not.toContain("Die Entscheidungen aus diesem Dialog werden beim Speichern nicht erneut abgefragt.");
    expect(html).toContain("Dokumenttext wird in die Anmerkungen übernommen.");
  });

  it("builds customer backfill only for empty existing fields", async () => {
    vi.resetModules();
    const { buildCustomerBackfillUpdatePayload } = await import("../../../client/src/components/ProjectDocumentExtractionWorkflowDialog");

    const update = buildCustomerBackfillUpdatePayload(
      {
        firstName: null,
        lastName: "Bestehend",
        company: null,
        email: "",
        phone: "0123",
        addressLine1: null,
        addressLine2: null,
        postalCode: null,
        city: null,
        country: null,
      },
      {
        customerNumber: "C-100",
        firstName: "Swen",
        lastName: "Wischnowsky",
        company: null,
        email: "swen@example.test",
        phone: "0172-7940641",
        addressLine1: "Ulmenweg 8",
        addressLine2: null,
        postalCode: "989610",
        city: "Sömmerda",
        country: "Deutschland",
      },
    );

    expect(update).toEqual({
      firstName: "Swen",
      email: "swen@example.test",
      addressLine1: "Ulmenweg 8",
      postalCode: "989610",
      city: "Sömmerda",
      country: "Deutschland",
    });
  });
});
