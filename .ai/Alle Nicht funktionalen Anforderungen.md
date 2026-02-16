# Alle Nicht funktionalen Anforderungen

# NFR (01): Multi-User-Konsistenz

## 1. Ziel

Das System muss parallele Nutzung durch mehrere Benutzer oder mehrere Browser-Sessions ermöglichen, ohne dass:

- Änderungen still überschrieben werden,
- fachliche Invarianten verletzt werden,
- inkonsistente Zustände entstehen,
- Race Conditions unbemerkt bleiben.

Das System garantiert deterministische Konsistenz bei parallelen Mutationen.

## 2. Geltungsbereich

Diese Anforderung gilt für:

- alle mutierenden REST-Endpoints (POST, PUT, PATCH, DELETE),
- alle versionierten Entitäten,
- alle Service-Operationen mit fachlichen Abhängigkeiten,
- alle Operationen mit zeitlicher Logik (Termine, Mitarbeiterzuweisung).

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

### 3.2 Transaktionale Fachregelprüfung (Pflicht)

Fachregeln mit konkurrierenden Zuständen müssen innerhalb einer DB-Transaktion geprüft und angewendet werden.

Beispiele:

- Mitarbeiter darf keine Terminüberschneidung haben.
- Archivierte Projekte dürfen keine neuen Termine erhalten.
- Gesperrte Termine dürfen nicht verändert werden.

Operationen müssen atomar sein:

- vollständiger Commit
- oder vollständiger Rollback

### 3.3 Server als alleinige Wahrheit

Der Client darf:

- keine Fachregeln erzwingen,
- keine Konfliktentscheidungen treffen,
- keine Versionslogik lokal berechnen.

Der Server entscheidet immer auf Basis des aktuellen DB-Zustands.

### 3.4 Fehlerstandardisierung

Konflikte müssen maschinenlesbar sein:

- `VERSION_CONFLICT`
- `BUSINESS_RULE_CONFLICT`
- `LOCK_VIOLATION`
- `NOT_FOUND`
- `VALIDATION_ERROR`

# NFR (02): Datenintegrität und referenzielle Stabilität

## 1. Ziel

Das System muss sicherstellen, dass zu keinem Zeitpunkt fachlich inkonsistente oder referenziell ungültige Zustände entstehen.

Insbesondere darf es nicht möglich sein, durch API-Nutzung, parallele Requests, UI-Manipulation oder Fehlbedienung Zustände zu erzeugen, die:

- Entitäten ohne erforderliche Referenz enthalten,
- fachliche Invarianten verletzen,
- implizite Annahmen der Domäne unterlaufen,
- oder referenzielle Integrität umgehen.

Das System garantiert strukturelle Konsistenz unabhängig vom Client.

## 2. Geltungsbereich

Diese Anforderung gilt für:

- alle Kernentitäten (Customer, Project, Appointment, Employee, Status, Attachments, Settings),
- alle Many-to-Many-Relationen,
- alle Archivierungsprozesse,
- alle Lösch- und Deaktivierungsoperationen,
- alle neuen Entitäten in zukünftigen Features.

## 3. Technische Mindestanforderungen

### 3.1 Harte Domänen-Invarianten (Pflicht)

Folgende Invarianten müssen serverseitig durchgesetzt werden:

- Ein Termin darf niemals ohne gültiges Projekt existieren.
- Ein Attachment darf niemals ohne gültiges Parent-Objekt existieren.
- Ein Projektstatus darf nicht gelöscht werden, solange Referenzen bestehen.
- Archivierte Entitäten dürfen keine neuen abhängigen Entitäten erzeugen.
- Many-to-Many-Relationen dürfen keine Duplikate enthalten.

Diese Regeln dürfen nicht ausschließlich im Frontend validiert werden.

### 3.2 Referentielle Integrität auf Datenbankebene (Pflicht)

Für alle abhängigen Entitäten gelten:

- Foreign Keys müssen definiert sein.
- Löschverhalten (CASCADE / RESTRICT / SET NULL) muss explizit festgelegt sein.
- Implizite „Soft-Referenzen“ sind unzulässig.

Datenbankseitige Integrität darf nicht durch Service-Workarounds ersetzt werden.

### 3.3 Archivierung statt physischer Löschung

Kernentitäten werden archiviert, nicht gelöscht.

Löschung ist nur zulässig, wenn:

- keine abhängigen Datensätze existieren,
- keine Historienverletzung entsteht,
- und die Operation fachlich explizit erlaubt ist.

### 3.4 Keine impliziten Seiteneffekte

Operationen dürfen keine verdeckten Nebenwirkungen erzeugen, die referenzielle Stabilität gefährden.

Beispiel:

- Entfernen eines Mitarbeiters aus einer Tour darf keine Terminzuweisung löschen.
- Löschen eines Teams darf keine Mitarbeiter löschen.
- Entfernen eines Status darf nicht automatisch andere Status verändern.

### 3.5 Service als Invarianten-Grenze

Alle referenziellen Prüfungen müssen:

- im Service stattfinden,
- innerhalb einer Transaktion erfolgen, wenn mehrere Entitäten betroffen sind,
- deterministisch mit klarer Fehlermeldung abbrechen.

## 4. Fehlerstandardisierung

Verstöße gegen NFR-02 müssen maschinenlesbar sein:

- `REFERENTIAL_INTEGRITY_VIOLATION`
- `DEPENDENCY_EXISTS`
- `INVALID_RELATION_STATE`
- `ARCHIVE_CONFLICT`

Freitextfehler sind unzulässig.