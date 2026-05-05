# UC 02/13: Denormalisierte Projektanzeige aktualisieren (Quersicht-Vertrag)

## Metadaten

- Feature: [FT (02): Projekte](../ft-02-projekte.md)

## Akteur

Administrator, Disponent

## Ziel

Sicherstellen, dass Änderungen an Projektdaten in allen abhängigen Sichten ohne Inkonsistenz sichtbar werden.

## Vorbedingungen

- Projekt existiert.
- Projektdaten werden in mindestens einer abhängigen Sicht dargestellt (z. B. Terminansicht, Kalender, Tabelle).
- Der Akteur besitzt Änderungsrechte.

## Ablauf

1. Akteur ändert Projektdaten (z. B. Titel, Kunde, Tags oder Beschreibung).
2. System speichert die Änderung am Projekt.
3. System erkennt betroffene abhängige Sichten.
4. System invalidiert veraltete Projektrepräsentationen in diesen Sichten.
5. Abhängige Sichten laden die aktualisierten Projektdaten neu.

## Alternativen

- Keine abhängige Sicht geöffnet → Aktualisierung erfolgt beim nächsten Laden.
- Änderung wird verworfen oder schlägt fehl → Keine Sicht wird aktualisiert.

## Ergebnis

Alle abhängigen Sichten zeigen konsistente und aktuelle Projektdaten.

Es existieren keine veralteten oder widersprüchlichen Projektinformationen im System.
