# NFR-01: Multi-User-Konsistenz

## 1. Ziel

Das System muss parallele Nutzung durch mehrere Benutzer oder mehrere Browser-Sessions ermöglichen, ohne dass:

- Änderungen still überschrieben werden,
- fachliche Invarianten verletzt werden,
- inkonsistente Zustände entstehen,
- Race Conditions unbemerkt bleiben.

Das System garantiert deterministische Konsistenz bei parallelen Mutationen.

---

## 2. Geltungsbereich

Diese Anforderung gilt für:

- alle mutierenden REST-Endpoints (POST, PUT, PATCH, DELETE),
- alle versionierten Entitäten,
- alle Service-Operationen mit fachlichen Abhängigkeiten,
- alle Operationen mit zeitlicher Logik (Termine, Mitarbeiterzuweisung).

---

## 3. Technische Mindestanforderungen

### 3.1 Optimistic Locking (Pflicht)

Alle mutierbaren Kernentitäten müssen eine `version`-Spalte besitzen.

Updates dürfen nur erfolgen, wenn:

```
WHEREid= ?ANDversion= ?
```

Bei Versionsabweichung muss der Server deterministisch antworten mit:

```
HTTP409CONFLICT
code: VERSION_CONFLICT
```

---

### 3.2 Transaktionale Fachregelprüfung (Pflicht)

Fachregeln mit konkurrierenden Zuständen müssen innerhalb einer DB-Transaktion geprüft und angewendet werden.

Beispiele:

- Mitarbeiter darf keine Terminüberschneidung haben.
- Archivierte Projekte dürfen keine neuen Termine erhalten.
- Gesperrte Termine dürfen nicht verändert werden.

Operationen müssen atomar sein:

- vollständiger Commit
- oder vollständiger Rollback

---

### 3.3 Server als alleinige Wahrheit

Der Client darf:

- keine Fachregeln erzwingen,
- keine Konfliktentscheidungen treffen,
- keine Versionslogik lokal berechnen.

Der Server entscheidet immer auf Basis des aktuellen DB-Zustands.

---

### 3.4 Fehlerstandardisierung

Konflikte müssen maschinenlesbar sein:

- `VERSION_CONFLICT`
- `BUSINESS_RULE_CONFLICT`
- `LOCK_VIOLATION`
- `NOT_FOUND`
- `VALIDATION_ERROR`

---

## 4. Testpflicht

Jeder mutierende Endpoint muss mindestens enthalten:

1. Test für korrekte Version
2. Test für alte Version → 409
3. Test für Fachregelverletzung
4. Concurrency-Test mit parallelen Requests

Ohne diese Tests gilt NFR-01 als nicht erfüllt.