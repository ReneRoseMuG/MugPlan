/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die kompakte LinkedProjectCard in der Kunden-Sidebar bleibt der sichtbare Trigger.
 * - Hover auf die LinkedProjectCard verdrahtet eine Projekt-Entity-Card als Preview.
 *
 * Fehlerfaelle:
 * - Die Sidebar-Karte verliert den HoverPreview-Wrapper.
 * - Die Preview rendert nicht mehr die Projekt-Entity-Card.
 *
 * Ziel:
 * Die lokale Hover-Preview-Verdrahtung der kompakten Projektkarte absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const hoverPreviewCalls: Array<Record<string, unknown>> = [];
const projectTableHoverPreviewCalls: Array<Record<string, unknown>> = [];

vi.mock("@/components/ui/hover-preview", () => ({
  HoverPreview: ({
    children,
    preview,
    ...props
  }: {
    children?: React.ReactNode;
    preview?: React.ReactNode;
  }) => {
    hoverPreviewCalls.push(props);
    return (
      <div data-testid="hover-preview-wrapper">
        <div data-testid="hover-preview-trigger">{children}</div>
        <div data-testid="hover-preview-content">{preview}</div>
      </div>
    );
  },
}));

vi.mock("@/components/ui/table-hover-previews", () => ({
  ProjectTableHoverPreview: (props: Record<string, unknown>) => {
    projectTableHoverPreviewCalls.push(props);
    return <div data-testid="project-table-hover-preview" />;
  },
}));

import { LinkedProjectCard } from "../../../client/src/components/LinkedProjectCard";

describe("LinkedProjectCard preview wiring", () => {
  const project = {
    id: 17,
    customerId: 5,
    name: "Premium IV Sauna",
    orderNumber: "A061654",
    amount: null,
    descriptionMd: "Projektbeschreibung",
    isActive: true,
    version: 1,
    notesCount: 2,
    plannedAppointmentsCount: 1,
    attachmentsCount: 3,
    tags: [],
    projectArticleItems: [],
    customer: {
      id: 5,
      customerNumber: "162175",
      fullName: "Choausz, Max",
      addressLine1: null,
      postalCode: null,
      city: null,
      phone: null,
      email: null,
    },
  };

  it("rendert die kompakte Karte im HoverPreview und verdrahtet die Projekt-Entity-Card als Preview", () => {
    hoverPreviewCalls.length = 0;
    projectTableHoverPreviewCalls.length = 0;

    const markup = renderToStaticMarkup(
      <LinkedProjectCard project={project} customerNumber="162175" onOpenProject={vi.fn()} />,
    );

    expect(markup).toContain("hover-preview-wrapper");
    expect(markup).toContain("Premium IV Sauna");
    expect(markup).toContain("A061654");
    expect(hoverPreviewCalls[0]).toMatchObject({
      mode: "cursor",
      cursorOffsetX: 20,
      cursorOffsetY: 20,
      maxWidth: 420,
      maxHeight: 400,
      openDelay: 300,
    });
    expect(markup).toContain("project-table-hover-preview");
    expect(projectTableHoverPreviewCalls[0]).toMatchObject({
      onDoubleClick: expect.any(Function),
      project: expect.objectContaining({
        id: 17,
        name: "Premium IV Sauna",
        orderNumber: "A061654",
      }),
    });
  });
});
