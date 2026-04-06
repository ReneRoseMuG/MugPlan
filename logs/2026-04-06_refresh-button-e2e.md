# Auftragslog: Refresh-Button E2E

## Zweck

Browserseitige Refresh-Regressionen für die Haupt-App und alle relevanten Standalone-Views absichern. Der Fokus lag auf dem Nachweis, dass neu angelegte Datensätze nach initialem Laden erst durch den jeweiligen Refresh-Button sichtbar werden.

## Scope

- Sidebar-Refresh in der Haupt-App absichern
- Standalone-Refresh für alle per "In Tab öffnen" erreichbaren Views absichern
- Pflichtdokumentation der neuen Tests in `docs/TEST_MATRIX.md` ergänzen
- Anschließend vollen Audit und vollen Testlauf seriell ausführen

## Technische Entscheidungen

- Der Sidebar-Refresh erhielt ausschließlich einen stabilen `data-testid`, damit die Schaltfläche ohne Verhaltensänderung testbar ist.
- Die neue Browser-Suite wurde seriell angelegt und nutzt `resetBrowserSuiteState()` einmalig in `beforeAll`.
- Für den eigentlichen Freshness-Nachweis werden die "externen" Datensätze nach dem initialen Laden per `page.request` erzeugt.
- Projekt-Refresh-Fälle legen zusätzlich einen Termin an, weil die Projektansicht neue Projekte ohne zugehörigen Termin nicht zuverlässig in der Board-Darstellung zeigt.
- Die Tests decken Listen-, Board- und Kalender-Views getrennt mit stabilen `data-testid`-Selektoren ab.

## Betroffene Dateien

- `client/src/components/Sidebar.tsx`
- `tests/e2e-browser/refresh-button.browser.e2e.spec.ts`
- `docs/TEST_MATRIX.md`

## Testen

Gezielter Gate-Run:

- `npx playwright test tests/e2e-browser/refresh-button.browser.e2e.spec.ts --reporter=line`

Ergebnis:

- 16/16 Tests bestanden

Voller Audit:

- `npm run check`
- `npm run lint`
- `npm run audit`
- `npm run secrets`

Ergebnis:

- alle vier Kommandos erfolgreich

Voller Testlauf:

- `npm run test:unit`
- `npm run test:integration -- --reporter=verbose`
- `npm run test:e2e`
- `npm run test:e2e:browser`

Ergebnis:

- alle vier Kommandos erfolgreich

## Bekannte Einschränkungen und Hinweise

- In mehreren Testläufen erscheint eine Sourcemap-Warnung zu `node-cron`; der Lauf bleibt erfolgreich.
- Im Browser-E2E-Lauf erscheint eine `Browserslist`-Hinweismeldung zu veralteten `caniuse-lite`-Daten; der Lauf bleibt erfolgreich.
- Die Warnungen wurden in diesem Auftrag nicht geändert, weil sie nicht Teil der eigentlichen Refresh-Implementierung waren.
