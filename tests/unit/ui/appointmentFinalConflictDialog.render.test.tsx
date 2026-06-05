/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Unit
 *
 * Realitätsgrad:
 * - React-Render der echten Dialogkomponente mit kleinen UI-Doubles für Shell und Badge.
 *
 * Mock-Entscheidung:
 * - UI-Doubles für DialogBaseShell/DialogBaseFooter und EmployeeInfoBadge, keine Fachlogik-Mocks.
 *
 * Isolation:
 * - Kein DB-/FS-Zugriff.
 *
 * Abgedeckte Regeln:
 * - Finale Mitarbeiterkonflikte werden als blockierender Dialog ohne Teilentscheidung angezeigt.
 * - Betroffene Mitarbeiter werden als ausgeschriebene Badges gezeigt.
 *
 * Fehlerfälle:
 * - Dialog bietet Auswahl- oder Sammelaktionen an.
 * - Ungültige Payload-Namen werden nicht als Mitarbeiter-Badges gerendert.
 *
 * Ziel:
 * Den sichtbaren Abschlussdialog für blockierende Termin-Mitarbeiterkonflikte absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const actions = new Map<string, { label: string; onClick?: () => void }>();

vi.mock("@/components/ui/dialog-base", () => ({
  DialogBaseShell: ({ children, footer, testId, title }: Record<string, any>) => (
    <section data-testid={testId}>
      <h2>{title}</h2>
      {children}
      <footer>{footer}</footer>
    </section>
  ),
  DialogBaseFooter: ({ primaryAction }: Record<string, any>) => {
    if (primaryAction?.testId) actions.set(primaryAction.testId, primaryAction);
    return primaryAction ? (
      <button type="button" data-testid={primaryAction.testId}>{primaryAction.label}</button>
    ) : null;
  },
}));

vi.mock("@/components/ui/employee-info-badge", () => ({
  EmployeeInfoBadge: ({ fullName, testId }: { fullName?: string; testId?: string }) => (
    <span data-testid={testId}>{fullName}</span>
  ),
}));

import {
  AppointmentFinalConflictDialog,
  normalizeAppointmentConflictEmployees,
} from "../../../client/src/components/AppointmentFinalConflictDialog";

describe("AppointmentFinalConflictDialog", () => {
  beforeEach(() => {
    actions.clear();
    vi.stubGlobal("React", React);
  });

  it("renders a blocking conflict dialog with employee badges and no selection controls", () => {
    const html = renderToStaticMarkup(
      <AppointmentFinalConflictDialog
        open
        title="Termin speichern nicht möglich"
        conflictEmployees={[
          { id: 11, fullName: "Ada Konflikt" },
          { id: 12, fullName: "Bert Überschnitt" },
        ]}
        onClose={() => undefined}
      />,
    );

    expect(html).toContain("dialog-appointment-final-conflict");
    expect(html).toContain("Termin speichern nicht möglich");
    expect(html).toContain("Mitarbeiter können nicht übernommen werden");
    expect(html).toContain("Ada Konflikt");
    expect(html).toContain("Bert Überschnitt");
    expect(html).toContain('data-testid="badge-appointment-final-conflict-11"');
    expect(html).toContain('data-testid="badge-appointment-final-conflict-12"');
    expect(html).not.toContain("checkbox");
    expect(html).not.toContain("Alle wählen");
    expect(html).not.toContain("Alle abwählen");
    expect(html).not.toContain("Auswahl übernehmen");
    expect(actions.get("button-appointment-final-conflict-close")?.label).toBe("Schließen");
  });

  it("normalizes conflict employees from API payloads and drops entries without names", () => {
    expect(normalizeAppointmentConflictEmployees([
      { id: 7, fullName: "  Clara Konflikt  " },
      { id: "custom", fullName: "Daniel Schnitt" },
      { id: 8, fullName: "" },
      { id: null, fullName: null },
    ])).toEqual([
      { id: 7, fullName: "Clara Konflikt" },
      { id: "custom", fullName: "Daniel Schnitt" },
    ]);
  });
});
