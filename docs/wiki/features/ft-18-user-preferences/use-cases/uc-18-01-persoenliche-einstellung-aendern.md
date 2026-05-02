# UC 18/01: PersÃ¶nliche Einstellung Ã¤ndern

## Metadaten

- Feature: [FT (18): User Preferences](../ft-18-user-preferences.md)
- Notion-Quelle: https://app.notion.com/p/d9f4fc001e9e42cd94d6e49e6f297eb2
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Disponent, Leser, Admin

## Ziel

Eine persÃ¶nliche Einstellung Ã¤ndern, sodass diese ausschlieÃŸlich fÃ¼r den jeweiligen Akteur wirksam ist.

## Vorbedingungen

- Der Akteur ist authentifiziert.
- Die persÃ¶nliche Einstellung ist im System definiert.
- FÃ¼r den Akteur existiert ein gÃ¼ltiger Benutzerkontext.

## Ablauf

1. Der Akteur Ã¶ffnet den Bereich fÃ¼r persÃ¶nliche Einstellungen.
2. Das System lÃ¤dt die aktuell gespeicherten Einstellungen des Akteurs.
3. Der Akteur Ã¤ndert eine oder mehrere Einstellungen.
4. Der Akteur speichert die Ã„nderungen.
5. Das System validiert Datentyp und Wertebereich der geÃ¤nderten Einstellungen.
6. Das System speichert die Einstellungen persistent und ordnet sie eindeutig dem Akteur zu.
7. Das System bestÃ¤tigt die erfolgreiche Speicherung.
8. Die geÃ¤nderte Einstellung wird bei zukÃ¼nftigen Aktionen des Akteurs angewendet.

## Alternativen

- UngÃ¼ltiger Wert â†’ Das System lehnt die Speicherung mit Validierungsfehler ab.
- Der Akteur bricht ab â†’ Es erfolgt keine Ã„nderung.
- Technischer Fehler â†’ Das System speichert nicht und liefert einen Fehlerstatus zurÃ¼ck.

## Ergebnis

Die geÃ¤nderte Einstellung ist persistent gespeichert und wirkt ausschlieÃŸlich fÃ¼r den betreffenden Akteur. Andere Akteure sind nicht betroffen.

