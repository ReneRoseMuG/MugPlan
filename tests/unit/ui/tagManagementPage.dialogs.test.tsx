/**
 * Test Scope:
 *
 * Feature: FT28 - Tagverwaltung im P01-Dialog-Rollout.
 *
 * Abgedeckte Regeln:
 * - Tag-Löschungen nutzen die gemeinsame ConfirmDialogBase statt nativer Browser-Confirm-Pfade.
 * - Die bestätigte Löschung sendet ID und Version an die bestehende Mutation.
 *
 * Fehlerfälle:
 * - Die Tagverwaltung fällt auf window.confirm zurück.
 * - Die Löschbestätigung verliert die Versionsübergabe.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useQueryMock = vi.fn();
const createMutateMock = vi.fn();
const updateMutateMock = vi.fn();
const deleteMutateMock = vi.fn();
const stateSetterMocks = [vi.fn(), vi.fn(), vi.fn(), vi.fn()];
const buttonCalls: Array<Record<string, unknown>> = [];
const confirmDialogCalls: Array<Record<string, unknown>> = [];
let mutationCallIndex = 0;
let preloadedPendingDeleteTag: unknown = null;

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => useQueryMock(options),
  useMutation: () => {
    mutationCallIndex += 1;
    if (mutationCallIndex === 1) return { mutate: createMutateMock, isPending: false };
    if (mutationCallIndex === 2) return { mutate: updateMutateMock, isPending: false };
    return { mutate: deleteMutateMock, isPending: false };
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/lib/queryClient", () => ({
  apiRequest: vi.fn(),
  queryClient: { invalidateQueries: vi.fn() },
}));

vi.mock("@/components/ui/button", () => ({
  Button: (props: Record<string, unknown> & { children?: React.ReactNode }) => {
    buttonCalls.push(props);
    return <button type="button" data-testid={String(props["data-testid"] ?? "")}>{props.children}</button>;
  },
}));

vi.mock("@/components/ui/dialog-base", () => ({
  ConfirmDialogBase: (props: Record<string, unknown>) => {
    confirmDialogCalls.push(props);
    return props.open ? <section data-testid={String(props.testId ?? "")}>confirm-dialog</section> : null;
  },
  DialogBaseInlineMessage: ({ title }: { title?: string }) => <div>{title}</div>,
}));

async function loadComponent() {
  vi.resetModules();
  vi.doMock("react", async () => {
    const actual = await vi.importActual<typeof import("react")>("react");
    let stateCall = 0;
    return {
      ...actual,
      useState: (<T,>(initial: T) => {
        stateCall += 1;
        if (stateCall === 3) {
          return [preloadedPendingDeleteTag, stateSetterMocks[2]] as unknown as [T, React.Dispatch<React.SetStateAction<T>>];
        }
        return [initial, stateSetterMocks[stateCall - 1] ?? vi.fn()] as [T, React.Dispatch<React.SetStateAction<T>>];
      }) as typeof actual.useState,
    };
  });
  return import("../../../client/src/components/TagManagementPage");
}

describe("FT28 UI: TagManagementPage dialog behavior", () => {
  beforeEach(() => {
    Object.assign(globalThis, {
      React,
      confirm: vi.fn(() => true),
    });
    mutationCallIndex = 0;
    preloadedPendingDeleteTag = null;
    buttonCalls.length = 0;
    confirmDialogCalls.length = 0;
    stateSetterMocks.forEach((mock) => mock.mockReset());
    useQueryMock.mockReset();
    createMutateMock.mockReset();
    updateMutateMock.mockReset();
    deleteMutateMock.mockReset();
    useQueryMock.mockReturnValue({
      data: [{ id: 12, name: "Service", color: "#2255aa", isDefault: false, version: 4 }],
      error: null,
    });
  });

  it("opens the shared delete dialog instead of calling window.confirm", async () => {
    const { TagManagementPage } = await loadComponent();

    renderToStaticMarkup(<TagManagementPage />);

    const deleteButton = buttonCalls.find((call) => call["data-testid"] === "button-delete-tag-12");
    expect(deleteButton).toBeDefined();
    (deleteButton?.onClick as (() => void) | undefined)?.();

    expect(globalThis.confirm).not.toHaveBeenCalled();
    expect(stateSetterMocks[2]).toHaveBeenCalledWith(expect.objectContaining({ id: 12, version: 4 }));
  });

  it("passes ID and version from the confirmed tag into the delete mutation", async () => {
    preloadedPendingDeleteTag = { id: 12, name: "Service", color: "#2255aa", isDefault: false, version: 4 };
    const { TagManagementPage } = await loadComponent();

    renderToStaticMarkup(<TagManagementPage />);

    const confirmDialog = confirmDialogCalls.find((call) => call.testId === "dialog-delete-tag");
    expect(confirmDialog).toBeDefined();
    (confirmDialog?.onConfirm as (() => void) | undefined)?.();

    expect(deleteMutateMock).toHaveBeenCalledWith({ id: 12, version: 4 });
  });
});
