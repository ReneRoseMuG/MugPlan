# UC 19/02: Attachmentliste anzeigen

## Metadaten

- Feature: [FT (19): Attachments](../ft-19-attachments.md)
- Notion-Quelle: https://app.notion.com/p/0a3cbd97ab474bd68d30b0c09ed3a822
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Disponent, Leser (rollenabhÃ¤ngig)

## Ziel

Alle einem Parent-Objekt (Projekt, Kunde, Mitarbeiter oder Termin) zugeordneten Attachments anzeigen.

## Vorbedingungen

- Das Parent-Objekt existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Leserechte fÃ¼r das Parent-Objekt.

## Ablauf

1. Der Akteur Ã¶ffnet die Detailansicht des Parent-Objekts.
2. Das System prÃ¼ft serverseitig die Leseberechtigung.
3. Das System lÃ¤dt alle dem Parent-Objekt zugeordneten Attachments.
4. Das System liefert fÃ¼r jedes Attachment mindestens:
    - Originaldateiname,
    - DateigrÃ¶ÃŸe,
    - MIME-Typ,
    - Erstellungszeitpunkt.
5. Das System zeigt die strukturierte Liste in der UI an.

**AlternativablÃ¤ufe**

- Keine Attachments vorhanden â†’ System zeigt eine leere Liste.
- Parent-Objekt existiert nicht â†’ System antwortet mit 404.
- Akteur ohne Leserechte â†’ System blockiert mit 403.
- Technischer Fehler â†’ System antwortet mit 500.

## Alternativen

Nicht angegeben in der Notion-Quelle.

## Ergebnis

- Alle vorhandenen Attachments sind vollstÃ¤ndig und konsistent sichtbar.
- Es werden keine Daten verÃ¤ndert.

