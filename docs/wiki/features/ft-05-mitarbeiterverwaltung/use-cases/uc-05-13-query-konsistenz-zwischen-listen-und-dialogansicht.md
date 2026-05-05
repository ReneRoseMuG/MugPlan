# UC 05/13: Query-Konsistenz zwischen Listen- und Dialogansicht

## Metadaten

- Feature: [FT (05): Mitarbeiterverwaltung](../ft-05-mitarbeiterverwaltung.md)

## Akteur

Administrator, Disponent

## Ziel

Sicherstellen, dass die in der Mitarbeiterliste angezeigten aktiven Mitarbeiter mit den in Dialoglisten zur Terminzuweisung verfügbaren Mitarbeitern konsistent sind.

## Vorbedingungen

- Mitarbeiter existieren im System.
- Mindestens ein Mitarbeiter ist deaktiviert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Leserechte für Mitarbeiter.

## Ablauf

1. Akteur öffnet die Mitarbeiterlistenansicht.
2. System lädt Mitarbeiterdaten gemäß Rollenregel:
    - Administrator erhält aktive und inaktive Mitarbeiter.
    - Disponent erhält ausschließlich aktive Mitarbeiter.
3. Akteur öffnet ein Terminformular.
4. System lädt die Mitarbeiterauswahlliste.
5. System wendet dieselbe Aktiv-Filterlogik an.
6. System stellt sicher, dass die Ergebnismenge identisch zur Listenlogik ist.

## Alternativen

- Ein Mitarbeiter wird zwischenzeitlich deaktiviert →
    
    Bei erneuter Abfrage erscheinen die Daten konsistent gefiltert.
    
- Unterschiedliche API-Endpunkte liefern unterschiedliche Filter →
    
    System muss als fehlerhaft betrachtet werden.

## Ergebnis

- Disponenten sehen in Listen- und Dialogansicht ausschließlich aktive Mitarbeiter.
- Administratoren sehen in der Stammdatenliste aktive und inaktive Mitarbeiter.
- Dialoglisten zur Terminzuweisung enthalten niemals deaktivierte Mitarbeiter.
- Es existiert keine Divergenz zwischen:
    - GET `/employees`
    - GET `/employees?active=true`
    - internen Dialogabfragen.
- Integrationstests können prüfen:
    - gleiche Anzahl aktiver Mitarbeiter in Liste und Dialog
    - deaktivierter Mitarbeiter erscheint in keiner Zuweisungsauswahl.
