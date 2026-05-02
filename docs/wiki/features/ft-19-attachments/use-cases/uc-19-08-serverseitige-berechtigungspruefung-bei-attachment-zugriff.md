# UC 19/08: Serverseitige BerechtigungsprÃ¼fung bei Attachment-Zugriff

## Metadaten

- Feature: [FT (19): Attachments](../ft-19-attachments.md)
- Notion-Quelle: https://app.notion.com/p/0a3cbd97ab474bd68d30b0c09ed3a822
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

System

## Ziel

Sicherstellen, dass jeder Zugriff auf ein Attachment ausschlieÃŸlich auf Basis der Parent-Berechtigungen erfolgt.

## Vorbedingungen

- Ein Attachment existiert.
- Ein Zugriff (Anzeige oder Download) wird angefordert.

## Ablauf

1. Das System identifiziert das angeforderte Attachment.
2. Das System ermittelt das zugehÃ¶rige Parent-Objekt.
3. Das System prÃ¼ft die Berechtigung des Akteurs fÃ¼r dieses Parent-Objekt.
4. Bei gÃ¼ltiger Berechtigung wird der Zugriff gewÃ¤hrt.
5. Bei fehlender Berechtigung wird der Zugriff verweigert.

**AlternativablÃ¤ufe**

- Attachment existiert nicht â†’ System antwortet mit 404.
- Parent-Objekt existiert nicht â†’ System antwortet mit 404.
- Akteur ohne Berechtigung â†’ System blockiert mit 403.
- Technischer Fehler â†’ System antwortet mit 500.

## Alternativen

Nicht angegeben in der Notion-Quelle.

## Ergebnis

- Attachment-Zugriffe sind vollstÃ¤ndig an Parent-Berechtigungen gebunden.
- Es existieren keine eigenstÃ¤ndigen Attachment-Berechtigungen.
- Direkter Zugriff auf das Upload-Verzeichnis ist nicht mÃ¶glich.

