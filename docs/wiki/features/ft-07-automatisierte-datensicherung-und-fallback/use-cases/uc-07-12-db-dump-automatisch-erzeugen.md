# UC 07/12: DB-Dump automatisch erzeugen

## Metadaten

- Feature: [FT (07): Automatisierte Datensicherung und Fallback](../ft-07-automatisierte-datensicherung-und-fallback.md)

## Akteur

System

## Ziel

Täglich einen vollständigen, importierbaren System-Dump erzeugen.

## Vorbedingungen

- Backup-Scheduler ist aktiv.
- Zielpfad für Backups und Dumps ist konfiguriert.

## Ablauf

- System erzeugt ein ZIP-Archiv mit `data.json`, `manifest.json` und Anhängen.
- `data.json` enthält die Anwendungstabellen einschließlich `users`.
- Benutzer werden mit `roleCode` exportiert; lokale Rollen-IDs werden nicht übertragen.
- `manifest.json` enthält Tabellen-Counts, Tabellen-Hashes und Upload-Summen.
- System speichert den Dump serverseitig und protokolliert Fehler.

## Alternativen

- Dump-Erzeugung schlägt fehl → Fehler wird protokolliert, der normale Betrieb läuft weiter.

## Ergebnis

Ein vollständiges Dump-Archiv liegt für Download und späteren Import bereit.
