/**
 * Test Scope:
 *
 * Feature: FT28 - TagBadge
 *
 * Abgedeckte Regeln:
 * - TagBadge nutzt den gekuerzten sichtbaren Namen inklusive Abkuerzungspunkt fuer lange Einwort-Tags.
 * - Vorschau, Farbe und Aktions-Callbacks werden an die gemeinsame Badge-Basis weitergereicht.
 *
 * Fehlerfaelle:
 * - Lange Tag-Namen erscheinen ungekürzt oder verlieren ihre Add/Remove-Aktionen.
 *
 * Ziel:
 * Das sichtbare Tag-Badge-Verhalten ueber die gemeinsame Badge-Schnittstelle absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const badgeCalls: Array<Record<string, unknown>> = [];

vi.mock("@/components/ui/colored-info-badge", () => ({
  ColoredInfoBadge: (props: Record<string, unknown>) => {
    badgeCalls.push(props);
    return <div data-testid={String(props.testId ?? "tag-badge")}>{String(props.label)}</div>;
  },
}));

vi.mock("@/components/ui/badge-previews/tag-badge-preview", () => ({
  createTagBadgePreview: (label: string) => `preview:${label}`,
}));

import { TagBadge } from "../../../client/src/components/ui/tag-badge";

describe("FT28 UI: TagBadge behavior", () => {
  beforeEach(() => {
    Object.assign(globalThis, { React });
    badgeCalls.length = 0;
  });

  it("uses the trimmed label and forwards preview and actions", () => {
    const onAdd = vi.fn();
    const onRemove = vi.fn();

    const html = renderToStaticMarkup(
      <TagBadge
        tag={{ id: 7, name: "  Systemtag  ", color: "#112233" } as any}
        action="remove"
        onAdd={onAdd}
        onRemove={onRemove}
        testId="tag-badge-7"
      />,
    );

    expect(badgeCalls[0]).toMatchObject({
      label: "Syst.",
      color: "#112233",
      foregroundColor: "#ffffff",
      visualStyle: "default",
      action: "remove",
      onAdd,
      onRemove,
      preview: "preview:  Systemtag  ",
      testId: "tag-badge-7",
    });
    expect(html).toContain("Syst.");
  });
});
