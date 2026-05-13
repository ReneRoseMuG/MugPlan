# UC 21/18: Dokumentextraktion im Formular „Neuer Kunde“ starten

## Metadaten

- Feature: [FT (21): Dokumentenextraktion](../ft-21-dokumentenextraktion.md)

## Akteur

Disponent, Administrator

## Ziel

Innerhalb des Formulars „Neuer Kunde“ ein Dokument mittels Parsing analysieren und einen Kundendatenvorschlag erzeugen.

## Vorbedingungen

- Das Formular „Neuer Kunde“ ist geöffnet.
- Der Akteur besitzt die Berechtigung zur Kundenanlage.
- Ein PDF-Dokument ist verfügbar.

## Ablauf

1. Der Akteur lädt ein PDF in den definierten Extraktionsbereich des Kundenformulars.
2. Das System startet die regelbasierte Dokumentextraktion gemäß UC 21/01.
3. Das System zeigt einen Kundendaten-Dialog mit erkannten Feldern, fehlenden Feldern und Warnungen an.
4. Das System löst die erkannte Kundennummer automatisch auf.
5. Falls genau ein Bestandskunde gefunden wird, zeigt das System an, dass dieser Kunde geladen wird.
6. Falls kein Bestandskunde gefunden wird, zeigt das System an, dass die Daten als neuer Kunde übernommen werden.
7. Der Akteur bestätigt die Übernahme oder bricht ab.

## Alternativen

- Das Dokument ist nicht geeignet → Das System zeigt eine Fehlermeldung; das Kundenformular bleibt unverändert.
- Das Dokument enthält nur teilweise verwertbare Kundendaten → Das System zeigt die verwertbaren Felder und markiert fehlende oder auffällige Felder als Hinweis oder Warnung.
- Kundennummer fehlt oder ist mehrdeutig → Der Dialog blockiert die Übernahme und verlangt Klärung.
- Der Akteur bricht ab → Keine Kundenanlage und keine Formularänderung.

## Ergebnis

Das Kundenformular enthält die bestätigten Kundendaten oder lädt den erkannten Bestandskunden. Es wurden keine Projekt- oder Termindaten erzeugt.
