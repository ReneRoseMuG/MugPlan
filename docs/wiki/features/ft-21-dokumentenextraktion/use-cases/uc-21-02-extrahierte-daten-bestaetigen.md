# UC 21/02: Extrahierte Daten bestätigen

## Metadaten

- Feature: [FT (21): Dokumentenextraktion](../ft-21-dokumentenextraktion.md)

## Akteur

Disponent, Administrator

## Ziel

Einen durch Parsing erzeugten Extraktionsvorschlag prüfen, anpassen und in den passenden Formular- oder Draft-Zustand übernehmen.

## Vorbedingungen

- Ein Extraktionsvorschlag mit erkannten Feldern, Hinweisen und Warnungen liegt vor.
- Der Akteur ist berechtigt, Kunden, Projekte oder Termine anzulegen oder zu verändern.

## Ablauf

1. Der Akteur prüft die vorbefüllten Kundendaten, fehlende Felder und Warnungen.
2. Das System löst die Kundennummer automatisch auf.
3. Bei einem bestehenden Kunden zeigt das System die Verknüpfung an und bietet optional an, ausschließlich leere Stammdaten aus dem Dokument zu ergänzen.
4. Bei einem neuen Kunden zeigt das System an, dass dieser Kunde beim Übernehmen angelegt wird.
5. Der Akteur prüft Projektdaten, Auftragsinhalt und optional die extrahierte Artikelliste.
6. Der Akteur entscheidet optional, ob der Dokumenttext in die Anmerkungen übernommen wird.
7. Der Akteur entscheidet im Projekt- oder Terminpfad optional, ob das Dokument als Reklamation behandelt wird. Bei Zustimmung wird die Notizfrage direkt im Dialog gestellt.
8. Der Akteur bestätigt die Übernahme.
9. Das System übernimmt bestätigte Daten in Formular- und Draft-Zustand. Projekt- und Terminpersistenz erfolgen erst im jeweiligen Speichern-Flow.

## Alternativen

- Der Akteur bricht den Vorgang ab → Es erfolgt keine Speicherung; bestehende Daten bleiben unverändert.
- Fehlende oder mehrdeutige Kundennummer → Der Dialog blockiert die Übernahme und zeigt den konkreten Grund.
- Bei der späteren Persistierung tritt ein Validierungsfehler auf → Das System zeigt eine Fehlermeldung an; es werden keine Teilzustände gespeichert.
- Während der Persistierung tritt ein Versionskonflikt auf → Das System bricht ab und informiert den Akteur; es erfolgt keine Speicherung.

## Ergebnis

Die bestätigten Daten sind im jeweiligen Formular- oder Draft-Zustand fachlich korrekt vorbereitet. Spätere Speicherentscheidungen werden im Project Save Review oder Termin-Save-Review getroffen, ohne bereits im Doc-Extract-Dialog abgeschlossene Entscheidungen doppelt abzufragen.
