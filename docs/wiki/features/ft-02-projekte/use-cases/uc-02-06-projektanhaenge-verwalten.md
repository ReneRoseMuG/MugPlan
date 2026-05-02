# UC 02/06: ProjektanhÃ¤nge verwalten

## Metadaten

- Feature: [FT (02): Projekte](../ft-02-projekte.md)
- Notion-Quelle: https://app.notion.com/p/30dda094354e80648c40dc62565d437e
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Administrator, Disponent

## Ziel

Dokumente zu einem Projekt hinzufÃ¼gen, einsehen, herunterladen und bei Bedarf entfernen.

## Vorbedingungen

- Das Projekt existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Ã„nderungsrechte (fÃ¼r Upload und LÃ¶schung) bzw. mindestens Leserechte (fÃ¼r Anzeige und Download).

### Ablauf â€” Anhang hochladen

1. Der Akteur Ã¶ffnet das Projekt und wÃ¤hlt â€žAttachment hinzufÃ¼gen".
2. Das System Ã¶ffnet einen Dateiauswahldialog.
3. Der Akteur wÃ¤hlt eine lokale Datei.
4. Das System prÃ¼ft serverseitig: Authentifizierung, Berechtigung, Existenz des Projekts, DateigrÃ¶ÃŸe und MIME-Typ.
5. Das System generiert einen eindeutigen persistenten Speichernamen, speichert die Datei und legt einen Attachment-Datensatz mit Projektreferenz und Metadaten (Originaldateiname, Speichername, MIME-Typ, DateigrÃ¶ÃŸe, Erstellungszeitpunkt) an.
6. Das System aktualisiert die Anhangsliste in der UI.

### Ablauf â€” Anhang Ã¶ffnen / herunterladen

1. Der Akteur wÃ¤hlt einen Anhang aus der Liste.
2. Das System prÃ¼ft Authentifizierung, Berechtigung und Existenz von Anhang und Projekt.
3. FÃ¼r Inline-Anzeige (z.Â B. PDF, Bild): Das System liefert die Datei mit `Content-Disposition: inline`.
4. FÃ¼r expliziten Download: Das System liefert die Datei mit `Content-Disposition: attachment`.

### Ablauf â€” Anhang entfernen

1. Der Akteur klickt den Action-Button am Attachment-Badge.
2. Das System zeigt eine Sicherheitsfrage: â€žSoll nur die VerknÃ¼pfung zum Projekt entfernt oder auch die physische Datei gelÃ¶scht werden? (Nicht empfohlen bei Auftragsdokumenten.)"
3. Der Akteur wÃ¤hlt eine Option:
    - **Entkopplung:** Das System entfernt den Attachment-Datensatz. Die physische Datei verbleibt im Upload-Verzeichnis.
    - **Physische LÃ¶schung:** Das System entfernt Datensatz und physische Datei vollstÃ¤ndig.
4. Das System aktualisiert die Anhangsliste.

## Ablauf

Nicht angegeben in der Notion-Quelle.

## Alternativen

- Projekt nicht vorhanden â†’ HTTP 404.
- Akteur nicht authentifiziert â†’ HTTP 401.
- Akteur ohne Berechtigung â†’ HTTP 403.
- Datei Ã¼berschreitet GrÃ¶ÃŸelimit oder hat ungÃ¼ltigen Typ â†’ HTTP 400, keine Persistenz.
- Upload abgebrochen â†’ keine Persistenz.
- Anhang nicht vorhanden (bei Ã–ffnen/LÃ¶schen) â†’ HTTP 404.
- Akteur bricht Sicherheitsfrage ab â†’ keine Aktion, Anhang bleibt unverÃ¤ndert.
- Technischer Fehler â†’ HTTP 500, keine TeillÃ¶schung.

## Ergebnis

AnhÃ¤nge sind dem Projekt zugeordnet und Ã¼ber die Anhangsliste zugÃ¤nglich. Bei Entkopplung verbleibt die physische Datei im Upload-Verzeichnis. Bei physischer LÃ¶schung sind Datensatz und Datei vollstÃ¤ndig entfernt. VollstÃ¤ndige Attachment-Regeln gemÃ¤ÃŸ FT (19).

