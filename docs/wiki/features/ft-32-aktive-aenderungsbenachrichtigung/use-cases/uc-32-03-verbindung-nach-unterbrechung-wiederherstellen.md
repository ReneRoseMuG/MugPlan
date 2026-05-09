# UC 32/03: Verbindung nach Unterbrechung wiederherstellen

## Metadaten

- Feature: [FT (32): Aktive Änderungsbenachrichtigung](../ft-32-aktive-aenderungsbenachrichtigung.md)

## Akteur

Angemeldeter Benutzer aller Rollen

## Ziel

Nach einem Verbindungsabbruch sicherstellen, dass keine Änderungsereignisse verloren gehen.

## Vorbedingungen

- Die SSE-Verbindung wurde unterbrochen.
- Der Benutzer ist noch angemeldet.

## Ablauf

1. Der Client erkennt den Verbindungsabbruch.
2. Der Client baut die SSE-Verbindung automatisch neu auf.
3. Der Client übermittelt dabei die ID des zuletzt empfangenen Ereignisses.
4. Der Server liefert alle `change_log`-Einträge nach, die seit diesem Zeitpunkt entstanden sind.
5. Der normale Ereignisstrom wird fortgesetzt.

## Alternativen

Keine.

## Ergebnis

Der Client ist nach dem Reconnect auf dem aktuellen Stand. Keine Änderungen wurden während der Unterbrechung lautlos übergangen.
