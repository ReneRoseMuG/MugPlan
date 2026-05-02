# UC 14/03: UnzulÃ¤ssige Mutation blockieren

## Metadaten

- Feature: [FT (14): Benutzer- und Rollenverwaltung](../ft-14-benutzer-und-rollenverwaltung.md)
- Notion-Quelle: https://app.notion.com/p/9b2597a244b74023b822b2c94668ebc4
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Leser oder Disponent ohne ausreichende Rechte

## Ziel

Verhindern, dass ein Benutzer eine nicht erlaubte Mutation ausfÃ¼hrt.

## Vorbedingungen

- Der Benutzer ist authentifiziert.
- Der Benutzer besitzt nicht die erforderliche Rolle.

## Ablauf

1. Der Akteur lÃ¶st eine schreibende Aktion aus.
2. Das System prÃ¼ft serverseitig die Rolle.
3. Das System erkennt fehlende Berechtigung.
4. Das System blockiert die Mutation.
5. Das System antwortet mit 403.

## Alternativen

- UI verhindert bereits die Anzeige der Aktion â†’ Keine Mutation mÃ¶glich.
- Manipulierter Request â†’ Serverseitige Blockade greift.

## Ergebnis

Keine fachliche Ã„nderung wird persistiert.

