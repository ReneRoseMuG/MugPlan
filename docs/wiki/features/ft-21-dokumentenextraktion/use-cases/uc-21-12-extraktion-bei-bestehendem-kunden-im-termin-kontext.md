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

1. Das System löst die extrahierte Kundennummer automatisch auf.
2. Falls die extrahierten Kundendaten zu dem bereits gesetzten Kunden passen:
    - Das System zeigt an, dass der bereits gesetzte Kunde weiterverwendet wird.
    - Das System bietet eine standardmäßig aktive Checkbox an, um ausschließlich bisher leere Stammdatenfelder aus dem Dokument zu ergänzen.
    - Vorhandene Werte am Kunden bleiben unverändert.
3. Falls die extrahierten Kundendaten nicht zu dem bereits gesetzten Kunden passen:
    - Das System zeigt die Abweichung im Dialog an.
    - Wenn genau ein anderer existierender Kunde gefunden wird, kann dieser nach sichtbarer Bestätigung verwendet werden.
    - Wenn kein Kunde gefunden wird, zeigt das System an, dass ein neuer Kunde mit der extrahierten Kundennummer angelegt werden kann.
4. Der Akteur bestätigt die Übernahme oder bricht ab.
5. Das System aktualisiert das Terminformular beziehungsweise den Projektentwurf im Termin-Kontext.

## Alternativen

- Der Akteur bricht ab → Die bestehende Kundenreferenz bleibt unverändert, keine neuen Kunden werden angelegt.
- Kundennummer fehlt oder ist mehrdeutig → Der Dialog blockiert die Übernahme und verlangt Klärung.
- Validierung der Kundendaten schlägt fehl → Das System zeigt eine Fehlermeldung an; es werden keine Daten persistiert und die bestehende Kundenreferenz bleibt unverändert.

## Ergebnis

Die Kundenreferenz im Terminformular ist eindeutig definiert und konsistent. Es entstehen keine doppelten Kundeneinträge. Fehlende Kundenfelder wurden nur nach sichtbarer Nutzerentscheidung ergänzt. Es existieren keine unerwarteten Überschreibungen.
