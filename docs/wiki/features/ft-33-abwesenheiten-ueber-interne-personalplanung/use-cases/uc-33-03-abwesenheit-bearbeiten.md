# UC 33/03: Abwesenheit bearbeiten

## Metadaten

- Feature: [FT (33): Abwesenheiten über interne Personalplanung](../ft-33-abwesenheiten-ueber-interne-personalplanung.md)

## Akteur

Disponent, Administrator

## Ziel

Art, Zeitraum oder Notiz einer bestehenden Abwesenheit ändern

## Vorbedingungen

Abwesenheit ist vorhanden. Akteur besitzt Disponent- oder Administratorrechte.

## Ablauf

1. Akteur öffnet eine bestehende Abwesenheit im Tab **Abwesenheiten**
2. Akteur ändert Art, Zeitraum oder Notiz
3. System aktualisiert den zugrunde liegenden Termin
4. System entfernt den bisherigen Abwesenheits-Tag und setzt den neuen
5. System prüft Version und Überschneidungen
6. System speichert die Änderung

## Alternativen

Versionskonflikt → System meldet Konflikt, Akteur lädt neu. Überschneidung → System blockiert und meldet Konflikt.

## Ergebnis

Abwesenheit ist mit den geänderten Werten gespeichert
