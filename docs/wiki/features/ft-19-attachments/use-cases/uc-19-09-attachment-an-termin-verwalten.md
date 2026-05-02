# UC 19/09: Attachment an Termin verwalten

## Metadaten

- Feature: [FT (19): Attachments](../ft-19-attachments.md)
- Notion-Quelle: https://app.notion.com/p/0a3cbd97ab474bd68d30b0c09ed3a822
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Disponent, Administrator

## Ziel

Eine Datei einem bestehenden Termin als Attachment hinzufÃ¼gen, die Anhangsliste anzeigen und Attachments herunterladen. Termin-Attachments folgen denselben technischen Regeln wie Attachments anderer DomÃ¤nen, haben aber eine termineigene Besonderheit: Sie bleiben am Termin erhalten, unabhÃ¤ngig von Ã„nderungen an Mitarbeiterliste, Tourzuordnung oder Datum.

## Vorbedingungen

- Der Termin existiert.
- Der Akteur ist authentifiziert.
- FÃ¼r Upload: Der Akteur besitzt die Rolle Disponent oder Administrator.
- FÃ¼r Anzeige/Download: Der Akteur besitzt mindestens Leserechte.

**Ablauf â€” Upload**

1. Der Akteur Ã¶ffnet die Detailansicht eines Termins.
2. Der Akteur wÃ¤hlt die Funktion â€žAttachment hinzufÃ¼gen".
3. Das System prÃ¼ft serverseitig Authentifizierung, Berechtigung (Disponent oder Administrator) und Existenz des Termins.
4. Das System fÃ¼hrt den Upload-Prozess gemÃ¤ÃŸ UC 19/01 und UC 19/05 durch.
5. Das System legt einen Attachment-Datensatz mit Referenz auf den Termin an.
6. Das System aktualisiert die Attachmentliste in der Termindetailansicht.

**Ablauf â€” Anzeige und Download**

1. Der Akteur Ã¶ffnet die Termindetailansicht.
2. Das System lÃ¤dt alle dem Termin zugeordneten Attachments.
3. Der Akteur Ã¶ffnet oder lÃ¤dt ein Attachment gemÃ¤ÃŸ UC 19/03 und UC 19/04.

**Besonderheit Termin-Attachments**

- Termin-Attachments bleiben beim Termin, wenn Mitarbeiter zugewiesen oder entfernt werden.
- Termin-Attachments bleiben beim Termin, wenn die Tourzuordnung geÃ¤ndert oder entfernt wird.
- Termin-Attachments bleiben beim Termin, wenn das Datum verschoben wird.
- Termin-Attachments werden erst entfernt, wenn der Termin selbst gelÃ¶scht wird (CASCADE).
- Historische Termine sind read-only â€” Uploads auf historische Termine werden serverseitig blockiert (403).

**AlternativablÃ¤ufe**

- Termin existiert nicht â†’ System antwortet mit 404.
- Akteur ohne Berechtigung â†’ System blockiert mit 403.
- Termin ist historisch (Startdatum in der Vergangenheit) â†’ Upload wird blockiert, Anzeige und Download bleiben erlaubt.
- Datei ungÃ¼ltig oder zu groÃŸ â†’ System antwortet mit 400, speichert nichts.
- Technischer Fehler â†’ System antwortet mit 500.

## Ablauf

Nicht angegeben in der Notion-Quelle.

## Alternativen

Nicht angegeben in der Notion-Quelle.

## Ergebnis

- Das Attachment ist persistent gespeichert und eindeutig dem Termin zugeordnet.
- Die Attachmentliste des Termins ist konsistent.
- Termin-Attachments Ã¼berleben alle Ã„nderungen am Termin auÃŸer der TermerlÃ¶schung selbst.
- Historische Termine kÃ¶nnen nicht mit neuen Attachments versehen werden.

