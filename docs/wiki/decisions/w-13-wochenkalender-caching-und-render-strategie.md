# W-13 - Wochenkalender: Caching-, Render- und Aktualisierungsstrategie

## Metadaten

- Status: offen
- PrioritÃ¤t: Hoch
- Feature: [FT (03): Kalenderansichten](../features/ft-03-kalenderansichten/ft-03-kalenderansichten.md)
- Entdeckt: 02.05.26
- Art: Architektur-Refaktoring

## Befund

Der Wochenkalender soll deutlich schneller starten und beim horizontalen Navigieren stabil performant bleiben, ohne API, Schema oder Persistenz zu Ã¤ndern. Der vorliegende Plan konkretisiert dafÃ¼r eine wochengenaue Cache-Strategie im Frontend, priorisierte Lade-Reihenfolgen, begrenztes Rendering nur fÃ¼r das Scrollfenster sowie Regeln, wie sichtbare und gepufferte Wochen nach Termin-, Projekt-, Kunden-, Tag-, Notiz-, Attachment-, Tour- oder WochenplanungsÃ¤nderungen wieder aktuell werden.

## Optionen

- A) Status quo beibehalten: groÃŸer zusammenhÃ¤ngender Kalenderpfad ohne wochengenauen Cache, Performance- und Stale-Probleme nur punktuell nachziehen
- B) Wochenweise Frontend-Cache- und Render-Strategie einfÃ¼hren: sichtbare Wochen priorisiert laden, Puffer nur cachen, nicht rendern, und Aktualisierung Ã¼ber gezielte Query-Invalidierung steuern
- C) GrÃ¶ÃŸeren Umbau mit neuer API, geÃ¤nderter Persistenz oder serverseitiger Spezialisierung verfolgen

## Auswirkungen eines Eingriffs

Variante B verbessert die wahrgenommene Startgeschwindigkeit des Wochenkalenders, hÃ¤lt Vor/ZurÃ¼ck und KW-SprÃ¼nge durch warmen Cache flÃ¼ssiger und begrenzt gleichzeitig die DOM-Last auf das tatsÃ¤chliche Scrollfenster. Fachlich Ã¤ndert sich kein Kalenderinhalt; betroffen sind vor allem Frontend-Query-Struktur, Invalidierungslogik, Prefetch-Verhalten und Rendergrenzen. Kritisch ist die korrekte Aktualisierung nach Mutationen, insbesondere wenn Termine Wochen, Mitarbeiterzuordnungen oder Tourkontexte wechseln.

## Schadenspotential

Mittel bis hoch. Wenn Query-Keys oder Invalidierungen unvollstÃ¤ndig bleiben, kÃ¶nnen im Kalender stale Karten, doppelte Termine oder fehlende Verschiebungen zwischen Wochen sichtbar werden. ZusÃ¤tzlich drohen unnÃ¶tige Hintergrundrequests oder beschÃ¤digte Scroll-/Restore-Pfade, wenn LadezustÃ¤nde oder Prefetches das Wochenraster destabilisieren.

## Vorgeschlagene MaÃŸnahme

Variante B als bevorzugten Pfad behandeln. Der Wochenkalender bleibt ein horizontaler Scrollcontainer, lÃ¤dt aber Daten pro Woche, rendert nur das Scrollfenster und hÃ¤lt links und rechts einen reinen Cache-Puffer warm. Nach Mutationen werden sichtbare Wochen aktiv refetched, gepufferte Wochen Ã¼ber Prefix-Invalidierung und Prefetch aktualisiert. API, DB-Schema, Persistenz und AbhÃ¤ngigkeiten bleiben unverÃ¤ndert.

## Abgeleiteter Plan

- [Plan: Wochenkalender schneller starten, cachen, rendern und aktuell halten](w-13-plan-wochenkalender-caching-und-render-strategie.md)

## Quelle

- Abgeleitet aus externem Planimport vom 02.05.26

