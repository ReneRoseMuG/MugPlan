# UC 05/04: Mitarbeiter deaktivieren

## Metadaten

- Feature: [FT (05): Mitarbeiterverwaltung](../ft-05-mitarbeiterverwaltung.md)
- Notion-Quelle: https://app.notion.com/p/19c06c719b6a45ef9b6b5da509e5b0c5
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Administrator

## Ziel

Einen bestehenden Mitarbeiter für zukünftige Dispositionsvorgänge sperren, ohne historische oder bestehende Terminzuordnungen zu verändern.

## Vorbedingungen

- Der Mitarbeiter existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt die Rolle Administrator.
- Der Mitarbeiter ist aktuell aktiv (`is_active = true`).
- Eine gültige Versionskennung liegt vor.

## Ablauf

1. Akteur öffnet die Mitarbeiterverwaltung.
2. Akteur wählt einen aktiven Mitarbeiter.
3. Akteur löst die Aktion „Deaktivieren“ aus.
4. System prüft die Berechtigung.
5. System prüft die Versionskennung.
6. System setzt `is_active = false`.
7. System persistiert die Ã„nderung.
8. System erhöht die Versionskennung.
9. System aktualisiert abhängige Auswahl- und Listenansichten.

## Alternativen

- Mitarbeiter existiert nicht →
    
    System antwortet mit 404.
    
- Akteur ohne Admin-Rolle →
    
    System blockiert mit 403.
    
- Versionskonflikt →
    
    System blockiert mit 409.
    
- Mitarbeiter bereits deaktiviert →
    
    System antwortet mit 200 ohne Zustandsänderung.
    
- Technischer Fehler →
    
    System antwortet mit 500.

## Ergebnis

- Mitarbeiter ist im System weiterhin vorhanden.
- `is_active = false`.
- Bestehende Terminzuordnungen bleiben unverändert.
- Vergangene und zukünftige Termine zeigen den Mitarbeiter weiterhin an.
- Der Mitarbeiter erscheint nicht mehr:
    - in Mitarbeiter-Auswahllisten für Disponenten,
    - in Dialogen zur Terminzuweisung,
    - in Filtern, die nur aktive Mitarbeiter berücksichtigen.
- Administratoren können den Mitarbeiter weiterhin in der Stammdatenliste sehen.

