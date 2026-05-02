# UC 33/02: Abwesenheit anlegen

## Metadaten

- Feature: [FT (33): Abwesenheiten über interne Personalplanung](../ft-33-abwesenheiten-ueber-interne-personalplanung.md)
- Notion-Quelle: https://app.notion.com/p/34dda094354e81d096b0f47ea36c177e
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Disponent, Administrator

## Ziel

Neue Abwesenheit für einen Mitarbeiter erfassen

## Vorbedingungen

Mitarbeiterformular ist geöffnet. Akteur besitzt Disponent- oder Administratorrechte.

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

Überschneidung erkannt → System blockiert das Anlegen und meldet den Konflikt

## Ergebnis

Abwesenheit ist als interner Termin gespeichert. Mitarbeiter ist im Zeitraum als nicht verfügbar markiert.
