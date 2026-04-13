## Zweck

Automatische Terminregel fuer die Messe-Tour ergaenzt und korrigiert:
- Wechsel eines bestehenden Termins auf die Messe-Tour setzt automatisch das Tag `Messe Aufbau/Abbau`.
- Wechsel weg von der Messe-Tour entfernt das Tag wieder.
- Neuer Termin direkt auf der Messe-Tour setzt das Tag ebenfalls automatisch.

## Scope

Betroffene Bereiche:
- serverseitige Termin-Create-/Update-Logik
- Formular-Invalidierung fuer Termin-Tags nach Save
- gezielte FT06-Tests fuer Unit, Integration und Browser

Bewusst nicht geaendert:
- keine neue UI
- keine Architektur-, Routing- oder Konfigurationsaenderungen
- keine neuen Abhaengigkeiten

## Technische Entscheidungen

- Die Regel wurde zentral in `server/services/appointmentsService.ts` umgesetzt, damit sie fuer Create und Edit serverseitig gleich greift.
- Die Messe-Tour-Erkennung akzeptiert den real verwendeten Namen `Messe` sowie den zuvor angenommenen Namen `Tour Messe`.
- Im Frontend wurde nach normalem Termin-Speichern zusaetzlich die Termin-Tag-Query invalidiert, damit die sichtbare Tag-Liste nach Tour-Wechseln nicht stale bleibt.

## Betroffene Dateien

- `server/services/appointmentsService.ts`
- `client/src/components/AppointmentForm.tsx`
- `tests/unit/services/appointments.park.test.ts`
- `tests/integration/server/appointments.park.integration.test.ts`
- `tests/e2e-browser/appointment-form.layout-tour-integration.browser.e2e.spec.ts`
- `tests/e2e-browser/appointment-form.create-sidebar-persistence.browser.e2e.spec.ts`
- `docs/TEST_MATRIX.md`

## Testen

Gezielt ausgefuehrt:
- `npm run test:unit -- tests/unit/services/appointments.park.test.ts`
- `npx cross-env NODE_ENV=test MUGPLAN_MODE=test vitest run --config vitest.workspace.ts --project integration tests/integration/server/appointments.park.integration.test.ts --reporter=verbose`
- `npx cross-env NODE_ENV=test MUGPLAN_MODE=test playwright test tests/e2e-browser/appointment-form.layout-tour-integration.browser.e2e.spec.ts -c playwright.config.ts --grep "Messe"`
- `npx cross-env NODE_ENV=test MUGPLAN_MODE=test playwright test tests/e2e-browser/appointment-form.create-sidebar-persistence.browser.e2e.spec.ts -c playwright.config.ts --grep "Messe"`

## Bekannte Einschraenkungen

- Es wurde kein voller Audit und kein voller Testlauf ueber alle Pflichtkommandos ausgefuehrt.
- Die Browser-Absicherung wurde gezielt auf die betroffenen Messe-Faelle begrenzt.
