/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - computeTagAddedAction fuer Reklamation loest Vorschlag aus wenn keine Duplikat-Notiz existiert.
 * - computeTagAddedAction fuer Reklamation loest keinen Vorschlag aus wenn Notiz mit Titel bereits existiert.
 * - computeTagAddedAction fuer Messe loest Vorschlag aus wenn keine Duplikat-Notiz existiert.
 * - computeTagAddedAction fuer Messe loest keinen Vorschlag aus wenn Notiz mit Titel bereits existiert.
 * - computeTagRemovedAction fuer Reklamation loest Entfernen-Dialog aus wenn Notiz existiert.
 * - computeTagRemovedAction fuer Reklamation loest keinen Dialog aus wenn keine Notiz existiert.
 * - computeTagRemovedAction fuer Messe loest Entfernen-Dialog aus wenn Notiz existiert.
 * - computeTagRemovedAction fuer andere Tags loest keine Aktion aus.
 * - Titelvergleich ist normalisiert (Gross/Klein, Leerzeichen).
 *
 * Fehlerfaelle:
 * - Vorschlag auch ohne persistierte Termin-ID, damit Projekt- und Draft-Kontexte denselben Flow nutzen koennen.
 * - Kein Entfernen-Dialog wenn existingNotes leer.
 *
 * Ziel:
 * Die reine Entscheidungslogik des useTagRuleEngine-Hooks ohne Browser-Abhaengigkeit absichern.
 *
 * Hinweis Testabdeckung:
 * Diese Datei prueft nur die Entscheidungslogik.
 * Das nachgelagerte AppointmentForm-UI-Verhalten fuer Vorschlag- und Template-Editor-Flows
 * wird in tests/unit/ui/appointmentForm.noteEditor.behavior.test.tsx abgedeckt.
 */
import { describe, expect, it } from "vitest";
import {
  computeTagAddedAction,
  computeTagRemovedAction,
} from "../../../client/src/hooks/useTagRuleEngine";

describe("useTagRuleEngine: computeTagAddedAction", () => {
  it("loest Vorschlag aus fuer Reklamation ohne existierende Notiz", () => {
    const action = computeTagAddedAction("Reklamation", 42, []);
    expect(action).toEqual({ kind: "show_note_suggestion_dialog", templateTitle: "Reklamation" });
  });

  it("loest keinen Vorschlag aus wenn Notiz mit Titel Reklamation bereits existiert", () => {
    const action = computeTagAddedAction("Reklamation", 42, [{ title: "Reklamation" }]);
    expect(action).toEqual({ kind: "noop" });
  });

  it("loest Vorschlag aus fuer Messe Aufbau/Abbau ohne existierende Notiz", () => {
    const action = computeTagAddedAction("Messe Aufbau/Abbau", 42, []);
    expect(action).toEqual({ kind: "show_note_suggestion_dialog", templateTitle: "Messe Aufbau/Abbau" });
  });

  it("loest keinen Vorschlag aus wenn Notiz mit Titel Messe Aufbau/Abbau bereits existiert", () => {
    const action = computeTagAddedAction("Messe Aufbau/Abbau", 42, [{ title: "Messe Aufbau/Abbau" }]);
    expect(action).toEqual({ kind: "noop" });
  });

  it("loest Vorschlag aus wenn targetId null ist", () => {
    const action = computeTagAddedAction("Reklamation", null, []);
    expect(action).toEqual({ kind: "show_note_suggestion_dialog", templateTitle: "Reklamation" });
  });

  it("loest Vorschlag aus wenn targetId undefined ist", () => {
    const action = computeTagAddedAction("Reklamation", undefined, []);
    expect(action).toEqual({ kind: "show_note_suggestion_dialog", templateTitle: "Reklamation" });
  });

  it("loest keinen Vorschlag aus fuer unbekannte Tag-Namen", () => {
    const action = computeTagAddedAction("Sondermaß", 42, []);
    expect(action).toEqual({ kind: "noop" });
  });

  it("loest keinen Vorschlag aus fuer Anmerkungen", () => {
    const action = computeTagAddedAction("Anmerkungen", 42, []);
    expect(action).toEqual({ kind: "noop" });
  });

  it("normalisiert Gross/Kleinschreibung beim Duplikat-Vergleich", () => {
    const action = computeTagAddedAction("Reklamation", 42, [{ title: "reklamation" }]);
    expect(action).toEqual({ kind: "noop" });
  });

  it("normalisiert fuehrende und nachfolgende Leerzeichen beim Duplikat-Vergleich", () => {
    const action = computeTagAddedAction("Reklamation", 42, [{ title: "  Reklamation  " }]);
    expect(action).toEqual({ kind: "noop" });
  });
});

describe("useTagRuleEngine: computeTagRemovedAction", () => {
  it("loest Entfernen-Dialog aus fuer Reklamation wenn Notiz existiert", () => {
    const action = computeTagRemovedAction("Reklamation", [{ title: "Reklamation" }]);
    expect(action).toEqual({ kind: "show_note_removal_dialog", templateTitle: "Reklamation" });
  });

  it("loest keinen Dialog aus fuer Reklamation wenn keine Notiz existiert", () => {
    const action = computeTagRemovedAction("Reklamation", []);
    expect(action).toEqual({ kind: "noop" });
  });

  it("loest Entfernen-Dialog aus fuer Messe Aufbau/Abbau wenn Notiz existiert", () => {
    const action = computeTagRemovedAction("Messe Aufbau/Abbau", [{ title: "Messe Aufbau/Abbau" }]);
    expect(action).toEqual({ kind: "show_note_removal_dialog", templateTitle: "Messe Aufbau/Abbau" });
  });

  it("loest keinen Dialog aus fuer Messe wenn Notiz fehlt", () => {
    const action = computeTagRemovedAction("Messe Aufbau/Abbau", []);
    expect(action).toEqual({ kind: "noop" });
  });

  it("loest keinen Dialog aus fuer andere Tags", () => {
    expect(computeTagRemovedAction("Sondermaß", [{ title: "Sondermaß" }])).toEqual({ kind: "noop" });
    expect(computeTagRemovedAction("Anmerkungen", [{ title: "Anmerkungen" }])).toEqual({ kind: "noop" });
    expect(computeTagRemovedAction("Info", [{ title: "Info" }])).toEqual({ kind: "noop" });
  });

  it("normalisiert Titel-Vergleich case-insensitiv", () => {
    const action = computeTagRemovedAction("Reklamation", [{ title: "REKLAMATION" }]);
    expect(action).toEqual({ kind: "show_note_removal_dialog", templateTitle: "Reklamation" });
  });
});
