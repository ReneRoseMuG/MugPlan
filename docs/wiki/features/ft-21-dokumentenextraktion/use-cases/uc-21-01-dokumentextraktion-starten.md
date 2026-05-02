# UC 21/01: Dokumentextraktion starten

## Metadaten

- Feature: [FT (21): Dokumentenextraktion](../ft-21-dokumentenextraktion.md)
- Notion-Quelle: https://app.notion.com/p/7f1c87cde87a4ab98db0469dd0af81c1
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Disponent, Administrator

## Ziel

Ein geeignetes Dokument mittels regelbasierter Parsing-Prozesse analysieren und daraus strukturierte, editierbare DatenvorschlÃ¤ge erzeugen.

## Vorbedingungen

- Ein Attachment existiert und ist einem fachlichen Objekt zugeordnet.
- Das Dokument ist technisch lesbar.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt die Berechtigung zur Dokumentextraktion.

## Ablauf

1. Der Akteur wÃ¤hlt ein vorhandenes Attachment aus.
2. Der Akteur startet die Funktion â€žDokument extrahieren".
3. Das System extrahiert den Text aus dem Dokument.
4. Das System analysiert den Text mithilfe deterministischer Parsing-Regeln.
5. Das System prÃ¼ft, ob eine Auftragsnummer im extrahierten Text identifiziert wurde.
6. Wenn eine Auftragsnummer vorhanden ist: Das System prÃ¼ft, ob diese Auftragsnummer bereits in der Datenbank existiert.
7. Wenn die Auftragsnummer bereits existiert: Das System bricht den Prozess ab und zeigt eine Fehlermeldung an (z. B. â€žAuftrag mit dieser Nummer bereits vorhanden. Weitere Verarbeitung nicht mÃ¶glich.").
8. Wenn die Auftragsnummer nicht existiert oder nicht vorhanden ist: Das System fÃ¤hrt fort.
9. Wenn die Kundennummer existiert, wird ein stilles Update leerer Stammdatenfelder ausgefÃ¼hrt
    1. es wird kein doppelter Kundendatnsetz angelegt
    2. Der Akteur erfÃ¤hrt nichts von diesem Vorgang
10. Das System identifiziert strukturierte Bereiche wie Kundendaten, Artikelliste und projektbezogene Informationen.
11. Das System validiert die extrahierten Daten gegen definierte Feld- und Formatregeln.
12. Das System zeigt die extrahierten Daten als editierbaren Vorschlag in einem Dialog an.

## Alternativen

- Dokument ist technisch nicht lesbar â†’ Das System bricht ab und zeigt eine Fehlermeldung an.
- Auftragsnummer existiert bereits â†’ Das System bricht den Prozess sofort ab und zeigt eine eindeutige Fehlermeldung an. Es erfolgt keine weitere Verarbeitung.
- Parsing-Regeln liefern keine verwertbaren Daten â†’ Das System zeigt einen Hinweis und erzeugt keinen Vorschlag.
- Validierung schlÃ¤gt fehl â†’ Das System zeigt einen strukturierten Fehlerstatus an; es werden keine Daten persistiert.

## Ergebnis

Ein strukturierter, validierter und editierbarer Datenvorschlag wird angezeigt. Es wurden keine fachlichen Stammdaten persistiert. Die Auftragsnummer-Eindeutigkeit ist gewÃ¤hrleistet.

