/**
 * Test Scope:
 *
 * Feature: FT28 - TagPickerPanel
 *
 * Abgedeckte Regeln:
 * - Zugewiesene Tags werden im Edit-Modus als entfernbar gerendert.
 * - Die Add-Liste enthaelt nur noch nicht zugewiesene Tags.
 * - Add/Remove-Aktionen loesen die beobachtbaren Callback-Effekte aus.
 *
 * Fehlerfaelle:
 * - Bereits zugewiesene Tags tauchen wieder in der Add-Liste auf.
 * - Editierbare Panels verlieren Add/Remove-Aktionen.
 *
 * Ziel:
 * Das TagPickerPanel ueber gerenderte Child-Props und echte Callback-Effekte absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const tagBadgeCalls: Array<Record<string, unknown>> = [];

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => (
    <button type="button" data-testid={String(props["data-testid"] ?? "")}>{children}</button>
  ),
}));

vi.mock("@/components/ui/entity-edit-dialog", () => ({
  EntityEditDialog: ({ children, open }: { children?: React.ReactNode; open?: boolean }) => (
    <section data-testid="tag-picker-dialog" data-open={String(open)}>{children}</section>
  ),
}));

vi.mock("@/components/ui/sidebar-child-panel", () => ({
  SidebarChildPanel: ({
    children,
    headerActions,
    title,
  }: {
    children?: React.ReactNode;
    headerActions?: React.ReactNode;
    title?: string;
  }) => (
    <section data-testid="tag-picker-panel">
      <header>{title}{headerActions}</header>
      {children}
    </section>
  ),
}));

vi.mock("@/components/ui/tag-badge", () => ({
  TagBadge: (props: Record<string, unknown>) => {
    tagBadgeCalls.push(props);
    return <div data-testid={String(props.testId ?? "tag-badge")}>{String(props.action ?? "none")}</div>;
  },
}));

vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

import { TagPickerPanel } from "../../../client/src/components/TagPickerPanel";

describe("FT28 UI: TagPickerPanel behavior", () => {
  beforeEach(() => {
    Object.assign(globalThis, { React });
    tagBadgeCalls.length = 0;
  });

  it("renders assigned tags as removable and keeps only unassigned tags in the add list", () => {
    const onAdd = vi.fn();
    const onRemove = vi.fn();
    const assignedItem = {
      tag: { id: 1, name: "Montage", color: "#111111" },
      relationVersion: 5,
    };

    renderToStaticMarkup(
      <TagPickerPanel
        assignedTags={[assignedItem] as any}
        availableTags={[
          { id: 1, name: "Montage", color: "#111111" },
          { id: 2, name: "Service", color: "#222222" },
        ] as any}
        onAdd={onAdd}
        onRemove={onRemove}
        canEdit
        testIdPrefix="tags"
      />,
    );

    const assignedCall = tagBadgeCalls.find((call) => call.testId === "tags-tag-1");
    const addCall = tagBadgeCalls.find((call) => call.testId === "tags-add-tag-2");

    expect(assignedCall).toMatchObject({ action: "remove" });
    expect(addCall).toMatchObject({ action: "add" });
    expect(tagBadgeCalls.find((call) => call.testId === "tags-add-tag-1")).toBeUndefined();

    (assignedCall?.onRemove as (() => void) | undefined)?.();
    (addCall?.onAdd as (() => void) | undefined)?.();

    expect(onRemove).toHaveBeenCalledWith(assignedItem);
    expect(onAdd).toHaveBeenCalledWith(2);
  });

  it("falls back to read-only badges when editing is disabled", () => {
    const onAdd = vi.fn();
    const html = renderToStaticMarkup(
      <TagPickerPanel
        assignedTags={[{ tag: { id: 1, name: "Montage", color: "#111111" }, relationVersion: 1 }] as any}
        availableTags={[{ id: 2, name: "Service", color: "#222222" }] as any}
        onAdd={onAdd}
        onRemove={vi.fn()}
        canEdit={false}
        testIdPrefix="readonly"
      />,
    );

    const assignedCall = tagBadgeCalls.find((call) => call.testId === "readonly-tag-1");
    const addCall = tagBadgeCalls.find((call) => call.testId === "readonly-add-tag-2");
    expect(assignedCall).toMatchObject({ action: "none" });
    expect(addCall).toMatchObject({ action: "add" });
    (addCall?.onAdd as (() => void) | undefined)?.();
    expect(onAdd).not.toHaveBeenCalled();
    expect(html).not.toContain("readonly-button-add");
  });
});
