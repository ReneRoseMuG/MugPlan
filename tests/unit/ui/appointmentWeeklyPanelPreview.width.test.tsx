/**
 * Test Scope:
 *
 * Feature: FT03 – Vorschau- und Kalenderverhalten
 * Use Case: UC03 – Adaptive Preview-Breite
 *
 * Abgedeckte Regeln:
 * - Ohne gespeicherten Messwert wird die Fallback-Breite verwendet.
 * - Mit gespeicherten Messwert wird die gemessene Breite verwendet.
 *
 * Fehlerfälle:
 * - Ungueltige gespeicherte Werte werden verworfen.
 *
 * Ziel:
 * Stabilitaet der Breitenauflösung fuer Weekly-Previews absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const panelCalls: Array<Record<string, unknown>> = [];

vi.mock("@/components/calendar/CalendarWeekAppointmentPanel", () => ({
  CalendarWeekAppointmentPanel: (props: Record<string, unknown>) => {
    panelCalls.push(props);
    return <div data-testid="mock-week-panel" />;
  },
}));

import {
  AppointmentWeeklyPanelPreview,
  appointmentWeeklyPanelPreviewOptions,
  createAppointmentWeeklyPanelPreview,
  resolveAppointmentWeeklyPanelPreviewWidthPx,
} from "../../../client/src/components/ui/badge-previews/appointment-weekly-panel-preview";
import {
  WEEKLY_PREVIEW_WIDTH_FALLBACK_PX,
  parseStoredWeeklyPreviewWidth,
  resolveWeeklyPreviewWidthPx,
  storeWeeklyPreviewWidth,
} from "../../../client/src/lib/preview-width";

describe("FT03 weekly preview width resolution", () => {
  beforeEach(() => {
    Object.assign(globalThis, { React });
    panelCalls.length = 0;
    const storage = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          storage.set(key, value);
        },
        removeItem: (key: string) => {
          storage.delete(key);
        },
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns fallback width when no value is stored", () => {
    expect(resolveWeeklyPreviewWidthPx()).toBe(WEEKLY_PREVIEW_WIDTH_FALLBACK_PX);
  });

  it("returns stored width when a valid value exists", () => {
    storeWeeklyPreviewWidth(318);
    expect(resolveWeeklyPreviewWidthPx()).toBe(318);
  });

  it("rejects invalid stored values", () => {
    expect(parseStoredWeeklyPreviewWidth("abc")).toBeNull();
    expect(parseStoredWeeklyPreviewWidth("-20")).toBeNull();
    expect(parseStoredWeeklyPreviewWidth("9999")).toBeNull();
  });

  it("uses at least 320px for sidebar/table profile when no width is stored", () => {
    expect(resolveAppointmentWeeklyPanelPreviewWidthPx("sidebarTable")).toBe(320);
  });

  it("uses measured width for sidebar/table profile when it is larger than 320px", () => {
    storeWeeklyPreviewWidth(380);
    expect(resolveAppointmentWeeklyPanelPreviewWidthPx("sidebarTable")).toBe(380);
  });

  it("renders weekly appointment previews in detail body mode with cursor positioning", () => {
    renderToStaticMarkup(
      <AppointmentWeeklyPanelPreview
        appointment={{
          id: 77,
          version: 1,
          projectId: 1,
          projectName: "Projekt",
          projectVersion: 1,
          projectOrderNumber: "A-1",
          projectArticleItems: [],
          projectDescription: null,
          project: null,
          startDate: "2099-04-01",
          endDate: null,
          startTime: null,
          tourId: null,
          tourName: null,
          tourColor: null,
          customer: {
            id: 1,
            customerNumber: "K-1",
            fullName: "Kunde",
            postalCode: "12345",
            city: "Berlin",
            addressLine1: null,
            phone: null,
            email: null,
          },
          customerNotesCount: 0,
          projectNotesCount: 0,
          appointmentNotesCount: 0,
          customerAttachmentsCount: 0,
          projectAttachmentsCount: 0,
          appointmentAttachmentsCount: 0,
          totalAttachmentsCount: 0,
          appointmentTags: [],
          customerTags: [],
          projectTags: [],
          displayMode: "standard",
          employees: [],
          isLocked: false,
          isCancelled: false,
        }}
        widthPx={320}
      />,
    );

    expect(panelCalls[0]).toMatchObject({
      weekTileBodyMode: "expanded",
      interactive: false,
      context: "week-calendar",
    });
    expect(appointmentWeeklyPanelPreviewOptions).toMatchObject({
      mode: "cursor",
      maxHeight: null,
      scrollY: "visible",
    });
  });

  it("uses an internal height cap for sidebar/table previews", () => {
    const preview = createAppointmentWeeklyPanelPreview(
      {
        id: 78,
        version: 1,
        projectId: 1,
        projectName: "Projekt",
        projectVersion: 1,
        projectOrderNumber: "A-2",
        projectArticleItems: [],
        projectDescription: null,
        project: null,
        startDate: "2099-04-02",
        endDate: null,
        startTime: null,
        tourId: null,
        tourName: null,
        tourColor: null,
        customer: {
          id: 1,
          customerNumber: "K-1",
          fullName: "Kunde",
          postalCode: "12345",
          city: "Berlin",
          addressLine1: null,
          phone: null,
          email: null,
        },
        customerNotesCount: 0,
        projectNotesCount: 0,
        appointmentNotesCount: 0,
        customerAttachmentsCount: 0,
        projectAttachmentsCount: 0,
        appointmentAttachmentsCount: 0,
        totalAttachmentsCount: 0,
        appointmentTags: [],
        customerTags: [],
        projectTags: [],
        displayMode: "standard",
        employees: [],
        isLocked: false,
        isCancelled: false,
      },
      { sizeProfile: "sidebarTable" },
    );

    expect(preview.options).toMatchObject({
      mode: "cursor",
      maxWidth: 320,
      maxHeight: 360,
      scrollY: "auto",
    });
  });
});
