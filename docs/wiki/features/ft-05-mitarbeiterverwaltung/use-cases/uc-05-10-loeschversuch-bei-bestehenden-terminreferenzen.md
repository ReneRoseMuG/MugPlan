# UC 05/10: LÃ¶schversuch bei bestehenden Terminreferenzen

## Metadaten

- Feature: [FT (05): Mitarbeiterverwaltung](../ft-05-mitarbeiterverwaltung.md)
- Notion-Quelle: https://app.notion.com/p/19c06c719b6a45ef9b6b5da509e5b0c5
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Administrator

## Ziel

Sicherstellen, dass ein Mitarbeiter nicht gelÃ¶scht werden kann, wenn noch Terminreferenzen bestehen.

## Vorbedingungen

- Der Mitarbeiter existiert.
- Mindestens ein Termin enthÃ¤lt den Mitarbeiter in seiner gespeicherten Mitarbeiterliste.
- Der Akteur besitzt Administratorrechte.

## Ablauf

1. Akteur Ã¶ffnet die Mitarbeiterverwaltung.
2. Akteur wÃ¤hlt einen bestehenden Mitarbeiter.
3. Akteur lÃ¶st die LÃ¶schaktion aus.
4. System prÃ¼ft, ob Terminreferenzen existieren.
5. System erkennt mindestens eine bestehende Zuordnung.
6. System blockiert den LÃ¶schvorgang.

## Alternativen

- Mitarbeiter besitzt keine Terminreferenzen â†’
    
    System erlaubt die LÃ¶schung.
    
- Mitarbeiter existiert nicht â†’
    
    System antwortet mit 404.
    
- Akteur ohne Administratorrolle â†’
    
    System blockiert mit 403.
    
- Technischer Fehler â†’
    
    System antwortet mit 500.

## Ergebnis

- Mitarbeiter bleibt im System erhalten.
- Es entstehen keine verwaisten Terminreferenzen.
- System antwortet mit HTTP 409 Conflict bei bestehender Referenz.
- Die Datenbank bleibt konsistent.

