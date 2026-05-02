# UC 02/13: Denormalisierte Projektanzeige aktualisieren (QuerÂ­sicht-Vertrag)

## Metadaten

- Feature: [FT (02): Projekte](../ft-02-projekte.md)
- Notion-Quelle: https://app.notion.com/p/30dda094354e80648c40dc62565d437e
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Administrator, Disponent

## Ziel

Sicherstellen, dass Ã„nderungen an Projektdaten in allen abhÃ¤ngigen Sichten ohne Inkonsistenz sichtbar werden.

## Vorbedingungen

- Projekt existiert.
- Projektdaten werden in mindestens einer abhÃ¤ngigen Sicht dargestellt (z. B. Terminansicht, Kalender, Tabelle).
- Der Akteur besitzt Ã„nderungsrechte.

## Ablauf

1. Akteur Ã¤ndert Projektdaten (z. B. Titel, Kunde, Tags oder Beschreibung).
2. System speichert die Ã„nderung am Projekt.
3. System erkennt betroffene abhÃ¤ngige Sichten.
4. System invalidiert veraltete ProjektreprÃ¤sentationen in diesen Sichten.
5. AbhÃ¤ngige Sichten laden die aktualisierten Projektdaten neu.

## Alternativen

- Keine abhÃ¤ngige Sicht geÃ¶ffnet â†’ Aktualisierung erfolgt beim nÃ¤chsten Laden.
- Ã„nderung wird verworfen oder schlÃ¤gt fehl â†’ Keine Sicht wird aktualisiert.

## Ergebnis

Alle abhÃ¤ngigen Sichten zeigen konsistente und aktuelle Projektdaten.

Es existieren keine veralteten oder widersprÃ¼chlichen Projektinformationen im System.

