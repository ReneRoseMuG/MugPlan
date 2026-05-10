/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Report-Spaltenauswahl nutzt die gemeinsame Dialogbasis.
 * - Reset, Sichtbarkeitszähler, Spaltenumschaltung und Footer-Aktionen bleiben verdrahtet.
 *
 * Fehlerfälle:
 * - Der Spaltendialog fällt auf einen lokalen Overlayrahmen zurück.
 * - Bestehende Test-IDs für Reset, Schließen, Übernehmen und Spaltenaktionen gehen verloren.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

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
    <section data-testid={testId ?? "dialog-base-shell"}>
      <h2>{title}</h2>
      <p>{description}</p>
      {children}
      {footer}
    </section>
  ),
  DialogBaseFooter: ({
    primaryAction,
    secondaryAction,
  }: {
    primaryAction?: { label: string; testId?: string };
    secondaryAction?: { label: string; testId?: string };
  }) => (
    <footer>
      {secondaryAction ? <button type="button" data-testid={secondaryAction.testId}>{secondaryAction.label}</button> : null}
      {primaryAction ? <button type="button" data-testid={primaryAction.testId}>{primaryAction.label}</button> : null}
    </footer>
  ),
}));

import { SpaltenDialog } from "../../../client/src/components/reports/SpaltenDialog";

describe("Reports: SpaltenDialog", () => {
  it("renders through the shared dialog base with the existing controls", () => {
    const html = renderToStaticMarkup(
      <SpaltenDialog
        open
        columns={[
          { id: "customer", label: "Kunde" },
          { id: "city", label: "Ort" },
        ]}
        hiddenColumnIds={["city"]}
        onClose={vi.fn()}
        onReset={vi.fn()}
        onToggleColumn={vi.fn()}
        onMoveColumn={vi.fn()}
        testId="dialog-reports-vorlaufliste-columns"
      />,
    );

    expect(html).toContain('data-testid="dialog-reports-vorlaufliste-columns"');
    expect(html).toContain("Spalten konfigurieren");
    expect(html).toContain("1 von 2 sichtbar");
    expect(html).toContain("button-reports-vorlaufliste-columns-dialog-reset");
    expect(html).toContain("button-reports-vorlaufliste-columns-dialog-close");
    expect(html).toContain("button-reports-vorlaufliste-columns-dialog-apply");
    expect(html).toContain("checkbox-reports-vorlaufliste-column-customer");
    expect(html).toContain("button-reports-vorlaufliste-column-city-down");
  });
});
