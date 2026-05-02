# UC 18/02: PersÃ¶nliche Einstellung auf Standardwert zurÃ¼cksetzen

## Metadaten

- Feature: [FT (18): User Preferences](../ft-18-user-preferences.md)
- Notion-Quelle: https://app.notion.com/p/d9f4fc001e9e42cd94d6e49e6f297eb2
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Disponent, Leser, Admin

## Ziel

Eine persÃ¶nliche Einstellung auf den systemseitig definierten Standardwert zurÃ¼cksetzen.

## Vorbedingungen

- Der Akteur ist authentifiziert.
- FÃ¼r die betreffende Einstellung ist ein systemweiter Standardwert definiert.
- FÃ¼r den Akteur existiert eine gespeicherte individuelle Einstellung.

## Ablauf

1. Der Akteur Ã¶ffnet den Bereich fÃ¼r persÃ¶nliche Einstellungen.
2. Das System lÃ¤dt die aktuell gespeicherten Einstellungen des Akteurs.
3. Der Akteur wÃ¤hlt fÃ¼r eine Einstellung die Funktion â€žAuf Standard zurÃ¼cksetzenâ€œ.
4. Der Akteur bestÃ¤tigt die Aktion.
5. Das System entfernt oder Ã¼berschreibt den individuellen Wert des Akteurs.
6. Das System speichert den Standardwert als wirksame Einstellung.
7. Das System bestÃ¤tigt die erfolgreiche ZurÃ¼cksetzung.
8. Bei zukÃ¼nftigen Aktionen wird der Standardwert angewendet.

## Alternativen

- Der Akteur bricht die ZurÃ¼cksetzung ab â†’ Der individuelle Wert bleibt unverÃ¤ndert.
- FÃ¼r die Einstellung existiert kein definierter Standardwert â†’ Das System blockiert die Aktion mit einem Fehlerstatus.
- Technischer Fehler â†’ Das System speichert nicht und liefert einen Fehlerstatus zurÃ¼ck.

## Ergebnis

Die persÃ¶nliche Einstellung entspricht dem systemweit definierten Standardwert und wirkt ausschlieÃŸlich fÃ¼r den betreffenden Akteur.

