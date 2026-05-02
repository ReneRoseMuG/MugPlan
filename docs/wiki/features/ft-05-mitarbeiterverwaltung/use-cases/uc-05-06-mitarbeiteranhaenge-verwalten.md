# UC 05/06: Mitarbeiteranhänge verwalten

## Metadaten

- Feature: [FT (05): Mitarbeiterverwaltung](../feature.md)
- Notion-Quelle: https://app.notion.com/p/19c06c719b6a45ef9b6b5da509e5b0c5
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Administrator, Disponent

## Ziel

Dokumente einem Mitarbeiter hinzufügen sowie bestehende Anhänge einsehen und herunterladen.

## Vorbedingungen

- Der Mitarbeiter existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Änderungsrechte für Mitarbeiter.
- Die hochzuladende Datei entspricht den erlaubten Formaten und Größenbeschränkungen.

## Ablauf – Upload

1. Akteur öffnet die Detailansicht eines Mitarbeiters.
2. Akteur wählt die Funktion „Anhang hinzufügen“.
3. Akteur wählt eine Datei aus.
4. System prüft:
    - Dateiformat,
    - Dateigröße,
    - Authentifizierung.
5. System speichert die Datei serverseitig.
6. System legt einen Attachment-Datensatz mit Parent-Referenz auf den Mitarbeiter an.
7. System gibt die gespeicherten Metadaten zurück.
8. System aktualisiert die Anhangsliste in der UI.

## Ablauf – Anzeigen / Herunterladen

1. Akteur öffnet die Anhangsliste.
2. System lädt alle dem Mitarbeiter zugeordneten Attachments.
3. Akteur wählt einen Anhang.
4. System liefert Datei über gesicherten Download-Endpunkt aus.

## Ablauf

Nicht angegeben in der Notion-Quelle.

## Alternativen

- Mitarbeiter existiert nicht →
    
    System antwortet mit 404.
    
- Akteur ohne Berechtigung →
    
    System blockiert mit 403.
    
- Ungültiges Dateiformat oder Größe →
    
    System antwortet mit 400.
    
- Technischer Speicherfehler →
    
    System antwortet mit 500.
    
- DELETE-Anfrage auf Attachment →
    
    System blockiert mit 405 oder 403.

## Ergebnis

- Der Anhang ist eindeutig dem Mitarbeiter zugeordnet.
- Keine Termin- oder Projektdaten wurden verändert.
- Mehrere Anhänge sind parallel zulässig.
- Anhänge existieren unabhängig von Terminzuweisungen.
- Es erfolgt keine physische Löschung bestehender Dateien.
- Parallele Uploads verschiedener Akteure sind zulässig und erzeugen getrennte Datensätze.
