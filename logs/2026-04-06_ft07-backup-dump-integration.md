# FT07 Backup-Dump-Integration

## Zweck

FT07 integriert den bestehenden ZIP-Dump in den automatischen und manuellen Backup-Lauf. Zusätzlich wurde die Admin-Backup-Oberfläche vereinfacht, sodass Dump-Erzeugung und Backup-Historie nicht mehr getrennt geführt werden.

## Scope

- ZIP-Dump als drittes Backup-Artefakt neben Excel und PDF im selben datierten Backup-Ordner erzeugen
- Backup-Download um `zip` erweitern
- Backup-Historie in der Admin-UI auf Datum, Status, Umfang und Excel/PDF/ZIP-Download verdichten
- Dump-Tab aus der sichtbaren Navigation entfernen
- Dump-Import im Backup-Bereich unten beibehalten
- `Backups aktiv` sofort beim Umschalten persistieren, ohne separaten Speichern-Button
- Tests für Scheduler-Lauf, manuellen Lauf und Download-Verhalten ergänzen

## Technische Entscheidungen

- Die bestehende `backup_log`-Struktur bleibt unverändert. Das JSON in `file_path` wurde nur um `zipPath` erweitert.
- Die ZIP-Erzeugung wurde nicht neu implementiert, sondern aus dem bisherigen Dump-Service als wiederverwendbare Funktion für den Backup-Lauf nutzbar gemacht.
- Ein Backup-Lauf gilt nur dann als erfolgreich, wenn Excel, PDF und ZIP gemeinsam erzeugt werden.
- Bestehende Dump-Import-Endpunkte bleiben erhalten, auch wenn die sichtbare Dump-Erzeugung aus der UI entfernt wurde.
- Die Backup-Tabelle wurde auf maximal 15 Zeilen mit eigenem Scrollbereich begrenzt, damit die Bedienleiste darunter sichtbar bleibt.

## Betroffene Dateien

- `server/services/dumpService.ts`
- `server/services/backupStorageService.ts`
- `server/services/backupScheduler.ts`
- `server/services/backupService.ts`
- `server/controllers/backupController.ts`
- `client/src/components/SettingsPage.tsx`
- `tests/integration/server/ft07.backup-and-caldav.integration.test.ts`
- `tests/unit/ui/settingsPage.behavior.test.tsx`
- `docs/TEST_MATRIX.md`

## Testen

Gezielt vor dem Volltest:

- `npm run typecheck`
- `npm run test:unit -- tests/unit/ui/settingsPage.behavior.test.tsx`
- `npm run test:integration -- --reporter=verbose tests/integration/server/ft07.backup-and-caldav.integration.test.ts`

Voller Audit:

- `npm run check`
- `npm run lint`
- `npm run audit`
- `npm run secrets`

Voller Testlauf:

- `npm run test:unit`
- `npm run test:integration -- --reporter=verbose`
- `npm run test:e2e`
- `npm run test:e2e:browser`

Hinweis:

- Der erste volle Integrationstest-Lauf endete am Shell-Timeout und wurde anschließend mit längerem Timeout erfolgreich wiederholt.

## Bekannte Einschränkungen

- In `SettingsPage.tsx` existiert weiterhin historischer Dump-UI-Code, der nach Entfernung des sichtbaren Dump-Tabs nicht mehr erreichbar ist. Funktional stört das den aktuellen Stand nicht, ist aber technischer Altbestand.
