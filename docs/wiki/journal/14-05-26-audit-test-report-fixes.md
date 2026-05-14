# 14.05.26 | Teststabilisierung | Audit/Test: Report-Fixes nach Audit

## Zusammenfassung

Nach einem Audit ohne Coverage und einem vollständigen Test-Report wurden die roten Testursachen aufsteigend nach Schadenspotential bearbeitet. Die Änderungen blieben auf bestehende Tests und Browser-E2E-Helfer begrenzt. Produktionscode, Datenbank-Schema, API-Contracts und Rollenlogik wurden nicht geändert.

## Art der Änderung

- Tests-only-Stabilisierung nach Audit- und Test-Report.
- Anpassung veralteter Erwartungen in Dokumentextraktions-Tests.
- Robustere Browser-E2E-Bedienung bestehender Bestätigungsdialoge.
- Keine Migration, keine neue Abhängigkeit und keine Produktionscode-Änderung.

## Betroffene Features

- Dokumentextraktion für Projekt- und Terminformulare.
- Terminnotizen im Terminformular.
- Termin-Save-Review bei Terminen ohne Mitarbeiter und bei Notizprüfung.
- Kalender-Drag-and-Drop in Monats- und Wochenansicht.
- Tour-KW-Blockierung im Dispatcher-Flow.
- Tourenplan-Report mit nachträglich aktivierten Drucknotizen.
- Notion-Links wurden im Auftrag nicht belastbar angegeben; Grundlage waren lokaler Audit, lokaler Testlauf und betroffene Testdateien.

## Konkrete Änderungen

- `tests/unit/validation/dtoValidators.test.ts` erwartet beim Projektformular-Fallback nun den Aufruf des Artikelnummer-Parsers statt dessen Ausbleiben.
- `tests/integration/server/documentExtraction.routes.test.ts` erwartet für die BSP-PLZ-Fixture die inzwischen erkannten zwei Artikel und weiterhin die PLZ-Formatwarnung.
- `tests/unit/ui/appointmentForm.noteEditor.behavior.test.tsx` prüft Draft-Terminnotizen nicht mehr über einen fragilen festen Hook-Index, sondern über den tatsächlich angelegten Test-State.
- `tests/helpers/browserE2e.ts` enthält mit `confirmAppointmentSaveReviewIfVisible` einen wiederverwendbaren Helfer für mehrstufige Termin-Save-Review-Dialoge.
- `tests/e2e-browser/appointment-multiday-edit.browser.e2e.spec.ts`, `tests/e2e-browser/reports.tourenplan.note-refresh.browser.e2e.spec.ts` und `tests/e2e-browser/dispatcher-form-data-and-actions.browser.e2e.spec.ts` bedienen bestehende Save-Review- und Blockierdialoge explizit.
- `tests/e2e-browser/calendar-drag-drop.validation-message.browser.e2e.spec.ts` und `tests/e2e-browser/calendar-week-drag-drop.drop-dispatch.browser.e2e.spec.ts` bestätigen den bestehenden Verschiebe-Dialog vor der PATCH-Erwartung.

## Rollen

- Keine Rollenlogik wurde geändert.
- Bestehende Browser-Pfade laufen weiterhin mit den vorhandenen Rollen `ADMIN` und `DISPATCHER`.
- Die Änderungen bedienen nur bereits vorhandene Dialoge in Tests; serverseitige Berechtigungen und UI-Sichtbarkeitsregeln bleiben unverändert.

## Tests / Verifikation

- Safety Gate: `.env.test` vorhanden, `NODE_ENV=test`, `MUGPLAN_MODE=test`.
- `npm run test:unit -- tests/unit/validation/dtoValidators.test.ts` erfolgreich mit 10 Tests.
- `npm run test:integration -- tests/integration/server/documentExtraction.routes.test.ts` erfolgreich mit 16 Tests.
- `npm run test:unit -- tests/unit/ui/appointmentForm.noteEditor.behavior.test.tsx` erfolgreich mit 6 Tests.
- `npm run test:e2e:browser -- tests/e2e-browser/appointment-multiday-edit.browser.e2e.spec.ts tests/e2e-browser/dispatcher-form-data-and-actions.browser.e2e.spec.ts tests/e2e-browser/reports.tourenplan.note-refresh.browser.e2e.spec.ts` erfolgreich mit 7 Tests.
- `npm run test:e2e:browser -- tests/e2e-browser/calendar-drag-drop.validation-message.browser.e2e.spec.ts tests/e2e-browser/calendar-week-drag-drop.drop-dispatch.browser.e2e.spec.ts` erfolgreich mit 2 Tests.

## Offene Punkte

- Nach den gezielten Fixes wurde noch kein vollständiger Audit und kein vollständiger Testlauf erneut ausgeführt.
- Der vorherige Audit ohne Coverage blieb gelb durch Architekturwarnungen und Knip-Findings, unter anderem Dependency-Cruiser-Warnungen, ungenutzte Exports, ungenutzte Typ-Exports und einen Duplicate Export.
- Diese Audit-Findings wurden in dieser Session nur eingeordnet, aber nicht bereinigt.
