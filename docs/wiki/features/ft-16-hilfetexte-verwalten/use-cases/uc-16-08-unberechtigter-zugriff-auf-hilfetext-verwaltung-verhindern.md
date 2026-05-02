# UC 16/08: Unberechtigter Zugriff auf Hilfetext-Verwaltung verhindern

## Metadaten

- Feature: [FT (16): Hilfetexte verwalten](../ft-16-hilfetexte-verwalten.md)
- Notion-Quelle: https://app.notion.com/p/a8c06986b3a641d4b4d30723de4b4315
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Disponent, Leser

## Ziel

Sicherstellen, dass nur Administratoren Hilfetexte anlegen, bearbeiten, aktivieren, deaktivieren oder lÃ¶schen dÃ¼rfen.

## Vorbedingungen

- Der Akteur ist authentifiziert.
- Der Akteur besitzt keine Admin-Rechte.

## Ablauf

1. Der Akteur versucht, die Hilfetext-Verwaltung aufzurufen oder eine Verwaltungsaktion auszufÃ¼hren.
2. Das System prÃ¼ft serverseitig die Rolle des Akteurs.
3. Das System verweigert den Zugriff auf Verwaltungsfunktionen.
4. Das System liefert einen Berechtigungsfehler zurÃ¼ck.

## Alternativen

- Der Akteur versucht, direkt Ã¼ber einen API-Endpunkt eine Verwaltungsaktion auszufÃ¼hren â†’ Das System prÃ¼ft die Rolle und blockiert ebenfalls mit einem Berechtigungsfehler.
- Technischer Fehler â†’ Das System liefert einen Fehlerstatus zurÃ¼ck.

## Ergebnis

Nicht berechtigte Rollen kÃ¶nnen keine Hilfetexte anlegen, bearbeiten, aktivieren, deaktivieren oder lÃ¶schen. Die IntegritÃ¤t der Hilfetexte bleibt gewahrt.

