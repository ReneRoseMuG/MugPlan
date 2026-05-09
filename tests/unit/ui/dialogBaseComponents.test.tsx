import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  DialogBaseFooter,
  DialogBaseInlineMessage,
  DialogBaseStepper,
} from "../../../client/src/components/ui/dialog-base";

describe("dialog base components", () => {
  it("renders explicit footer actions without caller-provided free-form buttons", () => {
    const html = renderToStaticMarkup(
      <DialogBaseFooter
        backAction={{ label: "Zurück" }}
        primaryAction={{ label: "Speichern", isPending: true }}
        secondaryAction={{ label: "Abbrechen" }}
      />,
    );

    expect(html).toContain("Zurück");
    expect(html).toContain("Speichern");
    expect(html).toContain("Abbrechen");
    expect(html).toContain("disabled");
    expect(html).toContain("animate-spin");
  });

  it("renders normalized server errors without exposing raw backend codes", () => {
    const html = renderToStaticMarkup(
      <DialogBaseInlineMessage
        error={'409: {"code":"EMPLOYEE_OVERLAP_CONFLICT"}'}
      />,
    );

    expect(html).toContain("Mitarbeiter ist bereits verplant");
    expect(html).toContain("Prüfen Sie die Auswahl");
    expect(html).not.toContain("EMPLOYEE_OVERLAP_CONFLICT");
  });

  it("marks the active step and keeps all step titles visible", () => {
    const html = renderToStaticMarkup(
      <DialogBaseStepper
        steps={[
          { id: "preview", state: "complete", title: "Vorschau" },
          { id: "confirm", state: "active", title: "Bestätigung" },
          { id: "result", state: "pending", title: "Ergebnis" },
        ]}
      />,
    );

    expect(html).toContain('aria-current="step"');
    expect(html).toContain("Vorschau");
    expect(html).toContain("Bestätigung");
    expect(html).toContain("Ergebnis");
  });
});
