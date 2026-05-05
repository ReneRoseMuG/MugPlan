# UC 14/05: Rollenabhängige UI-Reduktion

## Metadaten

- Feature: [FT (14): Benutzer- und Rollenverwaltung](../ft-14-benutzer-und-rollenverwaltung.md)

## Akteur

Leser

## Ziel

Sicherstellen, dass ein Leser keine schreibenden UI-Elemente sieht.

## Vorbedingungen

- Der Benutzer ist authentifiziert.
- Der Benutzer besitzt die Rolle Leser.

## Ablauf

1. Der Akteur öffnet eine fachliche Ansicht.
2. Das System rendert die UI rollenabhängig.
3. Das System blendet schreibende Elemente aus.
4. Der Akteur kann ausschließlich lesende Aktionen durchführen.

## Alternativen

- Deep-Link auf Bearbeitungsroute → Serverseitige Prüfung blockiert.

## Ergebnis

Die UI ist funktionsreduziert, ohne Datenmodelländerung.
