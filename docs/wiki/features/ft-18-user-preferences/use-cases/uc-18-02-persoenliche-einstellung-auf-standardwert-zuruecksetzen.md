# UC 18/02: Persönliche Einstellung auf Standardwert zurücksetzen

## Metadaten

- Feature: [FT (18): User Preferences](../ft-18-user-preferences.md)

## Akteur

Disponent, Leser, Admin

## Ziel

Eine persönliche Einstellung auf den systemseitig definierten Standardwert zurücksetzen.

## Vorbedingungen

- Der Akteur ist authentifiziert.
- Für die betreffende Einstellung ist ein systemweiter Standardwert definiert.
- Für den Akteur existiert eine gespeicherte individuelle Einstellung.

## Ablauf

1. Der Akteur öffnet den Bereich für persönliche Einstellungen.
2. Das System lädt die aktuell gespeicherten Einstellungen des Akteurs.
3. Der Akteur wählt für eine Einstellung die Funktion „Auf Standard zurücksetzen“.
4. Der Akteur bestätigt die Aktion.
5. Das System entfernt oder überschreibt den individuellen Wert des Akteurs.
6. Das System speichert den Standardwert als wirksame Einstellung.
7. Das System bestätigt die erfolgreiche Zurücksetzung.
8. Bei zukünftigen Aktionen wird der Standardwert angewendet.

## Alternativen

- Der Akteur bricht die Zurücksetzung ab → Der individuelle Wert bleibt unverändert.
- Für die Einstellung existiert kein definierter Standardwert → Das System blockiert die Aktion mit einem Fehlerstatus.
- Technischer Fehler → Das System speichert nicht und liefert einen Fehlerstatus zurück.

## Ergebnis

Die persönliche Einstellung entspricht dem systemweit definierten Standardwert und wirkt ausschließlich für den betreffenden Akteur.
