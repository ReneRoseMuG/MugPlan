# UC 08/05: Journal ohne Leseberechtigung nicht öffnen

## Metadaten

- Feature: [FT (08): Journal / Änderungshistorie](../ft-08-journal-aenderungshistorie.md)

## Akteur

Benutzer ohne Journal-Leseberechtigung

## Ziel

Sicherstellen, dass nur berechtigte Rollen Journalinhalte sehen.

## Vorbedingungen

- Der Benutzer ist angemeldet.

## Ablauf

1. Der Benutzer versucht, das Journal zu öffnen.
2. Das System prüft die Rolle und Leseberechtigung.
3. Bei fehlender Berechtigung zeigt das System keine Journalinhalte an und blockiert den Zugriff.

## Alternativen

Keine.

## Ergebnis

Die Änderungshistorie bleibt auf Administratoren und Disponenten mit Berechtigung beschränkt.
