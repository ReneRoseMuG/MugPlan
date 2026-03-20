/**
 * Test Scope:
 *
 * Feature: FT03 - Toaster / ToastViewport
 *
 * Abgedeckte Regeln:
 * - Toaster reicht die aufgeloeste Desktop-Position an den Viewport weiter.
 * - ToastViewport mappt die vier Desktop-Ecken auf sichtbare Klassen.
 *
 * Fehlerfaelle:
 * - Desktop-Positionen driften zwischen Setting und Viewport auseinander.
 * - Einzelne Eckpositionen verlieren ihre Klassen.
 *
 * Ziel:
 * Das sichtbare Toast-Positionierungsverhalten statt Quelltextstrings absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const viewportCalls: Array<Record<string, unknown>> = [];
const useToastMock = vi.fn();
const useSettingMock = vi.fn();

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => useToastMock(),
}));

vi.mock("@/hooks/useSettings", () => ({
  useSetting: (key: string) => useSettingMock(key),
}));

vi.mock("@radix-ui/react-toast", () => ({
  Provider: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Viewport: ({ children, className }: { children?: React.ReactNode; className?: string }) => {
    viewportCalls.push({ className });
    return <div className={className}>{children}</div>;
  },
  Root: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Title: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Description: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Close: ({ children }: { children?: React.ReactNode }) => <button type="button">{children}</button>,
  Action: ({ children }: { children?: React.ReactNode }) => <button type="button">{children}</button>,
}));

import { Toaster } from "../../../client/src/components/ui/toaster";
import { ToastViewport } from "../../../client/src/components/ui/toast";

describe("FT03 UI: toaster behavior", () => {
  beforeEach(() => {
    Object.assign(globalThis, { React });
    viewportCalls.length = 0;
    useToastMock.mockReset();
    useSettingMock.mockReset();
    useToastMock.mockReturnValue({
      toasts: [{ id: "a", title: "Info", description: "Nachricht" }],
    });
  });

  it("passes the resolved desktop position from the setting into the toaster viewport", () => {
    useSettingMock.mockReturnValue("top-left");

    const html = renderToStaticMarkup(<Toaster />);

    expect(html).toContain("Info");
    expect(html).toContain("Nachricht");
    expect(viewportCalls[0]).toMatchObject({
      className: expect.stringContaining("sm:top-0 sm:left-0"),
    });
  });

  it("maps all supported desktop positions to visible viewport classes", () => {
    const topLeft = renderToStaticMarkup(<ToastViewport desktopPosition="top-left" />);
    const topRight = renderToStaticMarkup(<ToastViewport desktopPosition="top-right" />);
    const bottomLeft = renderToStaticMarkup(<ToastViewport desktopPosition="bottom-left" />);
    const bottomRight = renderToStaticMarkup(<ToastViewport desktopPosition="bottom-right" />);

    expect(topLeft).toContain("sm:top-0 sm:left-0");
    expect(topRight).toContain("sm:top-0 sm:right-0");
    expect(bottomLeft).toContain("sm:bottom-0 sm:left-0");
    expect(bottomRight).toContain("sm:bottom-0 sm:right-0");
  });
});
