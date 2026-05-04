# UC 02/06: Projektanhänge verwalten

## Metadaten

- Feature: [FT (02): Projekte](../ft-02-projekte.md)
- Notion-Quelle: https://app.notion.com/p/30dda094354e80648c40dc62565d437e
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Administrator, Disponent

## Ziel

Dokumente zu einem Projekt hinzufügen, einsehen, herunterladen und bei Bedarf entfernen.

## Vorbedingungen

- Das Projekt existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Ã„nderungsrechte (für Upload und Löschung) bzw. mindestens Leserechte (für Anzeige und Download).

### Ablauf — Anhang hochladen

1. Der Akteur öffnet das Projekt und wählt „Attachment hinzufügen".
2. Das System öffnet einen Dateiauswahldialog.
3. Der Akteur wählt eine lokale Datei.
4. Das System prüft serverseitig: Authentifizierung, Berechtigung, Existenz des Projekts, DateigröÃŸe und MIME-Typ.
5. Das System generiert einen eindeutigen persistenten Speichernamen, speichert die Datei und legt einen Attachment-Datensatz mit Projektreferenz und Metadaten (Originaldateiname, Speichername, MIME-Typ, DateigröÃŸe, Erstellungszeitpunkt) an.
6. Das System aktualisiert die Anhangsliste in der UI.

### Ablauf — Anhang öffnen / herunterladen

1. Der Akteur wählt einen Anhang aus der Liste.
2. Das System prüft Authentifizierung, Berechtigung und Existenz von Anhang und Projekt.
3. Für Inline-Anzeige (z. B. PDF, Bild): Das System liefert die Datei mit `Content-Disposition: inline`.
4. Für expliziten Download: Das System liefert die Datei mit `Content-Disposition: attachment`.

### Ablauf — Anhang entfernen

1. Der Akteur klickt den Action-Button am Attachment-Badge.
2. Das System zeigt eine Sicherheitsfrage: „Soll nur die Verknüpfung zum Projekt entfernt oder auch die physische Datei gelöscht werden? (Nicht empfohlen bei Auftragsdokumenten.)"
3. Der Akteur wählt eine Option:
    - **Entkopplung:** Das System entfernt den Attachment-Datensatz. Die physische Datei verbleibt im Upload-Verzeichnis.
    - **Physische Löschung:** Das System entfernt Datensatz und physische Datei vollständig.
4. Das System aktualisiert die Anhangsliste.

## Ablauf

Nicht angegeben in der Notion-Quelle.

## Alternativen

- Projekt nicht vorhanden → HTTP 404.
- Akteur nicht authentifiziert → HTTP 401.
- Akteur ohne Berechtigung → HTTP 403.
- Datei überschreitet GröÃŸelimit oder hat ungültigen Typ → HTTP 400, keine Persistenz.
- Upload abgebrochen → keine Persistenz.
- Anhang nicht vorhanden (bei Ã–ffnen/Löschen) → HTTP 404.
- Akteur bricht Sicherheitsfrage ab → keine Aktion, Anhang bleibt unverändert.
- Technischer Fehler → HTTP 500, keine Teillöschung.

## Ergebnis

Anhänge sind dem Projekt zugeordnet und über die Anhangsliste zugänglich. Bei Entkopplung verbleibt die physische Datei im Upload-Verzeichnis. Bei physischer Löschung sind Datensatz und Datei vollständig entfernt. Vollständige Attachment-Regeln gemäÃŸ FT (19).

