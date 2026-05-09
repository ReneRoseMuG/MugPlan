# UC 04/14: Mitarbeiter aus einer Tour-KW entfernen

## Metadaten

- Feature: [FT (04): Tourenplanung](../ft-04-tourenplanung.md)

## Akteur

Disponent, Administrator

## Ziel

Einen Mitarbeiter aus einer Tour-Kalenderwoche entfernen und nach Bestätigung von Terminen abziehen.

## Vorbedingungen

- Die Tour existiert.
- Der Mitarbeiter ist in `tour_week_employees` für die Kalenderwoche enthalten.
- Die Kalenderwoche liegt in der Zukunft.
- Der Akteur ist berechtigt.

## Ablauf

1. Der Akteur öffnet den Tab „Wochenplanung“.
2. Der Akteur klickt den Entfernen-Button am Mitarbeiter-Badge.
3. Das System ermittelt Termine der Tour in dieser Woche, denen der Mitarbeiter zugeordnet ist.
4. Das System prüft, ob durch die Entfernung Unterbesetzung entstehen würde.
5. Das System zeigt eine Vorschau je Termin mit Datum, Projekt, aktuellem Mitarbeiterbestand und Status.
6. Alle Termine sind vorausgewählt.
7. Der Akteur kann einzelne Termine abwählen.
8. Der Akteur bestätigt die Auswahl.
9. Das System entfernt die `tour_week_employees`-Zuordnung.
10. Das System zieht den Mitarbeiter atomar von den bestätigten Terminen ab.
11. Unterbesetzte Termine werden an das Dispositions-Monitoring gemeldet.
12. Das System aktualisiert die betroffenen Sichten.

## Alternativen

- Keine Termine mit diesem Mitarbeiter vorhanden: Die Vorschau ist leer, die Tour-KW-Zuordnung wird trotzdem entfernt.
- Abbruch durch den Akteur: Es wird keine Zuordnung und keine Terminmutation geändert.

## Ergebnis

Der Mitarbeiter ist nicht mehr in `tour_week_employees` enthalten und von den bestätigten Terminen entfernt. Unterbesetzung ist im Monitoring sichtbar, historische Termine bleiben unverändert und es gibt keine stillen Änderungen.
