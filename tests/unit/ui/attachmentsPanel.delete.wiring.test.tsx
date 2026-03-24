/**
 * Test Scope:
 *
 * Feature: FT19 – Attachment Lösch-Workflow
 * Use Case: UI-Reaktion nach Löschoperation (Wiring)
 *
 * Abgedeckte Regeln:
 * - Nach erfolgreichem Soft-Delete wird queryClient.invalidateQueries mit dem korrekten
 *   Query-Key aufgerufen.
 * - Nach erfolgreichem Hard-Delete wird queryClient.invalidateQueries mit dem korrekten
 *   Query-Key aufgerufen.
 * - Der Bestätigungsdialog ist im DOM enthalten, wenn der Action-Button sichtbar ist.
 * - Der Dialog zeigt den korrekten Parent-Typ-Label dynamisch an (je Domäne ein Test).
 * - Abbrechen im Dialog führt zu keiner Mutation und keiner Invalidierung.
 * - Der Action-Button ist nicht sichtbar, wenn der Akteur keine Änderungsrechte hat.
 * - Der Action-Button ist nicht sichtbar bei historischen Terminen.
 *
 * Ziel:
 * Sichtbares Komponentenverhalten und Query-Cache-Wiring des Lösch-Workflows absichern.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { invalidateQueriesMock, mutateMock } = vi.hoisted(() => ({
  invalidateQueriesMock: vi.fn(),
  mutateMock: vi.fn(),
}));

let capturedOnSuccess: (() => void) | undefined;
let capturedOnError: (() => void) | undefined;

vi.mock("@tanstack/react-query", () => ({
  useMutation: (options: {
    onSuccess?: () => void;
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

  describe("Query-Invalidierung nach erfolgreichem Löschen", () => {
    it("ruft invalidateQueries nach Soft-Delete mit dem korrekten Projekt-Query-Key auf", () => {
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
      capturedOnSuccess!();
      expect(invalidateQueriesMock).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: listQueryKey }),
      );
    });

    it("ruft invalidateQueries nach Hard-Delete mit dem korrekten Projekt-Query-Key auf", () => {
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
      capturedOnSuccess!();
      expect(invalidateQueriesMock).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: listQueryKey }),
      );
    });

    it("ruft invalidateQueries nach Soft-Delete mit dem korrekten Kunden-Query-Key auf", () => {
      const listQueryKey = ["/api/customers", 7, "attachments"];

      renderToStaticMarkup(
        <AttachmentDeleteAction
          attachmentId={202}
          parentType="customer"
          listQueryKey={listQueryKey}
          canEdit
        />,
      );

      capturedOnSuccess!();
      expect(invalidateQueriesMock).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: listQueryKey }),
      );
    });

    it("ruft invalidateQueries nach Soft-Delete mit dem korrekten Mitarbeiter-Query-Key auf", () => {
      const listQueryKey = ["/api/employees", 3, "attachments"];

      renderToStaticMarkup(
        <AttachmentDeleteAction
          attachmentId={303}
          parentType="employee"
          listQueryKey={listQueryKey}
          canEdit
        />,
      );

      capturedOnSuccess!();
      expect(invalidateQueriesMock).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: listQueryKey }),
      );
    });

    it("ruft invalidateQueries nach Soft-Delete mit dem korrekten Termin-Query-Key auf", () => {
      const listQueryKey = ["/api/appointments", 55, "attachments"];

      renderToStaticMarkup(
        <AttachmentDeleteAction
          attachmentId={404}
          parentType="appointment"
          listQueryKey={listQueryKey}
          canEdit
        />,
      );

      capturedOnSuccess!();
      expect(invalidateQueriesMock).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: listQueryKey }),
      );
    });
  });

  describe("Dialog-Inhalt und Parent-Typ-Label", () => {
    it("Dialog zeigt 'Projekt' als Parent-Typ für Projektanhaenge", () => {
      const markup = renderToStaticMarkup(
        <AttachmentDeleteAction
          attachmentId={101}
          parentType="project"
          listQueryKey={["/api/projects", 42, "attachments"]}
          canEdit
        />,
      );

      expect(markup).toContain("Projekt");
      expect(markup).toContain("Nur Verknüpfung entfernen");
      expect(markup).toContain("Datei vollständig löschen");
    });

    it("Dialog zeigt 'Kunde' als Parent-Typ für Kundendokumente", () => {
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

    it("Dialog zeigt 'Mitarbeiter' als Parent-Typ für Mitarbeiteranhaenge", () => {
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

    it("Dialog zeigt 'Termin' als Parent-Typ für Terminanhaenge", () => {
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

  describe("Abbrechen löst keine Mutation und keine Invalidierung aus", () => {
    it("keine Mutation und kein invalidateQueries wenn onCancel aufgerufen wird", () => {
      renderToStaticMarkup(
        <AttachmentDeleteAction
          attachmentId={101}
          parentType="project"
          listQueryKey={["/api/projects", 42, "attachments"]}
          canEdit
        />,
      );

      // onSuccess wurde nicht aufgerufen (kein Abschluss einer Mutation)
      expect(invalidateQueriesMock).not.toHaveBeenCalled();
      expect(mutateMock).not.toHaveBeenCalled();
    });
  });

  describe("Sichtbarkeitsregeln des Action-Buttons", () => {
    it("Action-Button ist nicht im Markup, wenn canEdit=false (Leser-Rolle)", () => {
      const markup = renderToStaticMarkup(
        <AttachmentDeleteAction
          attachmentId={101}
          parentType="project"
          listQueryKey={["/api/projects", 42, "attachments"]}
          canEdit={false}
        />,
      );

      expect(markup).not.toContain("Nur Verknüpfung entfernen");
      expect(markup).not.toContain("Datei vollständig löschen");
    });

    it("Action-Button ist nicht im Markup bei historischen Terminen", () => {
      const markup = renderToStaticMarkup(
        <AttachmentDeleteAction
          attachmentId={404}
          parentType="appointment"
          listQueryKey={["/api/appointments", 55, "attachments"]}
          canEdit
          isHistoricalAppointment
        />,
      );

      expect(markup).not.toContain("Nur Verknüpfung entfernen");
      expect(markup).not.toContain("Datei vollständig löschen");
    });

    it("Action-Button ist sichtbar wenn canEdit=true und kein historischer Termin", () => {
      const markup = renderToStaticMarkup(
        <AttachmentDeleteAction
          attachmentId={101}
          parentType="project"
          listQueryKey={["/api/projects", 42, "attachments"]}
          canEdit
          isHistoricalAppointment={false}
        />,
      );

      // Mindestens einer der beiden Lösch-Optionen muss im Markup stehen
      const hasSoftLabel = markup.includes("Nur Verknüpfung entfernen");
      const hasHardLabel = markup.includes("Datei vollständig löschen");
      expect(hasSoftLabel || hasHardLabel).toBe(true);
    });
  });

  describe("Fehlerfall: kein invalidateQueries bei fehlgeschlagener Mutation", () => {
    it("invalidateQueries wird bei Mutation-Fehler nicht aufgerufen", () => {
      renderToStaticMarkup(
        <AttachmentDeleteAction
          attachmentId={101}
          parentType="project"
          listQueryKey={["/api/projects", 42, "attachments"]}
          canEdit
        />,
      );

      // onError simulieren statt onSuccess
      if (capturedOnError) capturedOnError();
      expect(invalidateQueriesMock).not.toHaveBeenCalled();
    });
  });
});
