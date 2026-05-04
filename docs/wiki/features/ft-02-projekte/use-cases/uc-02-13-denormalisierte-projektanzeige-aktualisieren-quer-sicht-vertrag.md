# UC 02/13: Denormalisierte Projektanzeige aktualisieren (Quersicht-Vertrag)

## Metadaten

- Feature: [FT (02): Projekte](../ft-02-projekte.md)
- Notion-Quelle: https://app.notion.com/p/30dda094354e80648c40dc62565d437e
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Administrator, Disponent

## Ziel

Sicherstellen, dass Ã„nderungen an Projektdaten in allen abhängigen Sichten ohne Inkonsistenz sichtbar werden.

## Vorbedingungen

- Projekt existiert.
- Projektdaten werden in mindestens einer abhängigen Sicht dargestellt (z. B. Terminansicht, Kalender, Tabelle).
- Der Akteur besitzt Ã„nderungsrechte.

## Ablauf

1. Akteur ändert Projektdaten (z. B. Titel, Kunde, Tags oder Beschreibung).
2. System speichert die Ã„nderung am Projekt.
3. System erkennt betroffene abhängige Sichten.
4. System invalidiert veraltete Projektrepräsentationen in diesen Sichten.
5. Abhängige Sichten laden die aktualisierten Projektdaten neu.

## Alternativen

- Keine abhängige Sicht geöffnet → Aktualisierung erfolgt beim nächsten Laden.
- Ã„nderung wird verworfen oder schlägt fehl → Keine Sicht wird aktualisiert.

## Ergebnis

Alle abhängigen Sichten zeigen konsistente und aktuelle Projektdaten.

Es existieren keine veralteten oder widersprüchlichen Projektinformationen im System.

