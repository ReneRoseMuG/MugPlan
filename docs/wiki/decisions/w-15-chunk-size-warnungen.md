# W-15 - Chunk-Size-Warnungen strategisch behandeln

## Metadaten

- Status: offen
- Priorität: Mittel
- Feature: Frontend-Build, Bundle-Struktur und Lazy Loading
- Entdeckt: 02.05.26
- Art: Architektur-Refaktoring

## Befund

Wiederkehrende Chunk-Size-Warnungen im Build sind kein bloßer Kosmetikfehler, sondern ein möglicher Hinweis auf strukturell zu große Frontend-Bundles. Vor einer Maßnahme muss transparent werden, welche Einstiegspfade große Chunks laden, welche Module oder Bibliotheken sie dominieren und ob selten genutzte Fachbereiche unnötig im Initialpfad landen.

## Optionen

- A) Warnschwelle im Build erhöhen oder Warnungen still tolerieren, ohne ihre Ursachen sauber zu analysieren
- B) Zuerst Build-Struktur analysieren, danach fachlich gut trennbare Bereiche wie Reports, Admin-Screens, Spezialansichten oder Druckpfade gezielt per Lazy Loading entkoppeln und Importkopplungen reduzieren
- C) Frühzeitig manuelle Chunk-Aufteilung auf Build-Ebene als Haupthebel einsetzen

## Auswirkungen eines Eingriffs

Variante B schafft zuerst Transparenz und nutzt dann die fachliche Struktur der App als Haupthebel. Das kann den Initialpfad entlasten, ohne blind am Build-Limit zu drehen. Betroffen sind vor allem Frontend-Navigation, Importpfade, selten genutzte Screens und eventuell zentrale Sammelimporte. Manuelle Chunk-Regeln bleiben eine technische Feinsteuerung und dürfen nicht den Platz sauberer Modulgrenzen einnehmen.

## Schadenspotential

Mittel. Die reine Analyse ist risikoarm, aber Lazy Loading und Entkopplung können Ladezustände, Importpfade und selten genutzte Wege berühren. Das höchste Risiko liegt in vorschneller manueller Chunk-Aufteilung, wenn Seiteneffekte, Initialisierungsreihenfolgen oder zufällig stabile Ladepfade unbemerkt verändert werden.

## Vorgeschlagene Maßnahme

Variante B als bevorzugten Pfad behandeln. Erst die realen Chunk-Verursacher sichtbar machen, dann klare Lazy-Loading-Kandidaten aus dem Initialpfad lösen und anschließend unnötige Importkopplungen reduzieren. Eine Erhöhung des Warning-Limits oder manuelle Chunk-Regeln erst nach bewusster Analyse und Abwägung prüfen.

## Quelle

- Notion: https://www.notion.so/34bda094354e809fb1d3da9c84ba9046
