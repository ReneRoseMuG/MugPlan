# UC 21/13: Wiederholte Extraktion desselben Dokuments

## Metadaten

- Feature: [FT (21): Dokumentenextraktion](../ft-21-dokumentenextraktion.md)

## Akteur

Disponent, Administrator

## Ziel

Sicherstellen, dass die wiederholte Extraktion desselben Attachments keine inkonsistenten oder doppelten Stammdaten erzeugt.

## Vorbedingungen

- Ein Attachment wurde bereits extrahiert.
- Es wurden noch keine oder bereits bestätigte Daten aus diesem Dokument übernommen.

## Ablauf

1. Der Akteur startet erneut die Funktion „Dokument extrahieren" für dasselbe Attachment.
2. Das System führt die regelbasierte Parsing-Analyse erneut vollständig aus.
3. Das System prüft, ob eine Auftragsnummer im extrahierten Text identifiziert wurde.
4. Falls eine Auftragsnummer vorhanden ist: Das System prüft, ob diese bereits in der Datenbank existiert.
5. Falls die Auftragsnummer bereits existiert: Das System bricht den Prozess ab und zeigt eine Fehlermeldung an (z. B. „Auftrag mit dieser Nummer bereits vorhanden. Weitere Verarbeitung nicht möglich.").
6. Falls die Auftragsnummer nicht existiert oder nicht vorhanden ist: Das System führt die Validierung durch und erzeugt einen neuen, unabhängigen Extraktionsvorschlag.
7. Der Akteur bestätigt oder verwirft den neuen Vorschlag.
8. Bei Bestätigung führt das System reguläre Duplikats- und Validierungsprüfungen durch und persistiert die Daten gemäß den bestehenden Domänenregeln.

## Alternativen

- Der Akteur verwirft den neuen Vorschlag → Keine Änderung an bestehenden Daten.
- Auftragsnummer existiert bereits (Wiederholung desselben Dokuments) → Das System bricht ab. Der Akteur kann das Dokument mit geänderter Auftragsnummer erneut extrahieren oder die bestehenden Daten manuell aktualisieren.
- Duplikatsprüfung verhindert eine doppelte Kunden- oder Projektanlage → Das System aktualisiert bestehende Datensätze still gemäß UC 21/07 und UC 21/08, oder verweist auf bestehende Datensätze.

## Ergebnis

Es entstehen keine automatischen Dubletten. Die Auftragsnummer-Eindeutigkeit ist gewährleistet. Jede Persistierung erfolgt ausschließlich nach expliziter Bestätigung des Akteurs und unter Anwendung der bestehenden Domänenregeln (einschließlich still erfolgender Kundenaktualisierungen).
