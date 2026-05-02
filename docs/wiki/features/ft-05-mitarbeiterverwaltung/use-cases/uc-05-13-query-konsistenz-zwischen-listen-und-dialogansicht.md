# UC 05/13: Query-Konsistenz zwischen Listen- und Dialogansicht

## Metadaten

- Feature: [FT (05): Mitarbeiterverwaltung](../ft-05-mitarbeiterverwaltung.md)
- Notion-Quelle: https://app.notion.com/p/19c06c719b6a45ef9b6b5da509e5b0c5
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Administrator, Disponent

## Ziel

Sicherstellen, dass die in der Mitarbeiterliste angezeigten aktiven Mitarbeiter mit den in Dialoglisten zur Terminzuweisung verfÃ¼gbaren Mitarbeitern konsistent sind.

## Vorbedingungen

- Mitarbeiter existieren im System.
- Mindestens ein Mitarbeiter ist deaktiviert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Leserechte fÃ¼r Mitarbeiter.

## Ablauf

1. Akteur Ã¶ffnet die Mitarbeiterlistenansicht.
2. System lÃ¤dt Mitarbeiterdaten gemÃ¤ÃŸ Rollenregel:
    - Administrator erhÃ¤lt aktive und inaktive Mitarbeiter.
    - Disponent erhÃ¤lt ausschlieÃŸlich aktive Mitarbeiter.
3. Akteur Ã¶ffnet ein Terminformular.
4. System lÃ¤dt die Mitarbeiterauswahlliste.
5. System wendet dieselbe Aktiv-Filterlogik an.
6. System stellt sicher, dass die Ergebnismenge identisch zur Listenlogik ist.

## Alternativen

- Ein Mitarbeiter wird zwischenzeitlich deaktiviert â†’
    
    Bei erneuter Abfrage erscheinen die Daten konsistent gefiltert.
    
- Unterschiedliche API-Endpunkte liefern unterschiedliche Filter â†’
    
    System muss als fehlerhaft betrachtet werden.

## Ergebnis

- Disponenten sehen in Listen- und Dialogansicht ausschlieÃŸlich aktive Mitarbeiter.
- Administratoren sehen in der Stammdatenliste aktive und inaktive Mitarbeiter.
- Dialoglisten zur Terminzuweisung enthalten niemals deaktivierte Mitarbeiter.
- Es existiert keine Divergenz zwischen:
    - GET `/employees`
    - GET `/employees?active=true`
    - internen Dialogabfragen.
- Integrationstests kÃ¶nnen prÃ¼fen:
    - gleiche Anzahl aktiver Mitarbeiter in Liste und Dialog
    - deaktivierter Mitarbeiter erscheint in keiner Zuweisungsauswahl.

