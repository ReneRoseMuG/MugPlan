# UC 21/13: Wiederholte Extraktion desselben Dokuments

## Metadaten

- Feature: [FT (21): Dokumentenextraktion](../ft-21-dokumentenextraktion.md)
- Notion-Quelle: https://app.notion.com/p/7f1c87cde87a4ab98db0469dd0af81c1
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Disponent, Administrator

## Ziel

Sicherstellen, dass die wiederholte Extraktion desselben Attachments keine inkonsistenten oder doppelten Stammdaten erzeugt.

## Vorbedingungen

- Ein Attachment wurde bereits extrahiert.
- Es wurden noch keine oder bereits bestÃ¤tigte Daten aus diesem Dokument Ã¼bernommen.

## Ablauf

1. Der Akteur startet erneut die Funktion â€žDokument extrahieren" fÃ¼r dasselbe Attachment.
2. Das System fÃ¼hrt die regelbasierte Parsing-Analyse erneut vollstÃ¤ndig aus.
3. Das System prÃ¼ft, ob eine Auftragsnummer im extrahierten Text identifiziert wurde.
4. Falls eine Auftragsnummer vorhanden ist: Das System prÃ¼ft, ob diese bereits in der Datenbank existiert.
5. Falls die Auftragsnummer bereits existiert: Das System bricht den Prozess ab und zeigt eine Fehlermeldung an (z. B. â€žAuftrag mit dieser Nummer bereits vorhanden. Weitere Verarbeitung nicht mÃ¶glich.").
6. Falls die Auftragsnummer nicht existiert oder nicht vorhanden ist: Das System fÃ¼hrt die Validierung durch und erzeugt einen neuen, unabhÃ¤ngigen Extraktionsvorschlag.
7. Der Akteur bestÃ¤tigt oder verwirft den neuen Vorschlag.
8. Bei BestÃ¤tigung fÃ¼hrt das System regulÃ¤re Duplikats- und ValidierungsprÃ¼fungen durch und persistiert die Daten gemÃ¤ÃŸ den bestehenden DomÃ¤nenregeln.

## Alternativen

- Der Akteur verwirft den neuen Vorschlag â†’ Keine Ã„nderung an bestehenden Daten.
- Auftragsnummer existiert bereits (Wiederholung desselben Dokuments) â†’ Das System bricht ab. Der Akteur kann das Dokument mit geÃ¤nderter Auftragsnummer erneut extrahieren oder die bestehenden Daten manuell aktualisieren.
- DuplikatsprÃ¼fung verhindert eine doppelte Kunden- oder Projektanlage â†’ Das System aktualisiert bestehende DatensÃ¤tze still gemÃ¤ÃŸ UC 21/07 und UC 21/08, oder verweist auf bestehende DatensÃ¤tze.

## Ergebnis

Es entstehen keine automatischen Dubletten. Die Auftragsnummer-Eindeutigkeit ist gewÃ¤hrleistet. Jede Persistierung erfolgt ausschlieÃŸlich nach expliziter BestÃ¤tigung des Akteurs und unter Anwendung der bestehenden DomÃ¤nenregeln (einschlieÃŸlich still erfolgender Kundenaktualisierungen).

