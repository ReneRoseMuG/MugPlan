/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - EntityFormShell rendert Footer immer sichtbar.
 * - Header und Sidebar erscheinen nur bei uebergebenen Slots.
 * - sidebarWidth wirkt auf die gerenderte Sidebar-Breite.
 *
 * Fehlerfaelle:
 * - Header oder Sidebar tauchen ohne Props auf.
 * - Footer fehlt im gerenderten Shell-Markup.
 *
 * Ziel:
 * Sichtbares Slot-Verhalten der Formular-Shell ohne Source-Assertions absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useSettingMock = vi.fn();

vi.mock("../../../client/src/hooks/useSettings", () => ({
  useSetting: (key: string) => useSettingMock(key),
}));

import { EntityFormShell } from "../../../client/src/components/ui/entity-form-shell";

describe("EntityFormShell layout", () => {
  beforeEach(() => {
    useSettingMock.mockReset();
    useSettingMock.mockImplementation((key: string) => {
      if (key === "entityFormShell.sidebarWidthPx") return 360;
      if (key === "entityFormShell.contentMaxWidthPx") return 760;
      return undefined;
    });
  });

  it("renders footer by default while header and sidebar stay optional", () => {
    const html = renderToStaticMarkup(
      <EntityFormShell footer={<div>Footer</div>}>
        <div>Inhalt</div>
      </EntityFormShell>,
    );

    expect(html).toContain("entity-form-shell");
    expect(html).toContain("entity-form-shell-main");
    expect(html).toContain(">Inhalt<");
    expect(html).toContain("entity-form-shell-footer");
    expect(html).toContain(">Footer<");
    expect(html).toContain("entity-form-shell-main-inner");
    expect(html).toContain("max-width:760px");
    expect(html).not.toContain("entity-form-shell-header");
    expect(html).not.toContain("entity-form-shell-sidebar");
  });

  it("renders optional header and sidebar with settings-based default width", () => {
    const html = renderToStaticMarkup(
      <EntityFormShell
        header={<div>Kopf</div>}
        sidebar={<div>Sidebar</div>}
        footer={<div>Footer</div>}
      >
        <div>Inhalt</div>
      </EntityFormShell>,
    );

    expect(html).toContain("entity-form-shell-header");
    expect(html).toContain(">Kopf<");
    expect(html).toContain("entity-form-shell-sidebar");
    expect(html).toContain(">Sidebar<");
    expect(html).toContain("width:360px");
  });

  it("lets explicit props override settings values for sidebar and content width", () => {
    const html = renderToStaticMarkup(
      <EntityFormShell
        header={<div>Kopf</div>}
        sidebar={<div>Sidebar</div>}
        sidebarWidth={320}
        contentMaxWidth={880}
        footer={<div>Footer</div>}
      >
        <div>Inhalt</div>
      </EntityFormShell>,
    );

    expect(html).toContain("entity-form-shell-header");
    expect(html).toContain(">Kopf<");
    expect(html).toContain("entity-form-shell-sidebar");
    expect(html).toContain(">Sidebar<");
    expect(html).toContain("width:320px");
    expect(html).toContain("max-width:880px");
  });
});
