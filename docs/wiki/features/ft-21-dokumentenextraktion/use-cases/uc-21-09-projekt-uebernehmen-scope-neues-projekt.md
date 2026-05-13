# UC 21/09: Projekt übernehmen – Scope Neues Projekt

## Metadaten

- Feature: [FT (21): Dokumentenextraktion](../ft-21-dokumentenextraktion.md)

## Akteur

Disponent, Administrator

## Ziel

Extrahierte Projektinformationen im Kontext „Neues Projekt“ übernehmen.

## Vorbedingungen

- Ein Extraktionsvorschlag mit Projektdaten liegt vor.
- Das Formular „Neues Projekt“ ist geöffnet.

## Ablauf

1. Der Akteur prüft Projekttitel, Auftragsnummer, Betrag, Auftragsinhalt und Warnungen im Doc-Extract-Dialog.
2. Der Akteur entscheidet optional, ob der extrahierte Dokumenttext in die Anmerkungen übernommen wird.
3. Der Akteur entscheidet optional, ob das Dokument als Reklamation behandelt wird. Die Notizfrage und der optionale Notizeditor laufen direkt im Dialog.
4. Der Akteur wählt die Übernahme der Projektdaten.
5. Das System setzt die bestätigten Projektdaten im Projektformular.
6. Wenn Formularfelder bereits befüllt sind, dürfen sie nur nach sichtbarer Bestätigung ersetzt oder ergänzt werden.
7. Das eingelesene PDF bleibt als Draft-Dokument am Projektformular, bis der Projekt-Speichern-Flow abgeschlossen oder verworfen wird.

## Alternativen

- Der Akteur lehnt das Überschreiben ab → Bestehende Inhalte bleiben unverändert.
- Eine Artikelliste fehlt → Das System zeigt einen Hinweis, übernimmt aber die übrigen verwertbaren Projektdaten.
- Eine Auftragsnummer existiert bereits → Die spätere Projektübernahme muss als Duplikatkonflikt behandelt werden.

## Ergebnis

Das Projektformular enthält die übernommenen Projektdaten gemäß Bestätigung des Akteurs. Persistenz, Projekttitel-Entscheidung, PDF-Duplikatentscheidung und weitere projektbezogene Speicherfragen laufen anschließend über den Projekt-Speichern-Flow.
