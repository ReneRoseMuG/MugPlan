---
name: exploration
description: >
  Code-Exploration und Impact-Analyse für MugPlan — verstehe zuerst, was existiert
  und was betroffen ist, bevor irgendwas geändert wird.
  Auslöser: "was ist betroffen", "gibt es schon etwas für", "finde ähnliche Implementierungen",
  "was passiert wenn ich X ändere", "welche Dateien sind betroffen", "zeig mir wie X funktioniert".
---

# Exploration-Skill — MugPlan

Einstiegspunkt für alle Explorations- und Impact-Analyse-Aufträge.
Antwortet auf: "Was ist hier?", "Was passiert wenn ich X ändere?", "Gibt es schon etwas für Y?"

---

## MugPlan-Schichtenreferenz

```
shared/routes.ts                          ← API-Contracts (Contract-First, Pflichtquelle)
shared/schema.ts                          ← Datenbankschema (Drizzle ORM)

server/routes/*Routes.ts                  ← Route-Registrierung
server/controllers/*Controller.ts         ← Request-Handling, Validierung
server/services/*Service.ts               ← Fachlogik
server/repositories/*Repository.ts        ← Datenbankzugriff

client/src/pages/Home.tsx                 ← Hauptseite, Tab-Navigation
client/src/components/                    ← Fachliche Komponenten
client/src/components/ui/                 ← Basiskomponenten (ListLayout, BoardView, EntityCard …)
client/src/hooks/                         ← React Query Hooks und Datenbeschaffung
```

Verbindliche UI-Bausteine: `docs/UI-Komponenten-Referenz.md`
Verbindliche Architekturregeln: `docs/architecture.md`

---

## Trigger

- Auftrag liegt vor, aber Zuständigkeiten oder vorhandene Lösungen sind unklar
- Vor einer Architektur- oder Implementierungsentscheidung
- "Finde ähnliche Implementierungen"
- "Was ist betroffen wenn ich X ändere?"
- "Gibt es bereits etwas für Y?"
- Neuer Entwickler oder neuer Codebereich ohne Vorkenntnisse
- Audit- oder Review-Auftrag ohne konkrete Änderungsabsicht

## Nicht-Trigger

- Ziel, zuständige Datei und Umfang sind bereits vollständig klar
- Auftrag ist rein redaktionell ohne Codebezug

---

## Auftragsarten

| Art | Beschreibung |
|---|---|
| Strukturerkundung | Was existiert in diesem Bereich, welche Muster gibt es? |
| Impact-Analyse | Was ist betroffen wenn Komponente X verändert wird? |
| Mustersuche | Gibt es bereits etwas das Y tut oder Y ähnelt? |
| Vollanalyse | Alle drei kombiniert vor einer größeren Änderung |

---

## Pflichtablauf

1. Graphify-Protokoll anwenden (`skills/core/graphify-protocol.md`) — Pflicht als Schritt 1:
   ```bash
   graphify query "<fachlicher Begriff>"
   graphify path "<UI-Einstieg>" "<Service oder Repository>"
   ```
2. Auftragsart bestimmen: Strukturerkundung, Impact, Mustersuche oder Vollanalyse.
3. Passende Vertiefungsrichtung wählen:
   - Strukturerkundung → Graphfunde + Schichtenreferenz oben durchgehen
   - Impact-Analyse → alle Aufrufer, Importe, Abhängigkeiten über alle Schichten tracen
   - Mustersuche → vergleichbare Implementierungen im selben Schichtbereich suchen
4. Quellcodeprüfung der Graphfunde durchführen.
5. Ergebnis konsolidieren: gefundene Komponenten, Muster, Abhängigkeiten, offene Fragen.

---

## Leitplanken

- Keine Implementierungsentscheidung treffen — nur analysieren und dokumentieren.
- Keine Codeänderung aus einem reinen Explorationsauftrag ableiten.
- Unsicherheiten als Annahmen kennzeichnen, nicht stillschweigend auflösen.
- Analyseumfang proportional zur geplanten Änderungsgröße halten.
- Widersprüche zwischen Graphfund und Quellcode immer zugunsten des Quellcodes auflösen.
- Bei UI-Themen: `docs/UI-Komponenten-Referenz.md` als Referenz für vorhandene Bausteine nutzen.

---

## Übergabeformat

| Feld | Inhalt |
|---|---|
| Auftrag | Auftragsart und Zielbereich |
| Graphfunde | Relevante Knoten, Pfade, Vernetzung |
| Quellcode-Verifikation | Was tatsächlich vorhanden ist |
| Muster | Gefundene Implementierungen und ihre Klassifikation |
| Abhängigkeiten | Direkte Aufrufer, Seiteneffekte, betroffene Schichten |
| Offenes | Unklare Verantwortlichkeiten, Widersprüche, fehlende Quellen |
