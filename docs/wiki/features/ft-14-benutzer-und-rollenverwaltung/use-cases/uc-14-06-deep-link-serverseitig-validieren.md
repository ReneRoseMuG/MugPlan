# UC 14/06: Deep-Link serverseitig validieren

## Metadaten

- Feature: [FT (14): Benutzer- und Rollenverwaltung](../ft-14-benutzer-und-rollenverwaltung.md)
- Notion-Quelle: https://app.notion.com/p/9b2597a244b74023b822b2c94668ebc4
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Benutzer ohne ausreichende Rolle

## Ziel

Sicherstellen, dass direkte URL-Aufrufe keine unzulÃ¤ssigen Aktionen ermÃ¶glichen.

## Vorbedingungen

- Der Benutzer ist authentifiziert.
- Der Benutzer besitzt nicht die erforderliche Rolle.

## Ablauf

1. Der Akteur ruft eine geschÃ¼tzte Route direkt auf.
2. Das System prÃ¼ft serverseitig die Rolle.
3. Das System verweigert Zugriff.
4. Das System antwortet mit 403.

## Alternativen

- Route existiert nicht â†’ 404.
- Technischer Fehler â†’ 500.

## Ergebnis

Keine unzulÃ¤ssige Aktion wird ausgefÃ¼hrt.

