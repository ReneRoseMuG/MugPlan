# UC 19/10: Attachment-Duplikat entfernen

## Metadaten

- Feature: [FT (19): Attachments](../ft-19-attachments.md)
- Notion-Quelle: https://app.notion.com/p/0a3cbd97ab474bd68d30b0c09ed3a822
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Disponent, Administrator

## Ziel

Ein Attachment, das durch mehrfachen Upload aus unterschiedlichen Kontexten als Duplikat entstanden ist, gezielt entfernen, ohne andere Attachments oder das Parent-Objekt zu beeinträchtigen.

## Vorbedingungen

- Mindestens zwei Attachments mit identischem oder ähnlichem Inhalt sind demselben Parent-Objekt zugeordnet.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Ã„nderungsrechte für das Parent-Objekt.

## Ablauf

1. Der Akteur öffnet die Detailansicht des Parent-Objekts und sichtet die Attachmentliste.
2. Der Akteur identifiziert das zu entfernende Duplikat anhand von Dateiname, DateigröÃŸe und Erstellungszeitpunkt.
3. Der Akteur klickt den Action-Button am betreffenden Attachment-Badge.
4. Das System zeigt den Bestätigungsdialog gemäÃŸ UC 19/06 mit der Sicherheitsfrage: „Soll nur die Verknüpfung zum [Parent-Typ] entfernt oder auch die physische Datei gelöscht werden? (Nicht empfohlen bei Auftragsdokumenten.)“
5. Der Akteur wählt die gewünschte Löschstufe (Entkopplung oder physische Löschung) oder bricht ab.
6. Das System führt die gewählte Operation gemäÃŸ UC 19/06 aus.
7. Das System aktualisiert die Attachmentliste in der UI.

**Hinweis zur Entscheidung**

Entkopplung ist empfohlen, wenn nicht sicher ist, ob die physische Datei noch anderweitig benötigt wird. Physische Löschung nur dann, wenn sicher ist, dass es sich nicht um ein Auftragsdokument handelt und keine weitere Referenz besteht.

**Alternativabläufe**

- Akteur bricht den Dialog ab → keine Aktion, alle Attachments bleiben unverändert.
- Attachment existiert nicht → System antwortet mit 404.
- Parent-Objekt existiert nicht → System antwortet mit 404.
- Akteur ohne Ã„nderungsrechte → System blockiert mit 403.
- Technischer Fehler → System antwortet mit 500, keine Teillöschung.

## Alternativen

Nicht angegeben in der Notion-Quelle.

## Ergebnis

- Das Duplikat ist entfernt (Datensatz, oder Datensatz und Datei, je nach gewählter Stufe).
- Die verbleibenden Attachments des Parent-Objekts sind unverändert und konsistent.
- Die Attachmentliste zeigt den bereinigten Stand an.

