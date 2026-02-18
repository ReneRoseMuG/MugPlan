/**
 * Test Scope:
 *
 * Feature: FT03 - Vorschau- und Kalenderverhalten
 * Use Case: UC03 - Toast-Viewport Positionsverdrahtung
 *
 * Abgedeckte Regeln:
 * - Toaster liest toastDesktopPosition ueber useSetting.
 * - Toaster reicht den Wert an ToastViewport weiter.
 * - ToastViewport mappt alle vier Desktop-Positionen auf feste Klassen.
 * - Mobile-Basisposition bleibt top-0.
 *
 * Fehlerfaelle:
 * - Fehlende Default-Weitergabe an ToastViewport.
 *
 * Ziel:
 * Verdrahtung zwischen Setting und Viewport-Position gegen Regressions absichern.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("FT03 UI: toaster toastDesktopPosition wiring", () => {
  const toasterSource = readFileSync(path.resolve(process.cwd(), "client/src/components/ui/toaster.tsx"), "utf8");
  const toastSource = readFileSync(path.resolve(process.cwd(), "client/src/components/ui/toast.tsx"), "utf8");

  it("reads toastDesktopPosition setting and forwards it to ToastViewport", () => {
    expect(toasterSource).toContain('useSetting("toastDesktopPosition")');
    expect(toasterSource).toContain('<ToastViewport desktopPosition={toastDesktopPosition ?? "bottom-right"} />');
  });

  it("contains class mapping for all desktop corner positions", () => {
    expect(toastSource).toContain('"top-left": "sm:left-0 sm:right-auto sm:top-0 sm:bottom-auto"');
    expect(toastSource).toContain('"top-right": "sm:right-0 sm:left-auto sm:top-0 sm:bottom-auto"');
    expect(toastSource).toContain('"bottom-left": "sm:left-0 sm:right-auto sm:bottom-0 sm:top-auto"');
    expect(toastSource).toContain('"bottom-right": "sm:right-0 sm:left-auto sm:bottom-0 sm:top-auto"');
  });

  it("keeps mobile top anchor in viewport base classes", () => {
    expect(toastSource).toContain('"fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:flex-col md:max-w-[420px]"');
  });
});
