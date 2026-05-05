# UC 18/04: Versionskonflikt bei paralleler Änderung persönlicher Einstellungen

## Metadaten

- Feature: [FT (18): User Preferences](../ft-18-user-preferences.md)

## Akteur

Disponent, Leser, Admin

## Ziel

Sicherstellen, dass parallele Änderungen persönlicher Einstellungen desselben Akteurs nicht zu stillen Überschreibungen führen.

## Vorbedingungen

- Der Akteur ist authentifiziert.
- Für den Akteur existieren gespeicherte persönliche Einstellungen.
- Die Einstellungen besitzen eine gültige Versionskennung.

## Ablauf

1. Der Akteur öffnet in Browser A den Bereich für persönliche Einstellungen.
2. Das System übermittelt die aktuelle Versionskennung der Einstellungen.
3. Der Akteur öffnet in Browser B ebenfalls den Bereich für persönliche Einstellungen.
4. Browser A speichert eine Änderung der Einstellungen.
5. Das System erhöht die Versionskennung nach erfolgreicher Speicherung.
6. Browser B speichert eine Änderung auf Basis der veralteten Versionskennung.
7. Das System erkennt die veraltete Versionskennung.
8. Das System blockiert die Speicherung mit einem Konfliktstatus.
9. Das System fordert den Akteur auf, den aktuellen Stand neu zu laden.

## Alternativen

- Der Akteur lädt den aktuellen Stand und speichert erneut → Die Speicherung erfolgt erfolgreich auf Basis der aktuellen Versionskennung.
- Der Akteur bricht ab → Der zuletzt erfolgreich gespeicherte Stand bleibt unverändert.

## Ergebnis

Es entstehen keine Lost Updates. Die persönlichen Einstellungen entsprechen stets dem zuletzt erfolgreich gespeicherten Zustand des Akteurs.
