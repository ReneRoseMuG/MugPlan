# UC 07/03: PDF „Anstehende Termine“ erzeugen

## Metadaten

- Feature: [FT (07): Automatisierte Datensicherung und Fallback](../ft-07-automatisierte-datensicherung-und-fallback.md)

## Akteur

System

## Ziel

Ein aktuelles, gut lesbares PDF-Dokument aller anstehenden Termine erzeugen.

## Vorbedingungen

- Ein Termin wurde neu angelegt oder geändert.

## Ablauf

1. Das System ermittelt alle Termine ab dem heutigen Tag, heute eingeschlossen.
2. Das System sortiert die Termine nach Datum und Uhrzeit.
3. Termine ohne Uhrzeit stehen innerhalb eines Datums zuerst.
4. Das System rendert für jeden Termin einen visuell abgegrenzten horizontalen Abschnitt.
5. Die Kopfzeile enthält Uhrzeit, sofern erfasst, Datum, Kundennummer, vollständigen Kundennamen und Auftragsnummer.
6. Ist eine Auftragsnummer vorhanden, rendert das System einen eingerückten Detailbereich mit Artikelliste des Projekts und Anmerkungen aus der Projektbeschreibung.
7. Das System speichert das PDF serverseitig.
8. Das System protokolliert den Vorgang im Backup-Log.

## Alternativen

- Fehler bei der PDF-Erstellung: Das System protokolliert den Status „error“. Die Termin-Speicherung bleibt unberührt.

## Ergebnis

Das aktuelle PDF „Anstehende Termine“ ist persistent gespeichert und über die Backup-Historie abrufbar.
