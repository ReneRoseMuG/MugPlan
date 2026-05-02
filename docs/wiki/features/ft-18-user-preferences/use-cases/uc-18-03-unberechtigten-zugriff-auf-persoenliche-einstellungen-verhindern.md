# UC 18/03: Unberechtigten Zugriff auf persÃ¶nliche Einstellungen verhindern

## Metadaten

- Feature: [FT (18): User Preferences](../ft-18-user-preferences.md)
- Notion-Quelle: https://app.notion.com/p/d9f4fc001e9e42cd94d6e49e6f297eb2
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Disponent, Leser, Admin

## Ziel

Sicherstellen, dass ein Akteur ausschlieÃŸlich seine eigenen persÃ¶nlichen Einstellungen einsehen und Ã¤ndern kann.

## Vorbedingungen

- Der Akteur ist authentifiziert.
- FÃ¼r mindestens einen weiteren Akteur existieren gespeicherte persÃ¶nliche Einstellungen.

## Ablauf

1. Der Akteur ruft den Bereich fÃ¼r persÃ¶nliche Einstellungen auf.
2. Das System ermittelt anhand des Benutzerkontextes die IdentitÃ¤t des Akteurs.
3. Das System lÃ¤dt ausschlieÃŸlich die dem Akteur zugeordneten Einstellungen.
4. Der Akteur versucht, direkt oder indirekt Einstellungen eines anderen Akteurs abzurufen oder zu Ã¤ndern.
5. Das System prÃ¼ft serverseitig die Benutzerzuordnung.
6. Das System verweigert den Zugriff auf fremde Einstellungen und liefert einen Berechtigungsfehler zurÃ¼ck.

## Alternativen

- Der Akteur ruft ausschlieÃŸlich seine eigenen Einstellungen auf â†’ Das System erlaubt Zugriff.
- Technischer Fehler â†’ Das System liefert einen Fehlerstatus zurÃ¼ck.

## Ergebnis

Ein Akteur kann ausschlieÃŸlich seine eigenen persÃ¶nlichen Einstellungen einsehen und Ã¤ndern. Einstellungen anderer Akteure bleiben geschÃ¼tzt und unverÃ¤ndert.

