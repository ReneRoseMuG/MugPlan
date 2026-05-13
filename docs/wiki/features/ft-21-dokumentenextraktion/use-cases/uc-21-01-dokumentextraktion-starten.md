# UC 21/01: Dokumentextraktion starten

## Metadaten

- Feature: [FT (21): Dokumentenextraktion](../ft-21-dokumentenextraktion.md)

## Akteur

Disponent, Administrator

## Ziel

Ein geeignetes Dokument mittels regelbasierter Parsing-Prozesse analysieren und daraus strukturierte, editierbare Datenvorschläge erzeugen.

## Vorbedingungen

- Ein PDF-Dokument liegt als Upload im aktuellen Formularpfad vor oder ein bestehendes Attachment ist auswählbar.
- Das Dokument ist technisch lesbar.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt die Berechtigung zur Dokumentextraktion.

## Ablauf

1. Der Akteur wählt ein vorhandenes Attachment aus oder lädt ein PDF im aktuellen Formularpfad hoch.
2. Der Akteur startet die Funktion „Dokument extrahieren".
3. Das System extrahiert den Text aus dem Dokument.
4. Das System analysiert den Text mithilfe deterministischer Parsing-Regeln.
5. Das System prüft, ob eine Auftragsnummer im extrahierten Text identifiziert wurde.
6. Wenn eine Auftragsnummer vorhanden ist, prüft das System, ob diese Auftragsnummer bereits in der Datenbank existiert.
7. Wenn die Auftragsnummer bereits existiert, wird dies als Konflikt für die spätere Projektübernahme markiert. Die Extraktion selbst darf weiterhin verwertbare Kundendaten und Projekthinweise anzeigen.
8. Das System identifiziert strukturierte Bereiche wie Kundendaten, Artikelliste und projektbezogene Informationen.
9. Das System validiert die extrahierten Daten gegen definierte Feld- und Formatregeln.
10. Auffällige, aber verwertbare Werte werden als Warnung markiert. Eine formal falsche Postleitzahl oder eine fehlende Artikelliste darf die übrige Extraktion nicht abbrechen.
11. Das System zeigt die extrahierten Daten als editierbaren Vorschlag in einem Dialog an.

## Alternativen

- Dokument ist technisch nicht lesbar → Das System bricht ab und zeigt eine Fehlermeldung an.
- Auftragsnummer existiert bereits → Das System zeigt einen eindeutigen Konflikthinweis für die Projektübernahme. Kundendaten und andere verwertbare Felder können weiterhin angezeigt werden.
- Parsing-Regeln liefern keine verwertbaren Daten → Das System zeigt einen Hinweis und erzeugt keinen Vorschlag.
- Validierung schlägt für ein einzelnes Feld fehl → Das System zeigt einen strukturierten Fehlerstatus oder eine Warnung am betroffenen Feld; verwertbare andere Felder bleiben nutzbar.

## Ergebnis

Ein strukturierter, validierter und editierbarer Datenvorschlag wird angezeigt. Es wurden keine fachlichen Projekt- oder Termindaten persistiert. Konflikte und Warnungen sind für die folgenden Dialogschritte sichtbar.
