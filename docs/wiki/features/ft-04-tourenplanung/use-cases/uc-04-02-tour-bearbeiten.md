# UC 04/02: Tour bearbeiten

## Metadaten

- Feature: [FT (04): Tourenplanung](../ft-04-tourenplanung.md)

## Akteur

Disponent, Administrator

## Ziel

Name oder Farbe einer bestehenden Tour anpassen.

## Beschreibung

Vorhandene Touren können bearbeitet werden. Die Pflege der Tour-KW-Mitarbeiter erfolgt nicht hier, sondern über die zugehörigen Wochenplanungs-Use-Cases.

## Vorbedingungen

- Die Tour existiert.
- Der Akteur ist berechtigt.

## Ablauf

1. Der Akteur öffnet die Tourenverwaltung.
2. Der Akteur wählt eine Tour.
3. Das System zeigt die Tourdetails.
4. Der Akteur ändert bei Bedarf den Namen.
5. Der Akteur ändert bei Bedarf die Farbe.
6. Der Akteur bestätigt die Änderung.
7. Das System speichert die Änderung.
8. Das System aktualisiert die betroffenen Sichten.

## Alternativen

- Abbruch durch den Akteur: Es wird keine Änderung gespeichert.
- Technischer Konflikt: Das System blockiert die Speicherung mit Fehlermeldung.

## Ergebnis

Name oder Farbe der Tour sind aktualisiert. Abhängige Ansichten übernehmen die neuen Tourdaten.
