# UC 14/05: RollenabhÃ¤ngige UI-Reduktion

## Metadaten

- Feature: [FT (14): Benutzer- und Rollenverwaltung](../ft-14-benutzer-und-rollenverwaltung.md)
- Notion-Quelle: https://app.notion.com/p/9b2597a244b74023b822b2c94668ebc4
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Leser

## Ziel

Sicherstellen, dass ein Leser keine schreibenden UI-Elemente sieht.

## Vorbedingungen

- Der Benutzer ist authentifiziert.
- Der Benutzer besitzt die Rolle Leser.

## Ablauf

1. Der Akteur Ã¶ffnet eine fachliche Ansicht.
2. Das System rendert die UI rollenabhÃ¤ngig.
3. Das System blendet schreibende Elemente aus.
4. Der Akteur kann ausschlieÃŸlich lesende Aktionen durchfÃ¼hren.

## Alternativen

- Deep-Link auf Bearbeitungsroute â†’ Serverseitige PrÃ¼fung blockiert.

## Ergebnis

Die UI ist funktionsreduziert, ohne DatenmodellÃ¤nderung.

