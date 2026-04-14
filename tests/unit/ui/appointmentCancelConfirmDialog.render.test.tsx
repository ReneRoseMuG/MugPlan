/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der zentrale Storno-Confirm-Dialog zeigt den einheitlichen Titel und Beschreibungstext.
 * - Der Confirm-Button nutzt den einheitlichen Labeltext und die reservierte Storno-Farbe.
 * - Im Pending-Zustand wird das Pending-Label angezeigt und beide Aktionen werden deaktiviert.
 *
 * Fehlerfälle:
 * - Unterschiedliche Dialogtexte in verschiedenen Storno-Einstiegspunkten.
 * - Abweichende Confirm-Beschriftung oder fehlende visuelle Kennzeichnung.
 * - Fehlende Deaktivierung während laufender Storno-Aktion.
 *
 * Ziel:
 * Den zentralen Storno-Dialog als gemeinsame UI-Quelle mit konsistentem Laufzeitverhalten absichern.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { RESERVED_APPOINTMENT_CANCELLATION_TAG_COLOR } from "../../../shared/appointmentCancellation";
import {
  APPOINTMENT_CANCEL_DIALOG_CONFIRM_LABEL,
  APPOINTMENT_CANCEL_DIALOG_CONFIRM_PENDING_LABEL,
  APPOINTMENT_CANCEL_DIALOG_DESCRIPTION,
  APPOINTMENT_CANCEL_DIALOG_TITLE,
  AppointmentCancelConfirmDialog,
} from "../../../client/src/components/AppointmentCancelConfirmDialog";

vi.mock("@/components/ui/alert-dialog", () => ({
  AlertDialog: ({ children }: { children?: unknown }) => createElement("div", null, children),
  AlertDialogContent: ({ children }: { children?: unknown }) => createElement("div", null, children),
  AlertDialogHeader: ({ children }: { children?: unknown }) => createElement("div", null, children),
  AlertDialogTitle: ({ children }: { children?: unknown }) => createElement("h2", null, children),
  AlertDialogDescription: ({ children }: { children?: unknown }) => createElement("p", null, children),
  AlertDialogFooter: ({ children }: { children?: unknown }) => createElement("div", null, children),
  AlertDialogCancel: ({ children, ...props }: { children?: unknown; disabled?: boolean }) => createElement("button", props, children),
  AlertDialogAction: ({ children, ...props }: { children?: unknown; disabled?: boolean; style?: Record<string, string> }) => createElement("button", props, children),
}));

describe("FT28 appointment cancel confirm dialog", () => {
  it("renders shared cancellation copy and default action label", () => {
    const html = renderToStaticMarkup(
      createElement(AppointmentCancelConfirmDialog, {
        open: true,
        onOpenChange: () => undefined,
        onConfirm: () => undefined,
      }),
    );

    expect(html).toContain(APPOINTMENT_CANCEL_DIALOG_TITLE);
    expect(html).toContain(APPOINTMENT_CANCEL_DIALOG_DESCRIPTION);
    expect(html).toContain(APPOINTMENT_CANCEL_DIALOG_CONFIRM_LABEL);
    expect(html).toContain("Abbrechen");
    expect(html).toContain(`background-color:${RESERVED_APPOINTMENT_CANCELLATION_TAG_COLOR}`);
    expect(html).toContain(`border-color:${RESERVED_APPOINTMENT_CANCELLATION_TAG_COLOR}`);
  });

  it("renders pending label and disables actions while request is running", () => {
    const html = renderToStaticMarkup(
      createElement(AppointmentCancelConfirmDialog, {
        open: true,
        onOpenChange: () => undefined,
        onConfirm: () => undefined,
        isPending: true,
      }),
    );

    expect(html).toContain(APPOINTMENT_CANCEL_DIALOG_CONFIRM_PENDING_LABEL);
    expect(html).not.toContain(`>${APPOINTMENT_CANCEL_DIALOG_CONFIRM_LABEL}</button>`);
    expect((html.match(/disabled=""/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });
});

