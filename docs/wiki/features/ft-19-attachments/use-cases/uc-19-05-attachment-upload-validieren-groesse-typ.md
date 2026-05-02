# UC 19/05: Attachment-Upload validieren (GrÃ¶ÃŸe / Typ)

## Metadaten

- Feature: [FT (19): Attachments](../ft-19-attachments.md)
- Notion-Quelle: https://app.notion.com/p/0a3cbd97ab474bd68d30b0c09ed3a822
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

System

## Ziel

Sicherstellen, dass ausschlieÃŸlich zulÃ¤ssige Dateien gespeichert werden.

## Vorbedingungen

- Eine Datei wurde im Rahmen eines Upload-Vorgangs Ã¼bermittelt.

## Ablauf

1. Das System liest die Ã¼bermittelte DateigrÃ¶ÃŸe.
2. Das System vergleicht die GrÃ¶ÃŸe mit dem definierten Maximalwert.
3. Das System ermittelt grundlegende Dateieigenschaften (z. B. MIME-Typ).
4. Das System prÃ¼ft, ob der Dateityp grundsÃ¤tzlich zulÃ¤ssig ist.
5. Bei gÃ¼ltiger Datei wird der Upload-Prozess fortgesetzt.
6. Bei ungÃ¼ltiger Datei wird der Upload-Prozess abgebrochen.

**AlternativablÃ¤ufe**

- Datei Ã¼berschreitet GrÃ¶ÃŸenlimit â†’ System antwortet mit 400 und speichert nichts.
- Datei besitzt unzulÃ¤ssigen Typ â†’ System antwortet mit 400 und speichert nichts.
- Technischer Fehler bei Validierung â†’ System antwortet mit 500 und speichert nichts.

## Alternativen

Nicht angegeben in der Notion-Quelle.

## Ergebnis

- Nur valide Dateien werden persistiert.
- UngÃ¼ltige Dateien werden vollstÃ¤ndig verworfen.
- Es entstehen keine unvollstÃ¤ndigen Attachment-DatensÃ¤tze.

