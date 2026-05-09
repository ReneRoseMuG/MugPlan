# UC 06/00: Termin stornieren

## Metadaten

- Feature: [FT (06): Automatische Regeln](../ft-06-automatische-regeln.md)

## Akteur

Disponent, Administrator

## Ziel

Einen Termin unwiderruflich als storniert markieren, den Projektbetrag auf 0 setzen und den Termin aus Reports ausschließen.

## Vorbedingungen

- Der Termin existiert.
- Der Termin ist noch nicht storniert.
- Der Akteur besitzt Schreibrechte.

## Ablauf

1. Der Akteur löst die Aktion „Stornieren“ aus.
2. Das System fordert eine Bestätigung an.
3. Der Akteur bestätigt die Stornierung.
4. Das System markiert den Termin als storniert.
5. Das System entfernt Mitarbeiterzuweisungen.
6. Das System setzt den Projektbetrag auf 0.
7. Das System aktualisiert die betroffenen Ansichten.

## Alternativen

- Abbruch durch den Akteur: Der Termin bleibt unverändert.

## Ergebnis

Der Termin ist storniert, befindet sich im Systemzustand „Storniert“, ist nur eingeschränkt bearbeitbar und wird in Reports nicht mehr berücksichtigt.
