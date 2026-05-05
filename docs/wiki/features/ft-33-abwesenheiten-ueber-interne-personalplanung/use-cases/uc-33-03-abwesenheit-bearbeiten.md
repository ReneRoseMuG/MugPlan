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

- Versionskonflikt → System meldet Konflikt, Akteur lädt neu.
- Kollidierende reguläre Termine entstehen durch die Änderung → System fordert eine ausdrückliche Bestätigung zur Entfernung des Mitarbeiters aus diesen Terminen an.
- Akteur bestätigt die Entfernung → System entfernt nur den betroffenen Mitarbeiter aus den bestätigten regulären Terminen und speichert danach die geänderte Abwesenheit. Die Termine bleiben in ihrer bisherigen Tour.
- Akteur bricht ab → Abwesenheit und reguläre Termine bleiben unverändert.

## Ergebnis

Abwesenheit ist mit den geänderten Werten gespeichert. Falls reguläre Termine bestätigt betroffen waren, ist der entfernte Mitarbeiter als Folgeeffekt bewusst und nachvollziehbar.
