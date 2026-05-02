# UC 05/04: Mitarbeiter deaktivieren

## Metadaten

- Feature: [FT (05): Mitarbeiterverwaltung](../ft-05-mitarbeiterverwaltung.md)
- Notion-Quelle: https://app.notion.com/p/19c06c719b6a45ef9b6b5da509e5b0c5
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Administrator

## Ziel

Einen bestehenden Mitarbeiter fÃ¼r zukÃ¼nftige DispositionsvorgÃ¤nge sperren, ohne historische oder bestehende Terminzuordnungen zu verÃ¤ndern.

## Vorbedingungen

- Der Mitarbeiter existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt die Rolle Administrator.
- Der Mitarbeiter ist aktuell aktiv (`is_active = true`).
- Eine gÃ¼ltige Versionskennung liegt vor.

## Ablauf

1. Akteur Ã¶ffnet die Mitarbeiterverwaltung.
2. Akteur wÃ¤hlt einen aktiven Mitarbeiter.
3. Akteur lÃ¶st die Aktion â€žDeaktivierenâ€œ aus.
4. System prÃ¼ft die Berechtigung.
5. System prÃ¼ft die Versionskennung.
6. System setzt `is_active = false`.
7. System persistiert die Ã„nderung.
8. System erhÃ¶ht die Versionskennung.
9. System aktualisiert abhÃ¤ngige Auswahl- und Listenansichten.

## Alternativen

- Mitarbeiter existiert nicht â†’
    
    System antwortet mit 404.
    
- Akteur ohne Admin-Rolle â†’
    
    System blockiert mit 403.
    
- Versionskonflikt â†’
    
    System blockiert mit 409.
    
- Mitarbeiter bereits deaktiviert â†’
    
    System antwortet mit 200 ohne ZustandsÃ¤nderung.
    
- Technischer Fehler â†’
    
    System antwortet mit 500.

## Ergebnis

- Mitarbeiter ist im System weiterhin vorhanden.
- `is_active = false`.
- Bestehende Terminzuordnungen bleiben unverÃ¤ndert.
- Vergangene und zukÃ¼nftige Termine zeigen den Mitarbeiter weiterhin an.
- Der Mitarbeiter erscheint nicht mehr:
    - in Mitarbeiter-Auswahllisten fÃ¼r Disponenten,
    - in Dialogen zur Terminzuweisung,
    - in Filtern, die nur aktive Mitarbeiter berÃ¼cksichtigen.
- Administratoren kÃ¶nnen den Mitarbeiter weiterhin in der Stammdatenliste sehen.

