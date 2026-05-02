# UC 19/07: Verhalten bei LÃ¶schung eines Parent-Objekts

## Metadaten

- Feature: [FT (19): Attachments](../ft-19-attachments.md)
- Notion-Quelle: https://app.notion.com/p/0a3cbd97ab474bd68d30b0c09ed3a822
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Administrator, Disponent

## Ziel

Sicherstellen, dass bei LÃ¶schung eines Parent-Objekts keine verwaisten Attachment-Referenzen entstehen.

## Vorbedingungen

- Ein Parent-Objekt (Projekt, Kunde, Mitarbeiter oder Termin) existiert.
- Dem Parent-Objekt sind ein oder mehrere Attachments zugeordnet.
- Der Akteur besitzt LÃ¶schrechte fÃ¼r das Parent-Objekt.

## Ablauf

1. Der Akteur initiiert die LÃ¶schung des Parent-Objekts.
2. Das System prÃ¼ft die Berechtigung des Akteurs.
3. Das System prÃ¼ft referenzielle IntegritÃ¤t.
4. Das System entfernt den Parent-Datensatz gemÃ¤ÃŸ den Regeln des jeweiligen Features.
5. Das System stellt sicher, dass Attachment-DatensÃ¤tze nicht ohne Parent-Zuordnung bestehen bleiben.
6. Das System verhindert verwaiste FremdschlÃ¼sselzustÃ¤nde.

**AlternativablÃ¤ufe**

- Parent-Objekt existiert nicht â†’ System antwortet mit 404.
- Akteur ohne LÃ¶schrechte â†’ System blockiert mit 403.
- Technischer Fehler â†’ System antwortet mit 500.

## Alternativen

Nicht angegeben in der Notion-Quelle.

## Ergebnis

- Es existieren keine verwaisten Attachment-Referenzen.
- Die physische LÃ¶schung der Datei erfolgt weiterhin nicht.
- Die Datenbank bleibt konsistent.

