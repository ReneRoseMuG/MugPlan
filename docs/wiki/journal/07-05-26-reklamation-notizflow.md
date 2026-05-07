# 07.05.26 | FT-06/FT-13 | Reklamation-Notizflow ohne Doppelvorschlag

## Zusammenfassung

Der Reklamationsworkflow in Termin- und Projektformularen wurde gegen doppelt angebotene Notizvorschläge abgesichert. Wenn der Nutzer den Reklamations-Notizvorschlag einmal sieht und überspringt, schließt oder daraus einen Notizentwurf öffnet, wird derselbe Vorschlag beim anschließenden Speichern nicht erneut geöffnet.

## Art der Änderung

Frontend-Orchestrierungsfix mit Browser-Regressionstests. Zusätzlich wurde der Staged-Encoding-Guard so korrigiert, dass Testnamen nicht Bestandteil der ASCII-Umlaut-Prüfung sind. Es gab keine API-, Contract-, Datenbank- oder Migrationsänderung.

## Betroffene Features

- FT-06 Automatische Regeln: Reklamationsworkflow und Workflow-Folgeaktionen.
- FT-13 Notizverwaltung: optionaler Notizvorschlag aus Workflow-Templates.
- FT-01 Kalendertermine: Terminformular und Terminkarten-Menüpfad.
- FT-02 Projekte: Projektformular und projektbezogene Reklamation.

Notion-Links wurden für diese Session nicht ergänzt; die lokale Code- und Testlage war für den Fehlerzuschnitt ausreichend.

## Konkrete Änderungen

- `AppointmentForm` merkt sich bereits angebotene Workflow-Notizvorschläge und öffnet denselben Reklamationsvorschlag beim Save nicht erneut.
- `ProjectForm` nutzt dieselbe Sperre für projektbezogene Reklamationsvorschläge.
- `CalendarWeekView` nutzt eine terminbezogene Sperre für Notizvorschläge aus Terminkarten-/Menü-Mutation-Events.
- Beim Entfernen der Reklamation wird die Sperre zurückgesetzt, damit ein späteres bewusstes erneutes Setzen wieder einen Vorschlag anbieten kann.
- Zwei Browser-E2E-Tests schließen ausdrücklich aus, dass nach `Überspringen` im Create-Formular beim Speichern ein neuer Reklamations-Notizdialog erscheint.
- Der Staged-Encoding-Guard überspringt Testnamen in `test`, `it` und `describe`, prüft aber weiterhin Kommentare, Markdown, UI-Texte und sonstige menschenlesbare Strings.

## Rollen

`ADMIN` und `DISPATCHER` behalten die bestehenden Reklamationsaktionen. `READER` bleibt read-only. Die serverseitige Durchsetzung über vorhandene Reklamations-, Tag- und Notiz-Endpunkte bleibt unverändert.

## Tests / Verifikation

Erfolgreich ausgeführt:

- `npm run typecheck`
- `npm run test:unit -- tests/unit/hooks/useTagRuleEngine.test.ts tests/unit/ui/workflowNoteDialogs.behavior.test.tsx tests/unit/ui/appointmentForm.noteEditor.behavior.test.tsx tests/unit/ui/appointmentForm.layoutTourIntegration.test.tsx tests/unit/ui/projectForm.layoutShellIntegration.test.tsx`
- `npm run test:e2e:browser -- tests/e2e-browser/appointment-form.create-sidebar-persistence.browser.e2e.spec.ts tests/e2e-browser/project-form.create-sidebar-persistence.browser.e2e.spec.ts`
- `npm run check`
- `npm run check:encoding:staged`

## Offene Punkte

- Keine offenen Blocker im bearbeiteten Zuschnitt.
- Der konkrete doppelte Save-Fehler ist für Termin- und Projekt-Create-Formulare ausdrücklich per Browser-E2E abgesichert.
