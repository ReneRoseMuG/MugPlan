# UC 02/14: Konsistenz bei parallelen Änderungen an Projekten (Optimistic Locking)

## Metadaten

- Feature: [FT (02): Projekte](../feature.md)
- Notion-Quelle: https://app.notion.com/p/30dda094354e80648c40dc62565d437e
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Administrator, Disponent

## Ziel

Sicherstellen, dass parallele Änderungen an einem Projekt keine inkonsistenten Zustände oder stillen Überschreibungen verursachen.

## Vorbedingungen

- Projekt existiert.
- Beide Akteure sind authentifiziert.
- Projekt wird von mindestens zwei Akteuren parallel geöffnet.
- Projekt besitzt ein Versionsmerkmal (`version`).
- Beide Akteure besitzen Änderungsrechte.

## Ablauf

1. Akteur A und Akteur B öffnen dasselbe Projekt.
2. Akteur A ändert Projektdaten und speichert.
3. System erhöht die Projektversion.
4. Akteur B ändert Projektdaten auf Basis der alten Version und speichert.
5. System erkennt die veraltete Versionsbasis.
6. System verweigert das Speichern mit HTTP 409 VERSION_CONFLICT.

## Alternativen

- Akteur nicht authentifiziert → HTTP 401.
- Akteur ohne Änderungsrechte → HTTP 403.
- Keine parallele Änderung → Speichern erfolgt regulär.
- Akteur B lädt das Projekt nach dem Konflikt neu → Aktuelle Version wird geladen und kann bearbeitet werden.

## Ergebnis

Es kommt zu keiner stillen Überschreibung von Projektdaten.

Das Projekt bleibt in einem konsistenten Zustand.

Abhängige Sichten zeigen ausschließlich den zuletzt erfolgreich gespeicherten Zustand.
