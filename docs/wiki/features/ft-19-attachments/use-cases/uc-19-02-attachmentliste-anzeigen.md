# UC 19/02: Attachmentliste anzeigen

## Metadaten

- Feature: [FT (19): Attachments](../ft-19-attachments.md)
- Notion-Quelle: https://app.notion.com/p/0a3cbd97ab474bd68d30b0c09ed3a822
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Disponent, Leser (rollenabhängig)

## Ziel

Alle einem Parent-Objekt (Projekt, Kunde, Mitarbeiter oder Termin) zugeordneten Attachments anzeigen.

## Vorbedingungen

- Das Parent-Objekt existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Leserechte für das Parent-Objekt.

## Ablauf

1. Der Akteur öffnet die Detailansicht des Parent-Objekts.
2. Das System prüft serverseitig die Leseberechtigung.
3. Das System lädt alle dem Parent-Objekt zugeordneten Attachments.
4. Das System liefert für jedes Attachment mindestens:
    - Originaldateiname,
    - DateigröÃŸe,
    - MIME-Typ,
    - Erstellungszeitpunkt.
5. Das System zeigt die strukturierte Liste in der UI an.

**Alternativabläufe**

- Keine Attachments vorhanden → System zeigt eine leere Liste.
- Parent-Objekt existiert nicht → System antwortet mit 404.
- Akteur ohne Leserechte → System blockiert mit 403.
- Technischer Fehler → System antwortet mit 500.

## Alternativen

Nicht angegeben in der Notion-Quelle.

## Ergebnis

- Alle vorhandenen Attachments sind vollständig und konsistent sichtbar.
- Es werden keine Daten verändert.

