# UC 05/07: Mitarbeiter anzeigen

## Metadaten

- Feature: [FT (05): Mitarbeiterverwaltung](../ft-05-mitarbeiterverwaltung.md)

## Akteur

Administrator, Disponent, Leser

## Ziel

Mitarbeiterdaten in Listen- und Detailansichten anzeigen, rollenbasiert gefiltert.

## Vorbedingungen

- Der Akteur ist authentifiziert.
- Der Mitarbeiterbestand ist im System vorhanden.

## Ablauf – Listenansicht

1. Akteur öffnet die Mitarbeiterverwaltung.
2. System ermittelt die Rolle des Akteurs.
3. System lädt Mitarbeiterdaten:
    - Administrator erhält aktive und inaktive Mitarbeiter.
    - Disponent erhält ausschließlich aktive Mitarbeiter.
    - Leser erhält ausschließlich Lesedaten gemäß seiner Rolle.
4. System stellt Daten in Board- oder Tabellenansicht dar.

## Ablauf – Detailansicht

1. Akteur wählt einen Mitarbeiter aus der Liste.
2. System lädt vollständige Stammdaten.
3. System lädt zugehörige Anhänge.
4. System lädt Terminübersicht gemäß UC 03.
5. System zeigt Detailansicht an.

## Ablauf


## Alternativen

- Mitarbeiter existiert nicht →
    
    System antwortet mit 404.
    
- Akteur ohne Leserechte →
    
    System blockiert mit 403.
    
- Keine Mitarbeiter vorhanden →
    
    System zeigt leere Liste ohne Fehler.
    
- Parallel wird Mitarbeiter deaktiviert →
    
    Disponent erhält bei nächster Abfrage aktualisierte Liste ohne diesen Mitarbeiter.

## Ergebnis

- Mitarbeiterdaten werden rollenbasiert korrekt angezeigt.
- Disponenten sehen keine deaktivierten Mitarbeiter.
- Administratoren sehen vollständigen Bestand.
- Terminübersicht entspricht dem aktuellen Stand der Terminrelation.
- Es erfolgt keinerlei fachliche Datenänderung.
- Es entstehen keine inkonsistenten Zustände durch Anzeigeoperationen.
