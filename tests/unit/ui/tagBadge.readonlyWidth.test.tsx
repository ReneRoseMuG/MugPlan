/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Read-only TagBadge reserviert keine Aktionsspalte mehr.
 * - Die kompakte Tag-Darstellung bleibt auch mit Hover-Preview im Markup erhalten.
 *
 * Fehlerfälle:
 * - Read-only Tags behalten eine unnötige rechte Restbreite.
 * - Die kompakte Tag-Darstellung fällt auf die alte feste Aktionsbreite zurück.
 *
 * Ziel:
 * Den Tag-Sonderfall für die neue schmale Footer-Zeile regressionssicher absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/hover-preview", () => ({
  HoverPreview: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

import { TagBadge } from "../../../client/src/components/ui/tag-badge";

describe("FT28 UI: TagBadge readonly width", () => {
  beforeEach(() => {
    Object.assign(globalThis, { React });
  });

  it("does not reserve action width for read-only tags", () => {
    const markup = renderToStaticMarkup(
      <TagBadge
        tag={{ id: 11, name: "Tag Alpha", color: "#123456", isDefault: false, version: 1 } as any}
        size="sm"
        testId="readonly-tag-badge"
      />,
    );

    expect(markup).toContain("readonly-tag-badge");
    expect(markup).toContain("h-6");
    expect(markup).toContain("text-[9px]");
    expect(markup).toContain("justify-start");
    expect(markup).not.toContain("justify-between");
    expect(markup).toContain("w-0");
    expect(markup).not.toContain("w-5");
    expect(markup).not.toContain("w-7");
    expect(markup).not.toContain("flex-1");
    expect(markup).toContain("background-color:#123456");
    expect(markup).toContain("border-color:#123456");
    expect(markup).toContain("color:#ffffff");
    expect(markup).not.toContain("border-left-width:5px");
  });
});
