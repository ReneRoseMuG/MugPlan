# Reklamationsworkflow in Create-Formularen

Datum: 04.05.26
Branch: `feature/tour-kw-week-card-actions`
Commit: noch nicht erstellt

## Zweck

Dieses Log dokumentiert die Erweiterung des Reklamationsworkflows im Projekt- und Terminformular. Die Reklamationsfunktion war bislang nur in bestehenden Datensätzen im Edit-Modus erreichbar. Ziel war, `Reklamation melden` bereits beim Anlegen eines Projekts oder Termins anzubieten, damit der geschützte Reklamationszustand und die optionale Reklamationsnotiz schon vor dem ersten Speichern vorbereitet werden können.

## Scope

- Das Projekt-Create-Formular zeigt im Funktionen-Panel die explizite Aktion `Reklamation melden`.
- Das Termin-Create-Formular zeigt im Funktionen-Panel die explizite Aktion `Reklamation melden`.
- Der Create-Modus speichert Reklamation nicht über den generischen Tag-Endpunkt, sondern nach erfolgreichem Create über die bestehenden dedizierten Reklamationsrouten.
- Der optionale Reklamationsnotiz-Vorschlag funktioniert im Create-Modus als Draft und wird beim finalen Save persistiert.
- Edit-Verhalten, Storno, Parken, normale Tags, Anhänge, Notizen und Artikellisten bleiben unverändert.

## Rollen und Sperren

- `ADMIN` und `DISPONENT` dürfen die Reklamationsaktion sehen und ausführen.
- `READER` sieht die Aktion nicht und darf keine Reklamationsmutation ausführen.
- Die UI-Sichtbarkeit ist nur ergänzend. Die technische Durchsetzung bleibt serverseitig in den bestehenden Reklamationsrouten.
- Für Termine gelten weiterhin Relationspflicht, historische Sperre mit Admin-Ausnahme, Storno-Sperre, Abwesenheitsprüfung, Tour-KW-Sperre und Versionsschutz.

## Technische Entscheidungen

- Für Create wird ein lokaler Draft-Tag mit dem Namen `Reklamation` angezeigt, auch wenn der geschützte System-Tag nicht im normalen Tag-Katalog geladen ist.
- Beim Persistieren werden Reklamations-Draft-Tags bewusst aus dem generischen Tag-Persistenzloop herausgefiltert.
- Nach Projekt- oder Termin-Create wird der jeweilige dedizierte Reklamations-Endpunkt mit der frisch erzeugten Version aufgerufen.
- Das Terminformular nutzt für den Create-Notizvorschlag denselben `NotesSection`-Draft-Prefill-Mechanismus, den das Projektformular bereits verwendet.

## Betroffene Dateien

- `client/src/components/ProjectForm.tsx`
- `client/src/components/AppointmentForm.tsx`
- `tests/unit/ui/projectForm.layoutShellIntegration.test.tsx`
- `tests/unit/ui/appointmentForm.layoutTourIntegration.test.tsx`
- `tests/e2e-browser/project-form.create-sidebar-persistence.browser.e2e.spec.ts`
- `tests/e2e-browser/appointment-form.create-sidebar-persistence.browser.e2e.spec.ts`

## Hinweise zum Testen

Gezielt grün gelaufen sind:

- `npm run test:unit -- tests/unit/ui/projectForm.layoutShellIntegration.test.tsx tests/unit/ui/appointmentForm.layoutTourIntegration.test.tsx`
- `npm run test:e2e:browser -- tests/e2e-browser/project-form.create-sidebar-persistence.browser.e2e.spec.ts`
- `npm run test:e2e:browser -- tests/e2e-browser/appointment-form.create-sidebar-persistence.browser.e2e.spec.ts`
- `npm run typecheck`

## Bekannte Einschränkungen

- Es wurden keine Schema-, Contract- oder Migrationsänderungen vorgenommen.
- Ein vollständiger Browser-Gesamtlauf über alle E2E-Dateien wurde nicht ausgeführt.
