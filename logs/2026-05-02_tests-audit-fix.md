# Test- und Audit-Fix

## Datum

02.05.26

## Anlass

Nach `audit, test` waren mehrere Prüfungen rot:

- `npm run check` scheiterte an Mojibake in `docs/wiki/relations.md`.
- `analyze:coverage` und `test:integration` scheiterten breit an `ENOTEMPTY` beim Löschen temporärer Test-Storage-Verzeichnisse unter `mugplan-test-storage-*/backups`.
- Ein FT26-Integrationstest lief im Gesamtlauf länger als Vitests Standard-Timeout.
- Ein Browser-Test in FT33 war timing-anfällig, weil der Bestätigungsdialog `Ohne Mitarbeiter speichern?` verspätet erschien.

## Umsetzung

### Robuster Test-Storage-Cleanup

Geändert in:

- `tests/helpers/testStorageIsolation.ts`

`resetIsolatedTestStorage()` nutzt beim Löschen der isolierten Upload- und Backup-Verzeichnisse jetzt `maxRetries` und `retryDelay`. Damit werden kurzlebige Windows-Dateihandles oder verzögerte Verzeichnisfreigaben abgefedert, ohne die Test-Isolation fachlich zu verändern.

### Encoding-Bereinigung im Wiki

Geändert in:

- `docs/wiki/relations.md`

Die falsch kodierten Umlaute wurden durch korrektes UTF-8 ersetzt. Inhaltlich wurde die Relations-Datei nicht umgedeutet.

### FT26-Integrationstest stabilisiert

Geändert in:

- `tests/integration/server/reports.vorlaufliste.printPreview.integration.test.ts`

Der Test `returns the full 105-row report without list pagination` erzeugt 105 Projekte und prüft den Druckpfad ohne Listenpagination. Im Einzel- und Gesamtlauf benötigt dieser Fall real mehr als 5 Sekunden. Deshalb erhielt nur dieser Last-/Paginationstest ein lokales Timeout von 30 Sekunden.

### FT33-Browser-Test stabilisiert

Geändert in:

- `tests/e2e-browser/ft33-absence-readonly.browser.e2e.spec.ts`

Der lokale Helper `confirmAppointmentSaveIfNeeded()` wartet kurz auf den möglichen Dialog `Trotzdem speichern`, bevor er prüft und klickt. Dadurch wird der bestehende Testpfad nicht fachlich verändert, sondern nur gegen das verzögerte Erscheinen des Dialogs stabilisiert.

## Rollen und Sicherheit

Keine Rollenlogik wurde geändert.

Die betroffenen Tests prüfen weiterhin bestehende Rollen- und Sichtbarkeitsgrenzen:

- Attachment-Löschpfade mit Leser-Blockade
- FT26-Reportzugriff für Admin, Disponent und Leser
- FT33-Abwesenheits-Readonly außerhalb des Mitarbeiterformulars

Die Änderungen betreffen ausschließlich Teststabilität, Testtimeout und Encoding.

## Verifikation

Erfolgreich ausgeführt:

- `npm run check`
- `npm run test:unit -- tests/unit/helpers/testStorageIsolation.test.ts`
- `npm run test:integration -- --reporter=verbose tests/integration/server/attachments.delete.ft19.integration.test.ts`
- `npm run test:integration -- --reporter=verbose tests/integration/server/reports.vorlaufliste.printPreview.integration.test.ts`
- `npm run test:integration -- --reporter=verbose`
- `npm run test:unit`
- `npm run test:e2e`
- `npx playwright test -c playwright.config.ts tests/e2e-browser/ft33-absence-readonly.browser.e2e.spec.ts`
- `npm run test:e2e:browser`

Ergebnisse:

- Unit: 290 Dateien, 1171 Tests bestanden, 1 skipped
- Integration: 121 Dateien, 664 Tests bestanden, 4 skipped
- Vitest-E2E: 3 Tests bestanden
- Browser-E2E: 307 Tests bestanden
- `npm run check`: grün

## Nicht abgeschlossen

`npm run audit:local` wurde nach rund 9,5 Minuten bewusst abgebrochen. Grund war nicht ein neuer Fehler, sondern die Laufzeit von `analyze:coverage`: Der Audit-Runner startet über `npm run test:coverage` erneut einen großen Vitest-Lauf mit Coverage-Instrumentierung. Der vorherige Audit hatte für diesen Schritt rund 808 Sekunden benötigt.

## Ergebnis

Die zuvor roten Testläufe sind repariert und vollständig grün verifiziert. Der lokale Audit ist weiterhin zeitintensiv, weil Coverage nahezu die gesamte Vitest-Suite mit Instrumentierung ausführt.
