# UC 19/03: Attachment Ã¶ffnen (Inline-Anzeige)

## Metadaten

- Feature: [FT (19): Attachments](../ft-19-attachments.md)
- Notion-Quelle: https://app.notion.com/p/0a3cbd97ab474bd68d30b0c09ed3a822
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Disponent, Leser (rollenabhÃ¤ngig)

## Ziel

Ein Attachment eines Parent-Objekts (Projekt, Kunde, Mitarbeiter oder Termin) direkt im Browser anzeigen, sofern der Dateityp Inline-Anzeige unterstÃ¼tzt.

## Vorbedingungen

- Das Attachment existiert.
- Das zugehÃ¶rige Parent-Objekt existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Leserechte fÃ¼r das Parent-Objekt.

## Ablauf

1. Der Akteur wÃ¤hlt ein Attachment aus der Liste.
2. Das System prÃ¼ft serverseitig:
    - Existenz des Attachments,
    - Existenz des Parent-Objekts,
    - Leseberechtigung des Akteurs.
3. Das System ruft den Download-Endpunkt auf.
4. Das System liefert die Datei mit:
    - korrektem MIME-Typ,
    - Content-Disposition â€žinlineâ€œ, sofern Dateityp Inline-Anzeige erlaubt.
5. Der Browser zeigt die Datei an.

**AlternativablÃ¤ufe**

- Dateityp nicht inlinefÃ¤hig â†’ System liefert Content-Disposition â€žattachmentâ€œ.
- Attachment existiert nicht â†’ System antwortet mit 404.
- Akteur ohne Leserechte â†’ System blockiert mit 403.
- Technischer Fehler â†’ System antwortet mit 500.

## Alternativen

Nicht angegeben in der Notion-Quelle.

## Ergebnis

- Das Attachment wird inline angezeigt oder als Download behandelt.
- Es werden keine persistenten Daten verÃ¤ndert.

