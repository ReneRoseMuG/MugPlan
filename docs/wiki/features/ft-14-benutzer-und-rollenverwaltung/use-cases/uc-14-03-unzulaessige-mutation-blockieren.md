# UC 14/03: Unzulässige Mutation blockieren

## Metadaten

- Feature: [FT (14): Benutzer- und Rollenverwaltung](../feature.md)
- Notion-Quelle: https://app.notion.com/p/9b2597a244b74023b822b2c94668ebc4
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

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
