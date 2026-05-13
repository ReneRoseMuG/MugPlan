# UC 21/08: Kundendaten übernehmen – Scope Neuer Termin

## Metadaten

- Feature: [FT (21): Dokumentenextraktion](../ft-21-dokumentenextraktion.md)

## Akteur

Disponent, Administrator

## Ziel

Extrahierte Kundendaten im Kontext „Neuer Termin" übernehmen und korrekt mit Termin und ggf. Projekt verknüpfen, ohne bestehende Stammdaten still zu überschreiben.

## Vorbedingungen

- Ein Extraktionsvorschlag mit Kundendaten liegt vor.
- Das Formular „Neuer Termin" ist geöffnet.
- Kein Projekt ist im Terminformular ausgewählt.

## Ablauf

1. Das System löst die erkannte Kundennummer automatisch auf.
2. Falls genau ein Bestandskunde gefunden wird:
    - Das System zeigt an, dass dieser Kunde für den Termin- bzw. Projektpfad verwendet wird.
    - Das System bietet eine standardmäßig aktive Checkbox an, um ausschließlich bisher leere Stammdatenfelder aus dem Dokument zu ergänzen.
    - Vorhandene Werte am Bestandskunden bleiben immer unverändert.
3. Falls kein Bestandskunde gefunden wird:
    - Das System zeigt an, dass beim Übernehmen ein neuer Kunde mit der erkannten Kundennummer angelegt wird.
    - Das System legt den neuen Kunden erst bei Bestätigung der Übernahme an.
    - Das System setzt den neu angelegten Kunden im Termin- bzw. Projektentwurf.
4. Das System aktualisiert das Terminformular, um die Kundenverknüpfung widerzuspiegeln.

## Alternativen

- Der Akteur bricht ab → Keine Kundenanlage, keine Formularänderung.
- Kunde existiert bereits und alle Felder sind bereits befüllt → Das System setzt den bestehenden Kunden im Terminformular, ohne Aktualisierungen vorzunehmen.
- Kundennummer fehlt oder ist mehrdeutig → Der Dialog blockiert die Übernahme und verlangt Klärung.
- Validierung der Kundendaten schlägt fehl → Das System zeigt eine Fehlermeldung an; es werden keine Daten persistiert.

## Ergebnis

Der Terminentwurf oder der im Termin-Kontext erzeugte Projektentwurf referenziert einen Kunden. Es entstehen keine doppelten Kundeneinträge. Fehlende Kundenfelder wurden nur nach sichtbarer Nutzerentscheidung ergänzt. Es existieren keine verwaisten Referenzen.
