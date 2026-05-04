# UC 14/06: Deep-Link serverseitig validieren

## Metadaten

- Feature: [FT (14): Benutzer- und Rollenverwaltung](../ft-14-benutzer-und-rollenverwaltung.md)
- Notion-Quelle: https://app.notion.com/p/9b2597a244b74023b822b2c94668ebc4
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Benutzer ohne ausreichende Rolle

## Ziel

Sicherstellen, dass direkte URL-Aufrufe keine unzulässigen Aktionen ermöglichen.

## Vorbedingungen

- Der Benutzer ist authentifiziert.
- Der Benutzer besitzt nicht die erforderliche Rolle.

## Ablauf

1. Der Akteur ruft eine geschützte Route direkt auf.
2. Das System prüft serverseitig die Rolle.
3. Das System verweigert Zugriff.
4. Das System antwortet mit 403.

## Alternativen

- Route existiert nicht → 404.
- Technischer Fehler → 500.

## Ergebnis

Keine unzulässige Aktion wird ausgeführt.

