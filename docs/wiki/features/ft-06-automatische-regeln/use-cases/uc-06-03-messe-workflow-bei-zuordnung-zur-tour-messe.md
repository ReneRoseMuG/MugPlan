# UC 06/03: Messe-Workflow bei Zuordnung zur Tour Messe

## Metadaten

- Feature: [FT (06): Automatische Regeln](../ft-06-automatische-regeln.md)

## Akteur

Disponent, Administrator

## Ziel

Bei Zuordnung eines Termins zur Tour „Messe“ den Messe-Zustand und eine Messe-Notiz anbieten.

## Vorbedingungen

- Der Termin existiert.
- Der Termin ist noch nicht der Tour „Messe“ zugeordnet.
- Für den Termin existiert noch keine passende Messe-Notiz.

## Ablauf

1. Der Akteur ordnet den Termin der Tour „Messe“ zu.
2. Das System erkennt die Zuordnung zur Messe-Tour.
3. Das System setzt den Messe-Tag.
4. Das System bietet eine Messe-Notiz aus einer Systemvorlage an.
5. Wenn der Akteur den Vorschlag annimmt, öffnet das System die vorbereitete Notiz.
6. Der Akteur prüft und speichert die Notiz.

## Alternativen

- Der Akteur lehnt die Notiz ab: Der Messe-Tag bleibt gesetzt, es wird keine Notiz erstellt.
- Eine passende Messe-Notiz existiert bereits: Das System schlägt keine weitere Notiz vor.
- Der Akteur bricht die Notizerstellung ab: Es wird keine Notiz gespeichert.
- Der Termin wird von der Messe-Tour auf eine andere Tour verschoben: Das System entfernt den Messe-Tag automatisch.

## Ergebnis

Der Termin trägt den Messe-Tag und besitzt bei Annahme des Vorschlags eine passende Messe-Notiz. Wird der Termin aus der Messe-Tour entfernt, verschwindet der Messe-Tag.
