---
name: feature-editorial
description: >
  Redaktionelle Aufbereitung eines Features aus Anwendersicht. IMMER verwenden wenn
  der Nutzer ein Feature "überarbeiten", "redaktionell aufbereiten", "aus Anwendersicht
  beschreiben" oder "dokumentieren" möchte — egal ob eine Feature-ID (z. B. FEAT-35)
  oder ein Feature-Name genannt wird. Auch bei "schreib eine Beschreibung für...",
  "erstelle Use Cases für...", "bereite Feature X auf".
---

# Feature Editorial — MuGPlan

Zielgruppe: Fachverantwortliche und Product Owner. Kein technischer Jargon, keine
Implementierungsdetails — was das Feature tut und warum es existiert.

## Schritt 1: Quelle klären

- **Feature-ID angegeben** (z. B. `FEAT-35`) → Feature laden: `get_feature` über Projekt-Manager-MCP
- **Name oder Beschreibung im Chat** → als Ausgangsmaterial verwenden
- **Unklar** → kurz nachfragen

Zusätzlich: relevante Teile der Codebase lesen um Fachregeln, betroffene Objekte
und Querverbindungen eigenständig zu ermitteln.

## Schritt 2: Inhalt erarbeiten

1. **Zweck & Nutzen** — Was kann der Anwender tun? Welches Problem löst es?
2. **Fachregeln** — Pflichtfelder, Rollenbeschränkungen, Statusübergänge, Validierungen
3. **Betroffene Objekte** — Fachliche Namen (Termin, Mitarbeiter, Projekt, Kunde), keine Tabellennamen
4. **Verwandte Features** — Abhängigkeiten und Querverbindungen

## Schritt 3: Dokument schreiben

Feste Gliederung — H2-Titel des ersten Abschnitts durch inhaltlich treffende Überschrift ersetzen:

```
## [Treffende Überschrift]

### Ziel / Zweck
1–3 Sätze: Mehrwert im Arbeitsalltag.

### Fachliche Beschreibung
Aus Anwendersicht: Was passiert bei typischen Aktionen? Welche Zustände gibt es?

### Regeln & Randbedingungen
Jede Regel als eigenständiger Punkt.


## Architektur & Kontext

### Betroffene Objekte
Fachliche Entitäten mit kurzer Rollenbeschreibung.
Mermaid-Diagramm optional bei mehr als 2 Objekten mit nicht-trivialen Beziehungen.

### Verwandte Features & Abhängigkeiten
Querverweise mit kurzer Erklärung.
```

## Schritt 4 (optional): Use Cases

```
### UC-[Nummer]: [Titel]
**Akteur:** ...  **Ziel:** ...
**Vorbedingungen:** ...
**Ablauf:** 1. ... 2. ...
**Alternativen / Sonderfälle:** ...
**Ergebnis:** ...
```

## Schritt 5: Ausgabe

Features und Use Cases werden im Projekt Manager gepflegt — MCP ist das Ausgabeziel wenn eine ID bekannt ist.

Textfelder sind HTML — niemals Markdown übergeben (Regeln: Projekt-Manager-Skill).

**Mit Feature-ID:**
1. `update_feature` via Projekt-Manager-MCP
2. Use Cases → `create_use_case` + mit Feature verknüpfen; Status immer `open`
3. Kurze Rückmeldung was übertragen wurde

**Ohne Feature-ID:**
Fragen: neues Feature anlegen (`create_feature`) oder zunächst nur Durchsicht im Chat?

## Stil
- Aktiv: „Der Anwender kann…", „Das System erlaubt…"
- Fachregeln als klare Einzelaussagen — keine Schachtelsätze
- Mermaid nur wenn es echten Mehrwert bringt
- Datumsangaben in menschenlesbaren Texten immer im Format `dd.MM.yy`
