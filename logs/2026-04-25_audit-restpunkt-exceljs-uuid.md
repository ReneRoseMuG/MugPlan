# Auftragslog: Audit-Restpunkt `exceljs` / `uuid`

## Zweck

Dokumentation des verbleibenden `npm audit`-Restpunkts auf diesem Branch nach Bereinigung der risikoarmen Audit-Funde.

## Ausgangslage

- `npm audit` meldet nach dem Update von `postcss` weiterhin genau einen moderaten Befund.
- Der Befund betrifft `uuid < 14.0.0` als transitive Abhängigkeit von `exceljs@4.4.0`.
- `npm audit` bietet dafür keinen kleinen direkten Fix an, sondern verweist auf einen erzwungenen Eingriff mit möglichem Breaking-Change-Risiko.

## Betroffene Einsatzstellen im Projekt

`exceljs` wird aktuell nur an zwei Stellen direkt verwendet:

- Produktivcode:
  `server/services/exportService.ts`
- Integrationstest:
  `tests/integration/server/ft07.backup-and-caldav.integration.test.ts`

Der Produktivpfad erzeugt XLSX-Exporte. Der Integrationstest liest eine erzeugte XLSX-Datei wieder ein und prüft deren Inhalt.

## Bewertung

- Das verbleibende Problem ist ein Third-Party-Auditfund, kein lokaler Fach- oder Rollenfehler im eigenen Code.
- Ein automatischer Fix würde laut `npm audit` nicht einfach `uuid` anheben, sondern auf einen anderen `exceljs`-Stand wechseln.
- Da `exceljs` direkt für Exportdateien verwendet wird, wäre ein ungezielter Versionssprung ohne separate Export-Validierung fachlich riskant.

## Bewusste Entscheidung auf diesem Branch

- `nanoid` als direkte Dependency wurde eingetragen.
- `powershell` wurde in `knip` als ignoriertes Binary hinterlegt.
- `postcss` wurde auf einen sicheren Stand aktualisiert.
- Der verbleibende `exceljs`-/`uuid`-Befund wird auf diesem Branch bewusst nicht per `--force` oder blindem Downgrade/Umbau behoben.

## Gründe gegen einen Sofort-Fix

- Exportlogik ist produktiv relevant.
- XLSX-Struktur, Dateiinhalte und Testeinlese-Verhalten dürfen nicht still verändert werden.
- Der von `npm audit` vorgeschlagene Pfad ist kein klarer, risikoarmer Patch-Update-Pfad.

## Empfohlener Folgeauftrag

Vor einer Änderung an `exceljs` sollten mindestens diese Punkte separat geprüft werden:

- Welche `exceljs`-Version den `uuid`-Befund tatsächlich sauber auflöst
- Ob sich API, Workbook-Verhalten oder Dateiformat im Exportpfad ändern
- Ob die bestehenden Export- und FT07-Tests den Wechsel ausreichend absichern
- Ob zusätzlich gezielte Exportvergleichstests nötig sind

## Stand nach dieser Runde

- `npm run analyze:knip`: unlisted dependency und unlisted binary bereinigt
- `npm audit`: `postcss`-Fund bereinigt
- verbleibender Audit-Restpunkt:
  - `uuid` über `exceljs`
