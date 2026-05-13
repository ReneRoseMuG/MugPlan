# 14.05.26 | Testabdeckung | P02: Feature-Testabdeckung und UC-Lücken abgeschlossen

## Zusammenfassung

P-02 wurde als tests-only-Arbeitsstrang abgeschlossen. Die zugeordneten Aufgaben zu FT-01, FT-02, FT-04, FT-19, FT-26, FT-33 und FT-34 wurden geschlossen oder bewusst verworfen, ohne Produktionscode zu ändern. Die verbleibenden Blocker wurden fachlich eingeordnet: Kundenlöschung bleibt außerhalb des Produktumfangs, physische Dateilöschung bei Projektlöschung bleibt unverändert, und für die Auftragsliste wird kein eigener Print-Preview-Endpunkt ergänzt.

## Art der Änderung

- Testabdeckungsabschluss über Integrationstests, Unit-Tests und Browser-E2E.
- Wiki-Abschluss für P-02, die Masteraufgabe und die zugeordneten Einzelaufgaben.
- Kein Produktionscode, keine Migration und keine neue Abhängigkeit.

## Betroffene Features

- FT-01 Kalendertermine.
- FT-02 Projekte.
- FT-04 Tourenplanung.
- FT-19 Attachments.
- FT-26 Auswertungen und Reports.
- FT-33 Abwesenheiten.
- FT-34 Kalendermarker.
- Notion-Links wurden im Auftrag nicht belastbar angegeben; die lokale Wiki-Projektakte war maßgeblich.

## Konkrete Änderungen

- FT-02-Projekttests nutzen zentrale API-Harness-Pfade und prüfen Projekttags, Projektnotizen, Aktivierung/Reaktivierung sowie Scope-Mengenlogik.
- FT-19-Tests prüfen historische Termin-Attachment-Sperren, Download-Dispositionen, Projekt-Delete-Referenzen und Attachment-Duplikate.
- FT-26-Tests prüfen Preset-Wirkung auf echte Reportdaten, Tourenplan-Print-Preview inklusive Termine ohne Tour und entfernte Auftragslisten-Settings.
- FT-34 erhielt einen Unit-Test für nur teilweise regionale Feiertage; der leere Ursprungsauftrag mit sieben nicht rekonstruierbaren Punkten wurde verworfen.
- FT-01, FT-04 und FT-33 prüfen Rollen-Storno, Vier-KW-Matrix, Tour-KW-Dialogabbruch sowie Abwesenheitsanzeige, Typwechsel und Tour-KW-Abzug.
- P-02, die Masteraufgabe und die fünf Einzelaufgaben wurden in der Wiki-Aufgabenstruktur geschlossen; FT-34 wurde als verworfen geschlossen.

## Rollen

- `ADMIN` und `DISPATCHER` sind für zulässige Testpfade zu Storno, Tour-KW-Planung, Projekt-/Attachment-Mutationen und Reportzugriffen geprüft.
- `READER`/`LESER` wird bei mutierenden API-Pfaden serverseitig blockiert.
- Reine UI-Sichtbarkeit wurde nicht als Berechtigungsnachweis gewertet.

## Tests / Verifikation

- Safety Gate: `.env.test` vorhanden, `NODE_ENV=test`, `MUGPLAN_MODE=test`.
- `npm run test:integration -- tests/integration/server/appointments.cancellation.integration.test.ts tests/integration/server/attachmentQueries.ft24.integration.test.ts tests/integration/server/attachments.delete.ft19.integration.test.ts tests/integration/server/customers.attachments.ft19.integration.test.ts tests/integration/server/ft02.full-uc-coverage.integration.test.ts tests/integration/server/projects.delete.rules.test.ts tests/integration/server/projects.scope.mengenlogik.integration.test.ts tests/integration/server/reportConfigs.reportEffects.integration.test.ts tests/integration/server/tour-print-preview.integration.test.ts --reporter=verbose` erfolgreich mit 97 Tests in 9 Dateien.
- `npm run test:unit -- tests/unit/calendarMarkersService.test.ts tests/unit/settings/useSettings.auftragsliste.test.ts tests/unit/ui/tourManagement.versioning.test.tsx tests/unit/ui/tourWeekPlanningView.render.test.tsx --reporter=verbose` erfolgreich mit 21 Tests in 4 Dateien.
- `npm run test:e2e:browser -- tests/e2e-browser/ft04.tour-employee-cascade.browser.e2e.spec.ts tests/e2e-browser/ft33-absence-readonly.browser.e2e.spec.ts tests/e2e-browser/ft33-absence-week-planning.browser.e2e.spec.ts --project=chromium` erfolgreich mit 8 Tests.

## Offene Punkte

- Keine offenen P-02-Aufgaben.
- Der FT-34-Ursprungsauftrag bleibt verworfen, solange keine belastbare Quelle für die sieben Punkte vorliegt.
- Andere offene Wiki-Aufgaben außerhalb P-02 bleiben unverändert.
