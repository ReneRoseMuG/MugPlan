# UC 04/12: Kalenderwoche einer Tour anlegen

## Metadaten

- Feature: [FT (04): Tourenplanung](../ft-04-tourenplanung.md)

## Akteur

Disponent, Administrator

## Ziel

Eine neue Kalenderwoche in der Tour-Wochenplanung anlegen.

## Beschreibung

Im Tab „Wochenplanung“ kann über „KW einfügen“ eine leere Wochenkarte angelegt werden. Zulässig sind nur zukünftige Kalenderwochen; doppelte Wochenkarten sind nicht erlaubt.

## Vorbedingungen

- Die Tour existiert.
- Der Akteur ist berechtigt.
- Die gewünschte Kalenderwoche liegt in der Zukunft.
- Für die Tour existiert noch keine Wochenkarte für diese Kalenderwoche.

## Ablauf

1. Der Akteur wählt eine Tour und öffnet den Tab „Wochenplanung“.
2. Der Akteur klickt auf „KW einfügen“.
3. Das System öffnet einen Dialog mit der nächsten freien editierbaren Kalenderwoche.
4. Der Akteur übernimmt oder ändert die Kalenderwoche.
5. Das System prüft, dass die Kalenderwoche nach heute liegt und noch nicht vorhanden ist.
6. Der Akteur bestätigt die Anlage.
7. Das System legt eine leere Wochenkarte ohne `tour_week_employees` an.
8. Das System zeigt die Karte sortiert an.

## Alternativen

- Vergangenheit oder laufende Woche: Das System blockiert die Anlage.
- Kalenderwoche bereits vorhanden: Das System blockiert die Anlage.
- Abbruch durch den Akteur: Es wird nichts angelegt.

## Ergebnis

Eine leere Wochenkarte ist sichtbar und editierbar. Terminmutationen finden nicht statt.
