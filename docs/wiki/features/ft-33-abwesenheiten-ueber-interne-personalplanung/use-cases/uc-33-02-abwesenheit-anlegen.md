# UC 33/02: Abwesenheit anlegen

## Metadaten

- Feature: [FT (33): Abwesenheiten über interne Personalplanung](../ft-33-abwesenheiten-ueber-interne-personalplanung.md)

## Akteur

Disponent, Administrator

## Ziel

Neue Abwesenheit für einen Mitarbeiter erfassen

## Vorbedingungen

- Mitarbeiterformular ist geöffnet.
- Akteur besitzt Disponent- oder Administratorrechte.

## Ablauf

1. Akteur öffnet den Tab **Abwesenheiten** im Mitarbeiterformular
2. Akteur wählt die Abwesenheitsart: **Urlaub**, **Krankheit** oder **Abwesend**
3. Akteur setzt Startdatum und optional Enddatum
4. Akteur setzt optional eine Notiz
5. System stellt Systemdaten sicher (Lazy Ensure für Tour, Kunde, Tag)
6. System legt Termin an mit bestehendem Seed-Kunden **Meisel & Gerken** mit Kundennummer `001`, Systemtour **Abwesenheiten**, genau diesem Mitarbeiter, ohne Startzeit
7. System setzt den gewählten Abwesenheits-Tag
8. System prüft Terminüberschneidungen
9. System speichert die Abwesenheit

## Alternativen

- Kollidierende reguläre Termine existieren: System liefert die betroffenen Termine mit Versionen zurück und fordert eine ausdrückliche Bestätigung zur Entfernung des Mitarbeiters aus diesen Terminen an.
- Akteur bestätigt die Entfernung: System entfernt nur den betroffenen Mitarbeiter aus den bestätigten regulären Terminen und speichert danach die Abwesenheit. Die Termine bleiben in ihrer bisherigen Tour.
- Akteur bricht ab oder bestätigt nicht alle erforderlichen Versionen: System speichert keine Abwesenheit und verändert keine regulären Termine.
- Konflikt mit einer bestehenden Abwesenheit oder ein Versionskonflikt liegt vor: System blockiert und meldet den Konflikt.

## Ergebnis

Abwesenheit ist als interner Termin gespeichert. Mitarbeiter ist im Zeitraum als nicht verfügbar markiert. Bestätigte kollidierende reguläre Termine bleiben bestehen und enthalten den abwesenden Mitarbeiter nicht mehr.
