import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  PopoverContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/plus-action-button", () => ({
  PlusActionButton: ({ disabled, ...props }: { disabled?: boolean; ["data-testid"]?: string }) => (
    <button type="button" disabled={disabled} data-testid={props["data-testid"]}>+</button>
  ),
}));

vi.mock("@/components/tags/tag-selection-menu-content", () => ({
  TagSelectionMenuContent: ({ emptyText }: { emptyText: string }) => <div>{emptyText}</div>,
}));

vi.mock("@/components/ui/tag-badge", () => ({
  TagBadge: ({ testId }: { testId?: string }) => <span data-testid={testId ?? ""}>tag</span>,
}));

vi.mock("@/components/ui/help/help-icon", () => ({
  HelpIcon: () => <span>help</span>,
}));

import { TagFilterInput } from "../../../client/src/components/filters/tag-filter-input";

const noop = () => undefined;

describe("TagFilterInput", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
  });

  it("keeps the add button clickable for empty report filters when configured", () => {
    const html = renderToStaticMarkup(
      <TagFilterInput
        selectedTags={[]}
        availableTags={[]}
        isOpen={false}
        onOpenChange={noop}
        onAddTag={noop}
        onRemoveTag={noop}
        addButtonTestId="button-add-tag"
        disableAddWhenEmpty={false}
      />,
    );

    expect(html).toContain("button-add-tag");
    expect(html).not.toContain("disabled");
    expect(html).toContain("Alle Tags ausgew");
  });

  it("keeps the previous default disabled state for empty generic filters", () => {
    const html = renderToStaticMarkup(
      <TagFilterInput
        selectedTags={[]}
        availableTags={[]}
        isOpen={false}
        onOpenChange={noop}
        onAddTag={noop}
        onRemoveTag={noop}
        addButtonTestId="button-add-tag"
      />,
    );

    expect(html).toContain("button-add-tag");
    expect(html).toContain("disabled");
  });
});
