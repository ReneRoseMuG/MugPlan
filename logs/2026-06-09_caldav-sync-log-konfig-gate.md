# CalDAV-Sync-Log an Konfiguration knüpfen

## Zweck

Der CalDAV-Dispatcher schrieb bei jeder Termin-Mutation eine Zeile in `calendar_sync_log` — auch dann, wenn CalDAV gar nicht konfiguriert ist. Da CalDAV produktiv nicht genutzt wird, entstand ausschließlich `skipped`-Rauschen ohne Nutzwert, das zudem in jeden Dump/jedes Backup wandert. Der Auftrag knüpft das Schreiben an eine vorhandene CalDAV-Konfiguration und bereinigt den Bestand in der Dev-DB.

## Vorgelagerte Analyse

- `calendar_sync_log` ist faktisch write-only: `listCalendarSyncLogs` wird nur im Integrationstest `ft07` aufgerufen, es gibt keine Route, keinen Controller und kein Frontend.
- Bestand in `mugplan_dev` vor der Änderung: 978 Zeilen, ~288 KB, Zeitraum 19.03.26–09.06.26.
- 100 % der Zeilen hatten Status `skipped` (975 `upsert`, 3 `delete`), Grund durchgängig „CalDAV nicht konfiguriert".
- 0 Termine mit gesetzter `external_event_id` → es gab in Dev nie einen erfolgreichen Sync.

## Scope

- Auftragsklasse 4 (kleiner lokaler Fix), kein neuer Branch, Arbeit auf `work`.
- Konfig-Gate zentral im Dispatcher ergänzen.
- Unit-Test für das Gate-Verhalten ergänzen.
- `skipped`-Zeilen in der Dev-DB entfernen.
- TEST_MATRIX pflegen.

## Technische Entscheidungen

- Das Gate sitzt zentral im Dispatcher (`dispatchCalDavUpsert` / `dispatchCalDavDelete`), nicht an den fünf Aufrufstellen. So profitieren alle Auslöser automatisch, ohne verteilte Logik.
- Neue, schmale `isCaldavConfigured()` in `caldavService` nutzt die bestehende private `loadConfig()`-Prüfung — keine Duplizierung der Konfig-Logik.
- Die inneren `skipped`-Pfade im Dispatcher bleiben unverändert als defensive Sicherung: Die Sync-Queue ist asynchron, das Gate prüft synchron beim Dispatch. Der innere Fallback fängt den theoretischen Fall, dass die Konfiguration zwischen Dispatch und Task-Ausführung wegfällt.
- Bewusst nicht gewählt: Gaten an jeder Aufrufstelle (verteilt, fehleranfällig) und ein reiner Retention/TTL-Job (bekämpft nur das Symptom Wachstum, nicht die Ursache).
- Die DB-Bereinigung lief über ein einmaliges Ad-hoc-Node-Skript (`mysql2`) im OS-Temp-Ordner mit Guard auf `SELECT DATABASE() = 'mugplan_dev'`; das Skript wurde nach Ausführung entfernt. Kein neuer Produktiv-/Repo-Code für die Bereinigung.

## Betroffene Dateien

- `server/services/caldavService.ts` (neue `isCaldavConfigured()`)
- `server/services/caldavSyncDispatcher.ts` (Import + frühes `return` in beiden Dispatch-Funktionen)
- `tests/unit/services/caldavSyncDispatcher.test.ts` (neu)
- `docs/TEST_MATRIX.md`

## Datenbankaktion (Dev)

- `DELETE FROM calendar_sync_log WHERE status = 'skipped'` gegen `mugplan_dev`.
- Ergebnis: 978 Zeilen gelöscht, Tabelle anschließend leer (0 Zeilen).
- Keine Schemaänderung, keine Migration.

## Testen

Durchgeführt:

- `npm run test:unit -- caldavSyncDispatcher` → 4 Tests grün
- `npm run check` (tsc + Encoding-Checks) → grün

Nicht durchgeführt (auf Wunsch übersprungen):

- Voller Audit (`npm run lint`, `npm run audit`, `npm run secrets`)
- Voller Testlauf (`npm run test:integration`, `npm run test:e2e`, `npm run test:e2e:browser`)

## Bekannte Einschränkungen

- Der `ft07`-Integrationstest wurde nicht erneut ausgeführt. Die Einschätzung „bleibt grün" beruht auf Code-Analyse: Der Test setzt seine CalDAV-Konfiguration selbst auf einen lokalen Mock-Server und erwartet `success`-Zeilen — das Gate greift dort also nicht.
- Nur die Dev-DB wurde bereinigt. Falls die Prod-DB ebenfalls `skipped`-Altbestand enthält, ist sie separat zu betrachten (nicht Teil dieses Auftrags).
- Die innere `upsert`-`skipped`-Meldung „CalDAV nicht konfiguriert oder Termin nicht vorhanden" bleibt wörtlich erhalten; der Konfig-Teil ist im Normalbetrieb nach dem Gate nicht mehr erreichbar. Bewusst minimal-invasiv belassen.
- Der zugehörige Commit `7bda4f56` enthält zusätzlich drei nicht zu diesem Auftrag gehörende Client-Dateien (`ProjectOrderForm.tsx`, `CalendarWeekAppointmentPanelHeader.tsx`, `CalendarWeekSpanningTile.tsx`), die auf ausdrückliche Anweisung mit aufgenommen wurden.
