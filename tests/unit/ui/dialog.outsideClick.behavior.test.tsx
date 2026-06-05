/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - DialogContent verhindert das Schließen durch Außenklick per Default (onInteractOutside).
 * - DialogContent akzeptiert eine explizite Override-Funktion für onInteractOutside.
 * - DialogBaseShell verhindert das Schließen durch Außenklick unabhängig von closeDisabled.
 *
 * Fehlerfälle:
 * - Fehlender Default: Außenklick würde den Dialog schließen.
 * - closeDisabled=false als frühere Bedingung: Außenklick schließt trotz fehlender Absicht.
 *
 * Ziel:
 * Das zentrale Außenklick-Schutzverhalten aller Dialoge absichern, das über
 * dialog.tsx (Default-Parameter) und dialog-base.tsx (DialogBaseShell) erzwungen wird.
 */
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type InteractEvent = { preventDefault: () => void };

const capturedContentProps: Array<{ onInteractOutside?: (e: InteractEvent) => void }> = [];

vi.mock("@radix-ui/react-dialog", () => {
  const ContentMock = React.forwardRef<
    HTMLElement,
    {
      children?: React.ReactNode;
      onInteractOutside?: (e: InteractEvent) => void;
      [key: string]: unknown;
    }
  >(({ children, onInteractOutside, ...rest }, _ref) => {
    capturedContentProps.push({ onInteractOutside });
    return React.createElement("section", rest as Record<string, unknown>, children);
  });
  ContentMock.displayName = "Content";

  const OverlayMock = React.forwardRef<HTMLElement, Record<string, unknown>>(
    ({ children: _c, ...rest }, _ref) => React.createElement("div", rest),
  );
  OverlayMock.displayName = "Overlay";

  return {
    Root: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    Portal: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    Overlay: OverlayMock,
    Content: ContentMock,
    Close: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) =>
      React.createElement("button", { type: "button", ...props }, children),
    Trigger: ({ children }: { children?: React.ReactNode }) =>
      React.createElement("button", { type: "button" }, children),
    Title: ({ children }: { children?: React.ReactNode }) =>
      React.createElement("h2", null, children),
    Description: ({ children }: { children?: React.ReactNode }) =>
      React.createElement("p", null, children),
  };
});

vi.mock("lucide-react", () => ({
  AlertCircle: () => null,
  ArrowLeft: () => null,
  CheckCircle2: () => null,
  Circle: () => null,
  Info: () => null,
  Loader2: () => null,
  TriangleAlert: () => null,
  X: () => null,
}));

vi.mock("@/components/ui/alert-dialog", () => ({
  AlertDialog: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", null, children),
  AlertDialogAction: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) =>
    React.createElement("button", { type: "button", ...props }, children),
  AlertDialogCancel: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) =>
    React.createElement("button", { type: "button", ...props }, children),
  AlertDialogContent: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) =>
    React.createElement("section", props, children),
  AlertDialogDescription: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("p", null, children),
  AlertDialogFooter: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("footer", null, children),
  AlertDialogHeader: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("header", null, children),
  AlertDialogTitle: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("h2", null, children),
}));

vi.mock("@/components/ui/alert", () => ({
  Alert: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) =>
    React.createElement("div", props, children),
  AlertDescription: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("p", null, children),
  AlertTitle: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("strong", null, children),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) =>
    React.createElement("button", { type: "button", ...props }, children),
}));

vi.mock("@/lib/error-normalization", () => ({
  normalizeServerError: () => ({
    isKnownCode: true,
    title: "Fehler",
    description: "Ein Fehler ist aufgetreten.",
    severity: "error" as const,
  }),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...classes: Array<string | undefined | null | false>) =>
    classes.filter(Boolean).join(" "),
}));

import { DialogContent } from "../../../client/src/components/ui/dialog";
import { DialogBaseShell } from "../../../client/src/components/ui/dialog-base";

describe("dialog outside-click prevention", () => {
  beforeEach(() => {
    capturedContentProps.length = 0;
  });

  describe("DialogContent – dialog.tsx", () => {
    it("ruft preventDefault per Default, wenn kein Handler übergeben wird", () => {
      renderToStaticMarkup(
        React.createElement(DialogContent as React.ComponentType<{ children?: React.ReactNode }>, null, "Inhalt"),
      );

      const handler = capturedContentProps[0]?.onInteractOutside;
      expect(handler, "onInteractOutside-Handler fehlt im gemockten Radix-Content").toBeDefined();

      const event = { preventDefault: vi.fn() };
      handler?.(event);
      expect(event.preventDefault).toHaveBeenCalledOnce();
    });

    it("übergibt einen expliziten Handler direkt, ohne preventDefault aufzurufen", () => {
      const customHandler = vi.fn();

      renderToStaticMarkup(
        React.createElement(
          DialogContent as React.ComponentType<{
            children?: React.ReactNode;
            onInteractOutside?: (e: InteractEvent) => void;
          }>,
          { onInteractOutside: customHandler },
          "Inhalt",
        ),
      );

      const handler = capturedContentProps[0]?.onInteractOutside;
      const event = { preventDefault: vi.fn() };
      handler?.(event);

      expect(customHandler).toHaveBeenCalledWith(event);
      expect(event.preventDefault).not.toHaveBeenCalled();
    });
  });

  describe("DialogBaseShell – dialog-base.tsx", () => {
    function renderShell(closeDisabled?: boolean) {
      renderToStaticMarkup(
        React.createElement(
          DialogBaseShell,
          {
            open: true,
            onOpenChange: () => undefined,
            title: "Test-Dialog",
            closeDisabled,
          },
          React.createElement("span", null, "Inhalt"),
        ),
      );
      return capturedContentProps[0]?.onInteractOutside;
    }

    it("ruft preventDefault bei Außenklick, wenn closeDisabled nicht gesetzt ist", () => {
      const handler = renderShell(undefined);
      expect(handler, "onInteractOutside-Handler fehlt im DialogBaseShell").toBeDefined();

      const event = { preventDefault: vi.fn() };
      handler?.(event);
      expect(event.preventDefault).toHaveBeenCalledOnce();
    });

    it("ruft preventDefault bei Außenklick, wenn closeDisabled false ist", () => {
      const handler = renderShell(false);
      expect(handler).toBeDefined();

      const event = { preventDefault: vi.fn() };
      handler?.(event);
      expect(event.preventDefault).toHaveBeenCalledOnce();
    });

    it("ruft preventDefault bei Außenklick, wenn closeDisabled true ist", () => {
      const handler = renderShell(true);
      expect(handler).toBeDefined();

      const event = { preventDefault: vi.fn() };
      handler?.(event);
      expect(event.preventDefault).toHaveBeenCalledOnce();
    });
  });
});
