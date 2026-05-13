# UC 21/10: Projekt übernehmen – Scope Neuer Termin

## Metadaten

- Feature: [FT (21): Dokumentenextraktion](../ft-21-dokumentenextraktion.md)

## Akteur

Disponent, Administrator

## Ziel

Extrahierte Projektinformationen im Kontext „Neuer Termin“ übernehmen und ein neues Projekt erzeugen.

## Vorbedingungen

- Ein Extraktionsvorschlag mit Projektdaten liegt vor.
- Kein Projekt ist im Terminformular ausgewählt.

## Ablauf

1. Der Akteur prüft Projekttitel, Auftragsnummer, Betrag, Auftragsinhalt und Warnungen im Doc-Extract-Dialog.
2. Der Akteur entscheidet optional, ob der extrahierte Dokumenttext in die Projektanmerkungen übernommen wird.
3. Der Akteur entscheidet optional, ob das Dokument als Reklamation behandelt wird. Die Notizfrage und der optionale Notizeditor laufen direkt im Dialog.
4. Der Akteur wählt die Übernahme der Projektdaten.
5. Das System öffnet den Projektentwurf im Termin-Kontext und übernimmt die bestätigten Daten.
6. Der Akteur speichert das Projekt.
7. Nach erfolgreichem Projektspeichern verknüpft das System das neue Projekt mit dem Terminformular.
8. Der Termin selbst wird erst durch den Termin-Speichern-Flow persistiert.

## Alternativen

- Der Akteur bricht vor Bestätigung ab → Kein Projekt wird angelegt; das Terminformular bleibt unverändert.
- Während der Projektanlage tritt ein Validierungs- oder Versionskonflikt auf → Das System bricht ab; es werden keine Teilzustände gespeichert.
- Eine Artikelliste fehlt → Das System zeigt einen Hinweis, übernimmt aber die übrigen verwertbaren Projektdaten.
- Eine Auftragsnummer existiert bereits → Die Projektanlage muss als Duplikatkonflikt behandelt werden.

## Ergebnis

Ein neues Projekt ist persistent angelegt und im Terminformular korrekt auswählbar. Alle Referenzen sind konsistent. Das extrahierte PDF wird im Projekt-Attachment-Flow behandelt (siehe UC 21/17).
