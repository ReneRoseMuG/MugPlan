# UC 19/06: LÃ¶sch-Workflow initiieren (Action Button)

## Metadaten

- Feature: [FT (19): Attachments](../ft-19-attachments.md)
- Notion-Quelle: https://app.notion.com/p/0a3cbd97ab474bd68d30b0c09ed3a822
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Disponent, Administrator

## Ziel

Ein Attachment Ã¼ber den Action-Button am Attachment-Badge gezielt entfernen â€” entweder durch Entkopplung vom Parent-Objekt oder durch physische LÃ¶schung von Datensatz und Datei.

## Vorbedingungen

- Das Attachment existiert.
- Das zugehÃ¶rige Parent-Objekt existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Ã„nderungsrechte fÃ¼r das Parent-Objekt.

## Ablauf

1. Der Akteur klickt den Action-Button am Attachment-Badge.
2. Das System zeigt einen BestÃ¤tigungsdialog mit der Sicherheitsfrage: â€žSoll nur die VerknÃ¼pfung zum [Parent-Typ] entfernt oder auch die physische Datei gelÃ¶scht werden? (Nicht empfohlen bei Auftragsdokumenten.)â€œ
3. Der Akteur wÃ¤hlt eine der beiden Optionen oder bricht ab.
4. Bei Entkopplung: Das System entfernt den Attachment-Datensatz. Die physische Datei bleibt erhalten.
5. Bei physischer LÃ¶schung: Das System entfernt den Attachment-Datensatz und lÃ¶scht die physische Datei aus dem Upload-Verzeichnis.
6. Das System prÃ¼ft serverseitig Authentifizierung, Berechtigung und Existenz von Attachment und Parent.
7. Das System aktualisiert die Attachmentliste in der UI.

**AlternativablÃ¤ufe**

- Akteur bricht den Dialog ab â†’ keine Aktion, Attachment bleibt unverÃ¤ndert.
- Attachment existiert nicht â†’ System antwortet mit 404.
- Parent-Objekt existiert nicht â†’ System antwortet mit 404.
- Akteur ohne Ã„nderungsrechte â†’ System blockiert mit 403.
- Technischer Fehler â†’ System antwortet mit 500, keine TeillÃ¶schung.

## Alternativen

Nicht angegeben in der Notion-Quelle.

## Ergebnis

- Bei Entkopplung: Datensatz ist entfernt, Datei bleibt im Upload-Verzeichnis erhalten.
- Bei physischer LÃ¶schung: Datensatz und Datei sind vollstÃ¤ndig entfernt.
- Die Attachmentliste zeigt den aktuellen Stand konsistent an.

