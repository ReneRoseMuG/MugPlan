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
import { describe, expect, it } from "vitest";

import { EntityFormShell } from "../../../client/src/components/ui/entity-form-shell";

describe("EntityFormShell layout", () => {
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
    expect(html).not.toContain("entity-form-shell-header");
    expect(html).not.toContain("entity-form-shell-sidebar");
  });

  it("renders optional header and sidebar with the configured width", () => {
    const html = renderToStaticMarkup(
      <EntityFormShell
        header={<div>Kopf</div>}
        sidebar={<div>Sidebar</div>}
        sidebarWidth={320}
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
  });
});
