# W-13 - Wochenkalender: Caching-, Render- und Aktualisierungsstrategie

## Metadaten

- Status: offen
- Priorität: Hoch
- Feature: [FT (03): Kalenderansichten](../features/ft-03-kalenderansichten/feature.md)
- Entdeckt: 02.05.26
- Art: Architektur-Refaktoring

## Befund

Der Wochenkalender soll deutlich schneller starten und beim horizontalen Navigieren stabil performant bleiben, ohne API, Schema oder Persistenz zu ändern. Der vorliegende Plan konkretisiert dafür eine wochengenaue Cache-Strategie im Frontend, priorisierte Lade-Reihenfolgen, begrenztes Rendering nur für das Scrollfenster sowie Regeln, wie sichtbare und gepufferte Wochen nach Termin-, Projekt-, Kunden-, Tag-, Notiz-, Attachment-, Tour- oder Wochenplanungsänderungen wieder aktuell werden.

## Optionen

- A) Status quo beibehalten: großer zusammenhängender Kalenderpfad ohne wochengenauen Cache, Performance- und Stale-Probleme nur punktuell nachziehen
- B) Wochenweise Frontend-Cache- und Render-Strategie einführen: sichtbare Wochen priorisiert laden, Puffer nur cachen, nicht rendern, und Aktualisierung über gezielte Query-Invalidierung steuern
- C) Größeren Umbau mit neuer API, geänderter Persistenz oder serverseitiger Spezialisierung verfolgen

## Auswirkungen eines Eingriffs

Variante B verbessert die wahrgenommene Startgeschwindigkeit des Wochenkalenders, hält Vor/Zurück und KW-Sprünge durch warmen Cache flüssiger und begrenzt gleichzeitig die DOM-Last auf das tatsächliche Scrollfenster. Fachlich ändert sich kein Kalenderinhalt; betroffen sind vor allem Frontend-Query-Struktur, Invalidierungslogik, Prefetch-Verhalten und Rendergrenzen. Kritisch ist die korrekte Aktualisierung nach Mutationen, insbesondere wenn Termine Wochen, Mitarbeiterzuordnungen oder Tourkontexte wechseln.

## Schadenspotential

Mittel bis hoch. Wenn Query-Keys oder Invalidierungen unvollständig bleiben, können im Kalender stale Karten, doppelte Termine oder fehlende Verschiebungen zwischen Wochen sichtbar werden. Zusätzlich drohen unnötige Hintergrundrequests oder beschädigte Scroll-/Restore-Pfade, wenn Ladezustände oder Prefetches das Wochenraster destabilisieren.

## Vorgeschlagene Maßnahme

Variante B als bevorzugten Pfad behandeln. Der Wochenkalender bleibt ein horizontaler Scrollcontainer, lädt aber Daten pro Woche, rendert nur das Scrollfenster und hält links und rechts einen reinen Cache-Puffer warm. Nach Mutationen werden sichtbare Wochen aktiv refetched, gepufferte Wochen über Prefix-Invalidierung und Prefetch aktualisiert. API, DB-Schema, Persistenz und Abhängigkeiten bleiben unverändert.

## Abgeleiteter Plan

- [Plan: Wochenkalender schneller starten, cachen, rendern und aktuell halten](w-13-plan-wochenkalender-caching-und-render-strategie.md)

## Quelle

- Abgeleitet aus externem Planimport vom 02.05.26
