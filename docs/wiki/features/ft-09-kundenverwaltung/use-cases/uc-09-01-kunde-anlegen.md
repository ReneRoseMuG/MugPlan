# UC 09/01: Kunde anlegen

## Metadaten

- Feature: [FT (09): Kundenverwaltung](../ft-09-kundenverwaltung.md)

## Akteur

Disponent, Administrator

## Ziel

Ein neuer Kunde wird mit vollständigen Stammdaten angelegt und steht anschließend für Projektzuordnungen zur Verfügung.

## Vorbedingungen

- Der Akteur ist authentifiziert.
- Der Akteur besitzt die Berechtigung zur Anlage von Kunden.
- Pflichtfelder sind im System definiert.

## Ablauf

1. Der Akteur startet die Funktion „Kunde anlegen“.
2. Das System zeigt ein Formular zur Erfassung der Kundendaten an.
3. Optional startet der Akteur die Dokumentextraktion im Kundenformular. Das System zeigt erkannte Kundendaten, fehlende Felder und Warnungen als Vorschlag an.
4. Der Akteur erfasst oder bestätigt mindestens:
    - Kundenname bzw. Firma,
    - Telefonnummer,
    - Kundennummer,
    - Adresse (sofern für Planung oder Druck erforderlich).
5. Der Akteur bestätigt die Eingabe.
6. Das System validiert:
    - Pflichtfelder,
    - formale Korrektheit der Daten,
    - optionale Dublettenprüfung anhand Name/Adresse/Kundennummer.
7. Bei erfolgreicher Validierung speichert das System den Kunden mit `is_active = true`.
8. Das System erzeugt eine Versionskennung (z. B. `version` oder `updated_at`).
9. Das System zeigt die Kundendetailansicht des neu angelegten Kunden an.

## Alternativen

- Pflichtfeld fehlt → System antwortet mit Validierungsfehler, kein Persistieren.
- Formale Validierung schlägt fehl → System lehnt ab und markiert Feld.
- Dublettenprüfung schlägt an → System warnt oder blockiert gemäß Regel.
- Dokumentextraktion erkennt eine bestehende Kundennummer → System lädt den Bestandskunden statt einen zweiten Datensatz anzulegen.
- Technischer Fehler → System antwortet mit 500, kein Kunde wird angelegt.

## Ergebnis

- Ein neuer Kundendatensatz existiert persistent.
- `is_active = true`.
- Der Kunde erscheint:
    - in Kundenlisten,
    - in Projektauswahldialogen (nur für aktive Kunden),
    - in Filterkomponenten für aktive Kunden.
- Es existieren noch keine Projekte, Termine oder Notizen für diesen Kunden.
