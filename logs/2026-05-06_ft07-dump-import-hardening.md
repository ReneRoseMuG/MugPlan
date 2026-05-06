# FT-07 Dump- und Import-Hardening

## Datum

06.05.26

## Zweck

Der Admin-Dump- und Importpfad wurde gehärtet. Ziel war ein vollständigerer Systemtransfer einschließlich Benutzerkonten, robustere Import-Sicherungen, bessere Retention für Dump-Artefakte und belastbarere Tests mit echten Datenbankpfaden.

## Scope

- Mehrschichtige Änderung in Dump-Service, Dump-Controller, Retention-Service und Tests.
- Keine Datenbankmigration und keine Änderung am Persistenzschema.
- Keine UI-Änderung.
- Ergänzende Wiki-Dokumentation zu FT-07, Importverhalten und offenem DB-Dry-Run.

## Technische Entscheidungen

- `users` ist Teil des Dump-Vertrags.
- `roles` bleibt seed-geführte Systemtabelle und wird nicht roh übertragen.
- Benutzer werden im Dump mit stabilem `roleCode` exportiert; beim Import wird `roleCode` auf die lokale `roles.id` gemappt.
- Legacy-Dumps ohne `users` bleiben tolerant importierbar; lokale Benutzer werden in diesem Fall nicht gelöscht.
- Der ungemountete Legacy-Servicepfad `importDump` wurde entfernt.
- Upload-Staging nutzt eine `path.resolve`-basierte Boundary-Prüfung und räumt Stage-Verzeichnisse bei Fehlern auf.
- Foreign-Key-Checks werden beim Apply-Pfad gekapselt reaktiviert; bei Reaktivierungsfehlern wird die Verbindung nicht still in den Pool zurückgegeben.
- Manuelle Dump-Dateien und Transfer-Tagesverzeichnisse werden in den bestehenden Retention-Lauf einbezogen.
- Ein echter DB-Dry-Run wurde nicht umgesetzt, sondern als offene Decision W-22 dokumentiert.

## Betroffene Dateien

- `server/services/dumpService.ts`
- `server/controllers/dumpController.ts`
- `server/services/backupRetentionService.ts`
- `tests/integration/server/admin.dump.integration.test.ts`
- `tests/unit/services/dumpService.test.ts`
- `tests/unit/services/backupRetentionService.test.ts`
- `docs/wiki/decisions/README.md`
- `docs/wiki/decisions/w-22-ft07-db-dry-run-dump-import.md`
- `docs/wiki/features/ft-07-automatisierte-datensicherung-und-fallback/ft-07-automatisierte-datensicherung-und-fallback.md`
- `docs/wiki/features/ft-07-automatisierte-datensicherung-und-fallback/use-cases/`

## Rollen und Berechtigungen

Dump-Erzeugung, Download, Preview, Apply und Löschung bleiben ausschließlich für Administratoren zulässig. Die Durchsetzung bleibt serverseitig im Service- und Routenpfad. Es wurde keine bestehende Rollenbeschränkung gelockert.

Da Dumps jetzt Benutzerkonten mit Passwort-Hashes, 2FA-Feldern und Aktivstatus enthalten, sind Dump-Dateien sicherheitsrelevante Admin-Artefakte. `roles` wird bewusst nicht roh übertragen, damit lokale Seed-Rollen nicht durch fremde IDs gekoppelt oder überschrieben werden.

## Tests / Verifikation

Erfolgreich ausgeführt:

- `npm run typecheck`
- `npm run test:integration -- --reporter=verbose tests/integration/server/admin.dump.integration.test.ts`
- `npm run test:unit -- tests/unit/services/dumpService.test.ts tests/unit/services/backupRetentionService.test.ts`

Die Integrationstests decken nun zusätzlich ab:

- Benutzer-Roundtrip mit Passwort-Hash, 2FA-Feldern, Aktivstatus, Version und Rollenmapping per `roleCode`.
- Rollback bei Apply-Fehler durch unbekannten Benutzer-`roleCode`.
- Blockierende Manifest-Mismatches für Tabellen-Counts, Tabellen-Hashes und Upload-Summen.

## Bekannte Einschränkungen

- Die aktuelle Preview ist weiterhin eine Archiv-, Manifest- und Sicherheitsprüfung, aber kein echter SQL-Trockenlauf.
- Ein echter DB-Dry-Run braucht zusätzliche isolierte Datenbanken und ist als W-22 offen dokumentiert.
- Der Arbeitsstand ist auf dem Branch `refactor-dump-service` noch nicht committed.
