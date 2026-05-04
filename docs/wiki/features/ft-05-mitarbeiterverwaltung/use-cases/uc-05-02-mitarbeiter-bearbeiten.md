# UC 05/02: Mitarbeiter bearbeiten

## Metadaten

- Feature: [FT (05): Mitarbeiterverwaltung](../ft-05-mitarbeiterverwaltung.md)
- Notion-Quelle: https://app.notion.com/p/19c06c719b6a45ef9b6b5da509e5b0c5
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Administrator, Disponent

## Ziel

Bestehende Stammdaten eines Mitarbeiters ändern, ohne Termin- oder Historienlogik zu beeinflussen.

## Vorbedingungen

- Der Mitarbeiter existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt die Rolle Administrator oder Disponent.
- Der Mitarbeiterdatensatz enthält eine gültige Versionskennung (Optimistic Locking).
- Der Mitarbeiter ist nicht physisch gelöscht.

## Ablauf

1. Akteur öffnet die Mitarbeiterverwaltung.
2. Akteur wählt einen bestehenden Mitarbeiter.
3. System lädt die aktuellen Stammdaten einschlieÃŸlich Versionskennung.
4. Akteur ändert zulässige Felder.
5. Akteur speichert die Ã„nderungen.
6. System prüft die Versionskennung.
7. System validiert die Eingaben.
8. System persistiert die Ã„nderungen.
9. System erhöht die Versionskennung.
10. System aktualisiert alle abhängigen Anzeige- und Auswahlansichten.

## Alternativen

- Mitarbeiter existiert nicht →
    
    System antwortet mit 404.
    
- Akteur ohne Berechtigung →
    
    System blockiert mit 403.
    
- Versionskonflikt (parallele Bearbeitung) →
    
    System blockiert mit 409 und speichert nicht.
    
- Ungültige Eingaben →
    
    System antwortet mit 400 und speichert nicht.
    
- Technischer Persistenzfehler →
    
    System antwortet mit 500.

## Ergebnis

- Die geänderten Stammdaten sind persistent gespeichert.
- Die Versionskennung wurde erhöht.
- Terminzuweisungen bleiben unverändert.
- Historische Termine bleiben unverändert.
- Kalenderansichten, Kartenansichten und Terminformulare zeigen bei erneuter Abfrage die aktualisierten Mitarbeiterdaten.
- Es entstehen keine inkonsistenten FK-Zustände.

