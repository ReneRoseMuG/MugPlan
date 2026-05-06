# W-22 - FT-07 echter DB-Dry-Run für Dump-Import

## Metadaten

- Status: offen
- Priorität: Hoch
- Feature: FT-07 Automatisierte Datensicherung und Fallback
- Entdeckt: 06.05.26
- Art: Architektur-Refaktoring

## Befund

Der aktuelle Import-Preview-Pfad prüft das Dump-Archiv vor dem eigentlichen Import auf ZIP-Lesbarkeit, `data.json`, optionales `manifest.json`, Tabellen-Hashes, Tabellen-Counts, Upload-Summen, Legacy-Warnungen und blockierende Produktionsregeln. Das ist eine wichtige Vorprüfung, aber kein echter Datenbank-Trockenlauf.

SQL-seitige Importierbarkeit wird erst im destruktiven Apply-Pfad sichtbar. Dazu gehören insbesondere Foreign-Key-Konflikte, fehlende Seed-Rollen, ungültige `roleCode`-Zuordnungen, Schema-Mismatches, Insert-Probleme durch Datenformate oder Constraints sowie Wechselwirkungen zwischen Tabellenreihenfolge und Zielbestand.

## Optionen

- A) Preview bleibt Archiv- und Manifestprüfung; Apply bleibt der erste echte DB-Import.
- B) Einen echten DB-Dry-Run gegen eine vollständig isolierte Zusatzdatenbank einführen.
- C) Dry-Run nur in Tests oder Skripten anbieten, aber nicht als produktiven Admin-Pfad.

## Betroffene Bereiche bei Umsetzung

Ein späterer Eingriff betrifft voraussichtlich:

- `server/services/dumpService.ts`
- `server/config/runtimeEnv.ts`
- `server/security/dbSafetyGuards.ts`
- `server/config/storagePaths.ts`
- `server/controllers/dumpController.ts`
- `server/routes/backupRoutes.ts`
- `.env.test` beziehungsweise dokumentierte Dry-Run-Env-Variablen
- Integrationstests für Dry-Run, Apply-Sperre und Sicherheitsguards

Für die Dry-Run-Datenbank braucht es eine eigene harte Allowlist. Die Datenbank darf weder identisch mit der normalen Test-, Dev- oder Produktionsdatenbank sein noch über Env-Fallbacks erreichbar werden.

## Rollen- und Sicherheitsbezug

Der Dry-Run gehört zum Dump-/Import-Betrieb und ist ausschließlich für `ADMIN` zulässig. Die Durchsetzung muss serverseitig erfolgen. Eine UI-Sichtbarkeit oder ein zusätzlicher Button darf keine Berechtigung ersetzen.

Da der Dry-Run reale Dumps mit sensiblen Auth-Daten, Passwort-Hashes, 2FA-Feldern und Upload-Referenzen verarbeitet, muss auch der Dry-Run-Pfad dieselben Dateigrößenlimits, Bestätigungslogik, Ziel-DB-Guards, Logging-Grenzen und Secret-Regeln beachten wie der finale Import.

## Auswirkungen eines Eingriffs

Ein echter DB-Dry-Run würde die Importvorschau fachlich deutlich belastbarer machen. Der Admin könnte vor dem destruktiven Zielimport erkennen, ob der Dump in eine echte DB importierbar ist, ob Rollen sauber gemappt werden und ob Verifikation nach dem Import erfolgreich wäre.

Der Dry-Run darf keine echten Upload-Dateien im produktiven oder normalen Test-Upload-Root verändern. Dafür ist ein isolierter Dry-Run-Upload-Root oder eine reine Stage-Verifikation nötig.

## Risiken und Schadenspotential

Hoch. Ein falsch abgesicherter Dry-Run könnte selbst destruktiv werden, die falsche Datenbank leeren, Upload-Dateien überschreiben oder sensible Dump-Inhalte in ungeeigneten Artefakten hinterlassen. Das Risiko ist nur vertretbar, wenn DB-Ziel, Upload-Ziel und Cleanup strikt isoliert und guardiert sind.

## Vorgeschlagene Maßnahme

Variante B vorbereiten, sobald die zusätzlichen Dry-Run-Datenbanken bereitgestellt sind. Danach zuerst die Konfiguration und Safety-Guards planen: eigene DB-Allowlist, eigene Host-Allowlist, eindeutige Zielprüfung, kein Fallback, harte Prüfung gegen normale Test-/Dev-/Produktionsdatenbanken.

Der eigentliche Dry-Run sollte denselben Importkern wie `applyDumpImport` verwenden, aber gegen die isolierte Dry-Run-DB und einen isolierten Upload-Pfad laufen. Nach erfolgreichem Import werden Tabellen- und Upload-Verifikation ausgeführt; anschließend wird die Dry-Run-Umgebung kontrolliert zurückgesetzt oder neu aufgebaut.

## Quelle

- Analyse vom 06.05.26 im Kontext `refactor-dump-service`
