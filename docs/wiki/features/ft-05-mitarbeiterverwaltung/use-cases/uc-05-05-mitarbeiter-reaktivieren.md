# UC 05/05: Mitarbeiter reaktivieren

## Metadaten

- Feature: [FT (05): Mitarbeiterverwaltung](../ft-05-mitarbeiterverwaltung.md)
- Notion-Quelle: https://app.notion.com/p/19c06c719b6a45ef9b6b5da509e5b0c5
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Administrator

## Ziel

Einen zuvor deaktivierten Mitarbeiter wieder fÃ¼r zukÃ¼nftige DispositionsvorgÃ¤nge freigeben.

## Vorbedingungen

- Der Mitarbeiter existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt die Rolle Administrator.
- Der Mitarbeiter ist aktuell deaktiviert (`is_active = false`).
- Eine gÃ¼ltige Versionskennung liegt vor.

## Ablauf

1. Akteur Ã¶ffnet die Mitarbeiterverwaltung.
2. Akteur wÃ¤hlt einen deaktivierten Mitarbeiter.
3. Akteur lÃ¶st die Aktion â€žReaktivierenâ€œ aus.
4. System prÃ¼ft die Berechtigung.
5. System prÃ¼ft die Versionskennung.
6. System setzt `is_active = true`.
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
    
- Mitarbeiter bereits aktiv â†’
    
    System antwortet mit 200 ohne ZustandsÃ¤nderung.
    
- Technischer Fehler â†’
    
    System antwortet mit 500.

## Ergebnis

- Mitarbeiter ist wieder aktiv.
- `is_active = true`.
- Bestehende Terminzuordnungen bleiben unverÃ¤ndert.
- Der Mitarbeiter erscheint wieder:
    - in Mitarbeiterlisten,
    - in Dialogen zur Terminzuweisung,
    - in Filtern fÃ¼r aktive Mitarbeiter.
- Es wurden keine bestehenden Termine oder Projekte verÃ¤ndert.

