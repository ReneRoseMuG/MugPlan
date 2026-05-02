# UC 05/05: Mitarbeiter reaktivieren

## Metadaten

- Feature: [FT (05): Mitarbeiterverwaltung](../feature.md)
- Notion-Quelle: https://app.notion.com/p/19c06c719b6a45ef9b6b5da509e5b0c5
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Administrator

## Ziel

Einen zuvor deaktivierten Mitarbeiter wieder für zukünftige Dispositionsvorgänge freigeben.

## Vorbedingungen

- Der Mitarbeiter existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt die Rolle Administrator.
- Der Mitarbeiter ist aktuell deaktiviert (`is_active = false`).
- Eine gültige Versionskennung liegt vor.

## Ablauf

1. Akteur öffnet die Mitarbeiterverwaltung.
2. Akteur wählt einen deaktivierten Mitarbeiter.
3. Akteur löst die Aktion „Reaktivieren“ aus.
4. System prüft die Berechtigung.
5. System prüft die Versionskennung.
6. System setzt `is_active = true`.
7. System persistiert die Änderung.
8. System erhöht die Versionskennung.
9. System aktualisiert abhängige Auswahl- und Listenansichten.

## Alternativen

- Mitarbeiter existiert nicht →
    
    System antwortet mit 404.
    
- Akteur ohne Admin-Rolle →
    
    System blockiert mit 403.
    
- Versionskonflikt →
    
    System blockiert mit 409.
    
- Mitarbeiter bereits aktiv →
    
    System antwortet mit 200 ohne Zustandsänderung.
    
- Technischer Fehler →
    
    System antwortet mit 500.

## Ergebnis

- Mitarbeiter ist wieder aktiv.
- `is_active = true`.
- Bestehende Terminzuordnungen bleiben unverändert.
- Der Mitarbeiter erscheint wieder:
    - in Mitarbeiterlisten,
    - in Dialogen zur Terminzuweisung,
    - in Filtern für aktive Mitarbeiter.
- Es wurden keine bestehenden Termine oder Projekte verändert.
