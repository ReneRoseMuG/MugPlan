# UC 05/02: Mitarbeiter bearbeiten

## Metadaten

- Feature: [FT (05): Mitarbeiterverwaltung](../ft-05-mitarbeiterverwaltung.md)
- Notion-Quelle: https://app.notion.com/p/19c06c719b6a45ef9b6b5da509e5b0c5
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Administrator, Disponent

## Ziel

Bestehende Stammdaten eines Mitarbeiters Ã¤ndern, ohne Termin- oder Historienlogik zu beeinflussen.

## Vorbedingungen

- Der Mitarbeiter existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt die Rolle Administrator oder Disponent.
- Der Mitarbeiterdatensatz enthÃ¤lt eine gÃ¼ltige Versionskennung (Optimistic Locking).
- Der Mitarbeiter ist nicht physisch gelÃ¶scht.

## Ablauf

1. Akteur Ã¶ffnet die Mitarbeiterverwaltung.
2. Akteur wÃ¤hlt einen bestehenden Mitarbeiter.
3. System lÃ¤dt die aktuellen Stammdaten einschlieÃŸlich Versionskennung.
4. Akteur Ã¤ndert zulÃ¤ssige Felder.
5. Akteur speichert die Ã„nderungen.
6. System prÃ¼ft die Versionskennung.
7. System validiert die Eingaben.
8. System persistiert die Ã„nderungen.
9. System erhÃ¶ht die Versionskennung.
10. System aktualisiert alle abhÃ¤ngigen Anzeige- und Auswahlansichten.

## Alternativen

- Mitarbeiter existiert nicht â†’
    
    System antwortet mit 404.
    
- Akteur ohne Berechtigung â†’
    
    System blockiert mit 403.
    
- Versionskonflikt (parallele Bearbeitung) â†’
    
    System blockiert mit 409 und speichert nicht.
    
- UngÃ¼ltige Eingaben â†’
    
    System antwortet mit 400 und speichert nicht.
    
- Technischer Persistenzfehler â†’
    
    System antwortet mit 500.

## Ergebnis

- Die geÃ¤nderten Stammdaten sind persistent gespeichert.
- Die Versionskennung wurde erhÃ¶ht.
- Terminzuweisungen bleiben unverÃ¤ndert.
- Historische Termine bleiben unverÃ¤ndert.
- Kalenderansichten, Kartenansichten und Terminformulare zeigen bei erneuter Abfrage die aktualisierten Mitarbeiterdaten.
- Es entstehen keine inkonsistenten FK-ZustÃ¤nde.

