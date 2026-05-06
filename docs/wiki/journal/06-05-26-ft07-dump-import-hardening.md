# 06.05.26 | Refactoring | FT-07: Dump- und Import-Hardening

## Zusammenfassung

Der FT-07 Dump-/Importpfad wurde gehärtet und fachlich nachdokumentiert. Dumps enthalten nun Benutzerkonten mit Auth-Feldern; Rollen bleiben seed-geführte Systemdaten und werden über `roleCode` gemappt.

## Art der Änderung

Mehrschichtiges Backend-Refactoring mit ergänzender Testabdeckung und Wiki-Dokumentation. Es wurden keine Datenbankmigrationen und keine UI-Änderungen eingeführt.

## Betroffene Features

- FT-07: Automatisierte Datensicherung und Fallback
- W-22: Echter DB-Dry-Run für Dump-Import als offener Folgepunkt

## Konkrete Änderungen

- `users` wurde in den Dump-Vertrag aufgenommen.
- `roles` bleibt außerhalb des Dumps; beim Import werden Benutzerrollen über `roleCode` auf lokale Seed-Rollen gemappt.
- Legacy-Dumps ohne `users` bleiben tolerant importierbar.
- Der veraltete Legacy-Servicepfad `importDump` wurde entfernt.
- Upload-Staging und Foreign-Key-Check-Cleanup wurden gehärtet.
- Retention umfasst jetzt auch manuelle Dump-Dateien und Dump-Transfer-Tagesverzeichnisse.
- Die erledigten Decisions W-17 und W-20 wurden aus dem Decision-Wiki entfernt.
- W-22 dokumentiert den späteren echten DB-Dry-Run gegen isolierte Zusatzdatenbanken.
- Die FT-07-Wiki-Seite und die Use Cases UC 07/07, UC 07/12 und UC 07/13 wurden aktualisiert; UC 07/14 für DB-Dump-Import wurde ergänzt.

## Rollen

Dump-Erzeugung, Download, Preview, Apply und Löschung bleiben ausschließlich Admin-Funktionen. Die Absicherung bleibt serverseitig. Es wurde keine Rollenbeschränkung erweitert oder gelockert.

## Tests / Verifikation

Erfolgreich ausgeführt:

- `npm run typecheck`
- `npm run test:integration -- --reporter=verbose tests/integration/server/admin.dump.integration.test.ts`
- `npm run test:unit -- tests/unit/services/dumpService.test.ts tests/unit/services/backupRetentionService.test.ts`

Die neuen Integrationstests prüfen echte DB-Pfade für Benutzer-Roundtrip, Rollenmapping per `roleCode`, Rollback bei unbekannter Rolle und blockierende Manifest-Mismatches.

## Offene Punkte

- Ein echter DB-Dry-Run ist noch nicht implementiert. Dafür werden isolierte Zusatzdatenbanken und eigene Safety-Guards benötigt.
- Der aktuelle Branch `refactor-dump-service` ist noch nicht committed.
