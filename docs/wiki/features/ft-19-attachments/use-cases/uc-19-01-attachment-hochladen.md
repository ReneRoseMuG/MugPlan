# UC 19/01: Attachment hochladen

## Metadaten

- Feature: [FT (19): Attachments](../ft-19-attachments.md)
- Notion-Quelle: https://app.notion.com/p/0a3cbd97ab474bd68d30b0c09ed3a822
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Disponent

## Ziel

Eine Datei einem bestehenden Parent-Objekt (Projekt, Kunde, Mitarbeiter oder Termin) hinzufÃ¼gen.

## Vorbedingungen

- Das Parent-Objekt existiert persistent.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Ã„nderungsrechte fÃ¼r das Parent-Objekt.
- Die Detailansicht des Parent-Objekts ist geÃ¶ffnet.
- Die maximal zulÃ¤ssige DateigrÃ¶ÃŸe ist systemseitig definiert.

## Ablauf

1. Der Akteur wÃ¤hlt in der Detailansicht des Parent-Objekts die Funktion â€žAttachment hinzufÃ¼genâ€œ.
2. Das System Ã¶ffnet einen Dateiauswahldialog.
3. Der Akteur wÃ¤hlt eine lokale Datei aus.
4. Das System Ã¼bertrÃ¤gt die Datei per Multipart-Request an den Server.
5. Das System prÃ¼ft serverseitig:
    - Authentifizierung,
    - Berechtigung des Akteurs,
    - Existenz des Parent-Objekts,
    - DateigrÃ¶ÃŸe,
    - grundlegende Dateieigenschaften.
6. Das System generiert einen eindeutigen persistenten Speichername.
7. Das System speichert die Datei im definierten Upload-Verzeichnis.
8. Das System legt einen Attachment-Datensatz mit Parent-Referenz an.
9. Das System speichert Metadaten (Originaldateiname, persistenter Speichername, MIME-Typ, DateigrÃ¶ÃŸe, Erstellungszeitpunkt).
10. Das System aktualisiert die Attachmentliste in der UI.

**AlternativablÃ¤ufe**

- Der Akteur bricht den Upload vor BestÃ¤tigung ab â†’ Es wird kein Attachment gespeichert.
- Das Parent-Objekt existiert nicht â†’ System antwortet mit 404.
- Der Akteur besitzt keine Ã„nderungsrechte â†’ System blockiert mit 403.
- Die Datei Ã¼berschreitet das GrÃ¶ÃŸenlimit oder ist ungÃ¼ltig â†’ System antwortet mit 400, speichert nichts.
- Technischer Fehler bei Speicherung â†’ System antwortet mit 500, speichert nichts.

## Alternativen

Nicht angegeben in der Notion-Quelle.

## Ergebnis

- Die Datei ist persistent gespeichert.
- Ein Attachment-Datensatz mit korrekter Parent-Referenz existiert.
- Die Attachmentliste zeigt das neue Attachment konsistent an.

