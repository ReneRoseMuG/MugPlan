/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Notizsektion zeigt im editierbaren Zustand Neu-, Pin- und Löschaktionen an.
 * - Im Readonly-Modus verschwinden diese Aktionen aus der sichtbaren Oberfläche.
 *
 * Fehlerfälle:
 * - Gesperrte Terminformulare zeigen weiterhin Notizaktionen.
 * - Die sichtbaren Notizaktionen verschwinden auch im normalen Bearbeitungsmodus.
 *
 * Ziel:
 * Das sichtbare Readonly-Verhalten der Notizsektion absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: [], isLoading: false }),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    ...props
  }: {
    children?: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: Record<string, unknown>) => <input {...props} />,
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children }: { children?: React.ReactNode }) => <label>{children}</label>,
}));

vi.mock("@/components/RichTextEditor", () => ({
  RichTextEditor: () => <div>editor</div>,
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children?: React.ReactNode }) => <button type="button">{children}</button>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
}));

vi.mock("@/components/ui/switch", () => ({
  Switch: (props: Record<string, unknown>) => <input type="checkbox" readOnly {...props} />,
}));

vi.mock("@/components/ui/color-select-button", () => ({
  ColorSelectButton: () => <button type="button">color</button>,
}));

vi.mock("@/components/ui/help/help-icon", () => ({
  HelpIcon: ({ helpKey }: { helpKey: string }) => <span data-help-key={helpKey}>help</span>,
}));

import { NotesSection } from "../../../client/src/components/NotesSection";

const notes = [
  {
    id: 1,
    title: "Erste Notiz",
    body: "<p>Inhalt</p>",
    isPinned: true,
    print: false,
    cardColor: null,
    cardColorLocked: false,
  },
];

describe("FT13 UI: notes section readonly wiring", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
    vi.stubGlobal("window", { confirm: () => true });
  });

  it("shows visible note actions in editable mode", () => {
    const markup = renderToStaticMarkup(
      <NotesSection
        notes={notes as never}
        onAdd={() => undefined}
        onUpdate={() => undefined}
        onTogglePin={() => undefined}
        onDelete={() => undefined}
      />,
    );

    expect(markup).toContain("button-new-note");
    expect(markup).toContain("button-pin-note-1");
    expect(markup).toContain("button-delete-note-1");
    expect(markup).toContain("data-help-key=\"note-templates\"");
  });

  it("hides visible note actions in readonly mode", () => {
    const markup = renderToStaticMarkup(
      <NotesSection
        notes={notes as never}
        readOnly
        onAdd={() => undefined}
        onUpdate={() => undefined}
        onTogglePin={() => undefined}
        onDelete={() => undefined}
      />,
    );

    expect(markup).not.toContain("button-new-note");
    expect(markup).not.toContain("button-pin-note-1");
    expect(markup).not.toContain("button-delete-note-1");
  });
});
