# Log: Reklamation-Notizflow

**Datum:** 2026-05-07
**Branch:** `feature/a07-a08-calendar-cut-insert`
**Auftragsklasse:** 5 - Mehrschichtige Änderung oder neues Feature

---

## Zweck

Der Reklamationsworkflow sollte so abgesichert werden, dass ein angebotener Notizvorschlag nicht doppelt erscheint. Beobachtet war der Fehler im Create-Formular: Nach dem Setzen von Reklamation wurde der Notizworkflow angeboten; nach Überspringen oder Bearbeiten konnte beim Speichern derselbe Notizworkflow erneut ausgelöst werden.

---

## Scope

Untersucht und geändert wurden die Reklamationspfade in:

- Terminformular Create/Edit
- Projektformular Create/Edit
- Wochenkalender-Terminkarte beziehungsweise Menüpfad

Zusätzlich wurde der Staged-Encoding-Guard gezielt korrigiert, weil Testnamen nicht Bestandteil der ASCII-Umlaut-Prüfung sein sollen.

Nicht geändert wurden Backend-Contracts, Server-Endpunkte, Datenbank-Schema, Rollenrechte oder Notiz-Persistenzregeln.

---

## Technische Entscheidungen

- Die Lösung bleibt im Frontend-Orchestrierungsbereich, weil die serverseitigen Reklamations-Endpunkte bereits Rollen, Versionen und Mutationen absichern.
- Pro Formularsitzung beziehungsweise pro Terminkarten-Kontext wird gemerkt, dass ein Workflow-Notizvorschlag für ein Template bereits angeboten wurde.
- Wenn der Nutzer den Vorschlag überspringt, schließt oder daraus einen Notizentwurf öffnet, wird derselbe Vorschlag beim anschließenden Speichern nicht erneut geöffnet.
- Beim Entfernen der Reklamation wird die Sperre zurückgesetzt, damit ein späteres bewusstes erneutes Setzen wieder einen Vorschlag anbieten kann.

---

## Betroffene Dateien

- `client/src/components/AppointmentForm.tsx`
- `client/src/components/ProjectForm.tsx`
- `client/src/components/calendar/CalendarWeekView.tsx`
- `tests/e2e-browser/appointment-form.create-sidebar-persistence.browser.e2e.spec.ts`
- `tests/e2e-browser/project-form.create-sidebar-persistence.browser.e2e.spec.ts`
- `scripts/check-staged-encoding.mjs`

---

## Rollen und Sicherheit

`ADMIN` und `DISPATCHER` behalten die bestehenden Reklamationsaktionen. `READER` bleibt read-only und erhält keine neue Aktion. Die serverseitige Durchsetzung über bestehende Reklamations-, Tag- und Notiz-Endpunkte bleibt unverändert; die Änderung erweitert keine Berechtigungen und fügt keinen neuen Endpunkt hinzu.

---

## Tests / Verifikation

Erfolgreich ausgeführt:

- `npm run typecheck`
- `npm run test:unit -- tests/unit/hooks/useTagRuleEngine.test.ts tests/unit/ui/workflowNoteDialogs.behavior.test.tsx tests/unit/ui/appointmentForm.noteEditor.behavior.test.tsx tests/unit/ui/appointmentForm.layoutTourIntegration.test.tsx tests/unit/ui/projectForm.layoutShellIntegration.test.tsx`
- `npm run test:e2e:browser -- tests/e2e-browser/appointment-form.create-sidebar-persistence.browser.e2e.spec.ts tests/e2e-browser/project-form.create-sidebar-persistence.browser.e2e.spec.ts`
- `npm run check`
- `npm run check:encoding:staged`

Neue explizite Regressionstests:

- `does not reopen the Reklamation note suggestion on new appointment save after skip`
- `does not reopen the Reklamation note suggestion on new project save after skip`

---

## Bekannte Einschränkungen

- Der konkrete doppelte Save-Fehler ist für Termin- und Projekt-Create-Formulare abgesichert.
- Die Terminkarten-/Menüpfade besitzen eine eigene Sperre gegen doppelte Vorschläge im Kalenderkontext; ein nachgelagerter Formular-Save gehört dort nicht zum gleichen Bedienpfad.
- Testnamen werden im Staged-Encoding-Guard nicht mehr als menschenlesbarer Produkttext behandelt; die übrigen Guard-Prüfungen bleiben aktiv.
- Keine offenen Blocker im bearbeiteten Zuschnitt.
