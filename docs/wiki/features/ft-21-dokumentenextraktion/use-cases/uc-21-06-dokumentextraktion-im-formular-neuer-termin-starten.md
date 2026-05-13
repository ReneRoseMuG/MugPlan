# UC 21/06: Dokumentextraktion im Formular „Neuer Termin“ starten

## Metadaten

- Feature: [FT (21): Dokumentenextraktion](../ft-21-dokumentenextraktion.md)

## Akteur

Disponent, Administrator

## Ziel

Innerhalb des Formulars „Neuer Termin“ ein Dokument mittels Parsing analysieren und einen Vorschlag erzeugen.

## Vorbedingungen

- Das Formular „Neuer Termin“ ist geöffnet.
- Der Akteur besitzt die Berechtigung zur Terminanlage.
- Ein PDF-Dokument ist verfügbar.

## Ablauf

1. Der Akteur lädt ein PDF in den definierten Extraktionsbereich des Terminformulars.
2. Das System startet die regelbasierte Dokumentextraktion gemäß UC 21/01.
3. Das System zeigt denselben mehrstufigen Ergebnisdialog wie im Formular „Neues Projekt“ an.
4. Das System löst erkannte Kundendaten automatisch auf und zeigt an, ob ein Kunde verknüpft, neu angelegt oder durch fehlende bzw. mehrdeutige Kundennummer blockiert wird.
5. Das System zeigt erkannte Projektdaten und bietet optional an, den extrahierten Dokumenttext in die Projektanmerkungen zu übernehmen.
6. Der Akteur kann das importierte Dokument als Reklamation markieren. Die Notizfrage und der optionale Notizeditor laufen direkt im Dialog.
7. Nach Bestätigung wird der Projektentwurf im Termin-Kontext weitergeführt. Erst nach erfolgreichem Projektspeichern wird das Projekt dem Terminformular zugeordnet.

## Alternativen

- Das Dokument ist nicht geeignet → Das System zeigt eine Fehlermeldung; das Terminformular bleibt unverändert.
- Das Dokument enthält nur teilweise verwertbare Daten → Das System zeigt die verwertbaren Bereiche und markiert fehlende oder auffällige Felder als Hinweis oder Warnung.

## Ergebnis

Ein editierbarer Extraktionsvorschlag steht im Kontext des Formulars „Neuer Termin“ zur Verfügung. Es wurden keine Termin- oder Projektdaten gespeichert. Der spätere Termin-Speichern-Flow behandelt ausschließlich terminbezogene Entscheidungen.
