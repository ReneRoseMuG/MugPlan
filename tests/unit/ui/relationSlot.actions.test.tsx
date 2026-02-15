/**
 * Test Scope:
 *
 * Feature: FT02/FT01 - Relation Slot UI Muster
 * Use Case: UC Slot-Darstellung in Formularen
 *
 * Abgedeckte Regeln:
 * - Empty-Slot rendert Header und Plus-Action.
 * - Active-Slot rendert Minus-Action.
 * - Readonly-Slot rendert keine Action.
 *
 * Fehlerfaelle:
 * - Falsche Action-Sichtbarkeit je Slot-Zustand.
 *
 * Ziel:
 * Sicherstellen, dass die Slot-Zustaende visuell und funktional konsistent gerendert werden.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FolderKanban } from "lucide-react";
import { RelationSlot } from "../../../client/src/components/ui/relation-slot";

describe("FT02/FT01 relation slot actions", () => {
  it("renders add action for empty slot", () => {
    const html = renderToStaticMarkup(
      createElement(
        RelationSlot,
        {
          title: "Projektzuordnung",
          icon: createElement(FolderKanban, { className: "w-4 h-4" }),
          state: "empty",
          onAdd: () => undefined,
          addActionTestId: "slot-add",
          emptyText: "Kein Projekt ausgewaehlt",
          testId: "slot-project",
        },
        null,
      ),
    );

    expect(html).toContain("Projektzuordnung");
    expect(html).toContain("data-testid=\"slot-add\"");
    expect(html).not.toContain("data-testid=\"slot-project-action-remove\"");
  });

  it("renders remove action for active slot", () => {
    const html = renderToStaticMarkup(
      createElement(
        RelationSlot,
        {
          title: "Projektzuordnung",
          icon: createElement(FolderKanban, { className: "w-4 h-4" }),
          state: "active",
          onRemove: () => undefined,
          removeActionTestId: "slot-remove",
          testId: "slot-project",
        },
        createElement("div", null, "Inhalt"),
      ),
    );

    expect(html).toContain("data-testid=\"slot-remove\"");
    expect(html).not.toContain("data-testid=\"slot-project-action-add\"");
  });

  it("renders no actions for readonly slot", () => {
    const html = renderToStaticMarkup(
      createElement(
        RelationSlot,
        {
          title: "Kunde",
          icon: createElement(FolderKanban, { className: "w-4 h-4" }),
          state: "readonly",
          testId: "slot-customer",
        },
        createElement("div", null, "Readonly"),
      ),
    );

    expect(html).not.toContain("slot-customer-action-add");
    expect(html).not.toContain("slot-customer-action-remove");
  });
});

