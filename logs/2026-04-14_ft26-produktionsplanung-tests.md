# Auftragslog FT26 Produktionsplanung Tests

## Zweck

Zwei offene Integrationstestlücken für den Produktionsplanungs-Report (FT26) schließen:
- Shortcode-Kollisionen dürfen nicht kategorieübergreifend zusammengeführt werden.
- Volumetrische Mengenakkumulation über 10 Projekte mit identischem Shortcode muss stabil summiert werden.

## Scope

- Bestehende Datei `tests/integration/server/reports.produktionsplanung.integration.test.ts` erweitert
- `docs/TEST_MATRIX.md` im Sinne der Testdokumentationspflicht aktualisiert
- Keine Änderungen am Produktionscode
- Keine neuen Testdateien

## Technische Entscheidungen

- Beide Lücken als echte Integrationstests in der bestehenden `describe`-Gruppe `FT26 integration: report produktionsplanung` ergänzt
- Vorhandene Fixture-Helfer aus `tests/helpers/testDataFactory.ts` weiterverwendet, um Setup konsistent zu halten
- Je neuer Test ein eigener `@Test Scope`-Kommentarblock direkt am `it`-Block
- Datumsbereiche bewusst getrennt von bestehenden FT26-Fällen gewählt (`2097-05` und `2097-06`), um Seiteneffekte zwischen Fixtures klein zu halten

## Betroffene Dateien

- `tests/integration/server/reports.produktionsplanung.integration.test.ts`
- `docs/TEST_MATRIX.md`

## Teststand

Ausgeführt:
- `npm run test:integration -- tests/integration/server/reports.produktionsplanung.integration.test.ts --reporter=verbose` → erfolgreich, alle 8 Tests grün
- `npm run check` → fehlgeschlagen, nicht wegen FT26, sondern wegen bestehender Treffer im repo-weiten `lint:encoding`
- `npm run lint` → erfolgreich
- `npm run test:unit` → fehlgeschlagen durch bereits bestehende Unit-Test-Probleme außerhalb dieses Auftrags

Nicht vollständig ausgeführt:
- Vollständiger `npm run test:integration -- --reporter=verbose` wurde begonnen, aber auf Wunsch vor Abschluss nicht mehr ausgewertet

## Bekannte Einschränkungen

- Das Gate `npm run check` ist weiterhin durch den bereits bekannten Encoding-Lint-Bestand blockiert
- Der aktuelle Unit-Testlauf ist nicht vollständig grün; die sichtbaren Fehlschläge lagen in bestehenden Tests außerhalb der geänderten FT26-Datei
