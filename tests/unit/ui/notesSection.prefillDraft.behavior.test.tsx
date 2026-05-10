/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - prefillDraft oeffnet den Notizdialog einmalig und konsumiert den Draft.
 * - Ein manuelles Schliessen des Dialogs oeffnet denselben Draft nicht erneut.
 * - Ohne prefillDraft bleibt das Schliessen des Dialogs ohne Reopen-Seiteneffekt.
 *
 * Ziel:
 * Den generischen prefillDraft-Lifecycle der NotesSection ohne AppointmentForm-spezifische Logik absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type StateSetter<T> = (value: T | ((current: T) => T)) => void;

const stateStore: unknown[] = [];
const setterSpies: Array<ReturnType<typeof vi.fn>> = [];
const effectDepsStore: Array<ReadonlyArray<unknown> | undefined> = [];
let stateCursor = 0;
let effectCursor = 0;
let lastDialogProps: { onOpenChange?: (open: boolean) => void } | null = null;

function resetHookCursors() {
  stateCursor = 0;
  effectCursor = 0;
}

function resetHookState() {
  stateStore.length = 0;
  setterSpies.length = 0;
  effectDepsStore.length = 0;
  lastDialogProps = null;
  resetHookCursors();
}

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");

  return {
    ...actual,
    default: actual,
    useState: <T,>(initialValue: T | (() => T)) => {
      const index = stateCursor++;
      if (!(index in stateStore)) {
        stateStore[index] = typeof initialValue === "function"
          ? (initialValue as () => T)()
          : initialValue;
      }
      if (!setterSpies[index]) {
        setterSpies[index] = vi.fn((nextValue: T | ((current: T) => T)) => {
          const currentValue = stateStore[index] as T;
          stateStore[index] = typeof nextValue === "function"
            ? (nextValue as (current: T) => T)(currentValue)
            : nextValue;
        });
      }

      return [stateStore[index] as T, setterSpies[index] as StateSetter<T>] as const;
    },
    useEffect: (effect: () => void | (() => void), deps?: ReadonlyArray<unknown>) => {
      const index = effectCursor++;
      const previousDeps = effectDepsStore[index];
      const hasChanged = !deps
        || !previousDeps
        || deps.length !== previousDeps.length
        || deps.some((dep, depIndex) => dep !== previousDeps[depIndex]);

      if (hasChanged) {
        effectDepsStore[index] = deps;
        effect();
      }
    },
  };
});

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: [], isLoading: false }),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => (
    <button type="button" {...props}>{children}</button>
  ),
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    children,
    onOpenChange,
  }: {
    children?: React.ReactNode;
    onOpenChange?: (open: boolean) => void;
  }) => {
    lastDialogProps = { onOpenChange };
    return <div>{children}</div>;
  },
  DialogContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/dialog-base", () => ({
  ConfirmDialogBase: ({ open, title }: { open: boolean; title?: React.ReactNode }) => (
    open ? <div data-testid="dialog-delete-note">{title}</div> : null
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: Record<string, unknown>) => <input {...props} />,
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children }: { children?: React.ReactNode }) => <label>{children}</label>,
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

vi.mock("@/components/ui/edit-form-context-text", () => ({
  EditFormContextText: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/RichTextEditor", () => ({
  RichTextEditor: () => <div>editor</div>,
}));

import { NotesSection } from "../../../client/src/components/NotesSection";

describe("FT13 UI: notes section prefill draft behavior", () => {
  beforeEach(() => {
    Object.assign(globalThis, { React });
    resetHookState();
    Object.defineProperty(globalThis, "window", {
      value: { confirm: () => true },
      configurable: true,
    });
  });

  it("opens the dialog once for a new prefill draft and consumes it", () => {
    const onPrefillDraftConsumed = vi.fn();
    const prefillDraft = {
      title: "Vorlage Reklamation",
      body: "<p>Body</p>",
      cardColor: "#22c55e",
      print: true,
      templateId: 12,
    };

    resetHookCursors();
    renderToStaticMarkup(
      <NotesSection
        notes={[]}
        onAdd={() => undefined}
        prefillDraft={prefillDraft}
        onPrefillDraftConsumed={onPrefillDraftConsumed}
      />,
    );

    expect(setterSpies[6]).toHaveBeenCalledWith(null);
    expect(setterSpies[1]).toHaveBeenCalledWith("Vorlage Reklamation");
    expect(setterSpies[2]).toHaveBeenCalledWith("<p>Body</p>");
    expect(setterSpies[3]).toHaveBeenCalledWith("#22c55e");
    expect(setterSpies[4]).toHaveBeenCalledWith(true);
    expect(setterSpies[5]).toHaveBeenCalledWith("12");
    expect(setterSpies[7]).toHaveBeenCalledWith(true);
    expect(setterSpies[0]).toHaveBeenCalledWith(true);
    expect(onPrefillDraftConsumed).toHaveBeenCalledTimes(1);
  });

  it("keeps the dialog closed after a manual close with the same consumed prefill draft", () => {
    const onPrefillDraftConsumed = vi.fn();
    const prefillDraft = {
      title: "Vorlage Messe",
      body: "<p>Body</p>",
      cardColor: "#f8fafc",
      print: false,
      templateId: 7,
    };

    resetHookCursors();
    renderToStaticMarkup(
      <NotesSection
        notes={[]}
        onAdd={() => undefined}
        prefillDraft={prefillDraft}
        onPrefillDraftConsumed={onPrefillDraftConsumed}
      />,
    );

    expect(setterSpies[0]).toHaveBeenCalledWith(true);
    lastDialogProps?.onOpenChange?.(false);
    expect(setterSpies[0]).toHaveBeenLastCalledWith(false);

    resetHookCursors();
    renderToStaticMarkup(
      <NotesSection
        notes={[]}
        onAdd={() => undefined}
        prefillDraft={prefillDraft}
        onPrefillDraftConsumed={onPrefillDraftConsumed}
      />,
    );

    expect(setterSpies[0]).toHaveBeenCalledTimes(2);
    expect(onPrefillDraftConsumed).toHaveBeenCalledTimes(1);
  });

  it("does not reopen the dialog when it closes without a prefill draft", () => {
    resetHookCursors();
    renderToStaticMarkup(
      <NotesSection
        notes={[]}
        onAdd={() => undefined}
        prefillDraft={null}
      />,
    );

    lastDialogProps?.onOpenChange?.(false);

    expect(setterSpies[0]).toHaveBeenCalledTimes(1);
    expect(setterSpies[0]).toHaveBeenCalledWith(false);
  });
});
