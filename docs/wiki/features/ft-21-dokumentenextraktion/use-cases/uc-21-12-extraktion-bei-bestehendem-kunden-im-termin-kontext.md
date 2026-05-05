# UC 21/12: Extraktion bei bestehendem Kunden im Termin-Kontext

## Metadaten

- Feature: [FT (21): Dokumentenextraktion](../ft-21-dokumentenextraktion.md)

## Akteur

Disponent, Administrator

## Ziel

Sicherstellen, dass extrahierte Kundendaten im Kontext „Neuer Termin" korrekt mit einem bereits gesetzten Kunden abgestimmt werden.

## Vorbedingungen

- Das Formular „Neuer Termin" ist geöffnet.
- Ein Kunde ist bereits im Terminformular ausgewählt.
- Ein Extraktionsvorschlag mit Kundendaten liegt vor.

## Ablauf

1. Der Akteur wählt die Übernahme der extrahierten Kundendaten.
2. Das System führt eine Duplikatsprüfung durch.
3. Falls die extrahierten Kundendaten zu dem bereits gesetzten Kunden matchen (gleiche Identifikationskriterien):
    - Das System aktualisiert fehlende Felder am bestehenden Kunden still (z. B. Telefon, E-Mail, Adressteile, sofern diese leer sind).
    - Der bereits gesettzte Kunde bleibt im Terminformular erhalten.
    - Keine Warnung oder Bestätigungsdialog wird angezeigt.
4. Falls die extrahierten Kundendaten nicht zu dem bereits gesetzten Kunden matchen:
    - Das System führt eine erneute Duplikatsprüfung für die extrahierten Daten durch.
    - Wenn ein anderer existierender Kunde matcht: Das System aktualisiert fehlende Felder bei diesem Kunden still und ersetzt die Kundenreferenz im Terminformular still.
    - Wenn kein Duplikat matcht: Das System legt einen neuen Kunden an und ersetzt die Kundenreferenz im Terminformular still.
5. Das System aktualisiert das Terminformular.

## Alternativen

- Der Akteur bricht ab → Die bestehende Kundenreferenz bleibt unverändert, keine neuen Kunden werden angelegt.
- Validierung der Kundendaten schlägt fehl → Das System zeigt eine Fehlermeldung an; es werden keine Daten persistiert und die bestehende Kundenreferenz bleibt unverändert.

## Ergebnis

Die Kundenreferenz im Terminformular ist eindeutig definiert und konsistent. Es entstehen keine doppelten Kundeneinträge. Fehlende Kundenfelder wurden still aufgefüllt. Es existieren keine stillen oder unerwarteten Überschreibungen ohne explizite Bestätigung durch das System.
