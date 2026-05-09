# UC 04/05: Tourliste anzeigen

## Metadaten

- Feature: [FT (04): Tourenplanung](../ft-04-tourenplanung.md)

## Akteur

Disponent, Administrator, Monteur

## Ziel

Alle Touren rollenabhängig anzeigen.

## Beschreibung

Die Tourübersicht zeigt alle Touren. Mutationsfunktionen sind rollenabhängig sichtbar und serverseitig abzusichern.

## Vorbedingungen

- Der Akteur ist angemeldet.
- Touren können vorhanden sein oder die Liste kann leer sein.

## Ablauf

1. Der Akteur öffnet die Tourenübersicht.
2. Das System ermittelt alle Touren.
3. Das System zeigt je Tour Name und Farbe.
4. Das System rendert die Bedienung rollenabhängig:
   - Disponent und Administrator sehen Aktionen zum Anlegen, Bearbeiten und Löschen.
   - Monteure sehen die Übersicht im Lesemodus.
5. Das System stellt sicher, dass Mutationsaktionen für Monteure nicht gerendert und serverseitig blockiert werden.

## Alternativen

- Keine Touren vorhanden: Das System zeigt eine leere Übersicht mit Hinweis.
- Direkter Zugriff auf eine Mutationsfunktion ohne Berechtigung: Das System blockiert serverseitig.

## Ergebnis

Die Tourübersicht ist vollständig sichtbar und entspricht der Rolle des Akteurs. Unzulässige Aktionen können nicht ausgeführt werden.
