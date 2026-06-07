# Graphify-Protokoll

Gemeinsames Analyse-Protokoll für alle Skills die Code berühren oder analysieren.
Alle code-nahen Skills referenzieren dieses Dokument und wenden es in Schritt 1 an.

---

## Grundsatz

Graphify ist kein optionales Werkzeug — es ist die erste Pflichthandlung vor jeder Analyse.
Wenn kein Graph vorhanden ist, wird er zuerst erstellt:

```bash
graphify update .
```

---

## Standardablauf

### Schritt 1 — Einstieg über Fachbegriff

```bash
graphify query "<fachlicher Begriff>"
```

Liefert: relevante Knoten, ihre Typen und Vernetzung. Ausgangspunkt für alle weiteren Schritte.

### Schritt 2 — Abhängigkeitspfad

```bash
graphify path "<Einstiegspunkt>" "<Zielpunkt>"
```

Liefert: vollständiger Pfad zwischen zwei Knoten — Aufrufer, Services, Repositories, Persistenz.
Verwenden um: Schichtgrenzen, Datenpfade, Seiteneffekte zu verstehen.

### Schritt 3 — Konzepterklärung

```bash
graphify explain "<Konzept>"
```

Verwenden wenn: ein Knoten unbekannt ist, ein Muster unklar bleibt, ein Bereich tiefer analysiert werden soll.

### Schritt 4 — Verifikation im Quellcode

Graphify-Ergebnisse sind Einstiegshilfe, keine Wahrheitsquelle.
Gefundene Knoten und Pfade müssen durch direkte Quellcodeprüfung verifiziert werden:
- Symbol- und Textsuche für genaue Definitionen
- Import- und Referenzsuche für tatsächliche Verwendungen
- Dateilesen für vollständige Verantwortung einer Komponente

---

## Qualitätssicherung der Graphergebnisse

Vor Verwendung des Graphen prüfen:

| Frage | Prüfung |
|---|---|
| Graph aktuell? | Letztes `graphify update .` nach letztem Commit? |
| Knoten verifiziert? | Im Quellcode tatsächlich vorhanden und nicht umbenannt? |
| Vernetzung plausibel? | Entspricht dem beobachteten Verhalten im Code? |
| Drift erkennbar? | Stark vernetzte Knoten ≠ automatisch verbindliche Referenz |

---

## Klassifikation gefundener Knoten

| Klasse | Merkmal |
|---|---|
| Verbindliche Referenz | Explizit als Standard benannt, zentral importiert, breite Nutzung |
| Zulässige Variante | Dokumentiert, bewusst abweichend |
| Aktuelle Implementierung | Verbreitet, aber nicht explizit als Standard definiert |
| Driftverdacht | Lokal, isoliert, ähnliche Aufgabe wie eine zentrale Lösung |
| Altlast | Veraltet, kaum referenziert, nicht gepflegt |

---

## Grenzen

- Häufigkeit oder Knotengrad beweist keine Korrektheit.
- Fehlende Knoten im Graph bedeuten nicht, dass keine Implementierung existiert.
- Graphify ersetzt nicht das Lesen des Codes — es reduziert die nötige Suchmenge.
- Bei UI-Themen: Graph zeigt Struktur, nicht visuelles Verhalten — Browser-/Screenshot-Prüfung bleibt Pflicht.
