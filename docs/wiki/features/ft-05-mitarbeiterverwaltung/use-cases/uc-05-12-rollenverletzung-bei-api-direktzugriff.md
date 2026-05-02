# UC 05/12: Rollenverletzung bei API-Direktzugriff

## Metadaten

- Feature: [FT (05): Mitarbeiterverwaltung](../ft-05-mitarbeiterverwaltung.md)
- Notion-Quelle: https://app.notion.com/p/19c06c719b6a45ef9b6b5da509e5b0c5
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Nicht berechtigter Benutzer (z. B. Leser)

## Ziel

Sicherstellen, dass unberechtigte Rollen keine schreibenden Aktionen auf Mitarbeiter ausführen können.

## Vorbedingungen

- Ein Mitarbeiter existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt keine Änderungs- oder Adminrechte.

## Ablauf

1. Akteur sendet direkt einen API-Request:
    - POST `/employees`
    - PATCH `/employees/:id`
    - DELETE `/employees/:id`
    - PATCH `/employees/:id/active`
2. System prüft Rollenberechtigung.
3. System erkennt fehlende Berechtigung.
4. System blockiert die Operation.

## Alternativen

- Akteur ist nicht authentifiziert →
    
    HTTP 401 Unauthorized.
    
- Technischer Fehler →
    
    HTTP 500.

## Ergebnis

- Keine Datenänderung erfolgt.
- System antwortet mit HTTP 403 Forbidden.
- Der Mitarbeiterbestand bleibt unverändert.
- Es entstehen keine inkonsistenten Zustände.
