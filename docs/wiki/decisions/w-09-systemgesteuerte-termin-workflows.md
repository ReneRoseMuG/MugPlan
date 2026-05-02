# W-09 - Systemgesteuerte Termin-Workflows gezielt generalisieren

## Metadaten

- Status: offen
- Priorität: Mittel
- Feature: FT (06), FT (33)
- Entdeckt: 01.05.26
- Art: Architektur-Refaktoring

## Befund

Mehrere Fachflows erzeugen oder verändern reguläre Termine mit festem Systemkontext und kontrollierten Nebenwirkungen. Die Regeln liegen verteilt in Services, Endpunkten, Mutation-Events und Client-Folgeaktionen.

## Vorgeschlagene Maßnahme

Einen kleinen gemeinsamen serverseitigen Workflow-Kern für wiederkehrende Termin-/Tag-Muster prüfen. Eine große generische Regel-Engine vorerst vermeiden.

## Quelle

https://app.notion.com/p/352da094354e802f98cdf0f824251d52
