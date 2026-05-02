# UC 19/10: Attachment-Duplikat entfernen

## Metadaten

- Feature: [FT (19): Attachments](../ft-19-attachments.md)
- Notion-Quelle: https://app.notion.com/p/0a3cbd97ab474bd68d30b0c09ed3a822
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Disponent, Administrator

## Ziel

Ein Attachment, das durch mehrfachen Upload aus unterschiedlichen Kontexten als Duplikat entstanden ist, gezielt entfernen, ohne andere Attachments oder das Parent-Objekt zu beeintrÃ¤chtigen.

## Vorbedingungen

- Mindestens zwei Attachments mit identischem oder Ã¤hnlichem Inhalt sind demselben Parent-Objekt zugeordnet.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Ã„nderungsrechte fÃ¼r das Parent-Objekt.

## Ablauf

1. Der Akteur Ã¶ffnet die Detailansicht des Parent-Objekts und sichtet die Attachmentliste.
2. Der Akteur identifiziert das zu entfernende Duplikat anhand von Dateiname, DateigrÃ¶ÃŸe und Erstellungszeitpunkt.
3. Der Akteur klickt den Action-Button am betreffenden Attachment-Badge.
4. Das System zeigt den BestÃ¤tigungsdialog gemÃ¤ÃŸ UC 19/06 mit der Sicherheitsfrage: â€žSoll nur die VerknÃ¼pfung zum [Parent-Typ] entfernt oder auch die physische Datei gelÃ¶scht werden? (Nicht empfohlen bei Auftragsdokumenten.)â€œ
5. Der Akteur wÃ¤hlt die gewÃ¼nschte LÃ¶schstufe (Entkopplung oder physische LÃ¶schung) oder bricht ab.
6. Das System fÃ¼hrt die gewÃ¤hlte Operation gemÃ¤ÃŸ UC 19/06 aus.
7. Das System aktualisiert die Attachmentliste in der UI.

**Hinweis zur Entscheidung**

Entkopplung ist empfohlen, wenn nicht sicher ist, ob die physische Datei noch anderweitig benÃ¶tigt wird. Physische LÃ¶schung nur dann, wenn sicher ist, dass es sich nicht um ein Auftragsdokument handelt und keine weitere Referenz besteht.

**AlternativablÃ¤ufe**

- Akteur bricht den Dialog ab â†’ keine Aktion, alle Attachments bleiben unverÃ¤ndert.
- Attachment existiert nicht â†’ System antwortet mit 404.
- Parent-Objekt existiert nicht â†’ System antwortet mit 404.
- Akteur ohne Ã„nderungsrechte â†’ System blockiert mit 403.
- Technischer Fehler â†’ System antwortet mit 500, keine TeillÃ¶schung.

## Alternativen

Nicht angegeben in der Notion-Quelle.

## Ergebnis

- Das Duplikat ist entfernt (Datensatz, oder Datensatz und Datei, je nach gewÃ¤hlter Stufe).
- Die verbleibenden Attachments des Parent-Objekts sind unverÃ¤ndert und konsistent.
- Die Attachmentliste zeigt den bereinigten Stand an.

