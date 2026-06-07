---
name: architektur
description: >
  Architektur- und Design-Analyse für MugPlan — mehrstufige Aufträge von der Bestandsanalyse
  bis zur Implementierung und Konformitätsprüfung.
  Auslöser: neues Feature, strukturelle Änderung, Bugfix mit UI/API-Auswirkung,
  Refactoring, Vereinheitlichung, Drift-Audit, "wie soll ich X bauen".
---

# Architektur-Skill — MugPlan

Einstiegspunkt für mehrstufige Architektur- und Designaufträge.
Bestimmt die Auftragsart, aktiviert nur die erforderlichen Analyseschritte und stellt sicher,
dass vor einer Implementierung eine belastbare Bestands- und Regelanalyse vorliegt.

---

## MugPlan-Schichtenreferenz

```
shared/routes.ts                          ← API-Contracts (Contract-First, Pflichtquelle)
shared/schema.ts                          ← Datenbankschema (Drizzle ORM)

server/routes/*Routes.ts                  ← Route-Registrierung
server/controllers/*Controller.ts         ← Request-Handling, Validierung
server/services/*Service.ts               ← Fachlogik (serverseitige Invarianten hier)
server/repositories/*Repository.ts        ← Datenbankzugriff

client/src/pages/Home.tsx                 ← Hauptseite, Tab-Navigation
client/src/components/                    ← Fachliche Komponenten
client/src/components/ui/                 ← Basiskomponenten (Pflichtquelle für UI-Arbeit)
client/src/hooks/                         ← React Query Hooks und Datenbeschaffung
```

**Verbindliche Designregeln:**
- `docs/architecture.md` — Architekturprinzipien, Schichtmodell, Invarianten
- `docs/UI-Komponenten-Referenz.md` — vorhandene UI-Bausteine (Pflichtquelle vor jeder neuen Komponente)
- `docs/implementation.md` — Implementierungsmuster und -entscheidungen
- `CLAUDE.md` §6–§9 — Architektur-, UI-, Daten- und Sicherheitsgrenzen

**Fachliche Invarianten (serverseitig, nicht umgehbar):**
- Termin-Relationspflicht: `projectId` oder direkte `customerId` muss gesetzt sein
- Mitarbeiter-Overlap: blockierend via `EMPLOYEE_OVERLAP_CONFLICT` (HTTP 409)
- Historische Termine: rollenabhängige Schreibsperre (`PAST_APPOINTMENT_READONLY`)
- Rollen: `LESER`, `DISPONENT`, `ADMIN` — Client-Header sind keine Autorisierungsquelle

---

## Trigger

- Neues Feature oder neue UI-Funktion
- Bugfix mit struktureller oder visueller Änderung
- Neue oder geänderte Komponente
- Änderung eines Nutzerablaufs
- Refactoring oder Vereinheitlichung
- Architektur- oder Designaudit
- Wiederkehrender Drift an vergleichbaren Stellen

## Nicht-Trigger

- Reine Textänderung ohne Code- oder UI-Auswirkung
- Mechanische Formatierung mit eindeutig begrenztem Umfang
- Ausdrücklich isolierter Analyseauftrag wenn bereits klar ist, welcher Bereich zuständig ist

---

## Auftragsarten

| Art | Beschreibung |
|---|---|
| Analyse | Keine Codeänderung — nur verstehen |
| Entscheidung | Analyse + Umsetzungsentscheidung, aber keine Implementierung |
| Implementierung | Vollständiger Ablauf: Analyse → Entscheidung → Umsetzung → Prüfung |
| Audit | Bestandsaufnahme und Driftbewertung ohne automatische Bereinigung |
| Vereinheitlichung | Geplante Beseitigung paralleler Lösungen |

---

## Pflichtablauf

1. Auftragsart, Ziel und zulässige Änderungen bestimmen.
2. Änderungsreichweite zunächst eng abgrenzen.
3. Graphify-Protokoll anwenden (`skills/core/graphify-protocol.md`):
   ```bash
   graphify query "<Domänenbegriff>"
   graphify path "<UI-Einstieg>" "<Service>"
   graphify explain "<unbekannter Knoten>"
   ```
4. Bestandsanalyse: Was existiert bereits in diesem Bereich? Welche Schichten sind betroffen?
5. Relevante Regeln ermitteln: Architektur-, UI- und Fachregeln aus den Quellen oben.
6. Wiederverwendungs- und Umsetzungsentscheidung treffen: vorhandene Bausteine nutzen, keine neue Komponente ohne Nachweis dass bestehende ungeeignet sind.
7. Bei Implementierungsauftrag: umsetzen — minimal-invasiv, nur was im Auftrag steht.
8. Konformitätsprüfung: Contract-Einhaltung, Schichttrennung, UI-Bausteine korrekt verwendet.
9. Ergebnisse konsolidieren und eindeutiges Abschlussurteil liefern.

Bei Analyse- oder Auditaufträgen: Schritte 6–8 entfallen.

---

## Leitplanken

- Keine Detailanalyse doppelt durchführen wenn ein nachgelagerter Schritt sie vollständig übernimmt.
- Keine vorhandene Implementierung automatisch als Referenz behandeln — Drift möglich.
- Keine neue Komponente allein deshalb erlauben weil sie lokal schneller zu bauen ist.
- Ein reiner Analyse- oder Auditauftrag verändert keinen Produktivcode.
- Fachliche Regeln immer serverseitig implementieren — UI-Regeln ergänzen nur UX.
- Neue UI-Bausteine müssen `docs/UI-Komponenten-Referenz.md` nachgepflegt werden.

---

## Abbruchbedingungen

- Gleichrangige Quellen verlangen unvereinbare Architektur oder UI-Verhalten.
- Zuständige Komponenten oder geltende Regeln sind ungeklärt und die Unsicherheit beeinflusst die Lösung wesentlich.
- Scope widerspricht dokumentierten Architekturentscheidungen (CLAUDE.md §6).

Bei Abbruch: Blocker und offene Fragen dokumentieren — keine Schätzung als Entscheidung ausgeben.
