# UC 21/07: Kundendaten übernehmen – Scope Neues Projekt

## Metadaten

- Feature: [FT (21): Dokumentenextraktion](../ft-21-dokumentenextraktion.md)

## Akteur

Disponent, Administrator

## Ziel

Extrahierte Kundendaten im Kontext „Neues Projekt" übernehmen und einen Kunden korrekt anlegen, verknüpfen oder kontrolliert ergänzen.

## Vorbedingungen

- Ein Extraktionsvorschlag mit Kundendaten liegt vor.
- Das Formular „Neues Projekt" ist geöffnet.

## Ablauf

1. Das System löst die erkannte Kundennummer automatisch auf.
2. Falls genau ein Bestandskunde gefunden wird:
    - Das System zeigt an, dass dieser Kunde mit dem Projekt verknüpft wird.
    - Das System bietet eine standardmäßig aktive Checkbox an, um ausschließlich bisher leere Stammdatenfelder aus dem Dokument zu ergänzen.
    - Vorhandene Werte am Bestandskunden bleiben immer unverändert.
3. Falls kein Bestandskunde gefunden wird:
    - Das System zeigt an, dass beim Übernehmen ein neuer Kunde mit der erkannten Kundennummer angelegt wird.
    - Das System legt den neuen Kunden erst bei Bestätigung der Übernahme an.
    - Das System verknüpft den neu angelegten Kunden mit dem Projektentwurf.
4. Das System aktualisiert das Projektformular, um die Kundenverknüpfung widerzuspiegeln.

## Alternativen

- Der Akteur bricht ab → Es erfolgt keine Kundenanlage und keine Änderung der Projektzuordnung.
- Kunde existiert bereits und alle Felder sind bereits befüllt → Das System verknüpft den bestehenden Kunden mit dem Projekt, ohne Aktualisierungen vorzunehmen.
- Kundennummer fehlt oder ist mehrdeutig → Der Dialog blockiert die Übernahme und verlangt Klärung.
- Validierung der Kundendaten schlägt fehl → Das System zeigt eine Fehlermeldung an; es werden keine Daten persistiert.

## Ergebnis

Der Projektentwurf ist mit einem Kunden verknüpft. Es entstehen keine doppelten Kundeneinträge. Fehlende Kundenfelder wurden nur nach sichtbarer Nutzerentscheidung ergänzt. Alle Referenzen sind konsistent.
