import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { PersonInfoBadge } from "../../../client/src/components/ui/person-info-badge";

describe("PersonInfoBadge", () => {
  beforeEach(() => {
    Object.assign(globalThis, { React });
  });

  it("renders compact mode with avatar only", () => {
    const markup = renderToStaticMarkup(
      <PersonInfoBadge
        firstName="Max"
        lastName="Muster"
        renderMode="compact"
        size="sm"
        testId="compact-person"
      />,
    );

    expect(markup).toContain("data-testid=\"compact-person-avatar\"");
    expect(markup).not.toContain("Max Muster");
    expect(markup).not.toContain("Max M.");
  });

  it("renders standard mode as first name plus last initial", () => {
    const markup = renderToStaticMarkup(
      <PersonInfoBadge
        firstName="Max"
        lastName="Muster"
        renderMode="standard"
        size="sm"
      />,
    );

    expect(markup).toContain("Max M.");
  });

  it("renders detail mode as full name", () => {
    const markup = renderToStaticMarkup(
      <PersonInfoBadge
        firstName="Max"
        lastName="Muster"
        renderMode="detail"
        size="sm"
      />,
    );

    expect(markup).toContain("Max Muster");
  });
});
