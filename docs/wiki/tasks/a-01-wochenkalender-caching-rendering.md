# A-01 - Wochenkalender schneller starten, cachen, rendern und aktuell halten

## Metadaten

- Status: offen
- Dringlichkeit: Hoch
- Thema: Kalender-Performance
- Typ: Implementierung
- Erstellt: 06.05.26
- Quelle: [W-13-Plan](../decisions/w-13-plan-wochenkalender-caching-und-render-strategie.md), [W-13-Entscheidung](../decisions/w-13-wochenkalender-caching-und-render-strategie.md)
- Verantwortlich: offen
- Journal: offen

## Beziehungen

- Features:
  - [FT (03): Kalenderansichten](../features/ft-03-kalenderansichten/ft-03-kalenderansichten.md)
- Use Cases:
  - Noch gezielt je Kalender-Use-Case zu verlinken.
- Entscheidungen:
  - [W-13 - Wochenkalender: Caching-, Render- und Aktualisierungsstrategie](../decisions/w-13-wochenkalender-caching-und-render-strategie.md)

## Ziel

Der Wochenkalender soll schneller starten, sichtbare Wochen priorisiert laden, zusätzliche Wochen nur im Cache vorhalten und nach Mutationen zuverlässig aktuell werden.

## Ausgangslage

Der vorliegende Plan beschreibt bereits eine konkrete wochengenaue Cache-, Prefetch-, Invalidierungs- und Renderstrategie. Damit ist der Punkt nicht mehr nur eine Entscheidung, sondern ein nachverfolgbares Umsetzungspaket.

## Umfang

Zur Aufgabe gehören die Umsetzung der wochengenauen Query-Keys, die Priorisierung sichtbarer Wochen, der reine Cache-Puffer links und rechts des Scrollfensters, begrenztes Rendering sowie gezielte Invalidierung nach Termin-, Projekt-, Kunden-, Tag-, Notiz-, Attachment-, Tour- und Wochenplanungsänderungen.

Nicht Teil der Aufgabe sind neue API-Endpunkte, DB-Schemaänderungen, Persistenzänderungen oder neue Abhängigkeiten.

## Umsetzungshinweise

- Render-/Scrollfenster bleibt von Cache-Puffer getrennt.
- Cache-Puffer ist Datenvorrat und wird nicht zusätzlich gerendert.
- Unsichere Mutationsergebnisse müssen konservativ den gesamten `calendarAppointments`-Prefix invalidieren.
- Rollen- und Sichtbarkeitsregeln bleiben serverseitig unverändert; die Aufgabe darf keine Kalenderdaten für unzulässige Rollen sichtbar machen.
- Erwartete Prüfungen sind Unit-Tests für Fensterberechnung, Query-Keys und Invalidierung sowie relevante Browser-E2E-Szenarien für KW-Sprung, Scrollverhalten und Terminänderungen.

## Anhänge

- Keine Anhänge.

## Blocker und offene Fragen

- Relevante Use Cases sind vor Umsetzung gezielt zu verlinken.

## Abschluss

- Abgeschlossen am: offen
- Ergebnis: offen
- Verifikation: offen
- Folgeaufgaben: offen
