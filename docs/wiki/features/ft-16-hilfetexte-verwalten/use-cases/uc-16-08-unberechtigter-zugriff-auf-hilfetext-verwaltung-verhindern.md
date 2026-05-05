# UC 16/08: Unberechtigter Zugriff auf Hilfetext-Verwaltung verhindern

## Metadaten

- Feature: [FT (16): Hilfetexte verwalten](../ft-16-hilfetexte-verwalten.md)

## Akteur

Disponent, Leser

## Ziel

Sicherstellen, dass nur Administratoren Hilfetexte anlegen, bearbeiten, aktivieren, deaktivieren oder löschen dürfen.

## Vorbedingungen

- Der Akteur ist authentifiziert.
- Der Akteur besitzt keine Admin-Rechte.

## Ablauf

1. Der Akteur versucht, die Hilfetext-Verwaltung aufzurufen oder eine Verwaltungsaktion auszuführen.
2. Das System prüft serverseitig die Rolle des Akteurs.
3. Das System verweigert den Zugriff auf Verwaltungsfunktionen.
4. Das System liefert einen Berechtigungsfehler zurück.

## Alternativen

- Der Akteur versucht, direkt über einen API-Endpunkt eine Verwaltungsaktion auszuführen → Das System prüft die Rolle und blockiert ebenfalls mit einem Berechtigungsfehler.
- Technischer Fehler → Das System liefert einen Fehlerstatus zurück.

## Ergebnis

Nicht berechtigte Rollen können keine Hilfetexte anlegen, bearbeiten, aktivieren, deaktivieren oder löschen. Die Integrität der Hilfetexte bleibt gewahrt.
