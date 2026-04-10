# Auftragslog: Legacy-Manifest-Toleranz im DB-Dump

## Zweck

Ein versionierter DB-Dump von einem älteren Serverstand konnte nicht importiert werden, obwohl das fachlich gewünscht war. Ursache war ein `manifest.json`, dem neue Tabellen wie `tourWeekEmployees` noch fehlten, weil der exportierende Serverstand diese Migrationen noch nicht hatte.

Ziel der Session war, die Importvorschau und den Import so anzupassen, dass fehlende neue Tabellen in versionierten Legacy-Dumps keinen harten Abbruch mehr auslösen, ohne die Integritätsprüfungen für tatsächlich widersprüchliche oder beschädigte Dumps aufzuweichen.

## Scope

- Legacy-Kompatibilität für fehlende bekannte Tabellen in `manifest.json`
- Warnungsbasierte statt blockierende Vorschau für diesen Fall
- Beibehaltung harter Blocker bei echten Manifest-/Daten-Widersprüchen
- gezielte Unit- und Integrationstest-Erweiterung für versionierte Legacy-Dumps

## Technische Entscheidungen

- `manifest.json` bleibt die primäre Prüfliste für Tabellen, die es tatsächlich enthält.
- Fehlen bekannte Tabellen im Manifest vollständig, werden sie als Legacy-Lücke interpretiert und nicht als sofortiger Validierungsfehler behandelt.
- Für solche fehlenden Tabellen wird der Sollzustand aus `data.json` abgeleitet; fehlt die Tabelle auch dort, wird sie kontrolliert als leer behandelt.
- Weiterhin blockierend bleiben:
  - ungültige Einträge für vorhandene Manifest-Tabellen
  - Count-/Hash-Widersprüche zwischen Manifest und `data.json`
  - beschädigte ZIPs oder ungültige JSON-Strukturen
  - bestehende Sicherheits- und Ziel-DB-Guards

## Betroffene Dateien

- `server/services/dumpService.ts`
  - Manifest-Parsing erweitert, damit fehlende bekannte Tabellen in versionierten Legacy-Dumps toleriert werden
  - Vorschauwarnungen für fehlende Legacy-Tabellen ergänzt
  - Tabellenabgleich so angepasst, dass nur tatsächlich vorhandene Manifest-Einträge strikt verifiziert werden
- `tests/unit/services/dumpService.test.ts`
  - neue Absicherung für Vorschau mit fehlender bekannter Tabelle im Manifest
- `tests/integration/server/admin.dump.integration.test.ts`
  - neuer echter End-to-End-Fall für versionierten Dump mit fehlendem `tourWeekEmployees`-Manifest-Eintrag

## Ergebnis in der App

- Ein versionierter Dump von einem älteren Serverstand, dessen `manifest.json` neue Tabellen noch nicht kennt, wird in der Vorschau nicht mehr mit `VALIDATION_ERROR` abgelehnt.
- Stattdessen erscheint eine Warning, dass die fehlende Tabelle tolerant behandelt wird.
- Der Import kann anschließend durchgeführt werden; die fehlenden neuen Tabellen werden dabei leer übernommen.
- Manipulierte oder beschädigte Dumps mit widersprüchlichen Manifest-Einträgen werden weiterhin blockiert.

## Testen

Erfolgreich ausgeführt:

- `npm run test:unit -- tests/unit/services/dumpService.test.ts`
- `npm run test:integration -- --reporter=verbose tests/integration/server/admin.dump.integration.test.ts`

## Bekannte Einschränkungen

- Die Änderung macht versionierte Legacy-Dumps kompatibler, ersetzt aber keine fachliche Migrationssynchronität zwischen Quell- und Zielsystem.
- Fehlt eine Tabelle im älteren Quelldump, wird sie auf dem Zielsystem bewusst leer übernommen. Das ist fachlich nur deshalb vertretbar, weil diese Tabelle auf dem Quellsystem noch nicht existierte.
