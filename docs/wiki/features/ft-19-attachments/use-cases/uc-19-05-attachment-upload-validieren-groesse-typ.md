# UC 19/05: Attachment-Upload validieren (GröÃŸe / Typ)

## Metadaten

- Feature: [FT (19): Attachments](../ft-19-attachments.md)
- Notion-Quelle: https://app.notion.com/p/0a3cbd97ab474bd68d30b0c09ed3a822
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

System

## Ziel

Sicherstellen, dass ausschlieÃŸlich zulässige Dateien gespeichert werden.

## Vorbedingungen

- Eine Datei wurde im Rahmen eines Upload-Vorgangs übermittelt.

## Ablauf

1. Das System liest die übermittelte DateigröÃŸe.
2. Das System vergleicht die GröÃŸe mit dem definierten Maximalwert.
3. Das System ermittelt grundlegende Dateieigenschaften (z. B. MIME-Typ).
4. Das System prüft, ob der Dateityp grundsätzlich zulässig ist.
5. Bei gültiger Datei wird der Upload-Prozess fortgesetzt.
6. Bei ungültiger Datei wird der Upload-Prozess abgebrochen.

**Alternativabläufe**

- Datei überschreitet GröÃŸenlimit → System antwortet mit 400 und speichert nichts.
- Datei besitzt unzulässigen Typ → System antwortet mit 400 und speichert nichts.
- Technischer Fehler bei Validierung → System antwortet mit 500 und speichert nichts.

## Alternativen

Nicht angegeben in der Notion-Quelle.

## Ergebnis

- Nur valide Dateien werden persistiert.
- Ungültige Dateien werden vollständig verworfen.
- Es entstehen keine unvollständigen Attachment-Datensätze.

