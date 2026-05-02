# UC 18/01: Persönliche Einstellung ändern

## Metadaten

- Feature: [FT (18): User Preferences](../feature.md)
- Notion-Quelle: https://app.notion.com/p/d9f4fc001e9e42cd94d6e49e6f297eb2
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Disponent, Leser, Admin

## Ziel

Eine persönliche Einstellung ändern, sodass diese ausschließlich für den jeweiligen Akteur wirksam ist.

## Vorbedingungen

- Der Akteur ist authentifiziert.
- Die persönliche Einstellung ist im System definiert.
- Für den Akteur existiert ein gültiger Benutzerkontext.

## Ablauf

1. Der Akteur öffnet den Bereich für persönliche Einstellungen.
2. Das System lädt die aktuell gespeicherten Einstellungen des Akteurs.
3. Der Akteur ändert eine oder mehrere Einstellungen.
4. Der Akteur speichert die Änderungen.
5. Das System validiert Datentyp und Wertebereich der geänderten Einstellungen.
6. Das System speichert die Einstellungen persistent und ordnet sie eindeutig dem Akteur zu.
7. Das System bestätigt die erfolgreiche Speicherung.
8. Die geänderte Einstellung wird bei zukünftigen Aktionen des Akteurs angewendet.

## Alternativen

- Ungültiger Wert → Das System lehnt die Speicherung mit Validierungsfehler ab.
- Der Akteur bricht ab → Es erfolgt keine Änderung.
- Technischer Fehler → Das System speichert nicht und liefert einen Fehlerstatus zurück.

## Ergebnis

Die geänderte Einstellung ist persistent gespeichert und wirkt ausschließlich für den betreffenden Akteur. Andere Akteure sind nicht betroffen.
