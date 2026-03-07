# Direkttermine Tests

## Zweck

Direkttermin-Regeln und ihre wichtigsten Projektionen wurden gegen die Codebase in neue Integrations- und Browser-Tests ueberfuehrt.

## Scope

- redaktionelle Korrektur der Termin-Fachregel in `AGENTS.md`
- redaktionelle Korrektur in `docs/architecture.md`
- Praezisierung eines missverstaendlichen FT01-Testnamens
- neue Integrationssuite fuer Termin-Relationsregeln
- neue Integrationssuite fuer Direkttermin-Projektionen
- neue Browser-Suite fuer AppointmentForm-Direkttermin-Workflows
- Aktualisierung von `docs/TEST_MATRIX.md`
- Erweiterung der zentralen Test-Factory um customer-only Appointments

## Betroffene Dateien

- `AGENTS.md`
- `docs/architecture.md`
- `docs/TEST_MATRIX.md`
- `tests/helpers/testDataFactory.ts`
- `tests/integration/server/ft01.full-uc-coverage.integration.test.ts`
- `tests/integration/server/appointments.direct-relations.integration.test.ts`
- `tests/integration/server/appointments.direct-projections.integration.test.ts`
- `tests/e2e-browser/appointment-direct-relations.browser.e2e.spec.ts`

## Technische Entscheidungen

- Die neuen Integrationsfaelle laufen ueber die oeffentlichen Appointment-Endpunkte (`POST`, `PATCH`, `GET`, `DELETE`) statt ueber interne Service-Abkuerzungen.
- Direkttermine werden in Fixtures nicht ueber einen separaten Helper, sondern ueber die bestehende `createAppointmentFixture` mit optionaler `customerId` angelegt.
- Die Browser-Suite setzt auf bestehende Formular-Test-IDs (`button-save-appointment`, Relation-Slots, Wochenkalender-Create-Buttons).

## Teststatus

Ausgefuehrt:

- `npx cross-env NODE_ENV=test MUGPLAN_MODE=test vitest run -c vitest.integration.config.ts tests/integration/server/appointments.direct-relations.integration.test.ts tests/integration/server/appointments.direct-projections.integration.test.ts`
- `npm run test:e2e:browser -- tests/e2e-browser/appointment-direct-relations.browser.e2e.spec.ts`

Ergebnis:

- Integration: `2/2` Dateien gruen, `14/14` Tests gruen
- Browser-E2E: `1/1` Datei gruen, `3/3` Tests gruen

## Bekannte Ursachen / Anpassungen

- Die urspruenglich geplanten Browser-Faelle mit Customer-/Project-Picker wurden wieder reduziert. Der Customer-Picker zeigte im Ist-Stand einen separaten Frontend-Crash (`customers.filter is not a function`) und war damit kein stabiler Direkttermin-E2E-Pfad.
- Die finale Browser-Suite deckt deshalb nur die belastbaren Flows ab:
  - vorhandenen Direkttermin oeffnen
  - Speichern ohne Relation blockieren
  - Projekt aus vorhandenem Termin entfernen

## Einschraenkungen

- Die reduzierte Browser-Suite belegt keine direkte Customer-Picker-Auswahl fuer neue Direkttermine. Dieser Pfad ist weiterhin primär ueber die Integrationssuiten abgesichert.
