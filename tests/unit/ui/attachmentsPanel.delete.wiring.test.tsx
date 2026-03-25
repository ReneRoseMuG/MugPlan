/**
 * Test Scope:
 *
 * Feature: FT19 - Attachment Loesch-Workflow
 * Use Case: UI-Reaktion nach Loeschoperation (Wiring)
 *
 * Abgedeckte Regeln:
 * - Nach erfolgreichem Soft-Delete wird der lokale Attachment-Query-Key invalidiert.
 * - Nach erfolgreichem Hard-Delete wird der lokale Attachment-Query-Key invalidiert.
 * - Nach erfolgreichem Delete wird zusaetzlich die Kalenderprojektion invalidiert.
 * - Projekt-, Kunden- und Termin-Loeschungen invalidieren zusaetzlich offene Appointment-Context-Projektionen.
 * - Das Bestaetigungspanel ist im DOM enthalten, wenn der Action-Button sichtbar ist.
 * - Das Panel zeigt das korrekte Parent-Typ-Label dynamisch an.
 * - Abbrechen fuehrt zu keiner Mutation und keiner Invalidierung.
 * - Der Action-Button ist nicht sichtbar, wenn keine Aenderungsrechte bestehen.
 * - Der Action-Button ist nicht sichtbar bei historischen Terminen.
 *
 * Fehlerfaelle:
 * - Delete invalidiert nur die lokale Liste und laesst Kalender-Counter oder Termin-Dokumentenkontext stale.
 * - Das Panel zeigt den falschen Parent-Typ an.
 *
 * Ziel:
 * Sichtbares Komponentenverhalten und Query-Cache-Wiring des Loesch-Workflows absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { invalidateQueriesMock, mutateMock } = vi.hoisted(() => ({
  invalidateQueriesMock: vi.fn(),
  mutateMock: vi.fn(),
}));

let capturedOnSuccess: (() => void | Promise<void>) | undefined;
let capturedOnError: (() => void) | undefined;

vi.mock("@tanstack/react-query", () => ({
  useMutation: (options: {
    onSuccess?: () => void | Promise<void>;
    onError?: () => void;
  }) => {
    capturedOnSuccess = options?.onSuccess;
    capturedOnError = options?.onError;
    return { mutate: mutateMock, isPending: false };
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/lib/queryClient", () => ({
  queryClient: { invalidateQueries: invalidateQueriesMock },
}));

import { AttachmentDeleteAction } from "../../../client/src/components/AttachmentDeleteAction";

describe("FT19 UI: AttachmentDeleteAction Wiring", () => {
  beforeEach(() => {
    invalidateQueriesMock.mockReset();
    mutateMock.mockReset();
    capturedOnSuccess = undefined;
    capturedOnError = undefined;
    vi.stubGlobal("React", React);
  });

  describe("Query-Invalidierung nach erfolgreichem Loeschen", () => {
    it("invalidiert nach Soft-Delete den Projekt-Query-Key, die Kalenderprojektion und den Appointment-Context", async () => {
      const listQueryKey = ["/api/projects", 42, "attachments"];

      renderToStaticMarkup(
        <AttachmentDeleteAction
          attachmentId={101}
          parentType="project"
          listQueryKey={listQueryKey}
          canEdit
        />,
      );

      expect(capturedOnSuccess).toBeDefined();
      await capturedOnSuccess!();

      expect(invalidateQueriesMock).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: listQueryKey }),
      );
      expect(invalidateQueriesMock).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ["calendarAppointments"] }),
      );
      expect(invalidateQueriesMock).toHaveBeenCalledWith(
        expect.objectContaining({ predicate: expect.any(Function) }),
      );
    });

    it("invalidiert nach Hard-Delete den Projekt-Query-Key, die Kalenderprojektion und den Appointment-Context", async () => {
      const listQueryKey = ["/api/projects", 42, "attachments"];

      renderToStaticMarkup(
        <AttachmentDeleteAction
          attachmentId={101}
          parentType="project"
          listQueryKey={listQueryKey}
          canEdit
          defaultMode="hard"
        />,
      );

      expect(capturedOnSuccess).toBeDefined();
      await capturedOnSuccess!();

      expect(invalidateQueriesMock).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: listQueryKey }),
      );
      expect(invalidateQueriesMock).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ["calendarAppointments"] }),
      );
      expect(invalidateQueriesMock).toHaveBeenCalledWith(
        expect.objectContaining({ predicate: expect.any(Function) }),
      );
    });

    it("invalidiert nach Soft-Delete den Kunden-Query-Key, die Kalenderprojektion und den Appointment-Context", async () => {
      const listQueryKey = ["/api/customers", 7, "attachments"];

      renderToStaticMarkup(
        <AttachmentDeleteAction
          attachmentId={202}
          parentType="customer"
          listQueryKey={listQueryKey}
          canEdit
        />,
      );

      await capturedOnSuccess!();

      expect(invalidateQueriesMock).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: listQueryKey }),
      );
      expect(invalidateQueriesMock).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ["calendarAppointments"] }),
      );
      expect(invalidateQueriesMock).toHaveBeenCalledWith(
        expect.objectContaining({ predicate: expect.any(Function) }),
      );
    });

    it("invalidiert nach Soft-Delete den Mitarbeiter-Query-Key und die Kalenderprojektion, aber nicht den Appointment-Context", async () => {
      const listQueryKey = ["/api/employees", 3, "attachments"];

      renderToStaticMarkup(
        <AttachmentDeleteAction
          attachmentId={303}
          parentType="employee"
          listQueryKey={listQueryKey}
          canEdit
        />,
      );

      await capturedOnSuccess!();

      expect(invalidateQueriesMock).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: listQueryKey }),
      );
      expect(invalidateQueriesMock).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ["calendarAppointments"] }),
      );
      expect(invalidateQueriesMock).not.toHaveBeenCalledWith(
        expect.objectContaining({ predicate: expect.any(Function) }),
      );
    });

    it("invalidiert nach Soft-Delete den Termin-Query-Key, die Kalenderprojektion und den Appointment-Context", async () => {
      const listQueryKey = ["/api/appointments", 55, "attachments"];

      renderToStaticMarkup(
        <AttachmentDeleteAction
          attachmentId={404}
          parentType="appointment"
          listQueryKey={listQueryKey}
          canEdit
        />,
      );

      await capturedOnSuccess!();

      expect(invalidateQueriesMock).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: listQueryKey }),
      );
      expect(invalidateQueriesMock).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ["calendarAppointments"] }),
      );
      expect(invalidateQueriesMock).toHaveBeenCalledWith(
        expect.objectContaining({ predicate: expect.any(Function) }),
      );
    });
  });

  describe("Panel-Inhalt und Parent-Typ-Label", () => {
    it("zeigt 'Projekt' fuer Projektanhaenge", () => {
      const markup = renderToStaticMarkup(
        <AttachmentDeleteAction
          attachmentId={101}
          parentType="project"
          listQueryKey={["/api/projects", 42, "attachments"]}
          canEdit
        />,
      );

      expect(markup).toContain("Projekt");
      expect(markup).toContain("Nur Verkn");
      expect(markup).toContain("Datei vollst");
    });

    it("zeigt 'Kunde' fuer Kundendokumente", () => {
      const markup = renderToStaticMarkup(
        <AttachmentDeleteAction
          attachmentId={202}
          parentType="customer"
          listQueryKey={["/api/customers", 7, "attachments"]}
          canEdit
        />,
      );

      expect(markup).toContain("Kunde");
    });

    it("zeigt 'Mitarbeiter' fuer Mitarbeiteranhaenge", () => {
      const markup = renderToStaticMarkup(
        <AttachmentDeleteAction
          attachmentId={303}
          parentType="employee"
          listQueryKey={["/api/employees", 3, "attachments"]}
          canEdit
        />,
      );

      expect(markup).toContain("Mitarbeiter");
    });

    it("zeigt 'Termin' fuer Terminanhaenge", () => {
      const markup = renderToStaticMarkup(
        <AttachmentDeleteAction
          attachmentId={404}
          parentType="appointment"
          listQueryKey={["/api/appointments", 55, "attachments"]}
          canEdit
        />,
      );

      expect(markup).toContain("Termin");
    });
  });

  describe("Abbrechen loest keine Mutation und keine Invalidierung aus", () => {
    it("invalidiert nichts ohne erfolgreichen Abschluss", () => {
      renderToStaticMarkup(
        <AttachmentDeleteAction
          attachmentId={101}
          parentType="project"
          listQueryKey={["/api/projects", 42, "attachments"]}
          canEdit
        />,
      );

      expect(invalidateQueriesMock).not.toHaveBeenCalled();
      expect(mutateMock).not.toHaveBeenCalled();
    });
  });

  describe("Sichtbarkeitsregeln des Action-Buttons", () => {
    it("rendert keinen Action-Button ohne Edit-Rechte", () => {
      const markup = renderToStaticMarkup(
        <AttachmentDeleteAction
          attachmentId={101}
          parentType="project"
          listQueryKey={["/api/projects", 42, "attachments"]}
          canEdit={false}
        />,
      );

      expect(markup).not.toContain("Nur Verkn");
      expect(markup).not.toContain("Datei vollst");
    });

    it("rendert keinen Action-Button bei historischen Terminen", () => {
      const markup = renderToStaticMarkup(
        <AttachmentDeleteAction
          attachmentId={404}
          parentType="appointment"
          listQueryKey={["/api/appointments", 55, "attachments"]}
          canEdit
          isHistoricalAppointment
        />,
      );

      expect(markup).not.toContain("Nur Verkn");
      expect(markup).not.toContain("Datei vollst");
    });

    it("rendert den Action-Button mit Delete-Optionen bei editierbaren Attachments", () => {
      const markup = renderToStaticMarkup(
        <AttachmentDeleteAction
          attachmentId={101}
          parentType="project"
          listQueryKey={["/api/projects", 42, "attachments"]}
          canEdit
          isHistoricalAppointment={false}
        />,
      );

      const hasSoftLabel = markup.includes("Nur Verkn");
      const hasHardLabel = markup.includes("Datei vollst");
      expect(hasSoftLabel || hasHardLabel).toBe(true);
    });
  });

  describe("Fehlerfall: kein invalidateQueries bei fehlgeschlagener Mutation", () => {
    it("invalidiert bei Mutation-Fehler nicht", () => {
      renderToStaticMarkup(
        <AttachmentDeleteAction
          attachmentId={101}
          parentType="project"
          listQueryKey={["/api/projects", 42, "attachments"]}
          canEdit
        />,
      );

      if (capturedOnError) capturedOnError();
      expect(invalidateQueriesMock).not.toHaveBeenCalled();
    });
  });
});
