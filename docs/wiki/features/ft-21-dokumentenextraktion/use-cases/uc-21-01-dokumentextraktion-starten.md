# UC 21/01: Dokumentextraktion starten

## Metadaten

- Feature: [FT (21): Dokumentenextraktion](../ft-21-dokumentenextraktion.md)

## Akteur

Disponent, Administrator

## Ziel

Ein geeignetes Dokument mittels regelbasierter Parsing-Prozesse analysieren und daraus strukturierte, editierbare Datenvorschläge erzeugen.

## Vorbedingungen

- Ein Attachment existiert und ist einem fachlichen Objekt zugeordnet.
- Das Dokument ist technisch lesbar.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt die Berechtigung zur Dokumentextraktion.

## Ablauf

1. Der Akteur wählt ein vorhandenes Attachment aus.
2. Der Akteur startet die Funktion „Dokument extrahieren".
3. Das System extrahiert den Text aus dem Dokument.
4. Das System analysiert den Text mithilfe deterministischer Parsing-Regeln.
5. Das System prüft, ob eine Auftragsnummer im extrahierten Text identifiziert wurde.
6. Wenn eine Auftragsnummer vorhanden ist: Das System prüft, ob diese Auftragsnummer bereits in der Datenbank existiert.
7. Wenn die Auftragsnummer bereits existiert: Das System bricht den Prozess ab und zeigt eine Fehlermeldung an (z. B. „Auftrag mit dieser Nummer bereits vorhanden. Weitere Verarbeitung nicht möglich.").
8. Wenn die Auftragsnummer nicht existiert oder nicht vorhanden ist: Das System fährt fort.
9. Wenn die Kundennummer existiert, wird ein stilles Update leerer Stammdatenfelder ausgeführt
    1. es wird kein doppelter Kundendatnsetz angelegt
    2. Der Akteur erfährt nichts von diesem Vorgang
10. Das System identifiziert strukturierte Bereiche wie Kundendaten, Artikelliste und projektbezogene Informationen.
11. Das System validiert die extrahierten Daten gegen definierte Feld- und Formatregeln.
12. Das System zeigt die extrahierten Daten als editierbaren Vorschlag in einem Dialog an.

## Alternativen

- Dokument ist technisch nicht lesbar → Das System bricht ab und zeigt eine Fehlermeldung an.
- Auftragsnummer existiert bereits → Das System bricht den Prozess sofort ab und zeigt eine eindeutige Fehlermeldung an. Es erfolgt keine weitere Verarbeitung.
- Parsing-Regeln liefern keine verwertbaren Daten → Das System zeigt einen Hinweis und erzeugt keinen Vorschlag.
- Validierung schlägt fehl → Das System zeigt einen strukturierten Fehlerstatus an; es werden keine Daten persistiert.

## Ergebnis

Ein strukturierter, validierter und editierbarer Datenvorschlag wird angezeigt. Es wurden keine fachlichen Stammdaten persistiert. Die Auftragsnummer-Eindeutigkeit ist gewährleistet.
