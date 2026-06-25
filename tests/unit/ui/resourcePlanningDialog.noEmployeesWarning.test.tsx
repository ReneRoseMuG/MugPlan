/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Unit (statisches Komponenten-Rendering ohne DOM-Umgebung)
 *
 * Realitätsgrad:
 * - Echte ResourcePlanningDialog-Komponente; schwergewichtige UI-Bausteine (Dialog-Shell,
 *   Footer, Inline-Message, Button, Checkbox, Badge) sind als schlanke Doubles gemockt, weil
 *   der Beweis allein das Einblenden der bestehenden Konfliktwarnung betrifft.
 *
 * Mock-Entscheidung:
 * - Unit-Mocks für UI-Bausteine (kein DOM nötig). Keine Wunschzustände; gerendert wird der echte
 *   bedingte Markup-Pfad der Komponente.
 *
 * Isolation:
 * - keine DB/FS
 *
 * Abgedeckte Regeln:
 * - Im Termin-Entfernen-Dialog wird dieselbe Warnung "Termin hat keine Mitarbeiter" eingeblendet
 *   wie im Terminformular, sobald das Entfernen den letzten Mitarbeiter abzieht
 *   (appointmentWillHaveNoEmployees) — auch im kompakten infoText-Layout.
 *
 * Fehlerfälle:
 * - Ohne diese Bedingung darf die Warnung NICHT erscheinen (Gegenbeispiel).
 *
 * Ziel:
 * Sicherstellen, dass der Wochenkarten-Entfernen-Pfad die bestehende Konfliktwarnung wiederverwendet
 * und sie beim Abzug des letzten Mitarbeiters tatsächlich sichtbar macht.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/dialog-base", () => ({
  MutationPreviewDialogBase: ({ children, footer, title, testId }: Record<string, any>) => (
    <section data-testid={testId}>
      <h2>{title}</h2>
      {children}
      <footer>{footer}</footer>
    </section>
  ),
  DialogBaseFooter: ({ primaryAction, secondaryAction }: Record<string, any>) => (
    <>
      {secondaryAction ? <button type="button">{secondaryAction.label}</button> : null}
      {primaryAction ? <button type="button" data-testid={primaryAction.testId}>{primaryAction.label}</button> : null}
    </>
  ),
  DialogBaseInlineMessage: ({ title, description }: { title?: React.ReactNode; description?: React.ReactNode }) => (
    <aside>
      <strong>{title}</strong>
      <p>{description}</p>
    </aside>
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

vi.mock("@/components/ui/employee-info-badge", () => ({
  EmployeeInfoBadge: ({ fullName, testId }: { fullName?: string; testId?: string }) => (
    <span data-testid={testId}>{fullName}</span>
  ),
}));

import { ResourcePlanningDialog } from "../../../client/src/components/ResourcePlanningDialog";

const removePreviewItem = {
  employeeId: 9,
  employeeName: "Max Mustermann",
  status: "current_only" as const,
  selectable: false,
  conflictReason: "WILL_REMOVE",
  source: "current" as const,
};

function renderRemoveDialog(appointmentWillHaveNoEmployees: boolean): string {
  return renderToStaticMarkup(
    <ResourcePlanningDialog
      open
      variant="appointment"
      mode="remove"
      title="Mitarbeiter entfernen"
      employeeId={9}
      employeeName="Max Mustermann"
      infoText="wird vom Termin entfernt"
      previewItems={[removePreviewItem]}
      isSubmitting={false}
      appointmentWillHaveNoEmployees={appointmentWillHaveNoEmployees}
      onConfirm={() => undefined}
      onClose={() => undefined}
    />,
  );
}

describe("ResourcePlanningDialog: Warnung 'Termin hat keine Mitarbeiter'", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
  });

  it("blendet beim Abzug des letzten Mitarbeiters die bestehende Konfliktwarnung ein (auch im kompakten Entfernen-Layout)", () => {
    const html = renderRemoveDialog(true);

    expect(html).toContain("Termin hat keine Mitarbeiter");
    expect(html).toContain("Nach dem Entfernen ist diesem Termin kein Mitarbeiter mehr zugewiesen.");
    // Der kompakte Kontext (Mitarbeitername + Entfernen-Hinweis) bleibt erhalten.
    expect(html).toContain("Max Mustermann");
    expect(html).toContain("wird vom Termin entfernt");
  });

  it("zeigt die Warnung NICHT, wenn weitere Mitarbeiter am Termin verbleiben (Gegenbeispiel)", () => {
    const html = renderRemoveDialog(false);

    expect(html).not.toContain("Termin hat keine Mitarbeiter");
    // Der Dialog selbst rendert weiterhin normal.
    expect(html).toContain("wird vom Termin entfernt");
  });
});
