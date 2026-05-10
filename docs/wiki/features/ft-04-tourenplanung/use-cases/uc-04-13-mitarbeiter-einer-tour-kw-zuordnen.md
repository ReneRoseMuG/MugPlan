# UC 04/13: Mitarbeiter einer Tour-KW zuordnen

## Metadaten

- Feature: [FT (04): Tourenplanung](../ft-04-tourenplanung.md)

## Akteur

Disponent, Administrator

## Ziel

Einen Mitarbeiter einer Tour-Kalenderwoche zuordnen und nach selektiver Bestätigung auf Termine ausrollen.

## Vorbedingungen

- Die Tour existiert.
- Der Mitarbeiter ist aktiv.
- Die Kalenderwoche liegt in der Zukunft.
- Der Akteur ist berechtigt.

## Ablauf

1. Der Akteur öffnet den Tab „Wochenplanung“ der Tour.
2. Der Akteur klickt im Kartenheader auf das Plus.
3. Das System zeigt aktive Mitarbeiter, für die in dieser Kalenderwoche kein Typ-1-Konflikt besteht.
4. Ein Typ-1-Konflikt liegt vor, wenn der Mitarbeiter in derselben Kalenderwoche bereits einer anderen Tour zugeordnet ist; solche Mitarbeiter werden nicht angezeigt.
5. Der Akteur wählt einen Mitarbeiter.
6. Das System ermittelt Termine der Tour in dieser Kalenderwoche.
7. Das System prüft je betroffenen Termin, ob beim Ausrollen ein Typ-2-Konflikt durch eine zeitliche Terminüberschneidung entstehen würde.
8. Das System zeigt eine Vorschau je Termin mit Datum, Projekt, Kunde, aktuellem Mitarbeiterbestand und Status.
9. Konfliktfreie Termine sind vorausgewählt, Konflikte sind deaktiviert.
10. Der Akteur kann vorausgewählte Termine abwählen.
11. Der Akteur bestätigt die Auswahl.
12. Das System legt die `tour_week_employees`-Zuordnung an.
13. Das System fügt den Mitarbeiter atomar den bestätigten konfliktfreien Terminen hinzu.
14. Das System aktualisiert die betroffenen Sichten.

## Alternativen

- Alle Termine haben Konflikte: Die Vorschau enthält keine auswählbaren Terminmutationen, die Tour-KW-Zuordnung wird trotzdem angelegt.
- Keine Termine vorhanden: Das System legt die Tour-KW-Zuordnung direkt an.
- Abbruch durch den Akteur: Es wird keine Zuordnung und keine Terminmutation gespeichert.

## Ergebnis

Der Mitarbeiter ist in `tour_week_employees` gespeichert und auf den bestätigten Terminen zugeordnet. Historische Termine bleiben unverändert; die Ausrollung erfolgt nur nach expliziter Bestätigung.
