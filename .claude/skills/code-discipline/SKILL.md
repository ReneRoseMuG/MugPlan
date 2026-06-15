---
name: code-discipline
description: >
  Disziplin-Gate vor jedem Implementierungsauftrag. Verwenden bevor Dateien bearbeitet
  werden — besonders bei UI-Komponenten, CSS, Event-Handlern, Service-Methoden,
  geteilter Logik und Dateien in der Nähe bestehenden Verhaltens. Verhindert
  versehentliches Entfernen von UI-Elementen, unterbrochenes Event-Wiring und
  unbeabsichtigte Seiteneffekte in benachbarten Komponenten.
---

# Code-Disziplin — MuGPlan

## Prinzip 1: Zuerst lesen, dann ändern

Vor jeder Dateiänderung:
- Bei Code-Bezug zuerst Graphify (`graphify query/path/explain`), dann gezielt lesen
- Ganze Komponente oder Modul verstehen wie es heute funktioniert
- Alle UI-Elemente identifizieren: Buttons, Inputs, Icons, Event-Handler, conditional Renders
- Bei CSS: welche anderen Komponenten teilen dieselben Klassen oder Parent-Selektoren
- Bei Service-/Logik-Änderungen: welche Aufrufer hängen von der geänderten Funktion ab

## Prinzip 2: Code ist die Wahrheit

Wenn Spezifikation und bestehender Code sich widersprechen → Code gilt als aktuelle Wahrheit, außer der Auftrag sagt ausdrücklich etwas anderes.
- Funktionierenden Code nicht zurücksetzen weil ein Spec-Dokument etwas anderes beschreibt
- Diskrepanz als Beobachtung melden — nicht still „fixen"

## Prinzip 3: Auswirkungen durchdenken

Vor der ersten Änderung:
- Welche anderen Dateien werden direkt oder indirekt betroffen?
- Trifft die CSS-Änderung eine geteilte Klasse?
- Betrifft die Funktionsänderung andere Aufrufer?
- Ist die Komponente in andere eingebettet die von ihrer Struktur abhängen?

## Prinzip 4: Nur ändern was der Auftrag verlangt

- Keinen benachbarten Code refactorn der nur anders sauberer wäre
- Nichts umbenennen das nicht kaputt ist
- Keine Dateien außerhalb des Auftrags reorganisieren
- Nötige Nebenänderungen explizit benennen
- In einer Test- oder Fix-Session keinen über den Auftrag hinausgehenden Produktivcode ändern
- Bestehenden Stil im berührten Code übernehmen, auch wenn man es selbst anders machen würde
- Verwaiste Imports/Variablen/Funktionen entfernen, die erst durch die eigene Änderung ungenutzt wurden; schon vorher vorhandenen toten Code nicht löschen, sondern als Beobachtung melden
- Jede geänderte Zeile muss sich direkt auf den Auftrag zurückführen lassen

## Prinzip 5: Einfachheit zuerst — kein Over-Engineering

Minimaler Code, der den Auftrag löst — nichts Spekulatives.
- Keine Features über das Gefragte hinaus, keine Abstraktion für Einmal-Code
- Keine „Flexibilität" oder „Konfigurierbarkeit", die nicht verlangt wurde
- Kein Error-Handling für unmögliche Szenarien
- Selbsttest: Würde ein erfahrener Entwickler das als überkompliziert bezeichnen? Wenn ja — vereinfachen.

## Prinzip 6: Preservation Checklist vor dem Abschluss

### UI
- [ ] Alle Buttons, Inputs, interaktive Elemente noch vorhanden und funktional
- [ ] Alle Event-Handler noch korrekt verdrahtet
- [ ] Layout ohne unbeabsichtigten Overflow oder Überlappung
- [ ] Style-Änderung auf beabsichtigten Scope begrenzt

### Logik / Service
- [ ] Alle Aufrufer der geänderten Funktion arbeiten noch korrekt
- [ ] Alle bisher gültigen Zustände noch korrekt behandelt
- [ ] Nichts entfernt das ein anderer Teil noch braucht

### Scope & Einfachheit
- [ ] Keine ungefragte Flexibilität, Abstraktion oder spekulatives Error-Handling (Prinzip 5)
- [ ] Bestehender Stil im berührten Code beibehalten; nur Auftragsbezogenes geändert (Prinzip 4)
- [ ] Schon vorher vorhandener toter Code nicht gelöscht, sondern gemeldet (Prinzip 4)

### Projektspezifisch — MuGPlan
- [ ] Datenabruf über React Query — kein `useState` + `useEffect` für Server-State
- [ ] Mutations invalidieren über die zugehörigen Query-Keys — kein direktes manuelles `refetch` außerhalb der Query-Logik
- [ ] API-Routen folgen dem Muster in `shared/routes.ts`
- [ ] Fachliche Regeln serverseitig in Services umgesetzt, nicht nur im Frontend
- [ ] Schichten eingehalten: Route → Controller → Service → Repository
- [ ] Neue/geänderte Endpunkte haben eine Berechtigungsentscheidung
- [ ] Bestehende Tests die die geänderten Stellen abdecken wurden nachgeführt (agents.md §4.4)

Bei Befund: sofort korrigieren, außer der Auftrag erlaubt ausdrücklich das Offenlassen.
