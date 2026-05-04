# 04.05.26 | Änderung | FT-06: Reklamationsworkflow in Create-Formularen

## Zusammenfassung

Der Reklamationsworkflow ist jetzt im Projekt- und Terminformular bereits beim Anlegen verfügbar. Administratoren und Disponenten können im Create-Modus `Reklamation melden` wählen, erhalten den optionalen Reklamationsnotiz-Vorschlag und speichern den Zustand anschließend mit dem neu erzeugten Projekt oder Termin.

Der geschützte Systemzustand wird weiterhin nicht über den generischen Tag-Endpunkt gesetzt. Create-Drafts zeigen die Reklamation lokal an; nach erfolgreichem Create wird die bestehende dedizierte Reklamationsroute aufgerufen.

## Art der Änderung

- Frontend-Verhalten in Projekt- und Terminformular erweitert.
- Create-Draft für Reklamation ergänzt.
- Reklamationsnotiz-Vorschlag im Termin-Create über `NotesSection`-Prefill angebunden.
- Persistenz bewusst über bestehende Workflow-Endpunkte statt generische Tag-Mutation geführt.
- Unit- und Browser-E2E-Tests für Sichtbarkeit, Speichern, Tag-Persistenz und Notiz-Persistenz ergänzt.

## Betroffene Features

- [FT-01: Kalendertermine](../features/ft-01-kalendertermine/ft-01-kalendertermine.md)
- [FT-02: Projekte](../features/ft-02-projekte/ft-02-projekte.md)
- [FT-06: Automatische Regeln](../features/ft-06-automatische-regeln/ft-06-automatische-regeln.md)

## Konkrete Änderungen

- `ProjectForm` zeigt das Funktionen-Panel im Create-Modus mit `Reklamation melden`.
- `AppointmentForm` zeigt das Funktionen-Panel im Create-Modus mit `Reklamation melden`.
- Reklamations-Draft-Tags werden beim Speichern aus generischen Tag-Loops herausgefiltert.
- Projekt-Create ruft nach erfolgreichem Create `/api/projects/:id/reklamation` mit der erzeugten Version auf.
- Termin-Create ruft nach erfolgreichem Create `/api/appointments/:id/reklamation` mit der erzeugten Version auf.
- Der optionale Notizvorschlag kann vor dem ersten Save als Draft gespeichert und danach persistiert werden.

## Tests / Verifikation

Gezielt erfolgreich ausgeführt:

- `npm run test:unit -- tests/unit/ui/projectForm.layoutShellIntegration.test.tsx tests/unit/ui/appointmentForm.layoutTourIntegration.test.tsx`
- `npm run test:e2e:browser -- tests/e2e-browser/project-form.create-sidebar-persistence.browser.e2e.spec.ts`
- `npm run test:e2e:browser -- tests/e2e-browser/appointment-form.create-sidebar-persistence.browser.e2e.spec.ts`
- `npm run typecheck`

## Offene Punkte

- Kein vollständiger Browser-Gesamtlauf über alle E2E-Dateien.
- Keine Schema-, Contract- oder Migrationsänderungen.
