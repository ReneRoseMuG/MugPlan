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
4. Falls eine Auftragsnummer vorhanden ist, prüft das System, ob diese bereits in der Datenbank existiert.
5. Falls die Auftragsnummer bereits existiert, markiert das System den Konflikt für die Projektübernahme, zeigt aber weiterhin verwertbare Kundendaten und andere Hinweise.
6. Das System führt die Validierung durch und erzeugt einen neuen, unabhängigen Extraktionsvorschlag.
7. Der Akteur bestätigt oder verwirft den neuen Vorschlag.
8. Bei Bestätigung führt das System reguläre Duplikats- und Validierungsprüfungen durch und übernimmt die Daten gemäß den bestehenden Formular- und Speicherregeln.

## Alternativen

- Der Akteur verwirft den neuen Vorschlag → Keine Änderung an bestehenden Daten.
- Auftragsnummer existiert bereits (Wiederholung desselben Dokuments) → Das System zeigt einen Konflikt für die Projektübernahme. Der Akteur kann den vorhandenen Projektpfad nutzen oder die bestehenden Daten manuell aktualisieren.
- Duplikatsprüfung verhindert eine doppelte Kunden- oder Projektanlage → Das System verweist auf bestehende Datensätze. Leere Kundenstammdaten werden nur nach sichtbarer Nutzerentscheidung ergänzt.

## Ergebnis

Es entstehen keine automatischen Dubletten. Auftragsnummer-Konflikte sind sichtbar. Jede Persistierung erfolgt ausschließlich nach expliziter Bestätigung des Akteurs und unter Anwendung der bestehenden Domänenregeln.
