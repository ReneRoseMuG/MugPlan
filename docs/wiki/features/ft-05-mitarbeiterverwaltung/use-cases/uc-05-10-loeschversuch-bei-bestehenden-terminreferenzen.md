# UC 05/10: Löschversuch bei bestehenden Terminreferenzen

## Metadaten

- Feature: [FT (05): Mitarbeiterverwaltung](../ft-05-mitarbeiterverwaltung.md)

## Akteur

Administrator

## Ziel

Sicherstellen, dass ein Mitarbeiter nicht gelöscht werden kann, wenn noch Terminreferenzen bestehen.

## Vorbedingungen

- Der Mitarbeiter existiert.
- Mindestens ein Termin enthält den Mitarbeiter in seiner gespeicherten Mitarbeiterliste.
- Der Akteur besitzt Administratorrechte.

## Ablauf

1. Akteur öffnet die Mitarbeiterverwaltung.
2. Akteur wählt einen bestehenden Mitarbeiter.
3. Akteur löst die Löschaktion aus.
4. System prüft, ob Terminreferenzen existieren.
5. System erkennt mindestens eine bestehende Zuordnung.
6. System blockiert den Löschvorgang.

## Alternativen

- Mitarbeiter besitzt keine Terminreferenzen →
    
    System erlaubt die Löschung.
    
- Mitarbeiter existiert nicht →
    
    System antwortet mit 404.
    
- Akteur ohne Administratorrolle →
    
    System blockiert mit 403.
    
- Technischer Fehler →
    
    System antwortet mit 500.

## Ergebnis

- Mitarbeiter bleibt im System erhalten.
- Es entstehen keine verwaisten Terminreferenzen.
- System antwortet mit HTTP 409 Conflict bei bestehender Referenz.
- Die Datenbank bleibt konsistent.
