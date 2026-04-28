# Auftragslog: Reader Reports- und Mitarbeiterzugriff

## Zweck

Für die Rolle `Reader` sollten die Ansichten `Reports` und `Mitarbeiter` in der Hauptnavigation sichtbar werden. Zusätzlich sollten `Reports` für `Reader` nicht nur sichtbar, sondern auch fachlich lesbar sein. `Journal` sollte dabei bewusst weiter verborgen bleiben.

## Scope

- Reader-Sichtbarkeit für `Reports` in der Hauptnavigation freigeben
- Reader-Sichtbarkeit für `Mitarbeiter` in der Hauptnavigation freigeben
- serverseitige Leserechte für Report-Endpunkte auf `Reader` erweitern
- bestehende `Journal`-Sperre für `Reader` ausdrücklich beibehalten
- gezielte Unit-, Integration- und Browser-Tests für die geänderte Rollenmatrix anpassen

## Technische Entscheidungen

- Die bisher gekoppelte Frontend-Logik für `Reports` und `Journal` wurde getrennt, damit `Reader` Reports sehen darf, ohne automatisch auch Journalzugriff zu bekommen.
- Die Reader-Sichtbarkeit für `Mitarbeiter` wurde nur auf Navigationsebene geöffnet; das bestehende Read-only-Verhalten im Mitarbeiterbereich blieb unverändert.
- Die serverseitige Report-Leseprüfung wurde minimal erweitert: `LESER` darf die vorhandenen Report-Leseendpunkte nutzen, ohne Schreib- oder Adminrechte zu erhalten.
- Contracts, Payloads und Report-Response-Strukturen blieben unverändert; geändert wurde nur die Rollenmatrix der Lesepfade.

## Betroffene Dateien

- `client/src/lib/auth.ts`
- `client/src/components/Sidebar.tsx`
- `client/src/pages/Home.tsx`
- `server/services/reportsService.ts`
- `tests/unit/ui/sidebar.behavior.test.tsx`
- `tests/e2e-browser/reader-navigation.browser.e2e.spec.ts`
- `tests/integration/server/reports.defaults.integration.test.ts`
- `tests/integration/server/reports.vorlaufliste.integration.test.ts`
- `tests/integration/server/reports.vorlaufliste.printPreview.integration.test.ts`
- `tests/integration/server/reports.produktionsplanung.integration.test.ts`
- `tests/integration/server/reports.auftragsliste.integration.test.ts`

## Hinweise zum Testen

Erfolgreich ausgeführt:

- `npm run test:unit -- tests/unit/ui/sidebar.behavior.test.tsx`
- `npm run test:integration -- --reporter=verbose tests/integration/server/reports.defaults.integration.test.ts`
- `npm run test:integration -- --reporter=verbose tests/integration/server/reports.vorlaufliste.integration.test.ts`
- `npm run test:integration -- --reporter=verbose tests/integration/server/reports.vorlaufliste.printPreview.integration.test.ts`
- `npm run test:integration -- --reporter=verbose tests/integration/server/reports.produktionsplanung.integration.test.ts`
- `npm run test:integration -- --reporter=verbose tests/integration/server/reports.auftragsliste.integration.test.ts`
- `npm run test:e2e:browser -- tests/e2e-browser/reader-navigation.browser.e2e.spec.ts`
- `npm run typecheck`

## Bekannte Einschränkungen

- Es wurde kein vollständiger Gesamt-Testlauf des gesamten Repositories ausgeführt, sondern eine gezielte Absicherung der betroffenen Reader-, Navigations- und Report-Pfade.
- `Journal` bleibt für `Reader` absichtlich verborgen; diese Änderung erweitert nur den Zugriff auf `Reports` und die Sichtbarkeit von `Mitarbeiter`.
