# UC 19/04: Attachment herunterladen

## Metadaten

- Feature: [FT (19): Attachments](../ft-19-attachments.md)
- Notion-Quelle: https://app.notion.com/p/0a3cbd97ab474bd68d30b0c09ed3a822
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Disponent, Leser (rollenabhÃ¤ngig)

## Ziel

Ein Attachment eines Parent-Objekts (Projekt, Kunde, Mitarbeiter oder Termin) lokal speichern.

## Vorbedingungen

- Das Attachment existiert.
- Das zugehÃ¶rige Parent-Objekt existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Leserechte fÃ¼r das Parent-Objekt.

## Ablauf

1. Der Akteur wÃ¤hlt die Download-Funktion fÃ¼r ein Attachment.
2. Das System prÃ¼ft serverseitig:
    - Existenz des Attachments,
    - Existenz des Parent-Objekts,
    - Leseberechtigung des Akteurs.
3. Das System ruft den Download-Endpunkt mit Download-Parameter auf.
4. Das System liefert:
    - korrekten MIME-Typ,
    - Content-Disposition â€žattachmentâ€œ,
    - den gespeicherten Dateistream.
5. Der Browser startet den Download.

**AlternativablÃ¤ufe**

- Attachment nicht auffindbar â†’ System antwortet mit 404.
- Akteur ohne Leserechte â†’ System blockiert mit 403.
- Technischer Fehler â†’ System antwortet mit 500.

## Alternativen

Nicht angegeben in der Notion-Quelle.

## Ergebnis

- Die Datei wird lokal gespeichert.
- Es werden keine persistenten Daten verÃ¤ndert.

