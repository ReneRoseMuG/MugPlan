# W-09 - Systemgesteuerte Termin-Workflows gezielt generalisieren

## Metadaten

- Status: offen
- Priorität: Mittel
- Feature: FT (06), FT (33)
- Entdeckt: 01.05.26
- Art: Architektur-Refaktoring

## Befund

Mehrere Fachflows erzeugen oder verändern reguläre Termine mit festem Systemkontext und kontrollierten Nebenwirkungen. Die Regeln liegen verteilt in Services, Endpunkten, Mutation-Events und Client-Folgeaktionen.

## Optionen

- A) Status quo beibehalten: Spezialfälle weiterhin einzeln je Feature ergänzen
- B) Kleinen gemeinsamen Workflow-Kern für systemgesteuerte Termin-/Tag-Fälle einführen, z. B. für Systemkontext sicherstellen, exklusive Workflow-Tags setzen, Mutation-Events erzeugen und Folgeaktionen definieren
- C) Großen generischen `RuleService` oder eine allgemeine Termin-Typ-Registry einführen

## Auswirkungen eines Eingriffs

Ein kleiner gemeinsamer Kern könnte wiederkehrende Muster aus FT-06 und FT-33 vereinheitlichen, ohne gleich eine große Regel-Engine einzuführen. Besonders relevant sind geschützte Workflow-Tags, feste Systemdaten, Konflikt- und Rollenlogik sowie Folgeaktionen wie Notizvorschläge. Andere unabhängige Terminpfade sollen bewusst nicht in eine Vollabstraktion gezogen werden.

## Schadenspotential

Mittel. Der Bereich berührt mehrere systemgesteuerte Fachflows und damit zentrale fachliche Regeln rund um Terminmutationen, Tags und Nebenwirkungen. Ein zu großer Generalisierungsschritt könnte bestehende Spezialfälle beschädigen; ein kleiner, klar begrenzter Kern ist besser kontrollierbar.

## Vorgeschlagene Maßnahme

Einen kleinen gemeinsamen serverseitigen Workflow-Kern für wiederkehrende Termin-/Tag-Muster prüfen. Eine große generische Regel-Engine vorerst vermeiden.

## Quelle
