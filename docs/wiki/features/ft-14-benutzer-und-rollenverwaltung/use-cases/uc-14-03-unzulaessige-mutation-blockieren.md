# UC 14/03: Unzulässige Mutation blockieren

## Metadaten

- Feature: [FT (14): Benutzer- und Rollenverwaltung](../ft-14-benutzer-und-rollenverwaltung.md)

## Akteur

Leser oder Disponent ohne ausreichende Rechte

## Ziel

Verhindern, dass ein Benutzer eine nicht erlaubte Mutation ausführt.

## Vorbedingungen

- Der Benutzer ist authentifiziert.
- Der Benutzer besitzt nicht die erforderliche Rolle.

## Ablauf

1. Der Akteur löst eine schreibende Aktion aus.
2. Das System prüft serverseitig die Rolle.
3. Das System erkennt fehlende Berechtigung.
4. Das System blockiert die Mutation.
5. Das System antwortet mit 403.

## Alternativen

- UI verhindert bereits die Anzeige der Aktion → Keine Mutation möglich.
- Manipulierter Request → Serverseitige Blockade greift.

## Ergebnis

Keine fachliche Änderung wird persistiert.
