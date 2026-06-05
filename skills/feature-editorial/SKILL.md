---
name: feature-editorial
description: Use in the MuGPlan / Projekt Manager repository when the user asks to rewrite, document, structure, or prepare a feature from the user's perspective, including Feature descriptions, FEAT-N references, use cases, UC-N entries, "Feature überarbeiten", "redaktionell aufbereiten", "aus Anwendersicht beschreiben", "Beschreibung schreiben", or "Use Cases erstellen". Use Projekt-Manager MCP when a feature or use-case ID is known.
---

# Feature Editorial

Nutze diesen Skill, um Features aus Anwendersicht fachlich verständlich aufzubereiten. Zielgruppe ist Fachverantwortung oder Product Owner, nicht die technische Implementierung.

`agents.md` bleibt verbindlich. Für Projekt-Manager-Objekte nutze zusätzlich den Skill `projekt-manager`.

## Quelle Klären

- Wenn eine Feature-ID wie `FEAT-35` angegeben ist, lade das Feature über den Projekt-Manager-MCP.
- Wenn ein Feature-Name oder Text im Chat steht, verwende diesen als Ausgangsmaterial.
- Wenn Use Cases wie `UC-4` angegeben sind, lade sie über den Projekt-Manager-MCP.
- Wenn die Quelle unklar ist, frage knapp nach.

Lies Code oder lokale Dokumente nur, wenn fachliche Regeln, betroffene Domänenobjekte oder Querverbindungen sonst nicht sicher genug bestimmbar sind.

## Inhalt Erarbeiten

Sammle vor dem Schreiben:

- Zweck und Nutzen: Was kann der Anwender tun, welches Problem wird gelöst?
- Fachregeln: Pflichtfelder, Rollenbeschränkungen, Statusübergänge, Validierungen.
- Betroffene Objekte: fachliche Namen, keine unnötigen Tabellen- oder Feldnamen.
- Verwandte Features: Abhängigkeiten und Querverbindungen.
- Offene Unsicherheiten: nicht erfinden, sondern benennen.

## Feature-Struktur

Verwende diese Gliederung. Ersetze die erste H2 durch eine treffende fachliche Überschrift.

```markdown
## [Treffende Überschrift für den Fachbereich]

### Ziel / Zweck
1 bis 3 Sätze: Was kann der Anwender damit tun? Welchen Mehrwert bringt es?

### Fachliche Beschreibung
Aus Anwendersicht: Was passiert bei typischen Aktionen? Welche Zustände gibt es?

### Regeln & Randbedingungen
- Jede Fachregel als eigener Punkt.

## Architektur & Kontext

### Betroffene Objekte
Fachliche Entitäten mit kurzer Rollenbeschreibung.

### Verwandte Features & Abhängigkeiten
Querverweise mit kurzer Erklärung der Verbindung.
```

Mermaid-Diagramme nur verwenden, wenn mehr als zwei Objekte mit nicht-trivialen Beziehungen erklärt werden müssen.

## Use Cases

Wenn der Nutzer Use Cases wünscht, verwende:

```markdown
### UC-[Nummer]: [Titel]

**Akteur:** [Rolle]
**Ziel:** [Was möchte der Akteur erreichen?]

**Vorbedingungen:**
- [Was muss vorher erfüllt sein?]

**Ablauf:**
1. [Schritt 1]
2. [Schritt 2]

**Alternativen / Sonderfälle:**
- [Was passiert bei abweichendem Verlauf?]

**Ergebnis:**
[Was hat sich nach erfolgreicher Ausführung verändert?]
```

## Ausgabeziel

Wenn eine Feature- oder Use-Case-ID bekannt ist, ist der Projekt-Manager-MCP das Ausgabeziel. Prüfe vorher, ob das konkrete Textfeld Markdown oder HTML erwartet. Wenn HTML erwartet wird, nutze die HTML-Regeln aus `projekt-manager`.

Wenn keine ID bekannt ist, frage, ob ein neues Feature im Projekt Manager angelegt werden soll oder ob die Beschreibung nur im Chat zur Durchsicht ausgegeben werden soll.

## Stil

- Aktiv und anwendernah schreiben.
- Technischen Jargon vermeiden.
- Fachregeln klar und einzeln formulieren.
- Rollenbeschränkungen ausdrücklich benennen, wenn sie fachlich belegt sind.
- Keine Implementierungsdetails, Dateinamen oder API-Namen nennen, außer sie sind für die fachliche Einordnung nötig.
- Keine veralteten oder widersprüchlichen Informationen glätten; Unsicherheiten sichtbar machen.
