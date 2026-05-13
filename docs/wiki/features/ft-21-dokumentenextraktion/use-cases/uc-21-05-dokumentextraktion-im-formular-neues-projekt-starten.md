# UC 21/05: Dokumentextraktion im Formular „Neues Projekt“ starten

## Metadaten

- Feature: [FT (21): Dokumentenextraktion](../ft-21-dokumentenextraktion.md)

## Akteur

Disponent, Administrator

## Ziel

Innerhalb des Formulars „Neues Projekt“ ein Dokument mittels Parsing analysieren und einen Vorschlag erzeugen.

## Vorbedingungen

- Das Formular „Neues Projekt“ ist geöffnet.
- Der Akteur besitzt die Berechtigung zur Projektanlage.
- Ein PDF-Dokument ist verfügbar.

## Ablauf

1. Der Akteur lädt ein PDF in den definierten Extraktionsbereich des Formulars.
2. Das System startet die regelbasierte Dokumentextraktion gemäß UC 21/01.
3. Das System zeigt einen mehrstufigen Ergebnisdialog mit Kundendaten, Projektdaten, Warnungen und Abschluss an.
4. Das System löst erkannte Kundendaten automatisch auf und zeigt an, ob ein Kunde verknüpft, neu angelegt oder durch fehlende bzw. mehrdeutige Kundennummer blockiert wird.
5. Das System zeigt erkannte Projektdaten und bietet optional an, den extrahierten Dokumenttext in die Anmerkungen zu übernehmen.
6. Der Akteur kann das Dokument im Dialog als Reklamation markieren. In diesem Fall wird die Notizfrage direkt im Dialog gestellt und bei Zustimmung der Notizeditor eingeblendet.

## Alternativen

- Das Dokument ist nicht geeignet → Das System zeigt eine Fehlermeldung; das Projektformular bleibt unverändert.
- Das Dokument enthält nur teilweise verwertbare Daten → Das System zeigt die verwertbaren Bereiche und markiert fehlende oder auffällige Felder als Hinweis oder Warnung.

## Ergebnis

Ein editierbarer Extraktionsvorschlag steht im Kontext des Formulars „Neues Projekt“ zur Verfügung. Es wurden keine Projektdaten gespeichert. Nach Übernahme liegen Projekt-, Kunden-, Reklamations- und PDF-Draft-Daten im Formularzustand bereit; endgültige projektbezogene Entscheidungen erfolgen beim Speichern.
