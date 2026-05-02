# UC 05/06: MitarbeiteranhÃ¤nge verwalten

## Metadaten

- Feature: [FT (05): Mitarbeiterverwaltung](../ft-05-mitarbeiterverwaltung.md)
- Notion-Quelle: https://app.notion.com/p/19c06c719b6a45ef9b6b5da509e5b0c5
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Administrator, Disponent

## Ziel

Dokumente einem Mitarbeiter hinzufÃ¼gen sowie bestehende AnhÃ¤nge einsehen und herunterladen.

## Vorbedingungen

- Der Mitarbeiter existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Ã„nderungsrechte fÃ¼r Mitarbeiter.
- Die hochzuladende Datei entspricht den erlaubten Formaten und GrÃ¶ÃŸenbeschrÃ¤nkungen.

## Ablauf â€“ Upload

1. Akteur Ã¶ffnet die Detailansicht eines Mitarbeiters.
2. Akteur wÃ¤hlt die Funktion â€žAnhang hinzufÃ¼genâ€œ.
3. Akteur wÃ¤hlt eine Datei aus.
4. System prÃ¼ft:
    - Dateiformat,
    - DateigrÃ¶ÃŸe,
    - Authentifizierung.
5. System speichert die Datei serverseitig.
6. System legt einen Attachment-Datensatz mit Parent-Referenz auf den Mitarbeiter an.
7. System gibt die gespeicherten Metadaten zurÃ¼ck.
8. System aktualisiert die Anhangsliste in der UI.

## Ablauf â€“ Anzeigen / Herunterladen

1. Akteur Ã¶ffnet die Anhangsliste.
2. System lÃ¤dt alle dem Mitarbeiter zugeordneten Attachments.
3. Akteur wÃ¤hlt einen Anhang.
4. System liefert Datei Ã¼ber gesicherten Download-Endpunkt aus.

## Ablauf

Nicht angegeben in der Notion-Quelle.

## Alternativen

- Mitarbeiter existiert nicht â†’
    
    System antwortet mit 404.
    
- Akteur ohne Berechtigung â†’
    
    System blockiert mit 403.
    
- UngÃ¼ltiges Dateiformat oder GrÃ¶ÃŸe â†’
    
    System antwortet mit 400.
    
- Technischer Speicherfehler â†’
    
    System antwortet mit 500.
    
- DELETE-Anfrage auf Attachment â†’
    
    System blockiert mit 405 oder 403.

## Ergebnis

- Der Anhang ist eindeutig dem Mitarbeiter zugeordnet.
- Keine Termin- oder Projektdaten wurden verÃ¤ndert.
- Mehrere AnhÃ¤nge sind parallel zulÃ¤ssig.
- AnhÃ¤nge existieren unabhÃ¤ngig von Terminzuweisungen.
- Es erfolgt keine physische LÃ¶schung bestehender Dateien.
- Parallele Uploads verschiedener Akteure sind zulÃ¤ssig und erzeugen getrennte DatensÃ¤tze.

