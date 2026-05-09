# UC 04/01: Tour anlegen

## Metadaten

- Feature: [FT (04): Tourenplanung](../ft-04-tourenplanung.md)

## Akteur

Disponent, Administrator

## Ziel

Eine neue Tour zur organisatorischen Gruppierung von Terminen anlegen.

## Beschreibung

Der Name wird beim Anlegen automatisch mit dem nächsten freien Index vorgeschlagen. Er ist beim Anlegen sichtbar und nachträglich änderbar. Zusätzlich legt der Akteur eine Farbe fest.

## Vorbedingungen

- Der Akteur ist angemeldet.
- Das System ist betriebsbereit.
- Die Tourenverwaltung ist verfügbar.

## Ablauf

1. Der Akteur öffnet die Tourenverwaltung.
2. Der Akteur wählt „Tour anlegen“.
3. Das System erzeugt einen neuen Tourdatensatz mit automatisch generiertem Namen.
4. Das System zeigt den vorgeschlagenen Namen an.
5. Der Akteur ändert den Namen bei Bedarf.
6. Der Akteur wählt eine Farbe.
7. Der Akteur bestätigt die Anlage.
8. Das System speichert die Tour.
9. Das System führt keine Kaskadenänderung an Terminen oder Mitarbeitern aus.
10. Das System aktualisiert die betroffenen Sichten.

## Alternativen

- Abbruch durch den Akteur: Es wird keine Tour gespeichert.

## Ergebnis

Die neue Tour ist gespeichert, ihr Name ist generiert, aber änderbar, und eine Farbe ist definiert. Die Tour steht für Terminzuweisungen bereit und wird in Kalender- und Wochenansichten berücksichtigt.
