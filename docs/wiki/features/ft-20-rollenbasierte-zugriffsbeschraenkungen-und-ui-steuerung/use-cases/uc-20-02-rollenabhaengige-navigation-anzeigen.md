# UC 20/02: Rollenabhängige Navigation anzeigen

## Metadaten

- Feature: [FT (20): Rollenbasierte Zugriffsbeschränkungen und UI-Steuerung](../feature.md)
- Notion-Quelle: https://app.notion.com/p/f29fe0b8f4a443f982ef140a3983e737
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Admin, Disponent, Monteur

## Ziel

Die Navigation zeigt ausschließlich die für die Rolle des Akteurs vorgesehenen Bereiche.

## Vorbedingungen

- Der Akteur ist authentifiziert.
- Dem Akteur ist genau eine Rolle zugeordnet.

## Ablauf

1. Akteur öffnet die Anwendung.
2. Das System ermittelt serverseitig die Rolle des Akteurs.
3. Das System rendert die Navigation gemäß der Rollendefinition.
4. Nicht zulässige Navigationspunkte werden nicht angezeigt.
5. Bei Direktaufruf eines nicht zulässigen Bereichs prüft das System serverseitig die Berechtigung.
6. Das System blockiert mit 403 bei fehlender Berechtigung.

## Alternativen

- Der Akteur besitzt die höchste Rolle → Alle vorgesehenen Bereiche werden angezeigt.
- Der Akteur besitzt ausschließlich Leserechte → Nur lesende Bereiche werden angezeigt.

## Ergebnis

Die Navigation entspricht der funktionalen Rolle.

Unzulässige Bereiche sind weder sichtbar noch serverseitig zugänglich.
