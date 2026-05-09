# UC 32/01: SSE-Verbindung aufbauen

## Metadaten

- Feature: [FT (32): Aktive Änderungsbenachrichtigung](../ft-32-aktive-aenderungsbenachrichtigung.md)

## Akteur

Angemeldeter Benutzer aller Rollen

## Ziel

Beim Laden der Anwendung eine persistente Server-Push-Verbindung aufbauen, über die der Client Änderungsereignisse empfangen kann.

## Vorbedingungen

- Der Benutzer ist angemeldet.

## Ablauf

1. Der Client baut nach erfolgreichem Login eine SSE-Verbindung zum Server auf.
2. Der Server registriert die Session als aktiven Empfänger.
3. Die Verbindung bleibt für die Dauer der Session offen.

## Alternativen

Keine.

## Ergebnis

Die Session ist als Empfänger registriert und empfängt ab sofort Änderungsereignisse anderer Benutzer.
