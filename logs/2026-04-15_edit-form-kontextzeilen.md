# Edit-Form-Kontextzeilen

## Zweck

Ergänzung der Kopfzeilen in bestehenden Edit-Formularen um eine zweite Kontextzeile, damit direkt erkennbar ist, welches konkrete Item bearbeitet wird.

## Scope

- Lokale UI-Erweiterung in bestehenden Edit-Formularen und Edit-Dialogen
- Einheitliche Kontextanzeige für Projekt, Kunde, Mitarbeiter, Termin, Tour, Team, Hilfetext sowie bestehende Notiz-, Vorlagen- und Abwesenheits-Editoren
- Keine Änderung an API, Persistenz, Rollenlogik, Contracts oder Formularabläufen

## Technische Entscheidungen

- Die Kontextanzeige wurde als kleine gemeinsame UI-Komponente `EditFormContextText` umgesetzt, damit Darstellung und Styling an allen Stellen konsistent bleiben.
- Die fachliche Aufbereitung der Kontextwerte wurde in `client/src/lib/edit-form-context.ts` gebündelt, damit Namen, Datums-/Zeitangaben und optionale Zusatzinfos nicht pro Formular neu zusammengesetzt werden.
- Bestehende Formular-Header wurden nur lokal erweitert; es wurden keine Form-Strukturen oder Datenflüsse umgebaut.
- Für Termine wird die Kontextzeile aus Datum, optionaler Uhrzeit, Tour und Kunde zusammengesetzt, wie im Auftrag gefordert.

## Betroffene Dateien

- `client/src/components/AppointmentForm.tsx`
- `client/src/components/CustomerData.tsx`
- `client/src/components/EmployeeAbsencesPanel.tsx`
- `client/src/components/EmployeeForm.tsx`
- `client/src/components/HelpTextForm.tsx`
- `client/src/components/NoteTemplatesPage.tsx`
- `client/src/components/NotesSection.tsx`
- `client/src/components/ProjectForm.tsx`
- `client/src/components/TeamEditForm.tsx`
- `client/src/components/TourEditForm.tsx`
- `client/src/components/calendar/CalendarWeekAppointmentTagPicker.tsx`
- `client/src/components/ui/edit-form-context-text.tsx`
- `client/src/components/ui/entity-edit-dialog.tsx`
- `client/src/components/ui/entity-form-layout.tsx`
- `client/src/lib/edit-form-context.ts`
- `logs/2026-04-15_edit-form-kontextzeilen.md`

## Tests

Ausgeführt:

- `npm run typecheck`
- `npx eslint client/src/components/AppointmentForm.tsx client/src/components/CustomerData.tsx client/src/components/EmployeeAbsencesPanel.tsx client/src/components/EmployeeForm.tsx client/src/components/HelpTextForm.tsx client/src/components/NoteTemplatesPage.tsx client/src/components/NotesSection.tsx client/src/components/ProjectForm.tsx client/src/components/TeamEditForm.tsx client/src/components/TourEditForm.tsx client/src/components/calendar/CalendarWeekAppointmentTagPicker.tsx client/src/components/ui/entity-edit-dialog.tsx client/src/components/ui/entity-form-layout.tsx client/src/components/ui/edit-form-context-text.tsx client/src/lib/edit-form-context.ts`

Ergebnis:

- Beide Kommandos waren erfolgreich.

## Bekannte Einschränkungen

- Es wurde kein voller Audit und kein voller Testlauf ausgeführt.
- Die Änderung ist bewusst auf bestehende Edit-Oberflächen begrenzt und erweitert keine sonstigen Listen-, Badge- oder Read-Only-Ansichten.
