# UC 19/07: Verhalten bei Löschung eines Parent-Objekts

## Metadaten

- Feature: [FT (19): Attachments](../ft-19-attachments.md)
- Notion-Quelle: https://app.notion.com/p/0a3cbd97ab474bd68d30b0c09ed3a822
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Administrator, Disponent

## Ziel

Sicherstellen, dass bei Löschung eines Parent-Objekts keine verwaisten Attachment-Referenzen entstehen.

## Vorbedingungen

- Ein Parent-Objekt (Projekt, Kunde, Mitarbeiter oder Termin) existiert.
- Dem Parent-Objekt sind ein oder mehrere Attachments zugeordnet.
- Der Akteur besitzt Löschrechte für das Parent-Objekt.

## Ablauf

1. Der Akteur initiiert die Löschung des Parent-Objekts.
2. Das System prüft die Berechtigung des Akteurs.
3. Das System prüft referenzielle Integrität.
4. Das System entfernt den Parent-Datensatz gemäÃŸ den Regeln des jeweiligen Features.
5. Das System stellt sicher, dass Attachment-Datensätze nicht ohne Parent-Zuordnung bestehen bleiben.
6. Das System verhindert verwaiste Fremdschlüsselzustände.

**Alternativabläufe**

- Parent-Objekt existiert nicht → System antwortet mit 404.
- Akteur ohne Löschrechte → System blockiert mit 403.
- Technischer Fehler → System antwortet mit 500.

## Alternativen

Nicht angegeben in der Notion-Quelle.

## Ergebnis

- Es existieren keine verwaisten Attachment-Referenzen.
- Die physische Löschung der Datei erfolgt weiterhin nicht.
- Die Datenbank bleibt konsistent.

