# Auftragslog: FT01/FT04 Testabdeckung

## Zweck

Verbleibende Nachweislücken aus der Prüfaufgabe zu FT01 Kalendertermine und FT04 Tourenplanung schließen, ohne Produktivcode zu ändern.

## Scope

- FT01: appointment-spezifischen Notiz-Lifecycle explizit absichern
- FT04: Wochenplan-Sperren für laufende/vergangene Wochen sowie idempotente Wiederholung ohne Duplikate explizit absichern
- Testmatrix passend aktualisieren

## Technische Entscheidungen

- Bestehende Integrationsdateien wurden erweitert, statt neue Testinfrastruktur aufzubauen.
- Die neuen Fälle arbeiten mit echten Testdaten und zusätzlichem Nebendatenrauschen, damit die Regeln nicht nur an Minimaldatensätzen hängen.
- Die FT04-Sperrregel wurde bewusst über die echte API und nicht nur über den vorhandenen Unit-Test nachgewiesen.

## Betroffene Dateien

- `tests/integration/server/appointment.notes.card-color-print.integration.test.ts`
- `tests/integration/server/tourWeekEmployees.integration.test.ts`
- `tests/e2e-browser/appointment-form.layout-tour-integration.browser.e2e.spec.ts`
- `docs/TEST_MATRIX.md`

## Testen

Bereits gezielt erfolgreich ausgeführt:

- `npm run test:integration -- --reporter=verbose tests/integration/server/appointment.notes.card-color-print.integration.test.ts`
- `npm run test:integration -- --reporter=verbose tests/integration/server/tourWeekEmployees.integration.test.ts`
- `npm run test:e2e:browser -- tests/e2e-browser/appointment-form.layout-tour-integration.browser.e2e.spec.ts`

Danach vom Nutzer zusätzlich angefordert:

- voller Audit
- voller Testlauf

## Bekannte Einschränkungen

- Dieses Paket schließt nur die konkret identifizierten FT01-/FT04-Restlücken.
- Weitere fachliche Features außerhalb FT01/FT04 wurden nicht erweitert.
