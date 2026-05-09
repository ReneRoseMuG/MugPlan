# UC 32/02: Änderungsereignis empfangen und Hinweis anzeigen

## Metadaten

- Feature: [FT (32): Aktive Änderungsbenachrichtigung](../ft-32-aktive-aenderungsbenachrichtigung.md)

## Akteur

Angemeldeter Benutzer aller Rollen

## Ziel

Den Benutzer nicht-blockierend informieren, dass in seiner aktuellen Session fremde Änderungen vorliegen und eine zentrale Aktualisierung verfügbar ist.

## Vorbedingungen

- Die SSE-Verbindung der Session ist aktiv.
- Eine andere Session hat eine mutierende Operation erfolgreich abgeschlossen.

## Ablauf

1. Der Client empfängt ein SSE-Ereignis zu einer Fremdänderung.
2. Das System setzt für die aktuelle Session den Status „Updates verfügbar“.
3. Das System zeigt einen globalen, länger sichtbaren Toast mit dem Hinweis, dass über „Neu laden“ in der Hauptnavigation alle offenen Ansichten aktualisiert werden können.
4. Weitere eingehende Fremdänderungen erzeugen keine zusätzlichen Einzelmeldungen, solange der Status bereits aktiv ist.
5. Ist in der aktuellen Session kein Edit-Form geöffnet, kann der Benutzer bei Bedarf die zentrale Funktion „Neu laden“ auslösen.
6. Das System aktualisiert alle offenen, refresh-fähigen Ansichten der aktuellen Session.

## Alternativen

- Es liegt bereits ein aktiver Status „Updates verfügbar“ vor: Das neue Ereignis erzeugt keine zusätzliche Meldung.
- In der aktuellen Session ist ein Edit-Form geöffnet: Die Funktion „Neu laden“ ist gesperrt und kann nicht ausgelöst werden.
- Eine Ansicht befindet sich in laufender Bearbeitung oder enthält ungespeicherte Änderungen: Diese Ansicht darf nicht still überschrieben werden.

## Ergebnis

Der Benutzer ist informiert und kann die Aktualisierung zentral auslösen, sofern kein Edit-Form geöffnet ist. Seine laufende Bearbeitung bleibt unberührt. Der Versionskonflikt beim Speichern gemäß NFR (01) bleibt als harte Absicherung aktiv.
