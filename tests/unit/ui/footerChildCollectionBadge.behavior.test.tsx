/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - FooterChildCollectionBadge rendert kollabierten und expandierten Label-Zustand über die gemeinsame Klassenlogik.
 * - Hover-Handler schalten den lokalen Expand-State und lösen optionale Hover-Hooks aus.
 * - Inaktive `0`-Badges bleiben visuell gedimmt, aber weiter interaktiv.
 *
 * Fehlerfälle:
 * - Das Label expandiert beim Hover nicht mehr.
 * - `0`-Badges verlieren ihren Hover-Trigger oder den gedimmten Stil.
 *
 * Ziel:
 * Die neue Badge-Basis ohne Browserumgebung regressionssicher absichern.
 */
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

type RenderBadgeResult = {
  badge: ReactElement;
  labelClassName: string;
  setExpanded: ReturnType<typeof vi.fn>;
};

async function renderBadge(options?: {
  expanded?: boolean;
  count?: number;
  inactive?: boolean;
  onHoverStart?: () => void;
  onMouseEnter?: (event: unknown) => void;
  onMouseLeave?: (event: unknown) => void;
}): Promise<RenderBadgeResult> {
  vi.resetModules();

  const setExpanded = vi.fn();
  const expanded = options?.expanded ?? false;

  vi.doMock("react", async () => {
    const actual = await vi.importActual<typeof import("react")>("react");
    return {
      ...actual,
      useState: vi.fn(() => [expanded, setExpanded]),
    };
  });

  const React = await import("react");
  const { Tag } = await import("lucide-react");
  const { FooterChildCollectionBadge } = await import("../../../client/src/components/ui/footer-child-collection-badge");
  Object.assign(globalThis, { React });

  const badge = FooterChildCollectionBadge.render({
    icon: React.createElement(Tag, { className: "h-3 w-3" }),
    label: "Notizen",
    count: options?.count ?? 4,
    testId: "footer-badge",
    inactive: options?.inactive ?? false,
    onHoverStart: options?.onHoverStart,
    onMouseEnter: options?.onMouseEnter as never,
    onMouseLeave: options?.onMouseLeave as never,
  }, null) as ReactElement;

  const children = badge.props.children as ReactElement[];
  const label = children[1] as ReactElement;

  vi.doUnmock("react");

  return {
    badge,
    labelClassName: String(label.props.className ?? ""),
    setExpanded,
  };
}

describe("FT28 UI: FooterChildCollectionBadge behavior", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("expands the label state via hover handlers and calls the hover-start hook", async () => {
    const onHoverStart = vi.fn();
    const forwardedMouseEnter = vi.fn();
    const forwardedMouseLeave = vi.fn();
    const { badge, labelClassName, setExpanded } = await renderBadge({ onHoverStart });

    expect(labelClassName).toContain("max-w-0");

    badge.props.onMouseEnter({ type: "mouseenter" });
    expect(setExpanded).toHaveBeenCalledWith(true);
    expect(onHoverStart).toHaveBeenCalledTimes(1);

    const badgeWithForwardedHandlers = await renderBadge({
      onHoverStart,
      onMouseEnter: forwardedMouseEnter,
      onMouseLeave: forwardedMouseLeave,
    });

    badgeWithForwardedHandlers.badge.props.onMouseEnter({ type: "mouseenter" });
    expect(forwardedMouseEnter).toHaveBeenCalledTimes(1);

    badge.props.onMouseLeave({ type: "mouseleave" });
    expect(setExpanded).toHaveBeenCalledWith(false);

    badgeWithForwardedHandlers.badge.props.onMouseLeave({ type: "mouseleave" });
    expect(forwardedMouseLeave).toHaveBeenCalledTimes(1);

    const expandedBadge = await renderBadge({ expanded: true });
    expect(expandedBadge.labelClassName).toContain("max-w-[7.5rem]");
  });

  it("keeps inactive zero badges visually muted but hoverable", async () => {
    const { badge } = await renderBadge({ count: 0, inactive: true });

    expect(String(badge.props.className)).toContain("cursor-pointer");
    expect(String(badge.props.className)).toContain("text-slate-400");
  });
});
