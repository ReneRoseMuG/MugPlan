/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Wird textColor übergeben, setzt der Header genau diesen Wert als inline-color-Stil.
 * - Fehlt textColor, greift der Fallback auf #ffffff.
 *
 * Fehlerfälle:
 * - textColor wird ignoriert und immer #ffffff gerendert.
 * - Fehlender Fallback führt zu keiner Farbangabe.
 *
 * Ziel:
 * Das optionale textColor-Prop des CalendarWeekAppointmentPanelHeader gegen Regression absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CalendarWeekAppointmentPanelHeader } from "../../../client/src/components/calendar/CalendarWeekAppointmentPanelHeader";

describe("CalendarWeekAppointmentPanelHeader textColor prop", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
  });

  const baseProps = {
    customerNumber: "C-1",
    postalCode: "12345",
    color: "#225577",
    startDate: "2099-03-01",
    endDate: null,
    startTime: null,
  };

  it("uses the supplied textColor in the color style", () => {
    const html = renderToStaticMarkup(
      <CalendarWeekAppointmentPanelHeader {...baseProps} textColor="#cc3300" />,
    );
    expect(html).toContain("#cc3300");
  });

  it("falls back to #ffffff when textColor is not supplied", () => {
    const html = renderToStaticMarkup(
      <CalendarWeekAppointmentPanelHeader {...baseProps} />,
    );
    expect(html).toContain("#ffffff");
  });

  it("falls back to #ffffff when textColor is undefined", () => {
    const html = renderToStaticMarkup(
      <CalendarWeekAppointmentPanelHeader {...baseProps} textColor={undefined} />,
    );
    expect(html).toContain("#ffffff");
  });

  it("does not output the background color as the text color", () => {
    const html = renderToStaticMarkup(
      <CalendarWeekAppointmentPanelHeader {...baseProps} textColor="#ee2200" />,
    );
    // Background is #225577; text color is #ee2200 — both must be present but distinct
    expect(html).toContain("#225577");
    expect(html).toContain("#ee2200");
    // The text color must not be confused with the background
    expect(html.indexOf("#ee2200")).not.toBe(html.indexOf("#225577"));
  });
});
